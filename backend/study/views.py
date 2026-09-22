from datetime import date
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView
from courses.models import Course
from courses.permissions import HasContestAccess,HasStudyAccess
from knowledge.models import Content,Discipline,Question
from knowledge.services import can_use_question,question_payload
from .advanced_services import course_progress_payload,daily_quick_check,dismiss_daily_quick_check,mark_content_opened,mark_review_mastered,queue_review,rate_review,remove_review_item,remove_roadmap_item,resume_content,roadmap_payload,save_roadmap_item
from .models import SimulationRecord,SimulationReflection,StudyBookmark,StudyNote,StudyReviewItem,StudyRoadmapItem
from .learning_services import learning_plan,queue_question_error
from .services import answer,complete,simulation_detail,state,submit_simulation

class StateView(APIView):
    permission_classes=[HasStudyAccess]
    def get(self,request):return Response(state(request.user))
class AnswerView(APIView):
    permission_classes=[HasStudyAccess]
    def post(self,request):
        qid=str(request.data.get("questionId") or "")[:80]
        correct=bool(request.data.get("correct"))
        raw_confidence=request.data.get("confidence")
        confidence=None
        if raw_confidence not in (None,""):
            try:confidence=int(raw_confidence)
            except (TypeError,ValueError):return Response({"detail":"Confiança deve ser 1, 2 ou 3."},status=400)
            if confidence not in (1,2,3):return Response({"detail":"Confiança deve ser 1, 2 ou 3."},status=400)
        payload=answer(request.user,qid,correct,confidence)
        if not correct:queue_question_error(request.user,qid,source="answer_error")
        return Response(payload)
class CompleteView(APIView):
    permission_classes=[HasStudyAccess]
    def post(self,request):return Response(complete(request.user,str(request.data.get("moduleId") or "")[:80]))
class NoteView(APIView):
    permission_classes=[HasStudyAccess]
    def get(self,request,module_id):
        n=StudyNote.objects.filter(user=request.user,module_id=module_id).first();return Response(None if not n else {"moduleId":n.module_id,"content":n.content})
    def put(self,request,module_id):
        n,_=StudyNote.objects.update_or_create(user=request.user,module_id=module_id,defaults={"content":str(request.data.get("content") or "")[:12000]})
        return Response({"moduleId":n.module_id,"content":n.content})
class DailyQuickCheckView(APIView):
    def get(self,request,course_id):
        course=get_object_or_404(Course,pk=course_id)
        try:q=daily_quick_check(request.user,course)
        except PermissionError as exc:return Response({"detail":str(exc)},status=403)
        profile=request.user.study_profile
        return Response({"date":date.today().isoformat(),"dismissed":bool(profile.daily_quick_check_dismissed),"question":q})
    def delete(self,request,course_id):
        course=get_object_or_404(Course,pk=course_id)
        try:dismiss_daily_quick_check(request.user,course)
        except PermissionError as exc:return Response({"detail":str(exc)},status=403)
        return Response({"success":True})
class StudyQuestionsView(APIView):
    permission_classes=[HasStudyAccess]
    def get(self,request):
        questions=[]
        for q in Question.objects.all().order_by("id"):
            if not can_use_question(q):continue
            payload=question_payload(q)
            links=q.content_links.select_related("content").prefetch_related("content__discipline_links__discipline")
            contents=[link.content for link in links]
            disciplines=[]
            for content in contents:
                for dlink in content.discipline_links.all():
                    if dlink.discipline.name not in disciplines:disciplines.append(dlink.discipline.name)
            payload.update({"discipline":disciplines[0] if disciplines else "Biblioteca central","subject":" · ".join(c.title for c in contents) or "Conteúdo geral","contentIds":[c.id for c in contents]})
            questions.append(payload)
        return Response({"requiresReviewMode":False,"questions":questions})
