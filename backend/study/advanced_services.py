from datetime import date
from django.db import transaction
from django.utils import timezone
from courses.permissions import has_active_enrollment
from knowledge.models import Question
from knowledge.services import can_use_question,question_payload
from .models import StudyContentProgress,StudyProfile,StudyReviewItem,StudyRoadmapItem

def _stable_hash(value):
    h=0
    for ch in value:
        h=((h<<5)-h+ord(ch))&0xffffffff
    return h

def daily_quick_check(user,course):
    if not has_active_enrollment(user,course.id):
        raise PermissionError("Matrícula vigente necessária.")
    profile,_=StudyProfile.objects.get_or_create(user=user)
    today=date.today()
    if profile.daily_quick_check_date==today and profile.daily_quick_check_course_id==course.id:
        if profile.daily_quick_check_dismissed:
            return None
        if profile.daily_quick_check_question_id:
            return question_payload(profile.daily_quick_check_question)
    qs=Question.objects.filter(content_links__content__discipline_links__discipline__course_links__course=course).distinct()
    eligible=[q for q in qs if can_use_question(q) and q.question_type=="certo_errado"]
    preferred=[q for q in eligible if len(q.statement.strip())<=420 and q.difficulty=="basic"] or [q for q in eligible if len(q.statement.strip())<=420] or eligible
    if not preferred:
        return None
    recent=set(str(x) for x in profile.used_question_ids[-20:])
    pool=[q for q in preferred if str(q.id) not in recent] or preferred
    pool=sorted(pool,key=lambda q:q.id)
    selected=pool[_stable_hash(str(user.id)+":"+course.id+":"+today.isoformat())%len(pool)]
    profile.daily_quick_check_date=today
    profile.daily_quick_check_course=course
    profile.daily_quick_check_question=selected
    profile.daily_quick_check_dismissed=False
    profile.save()
    return question_payload(selected)

@transaction.atomic
def dismiss_daily_quick_check(user,course):
    if not has_active_enrollment(user,course.id):
        raise PermissionError("Matrícula vigente necessária.")
    profile,_=StudyProfile.objects.select_for_update().get_or_create(user=user)
    profile.daily_quick_check_date=date.today()
    profile.daily_quick_check_course=course
    profile.daily_quick_check_dismissed=True
    profile.save()
    return True

@transaction.atomic
def queue_review(user,question_key,snapshot):
    item,_=StudyReviewItem.objects.update_or_create(user=user,question_key=question_key,defaults={"snapshot_json":snapshot,"status":"pending","reviewed_at":None})
    return item

@transaction.atomic
def mark_review_mastered(user,item_id):
    item=StudyReviewItem.objects.select_for_update().get(pk=item_id,user=user)
    item.status="mastered"
    item.reviewed_at=timezone.now()
    item.save()
    return item

@transaction.atomic
def remove_review_item(user,item_id):
    item=StudyReviewItem.objects.select_for_update().get(pk=item_id,user=user)
    item.delete()
    return True

@transaction.atomic
def mark_content_opened(user,course,content,completed=False):
    if not has_active_enrollment(user,course.id):
        raise PermissionError("Matrícula vigente necessária.")
    defaults={"status":"completed" if completed else "started"}
    if completed:
        defaults["completed_at"]=timezone.now()
    progress,_=StudyContentProgress.objects.update_or_create(user=user,course=course,content=content,defaults=defaults)
    return progress

def course_progress(user,course):
    if not has_active_enrollment(user,course.id):
        raise PermissionError("Matrícula vigente necessária.")
    return StudyContentProgress.objects.filter(user=user,course=course).select_related("content").order_by("content_id")

def resume_content(user,course):
    if not has_active_enrollment(user,course.id):
        raise PermissionError("Matrícula vigente necessária.")
    return StudyContentProgress.objects.filter(user=user,course=course).select_related("content").order_by("-last_opened_at").first()

def roadmap_items(user,course):
    if not has_active_enrollment(user,course.id):
        raise PermissionError("Matrícula vigente necessária.")
    return StudyRoadmapItem.objects.filter(user=user,course=course,is_active=True).select_related("course","content","discipline").order_by("weekday","start_time")

@transaction.atomic
def save_roadmap_item(user,course,content,discipline,weekday,start_time,is_active=True):
    if not has_active_enrollment(user,course.id):
        raise PermissionError("Matrícula vigente necessária.")
    if discipline and not discipline.course_links.filter(course=course).exists():
        raise ValueError("A disciplina não pertence a este curso.")
    if not content.discipline_links.filter(discipline__course_links__course=course).exists():
        raise ValueError("O conteúdo não pertence a este curso.")
    item,_=StudyRoadmapItem.objects.update_or_create(
        user=user,course=course,discipline=discipline,
        defaults={"content":content,"weekday":weekday,"start_time":start_time,"is_active":is_active},
    )
    return item

@transaction.atomic
def remove_roadmap_item(user,item_id):
    item=StudyRoadmapItem.objects.select_for_update().get(pk=item_id,user=user)
    item.delete()
    return True
