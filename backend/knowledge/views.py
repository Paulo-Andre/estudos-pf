from django.db import IntegrityError,transaction
from django.db.models import Q
from rest_framework import permissions,status
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.models import AdminAuditLog
from courses.models import Course
from courses.permissions import has_active_enrollment
from .models import Content,ContentChangelog,CourseDiscipline,Discipline,DisciplineContent,Question,QuestionChangelog,QuestionContentLink,ReviewQueue
from .services import can_use_question,decide_review,question_payload,submit_for_review

def discipline_json(d):
    return {"id":d.id,"name":d.name,"shortName":d.short_name,"description":d.description,"status":d.status,
        "requiresReview":d.requires_review,"courseIds":list(d.course_links.values_list("course_id",flat=True)),
        "contentIds":list(d.content_links.values_list("content_id",flat=True))}

def content_json(c):
    return {"id":c.id,"title":c.title,"objective":c.objective,"description":c.description,"cardText":c.card_text,"body":c.body,
        "coverImageUrl":c.cover_image_url,"videoUrl":c.video_url,"videoLabel":c.video_label,"materialUrl":c.material_url,
        "materialLabel":c.material_label,"noticeKind":c.notice_kind,"noticeActivatedAt":c.notice_activated_at,"status":c.status,
        "requiresReview":c.requires_review,"disciplineIds":list(c.discipline_links.values_list("discipline_id",flat=True))}

def full_question_json(q):
    payload=question_payload(q)
    links=list(q.content_links.select_related("content").prefetch_related("content__discipline_links__discipline"))
    contents=[link.content for link in links]
    disciplines=[]
    for content in contents:
        for dlink in content.discipline_links.all():
            if dlink.discipline.name not in disciplines:disciplines.append(dlink.discipline.name)
    payload["contentIds"]=[content.id for content in contents]
    payload["discipline"]=disciplines[0] if disciplines else "Biblioteca central"
    payload["subject"]=" · ".join(content.title for content in contents) or "Conteúdo geral"
    return payload

class CourseLibraryView(APIView):
    def get(self,request,course_id):
        if not has_active_enrollment(request.user,course_id):
            return Response({"detail":"Matrícula vigente necessária."},status=403)
        disciplines=Discipline.objects.filter(course_links__course_id=course_id,status__in=["approved","published"]).distinct()
        data=[]
        for d in disciplines:
            contents=Content.objects.filter(discipline_links__discipline=d,status__in=["approved","published"]).order_by("title")
            data.append({"id":d.id,"name":d.name,"shortName":d.short_name,"description":d.description,
                "contents":[content_json(c) for c in contents]})
        return Response(data)

class EligibleQuestionsView(APIView):
    def get(self,request,course_id):
        if not has_active_enrollment(request.user,course_id):
            return Response({"detail":"Matrícula vigente necessária."},status=403)
        qs=Question.objects.filter(content_links__content__discipline_links__discipline__course_links__course_id=course_id).distinct()
        return Response([full_question_json(q) for q in qs if can_use_question(q)])

class AdminDisciplinesView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):
        return Response([discipline_json(d) for d in Discipline.objects.all().order_by("name")])
    @transaction.atomic
    def post(self,request):
        data=request.data
        short=str(data.get("shortName") or "").strip().lower()
        if Discipline.objects.filter(short_name__iexact=short).exists():
            return Response({"detail":"Já existe uma disciplina com esta sigla."},status=409)
        d=Discipline.objects.create(
            name=str(data.get("name") or "").strip()[:160],short_name=short[:48],description=str(data.get("description") or ""),
            requires_review=bool(data.get("requiresReview",False)),status=data.get("status") or "draft",created_by=request.user,updated_by=request.user)
        for cid in data.get("courseIds") or []:CourseDiscipline.objects.get_or_create(course_id=cid,discipline=d,defaults={"linked_by":request.user})
        for content_id in data.get("contentIds") or []:DisciplineContent.objects.get_or_create(discipline=d,content_id=content_id,defaults={"linked_by":request.user})
        return Response(discipline_json(d),status=201)

class AdminDisciplineDetailView(APIView):
    permission_classes=[permissions.IsAdminUser]
    @transaction.atomic
    def put(self,request,discipline_id):
        d=Discipline.objects.select_for_update().filter(pk=discipline_id).first()
        if not d:return Response({"detail":"Disciplina não encontrada."},status=404)
        data=request.data
        if "name" in data:d.name=str(data["name"]).strip()[:160]
        if "shortName" in data:d.short_name=str(data["shortName"]).strip().lower()[:48]
        if "description" in data:d.description=str(data["description"])
        if "requiresReview" in data:d.requires_review=bool(data["requiresReview"])
        if "status" in data:d.status=data["status"]
        d.updated_by=request.user;d.save()
        if "courseIds" in data:
            CourseDiscipline.objects.filter(discipline=d).delete()
            for cid in data.get("courseIds") or []:CourseDiscipline.objects.create(course_id=cid,discipline=d,linked_by=request.user)
        if "contentIds" in data:
            DisciplineContent.objects.filter(discipline=d).delete()
            for content_id in data.get("contentIds") or []:DisciplineContent.objects.create(discipline=d,content_id=content_id,linked_by=request.user)
        return Response(discipline_json(d))