class ReviewItemsView(APIView):
    permission_classes=[HasContestAccess]
    def get(self,request):
        qs=StudyReviewItem.objects.filter(user=request.user,status=request.query_params.get("status") or "pending")
        if str(request.query_params.get("dueOnly") or "").lower() in {"1","true","yes"}:
            from django.db.models import Q
            qs=qs.filter(Q(due_at__isnull=True)|Q(due_at__lte=timezone.now()))
        qs=qs.order_by("due_at","created_at")
        return Response([{"id":x.id,"questionKey":x.question_key,"snapshot":x.snapshot_json,"status":x.status,"createdAt":x.created_at,"reviewedAt":x.reviewed_at,
            "source":x.source,"dueAt":x.due_at,"intervalDays":x.interval_days,"repetitions":x.repetitions,"lapseCount":x.lapse_count,"lastRating":x.last_rating} for x in qs])
    def post(self,request):
        item=queue_review(request.user,str(request.data.get("questionKey") or "")[:80],dict(request.data.get("snapshot") or {}),source=str(request.data.get("source") or "manual")[:24]);return Response({"id":item.id,"status":item.status,"dueAt":item.due_at},status=201)
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
class CourseProgressView(APIView):
    def get(self,request,course_id):
        course=get_object_or_404(Course,pk=course_id)
        try:return Response(course_progress_payload(request.user,course))
        except PermissionError as exc:return Response({"detail":str(exc)},status=403)
class ContentProgressView(APIView):
    def post(self,request,course_id,content_id):
        course=get_object_or_404(Course,pk=course_id);content=get_object_or_404(Content,pk=content_id)
        try:mark_content_opened(request.user,course,content,bool(request.data.get("completed",False)));return Response(course_progress_payload(request.user,course))
        except PermissionError as exc:return Response({"detail":str(exc)},status=403)
        except ValueError as exc:return Response({"detail":str(exc)},status=400)
class ResumeView(APIView):
    def get(self,request,course_id):
        course=get_object_or_404(Course,pk=course_id)
        try:p=resume_content(request.user,course)
        except PermissionError as exc:return Response({"detail":str(exc)},status=403)
        return Response(None if not p else {"contentId":p.content_id,"title":p.content.title,"status":p.status,"lastOpenedAt":p.last_opened_at})
class RoadmapView(APIView):
    def get(self,request):
        course=get_object_or_404(Course,pk=request.query_params.get("courseId"))
        try:return Response(roadmap_payload(request.user,course))
        except PermissionError as exc:return Response({"detail":str(exc)},status=403)
    def post(self,request):
        course=get_object_or_404(Course,pk=request.data.get("courseId"));discipline=get_object_or_404(Discipline,pk=request.data.get("disciplineId"))
        try:
            weekday=int(request.data.get("weekday",0))
            if weekday<0 or weekday>6:raise ValueError("Dia da semana inválido.")
            return Response(save_roadmap_item(request.user,course,discipline,weekday,bool(request.data.get("isActive",True))),status=201)
        except PermissionError as exc:return Response({"detail":str(exc)},status=403)
        except (ValueError,TypeError) as exc:return Response({"detail":str(exc)},status=400)
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
        result=simulation_detail(request.user,simulation_id);return Response(result) if result else Response({"detail":"Simulado não encontrado."},status=404)


class BookmarkListView(APIView):
    permission_classes=[HasStudyAccess]
    def get(self,request):
        qs=StudyBookmark.objects.filter(user=request.user).select_related("course","content").order_by("-created_at")
        return Response([{"id":x.id,"courseId":x.course_id,"contentId":x.content_id,"title":x.content.title,
            "note":x.note,"createdAt":x.created_at} for x in qs])
    def post(self,request):
        course=get_object_or_404(Course,pk=request.data.get("courseId"))
        content=get_object_or_404(Content,pk=request.data.get("contentId"))
        try:course_progress_payload(request.user,course)
        except PermissionError as exc:return Response({"detail":str(exc)},status=403)
        if not content.discipline_links.filter(discipline__course_links__course=course).exists():
            return Response({"detail":"Este conteúdo não pertence ao curso informado."},status=400)
        item,_=StudyBookmark.objects.update_or_create(user=request.user,course=course,content=content,
            defaults={"note":str(request.data.get("note") or "")[:240]})
        return Response({"id":item.id,"courseId":course.id,"contentId":content.id,"title":content.title,"note":item.note,"createdAt":item.created_at},status=201)

