from django.db.models import Q
from rest_framework import permissions,status
from rest_framework.response import Response
from rest_framework.views import APIView
from courses.permissions import has_active_enrollment
from .models import Content,CourseDiscipline,Discipline,DisciplineContent,Question,QuestionContentLink,ReviewQueue
from .services import can_use_question,decide_review,question_payload,submit_for_review

class CourseLibraryView(APIView):
    def get(self,request,course_id):
        if not has_active_enrollment(request.user,course_id):
            return Response({"detail":"Matrícula vigente necessária."},status=403)
        disciplines=Discipline.objects.filter(course_links__course_id=course_id,status__in=["approved","published"]).distinct()
        data=[]
        for d in disciplines:
            contents=Content.objects.filter(discipline_links__discipline=d,status__in=["approved","published"]).order_by("title")
            data.append({"id":d.id,"name":d.name,"shortName":d.short_name,"description":d.description,
                "contents":[{"id":c.id,"title":c.title,"objective":c.objective,"description":c.description,"cardText":c.card_text,
                "body":c.body,"coverImageUrl":c.cover_image_url,"videoUrl":c.video_url,"videoLabel":c.video_label,
                "materialUrl":c.material_url,"materialLabel":c.material_label,"noticeKind":c.notice_kind,
                "noticeActivatedAt":c.notice_activated_at} for c in contents]})
        return Response(data)

class EligibleQuestionsView(APIView):
    def get(self,request,course_id):
        if not has_active_enrollment(request.user,course_id):
            return Response({"detail":"Matrícula vigente necessária."},status=403)
        qs=Question.objects.filter(content_links__content__discipline_links__discipline__course_links__course_id=course_id).distinct()
        qs=[q for q in qs if can_use_question(q)]
        return Response([question_payload(q) for q in qs])

class AdminQuestionsView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):
        term=str(request.query_params.get("search") or "").strip()
        qs=Question.objects.all().order_by("-updated_at")
        if term:
            qs=qs.filter(Q(statement__icontains=term)|Q(source__icontains=term)|Q(banca__icontains=term))
        return Response([question_payload(q) for q in qs[:200]])

    def post(self,request):
        data=request.data
        q=Question.objects.create(
            statement=str(data.get("statement") or "").strip(),
            question_type=data.get("questionType") or "certo_errado",
            options_json=data.get("options"),
            answer_json=data.get("answer"),
            explanation=str(data.get("explanation") or ""),
            difficulty=data.get("difficulty") or "intermediate",
            source=str(data.get("source") or ""),
            banca=str(data.get("banca") or ""),
            year=data.get("year"),
            requires_review=bool(data.get("requiresReview",False)),
            created_by=request.user,updated_by=request.user,
        )
        return Response(question_payload(q),status=201)

class AdminReviewSubmitView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def post(self,request):
        try:
            review=submit_for_review(str(request.data.get("itemType")),int(request.data.get("itemId")),request.user)
        except (ValueError,Question.DoesNotExist,Content.DoesNotExist) as exc:
            return Response({"detail":str(exc)},status=400)
        return Response({"id":review.id,"status":review.status},status=201)

class AdminReviewQueueView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):
        qs=ReviewQueue.objects.all().order_by("-created_at")[:200]
        return Response([{"id":r.id,"itemType":r.item_type,"itemId":r.item_id,"status":r.status,
            "submittedByUserId":r.submitted_by_id,"reviewedByUserId":r.reviewed_by_id,
            "notes":r.notes,"createdAt":r.created_at} for r in qs])

class AdminReviewDecisionView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def post(self,request,review_id):
        try:
            review=decide_review(review_id,request.user,str(request.data.get("decision")),str(request.data.get("notes") or ""))
        except (ValueError,ReviewQueue.DoesNotExist,Question.DoesNotExist,Content.DoesNotExist) as exc:
            return Response({"detail":str(exc)},status=400)
        return Response({"id":review.id,"status":review.status})
