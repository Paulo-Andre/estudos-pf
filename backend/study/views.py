from datetime import time
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView
from courses.models import Course
from courses.permissions import HasContestAccess,HasStudyAccess
from knowledge.models import Content,Discipline,Question
from knowledge.services import can_use_question,question_payload
from .advanced_services import (
    course_progress,daily_quick_check,dismiss_daily_quick_check,mark_content_opened,
    mark_review_mastered,queue_review,remove_review_item,remove_roadmap_item,
    resume_content,roadmap_items,save_roadmap_item,
)
from .models import StudyNote,StudyReviewItem,StudyRoadmapItem
from .services import answer,complete,simulation_detail,state,submit_simulation

class StateView(APIView):
    permission_classes=[HasStudyAccess]
    def get(self,request):return Response(state(request.user))

class AnswerView(APIView):
    permission_classes=[HasStudyAccess]
    def post(self,request):return Response(answer(request.user,str(request.data.get("questionId") or "")[:80],bool(request.data.get("correct"))))

class CompleteView(APIView):
    permission_classes=[HasStudyAccess]
    def post(self,request):return Response(complete(request.user,str(request.data.get("moduleId") or "")[:80]))

class NoteView(APIView):
    permission_classes=[HasStudyAccess]
    def get(self,request,module_id):
        n=StudyNote.objects.filter(user=request.user,module_id=module_id).first()
        return Response(None if not n else {"moduleId":n.module_id,"content":n.content})
    def put(self,request,module_id):
        n,_=StudyNote.objects.update_or_create(user=request.user,module_id=module_id,defaults={"content":str(request.data.get("content") or "")[:12000]})
        return Response({"moduleId":n.module_id,"content":n.content})

class DailyQuickCheckView(APIView):
    def get(self,request,course_id):
        course=get_object_or_404(Course,pk=course_id)
        try:q=daily_quick_check(request.user,course)
        except PermissionError as exc:return Response({"detail":str(exc)},status=403)
        return Response(q)
    def delete(self,request,course_id):
        course=get_object_or_404(Course,pk=course_id)
        try:dismiss_daily_quick_check(request.user,course)
        except PermissionError as exc:return Response({"detail":str(exc)},status=403)
        return Response({"success":True})

class StudyQuestionsView(APIView):
    permission_classes=[HasStudyAccess]
    def get(self,request):
        qs=Question.objects.all().order_by("id")
        return Response([question_payload(q) for q in qs if can_use_question(q)])

class ReviewItemsView(APIView):
    permission_classes=[HasContestAccess]
    def get(self,request):
        qs=StudyReviewItem.objects.filter(user=request.user).order_by("status","-created_at")
        return Response([{"id":x.id,"questionKey":x.question_key,"snapshot":x.snapshot_json,"status":x.status,"reviewedAt":x.reviewed_at} for x in qs])
    def post(self,request):
        item=queue_review(request.user,str(request.data.get("questionKey") or "")[:80],dict(request.data.get("snapshot") or {}))
        return Response({"id":item.id,"status":item.status},status=201)

class ReviewMasteredView(APIView):
    permission_classes=[HasContestAccess]
    def post(self,request,item_id):
        try:item=mark_review_mastered(request.user,item_id)
        except StudyReviewItem.DoesNotExist:return Response({"detail":"Item não encontrado."},status=404)
        return Response({"id":item.id,"status":item.status})

class ReviewDeleteView(APIView):
    permission_classes=[HasContestAccess]
    def delete(self,request,item_id):
        try:remove_review_item(request.user,item_id)
        except StudyReviewItem.DoesNotExist:return Response({"detail":"Item não encontrado."},status=404)
        return Response({"success":True})

def progress_json(p):
    return {"contentId":p.content_id,"status":p.status,"lastOpenedAt":p.last_opened_at,"completedAt":p.completed_at}

class CourseProgressView(APIView):
    def get(self,request,course_id):
        course=get_object_or_404(Course,pk=course_id)
        try:rows=course_progress(request.user,course)
        except PermissionError as exc:return Response({"detail":str(exc)},status=403)
        return Response([progress_json(p) for p in rows])

class ContentProgressView(APIView):
    def post(self,request,course_id,content_id):
        course=get_object_or_404(Course,pk=course_id)
        content=get_object_or_404(Content,pk=content_id)
        try:p=mark_content_opened(request.user,course,content,bool(request.data.get("completed",False)))
        except PermissionError as exc:return Response({"detail":str(exc)},status=403)
        return Response(progress_json(p))

class ResumeView(APIView):
    def get(self,request,course_id):
        course=get_object_or_404(Course,pk=course_id)
        try:p=resume_content(request.user,course)
        except PermissionError as exc:return Response({"detail":str(exc)},status=403)
        return Response(None if not p else {"contentId":p.content_id,"title":p.content.title,"status":p.status,"lastOpenedAt":p.last_opened_at})

class RoadmapView(APIView):
    def get(self,request):
        course=get_object_or_404(Course,pk=request.query_params.get("courseId"))
        try:qs=roadmap_items(request.user,course)
        except PermissionError as exc:return Response({"detail":str(exc)},status=403)
        return Response([{"id":x.id,"courseId":x.course_id,"contentId":x.content_id,"disciplineId":x.discipline_id,"weekday":x.weekday,"startTime":x.start_time.strftime("%H:%M"),"title":x.content.title,"isActive":x.is_active} for x in qs])
    def post(self,request):
        course=get_object_or_404(Course,pk=request.data.get("courseId"))
        content=get_object_or_404(Content,pk=request.data.get("contentId"))
        discipline=get_object_or_404(Discipline,pk=request.data.get("disciplineId")) if request.data.get("disciplineId") else None
        try:
            raw=str(request.data.get("startTime") or "08:00")
            hour,minute=[int(x) for x in raw.split(":",1)]
            weekday=int(request.data.get("weekday",0))
            if weekday<0 or weekday>6 or hour<0 or hour>23 or minute<0 or minute>59:raise ValueError("Horário ou dia da semana inválido.")
            item=save_roadmap_item(request.user,course,content,discipline,weekday,time(hour,minute),bool(request.data.get("isActive",True)))
        except PermissionError as exc:return Response({"detail":str(exc)},status=403)
        except (ValueError,TypeError) as exc:return Response({"detail":str(exc)},status=400)
        return Response({"id":item.id},status=201)

class RoadmapDeleteView(APIView):
    def delete(self,request,item_id):
        try:remove_roadmap_item(request.user,item_id)
        except StudyRoadmapItem.DoesNotExist:return Response({"detail":"Item não encontrado."},status=404)
        return Response({"success":True})

class SubmitSimulationView(APIView):
    permission_classes=[HasContestAccess]
    def post(self,request):
        try:return Response(submit_simulation(request.user,request.data))
        except ValueError as exc:return Response({"detail":str(exc)},status=400)

class SimulationDetailView(APIView):
    permission_classes=[HasContestAccess]
    def get(self,request,simulation_id):
        result=simulation_detail(request.user,simulation_id)
        return Response(result) if result else Response({"detail":"Simulado não encontrado."},status=404)