class AdminContentsView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):
        return Response([content_json(c) for c in Content.objects.all().order_by("title")])
    @transaction.atomic
    def post(self,request):
        data=request.data
        c=Content.objects.create(
            title=str(data.get("title") or "").strip()[:220],objective=str(data.get("objective") or ""),description=str(data.get("description") or ""),
            card_text=str(data.get("cardText") or ""),body=str(data.get("body") or ""),cover_image_url=str(data.get("coverImageUrl") or "")[:2048],
            video_url=str(data.get("videoUrl") or "")[:2048],video_label=str(data.get("videoLabel") or "")[:160],
            material_url=str(data.get("materialUrl") or "")[:2048],material_label=str(data.get("materialLabel") or "")[:160],
            notice_kind=data.get("noticeKind") or None,requires_review=bool(data.get("requiresReview",False)),
            status=data.get("status") or "draft",created_by=request.user,updated_by=request.user)
        for did in data.get("disciplineIds") or []:DisciplineContent.objects.get_or_create(discipline_id=did,content=c,defaults={"linked_by":request.user})
        return Response(content_json(c),status=201)

class AdminContentDetailView(APIView):
    permission_classes=[permissions.IsAdminUser]
    @transaction.atomic
    def put(self,request,content_id):
        c=Content.objects.select_for_update().filter(pk=content_id).first()
        if not c:return Response({"detail":"Conteúdo não encontrado."},status=404)
        data=request.data
        fields={"title":"title","objective":"objective","description":"description","cardText":"card_text","body":"body","coverImageUrl":"cover_image_url",
            "videoUrl":"video_url","videoLabel":"video_label","materialUrl":"material_url","materialLabel":"material_label","noticeKind":"notice_kind",
            "requiresReview":"requires_review","status":"status"}
        changes=[]
        for src,dst in fields.items():
            if src in data:
                old=getattr(c,dst);new=data[src]
                if old!=new:
                    changes.append((src,old,new));setattr(c,dst,new)
        c.updated_by=request.user;c.save()
        for field,old,new in changes:
            ContentChangelog.objects.create(content=c,actor=request.user,changed_field=field,old_value=str(old) if old is not None else None,new_value=str(new) if new is not None else None)
        if "disciplineIds" in data:
            DisciplineContent.objects.filter(content=c).delete()
            for did in data.get("disciplineIds") or []:DisciplineContent.objects.create(discipline_id=did,content=c,linked_by=request.user)
        return Response(content_json(c))

class ContentChangelogView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request,content_id):
        qs=ContentChangelog.objects.filter(content_id=content_id).order_by("-created_at")[:200]
        return Response([{"id":x.id,"actorUserId":x.actor_id,"changedField":x.changed_field,"oldValue":x.old_value,"newValue":x.new_value,"createdAt":x.created_at} for x in qs])

class AdminQuestionsView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):
        term=str(request.query_params.get("search") or "").strip()
        qs=Question.objects.all().order_by("-updated_at")
        if request.query_params.get("status"):qs=qs.filter(status=request.query_params["status"])
        if request.query_params.get("contentId"):qs=qs.filter(content_links__content_id=request.query_params["contentId"])
        if term:qs=qs.filter(Q(statement__icontains=term)|Q(source__icontains=term)|Q(banca__icontains=term))
        return Response([full_question_json(q) for q in qs.distinct()[:500]])

    @transaction.atomic
    def post(self,request):
        data=request.data
        q=Question.objects.create(
            statement=str(data.get("statement") or "").strip(),question_type=data.get("questionType") or "certo_errado",
            options_json=list(data.get("options") or []),answer_json=data.get("answer"),explanation=str(data.get("explanation") or ""),
            difficulty=data.get("difficulty") or "intermediate",source=str(data.get("source") or "")[:240],
            banca=str(data.get("banca") or "")[:120],year=data.get("year"),requires_review=bool(data.get("requiresReview",False)),
            status=data.get("status") or "draft",created_by=request.user,updated_by=request.user)
        for cid in data.get("contentIds") or []:QuestionContentLink.objects.get_or_create(question=q,content_id=cid,defaults={"linked_by":request.user})
        return Response(full_question_json(q),status=201)