class BookmarkDetailView(APIView):
    permission_classes=[HasStudyAccess]
    def delete(self,request,item_id):
        deleted,_=StudyBookmark.objects.filter(pk=item_id,user=request.user).delete()
        if not deleted:return Response({"detail":"Favorito não encontrado."},status=404)
        return Response({"success":True})

class WeeklyGoalView(APIView):
    permission_classes=[HasStudyAccess]
    def get(self,request):
        from datetime import timedelta
        from accounts.models import AccountPreferences
        from .models import StudyAnswer,StudyProfile
        today=date.today();start=today-timedelta(days=today.weekday())
        p,_=AccountPreferences.objects.get_or_create(user=request.user)
        answered=StudyAnswer.objects.filter(user=request.user,answered_at__date__gte=start).count()
        profile=StudyProfile.objects.filter(user=request.user).first()
        days=len({d for d in (profile.study_dates if profile else []) if str(d)>=start.isoformat()})
        return Response({"weekStart":start.isoformat(),"questions":{"target":p.weekly_goal_questions,"current":answered},
            "days":{"target":p.weekly_goal_days,"current":days},"examDate":p.exam_date})


class ReviewRateView(APIView):
    permission_classes=[HasContestAccess]
    def post(self,request,item_id):
        try:item=rate_review(request.user,item_id,str(request.data.get("rating") or ""))
        except StudyReviewItem.DoesNotExist:return Response({"detail":"Item não encontrado."},status=404)
        except ValueError as exc:return Response({"detail":str(exc)},status=400)
        return Response({"id":item.id,"status":item.status,"dueAt":item.due_at,"intervalDays":item.interval_days,
            "repetitions":item.repetitions,"lastRating":item.last_rating})

class LearningPlanView(APIView):
    permission_classes=[HasStudyAccess]
    def get(self,request):
        course=get_object_or_404(Course,pk=request.query_params.get("courseId"))
        try:return Response(learning_plan(request.user,course))
        except PermissionError as exc:return Response({"detail":str(exc)},status=403)


class SimulationReflectionView(APIView):
    permission_classes=[HasContestAccess]
    def get(self,request,simulation_id):
        simulation=SimulationRecord.objects.filter(pk=simulation_id,user=request.user).first()
        if not simulation:return Response({"detail":"Simulado não encontrado."},status=404)
        reflection=SimulationReflection.objects.filter(simulation=simulation).first()
        if not reflection:return Response(None)
        return Response({"confidence":reflection.confidence,"primaryCause":reflection.primary_cause,
            "nextAction":reflection.next_action,"note":reflection.note,"updatedAt":reflection.updated_at})
    def put(self,request,simulation_id):
        simulation=SimulationRecord.objects.filter(pk=simulation_id,user=request.user).first()
        if not simulation:return Response({"detail":"Simulado não encontrado."},status=404)
        try:confidence=int(request.data.get("confidence"))
        except (TypeError,ValueError):return Response({"detail":"Confiança deve estar entre 1 e 5."},status=400)
        cause=str(request.data.get("primaryCause") or "")
        next_action=str(request.data.get("nextAction") or "")
        if confidence<1 or confidence>5:return Response({"detail":"Confiança deve estar entre 1 e 5."},status=400)
        if cause not in SimulationReflection.Cause.values:return Response({"detail":"Causa de erro inválida."},status=400)
        if next_action not in SimulationReflection.NextAction.values:return Response({"detail":"Próxima ação inválida."},status=400)
        reflection,_=SimulationReflection.objects.update_or_create(simulation=simulation,defaults={
            "confidence":confidence,"primary_cause":cause,"next_action":next_action,
            "note":str(request.data.get("note") or "")[:600],
        })
        return Response({"confidence":reflection.confidence,"primaryCause":reflection.primary_cause,
            "nextAction":reflection.next_action,"note":reflection.note,"updatedAt":reflection.updated_at})
