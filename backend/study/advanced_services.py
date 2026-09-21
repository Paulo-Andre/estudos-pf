from datetime import date,time
from django.db import transaction
from django.utils import timezone
from courses.permissions import has_active_enrollment
from knowledge.models import Content,Discipline,Question
from knowledge.services import can_use_question,question_payload
from .models import StudyContentProgress,StudyProfile,StudyReviewItem,StudyRoadmapItem

def _stable_hash(value):
    h=0
    for ch in value:h=((h<<5)-h+ord(ch))&0xffffffff
    return h

def daily_quick_check(user,course):
    if not has_active_enrollment(user,course.id):raise PermissionError("Matrícula vigente necessária.")
    profile,_=StudyProfile.objects.get_or_create(user=user);today=date.today()
    if profile.daily_quick_check_date==today and profile.daily_quick_check_course_id==course.id:
        if profile.daily_quick_check_dismissed:return None
        if profile.daily_quick_check_question_id:return question_payload(profile.daily_quick_check_question)
    qs=Question.objects.filter(content_links__content__discipline_links__discipline__course_links__course=course).distinct()
    eligible=[q for q in qs if can_use_question(q) and q.question_type=="certo_errado"]
    preferred=[q for q in eligible if len(q.statement.strip())<=420 and q.difficulty=="basic"] or [q for q in eligible if len(q.statement.strip())<=420] or eligible
    if not preferred:return None
    recent=set(str(x) for x in profile.used_question_ids[-20:]);pool=[q for q in preferred if str(q.id) not in recent] or preferred
    pool=sorted(pool,key=lambda q:q.id);selected=pool[_stable_hash(str(user.id)+":"+course.id+":"+today.isoformat())%len(pool)]
    profile.daily_quick_check_date=today;profile.daily_quick_check_course=course;profile.daily_quick_check_question=selected;profile.daily_quick_check_dismissed=False;profile.save()
    return question_payload(selected)

@transaction.atomic
def dismiss_daily_quick_check(user,course):
    if not has_active_enrollment(user,course.id):raise PermissionError("Matrícula vigente necessária.")
    profile,_=StudyProfile.objects.select_for_update().get_or_create(user=user)
    profile.daily_quick_check_date=date.today();profile.daily_quick_check_course=course;profile.daily_quick_check_dismissed=True;profile.save();return True

@transaction.atomic
def queue_review(user,question_key,snapshot):
    return StudyReviewItem.objects.update_or_create(user=user,question_key=question_key,defaults={"snapshot_json":snapshot,"status":"pending","reviewed_at":None})[0]

@transaction.atomic
def mark_review_mastered(user,item_id):
    item=StudyReviewItem.objects.select_for_update().get(pk=item_id,user=user);item.status="mastered";item.reviewed_at=timezone.now();item.save();return item

@transaction.atomic
def remove_review_item(user,item_id):
    item=StudyReviewItem.objects.select_for_update().get(pk=item_id,user=user);item.delete();return True

def _course_contents(course):
    rows=Discipline.objects.filter(course_links__course=course).prefetch_related("content_links__content").order_by("name")
    result=[];seen=set()
    for discipline in rows:
        for link in discipline.content_links.all():
            content=link.content
            if content.id in seen:continue
            seen.add(content.id)
            result.append({"content":content,"discipline":discipline})
    return sorted(result,key=lambda x:x["content"].title.casefold())

def content_payload(content,discipline):
    return {
        "id":content.id,"disciplineId":discipline.id,"disciplineName":discipline.name,"title":content.title,
        "description":content.description or None,"objective":content.objective or None,"cardText":content.card_text or None,
        "body":content.body or None,"coverImageUrl":content.cover_image_url or None,"videoUrl":content.video_url or None,
        "videoLabel":content.video_label or None,"materialUrl":content.material_url or None,"materialLabel":content.material_label or None,
        "noticeKind":content.notice_kind,"noticeActivatedAt":content.notice_activated_at,
    }

def _assert_content(user,course,content):
    if not has_active_enrollment(user,course.id):raise PermissionError("Matrícula vigente necessária.")
    match=next((x for x in _course_contents(course) if x["content"].id==content.id),None)
    if not match:raise ValueError("O conteúdo escolhido não pertence ao curso selecionado.")
    return match

@transaction.atomic
def mark_content_opened(user,course,content,completed=False):
    _assert_content(user,course,content)
    existing=StudyContentProgress.objects.filter(user=user,course=course,content=content).first()
    if existing and existing.status=="completed" and not completed:
        existing.last_opened_at=timezone.now();existing.save(update_fields=["last_opened_at"]);return existing
    defaults={"status":"completed" if completed else "started"}
    if completed:defaults["completed_at"]=timezone.now()
    return StudyContentProgress.objects.update_or_create(user=user,course=course,content=content,defaults=defaults)[0]

def course_progress_payload(user,course):
    if not has_active_enrollment(user,course.id):raise PermissionError("Matrícula vigente necessária.")
    progress={p.content_id:p for p in StudyContentProgress.objects.filter(user=user,course=course)}
    items=[]
    for pair in _course_contents(course):
        base=content_payload(pair["content"],pair["discipline"]);p=progress.get(pair["content"].id)
        base["progress"]=None if not p else {"status":p.status,"startedAt":p.started_at,"lastOpenedAt":p.last_opened_at,"completedAt":p.completed_at}
        base["notice"]=None;items.append(base)
    started=[x for x in items if x["progress"] and x["progress"]["status"]=="started"]
    started.sort(key=lambda x:x["progress"]["lastOpenedAt"],reverse=True)
    first_pending=next((x for x in items if not x["progress"] or x["progress"]["status"]!="completed"),None)
    return {"courseId":course.id,"contents":items,"continueItem":(started[0] if started else first_pending or (items[0] if items else None))}

def resume_content(user,course):
    if not has_active_enrollment(user,course.id):raise PermissionError("Matrícula vigente necessária.")
    return StudyContentProgress.objects.filter(user=user,course=course).select_related("content").order_by("-last_opened_at").first()

def roadmap_items(user,course):
    if not has_active_enrollment(user,course.id):raise PermissionError("Matrícula vigente necessária.")
    return StudyRoadmapItem.objects.filter(user=user,course=course,is_active=True).select_related("course","content","discipline").order_by("weekday","start_time")

def roadmap_payload(user,course):
    result=[]
    for item in roadmap_items(user,course):
        discipline=item.discipline
        if not discipline:continue
        base=content_payload(item.content,discipline)
        result.append({"id":item.id,"contentId":item.content_id,"disciplineId":discipline.id,"disciplineName":discipline.name,
            "weekday":item.weekday,"startTime":item.start_time.strftime("%H:%M"),"isActive":item.is_active,"content":base})
    return result

@transaction.atomic
def save_roadmap_item(user,course,discipline,weekday,is_active=True):
    if not has_active_enrollment(user,course.id):raise PermissionError("Matrícula vigente necessária.")
    if not discipline.course_links.filter(course=course).exists():raise ValueError("A disciplina escolhida não pertence ao curso selecionado.")
    link=discipline.content_links.select_related("content").order_by("content__title").first()
    if not link:raise ValueError("A disciplina ainda não possui conteúdo para o roadmap.")
    StudyRoadmapItem.objects.update_or_create(user=user,course=course,discipline=discipline,
        defaults={"content":link.content,"weekday":weekday,"start_time":time(0,0),"is_active":is_active})
    return roadmap_payload(user,course)

@transaction.atomic
def remove_roadmap_item(user,item_id):
    item=StudyRoadmapItem.objects.select_for_update().get(pk=item_id,user=user);item.delete();return True