class AdminQuestionDetailView(APIView):
    permission_classes=[permissions.IsAdminUser]
    @transaction.atomic
    def put(self,request,question_id):
        q=Question.objects.select_for_update().filter(pk=question_id).first()
        if not q:return Response({"detail":"Questão não encontrada."},status=404)
        data=request.data
        fields={"statement":"statement","questionType":"question_type","options":"options_json","answer":"answer_json","explanation":"explanation",
            "difficulty":"difficulty","source":"source","banca":"banca","year":"year","requiresReview":"requires_review","status":"status"}
        changes=[]
        for src,dst in fields.items():
            if src in data:
                old=getattr(q,dst);new=data[src]
                if old!=new:changes.append((src,old,new));setattr(q,dst,new)
        q.updated_by=request.user;q.save()
        for field,old,new in changes:
            QuestionChangelog.objects.create(question=q,actor=request.user,changed_field=field,old_value=str(old) if old is not None else None,new_value=str(new) if new is not None else None)
        if "contentIds" in data:
            QuestionContentLink.objects.filter(question=q).delete()
            for cid in data.get("contentIds") or []:QuestionContentLink.objects.create(question=q,content_id=cid,linked_by=request.user)
        return Response(full_question_json(q))

    def delete(self,request,question_id):
        q=Question.objects.filter(pk=question_id).first()
        if not q:return Response({"detail":"Questão não encontrada."},status=404)
        try:q.delete()
        except IntegrityError:return Response({"detail":"A questão possui histórico de simulado/competição e não pode ser excluída; marque-a como inativa."},status=409)
        return Response({"success":True})

class QuestionChangelogView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request,question_id):
        qs=QuestionChangelog.objects.filter(question_id=question_id).order_by("-created_at")[:200]
        return Response([{"id":x.id,"actorUserId":x.actor_id,"changedField":x.changed_field,"oldValue":x.old_value,"newValue":x.new_value,"createdAt":x.created_at} for x in qs])

class AdminReviewSubmitView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def post(self,request):
        try:review=submit_for_review(str(request.data.get("itemType")),int(request.data.get("itemId")),request.user)
        except (ValueError,Question.DoesNotExist,Content.DoesNotExist) as exc:return Response({"detail":str(exc)},status=400)
        return Response({"id":review.id,"status":review.status},status=201)

class AdminReviewQueueView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):
        qs=ReviewQueue.objects.all().order_by("-created_at")
        if request.query_params.get("itemType"):qs=qs.filter(item_type=request.query_params["itemType"])
        if request.query_params.get("status"):qs=qs.filter(status=request.query_params["status"])
        rows=list(qs[:300])
        return Response([{"id":r.id,"itemType":r.item_type,"itemId":r.item_id,"status":r.status,
            "submittedByUserId":r.submitted_by_id,"reviewedByUserId":r.reviewed_by_id,"notes":r.notes,"createdAt":r.created_at} for r in rows])

class AdminReviewPendingCountView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):return Response({"count":ReviewQueue.objects.filter(status="pending").count()})

class AdminReviewDecisionView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def post(self,request,review_id):
        decision=str(request.data.get("decision") or "")
        notes=str(request.data.get("notes") or "").strip()
        if decision!="approved" and len(notes)<5:return Response({"detail":"Explique a rejeição ou correção em ao menos 5 caracteres."},status=400)
        try:review=decide_review(review_id,request.user,decision,notes)
        except (ValueError,ReviewQueue.DoesNotExist,Question.DoesNotExist,Content.DoesNotExist) as exc:return Response({"detail":str(exc)},status=400)
        return Response({"id":review.id,"status":review.status})


class CourseStudyBundleView(APIView):
    """Pacote protegido de estudo. Só retorna conteúdo para matrícula ativa."""
    def get(self,request,course_id):
        if not has_active_enrollment(request.user,course_id):
            return Response({"detail":"Matrícula vigente necessária."},status=403)
        from courses.models import CourseContent
        rows=CourseContent.objects.filter(course_id=course_id,is_published=True).order_by("order","id")
        modules=[]
        chapters={}
        for row in rows:
            payload=row.body_json or {}
            module=payload.get("module")
            chapter=payload.get("chapter")
            if module:
                modules.append(module)
            if chapter:
                chapters[row.module_id]=chapter
        questions=Question.objects.filter(
            content_links__content__discipline_links__discipline__course_links__course_id=course_id
        ).distinct().order_by("id")
        return Response({
            "courseId":course_id,
            "modules":modules,
            "chapters":chapters,
            "questions":[full_question_json(q) for q in questions if can_use_question(q)],
        })
