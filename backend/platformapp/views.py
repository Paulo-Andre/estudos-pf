import io
import uuid
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image,UnidentifiedImageError
from django.shortcuts import get_object_or_404
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from courses.models import Course
from .models import CompetitionMonthlyGoal,CompetitionSettings,GlobalContactSettings,PlatformAlert,PlatformGeneralSettings
from .services import answer_competition_round,clear_competition_ranking,competition_round_payload,dismiss_alert,monthly_goal_status,my_competition_history,my_competition_score,ranking,start_competition_round,visible_alerts

def alert_json(a):
    return {"id":a.id,"level":a.level,"title":a.title,"categoryLabel":a.category_label,"message":a.message,"audience":a.audience,
        "courseId":a.course_id,"isActive":a.is_active,"createdAt":a.created_at}

def settings_json():
    contact,_=GlobalContactSettings.objects.get_or_create(pk=1)
    general,_=PlatformGeneralSettings.objects.get_or_create(pk=1)
    return {"contact":{"email":contact.email,"telegramUrl":contact.telegram_url},"general":general.payload}

class AlertListView(APIView):
    def get(self,request):return Response([alert_json(a) for a in visible_alerts(request.user)])

class AlertDismissView(APIView):
    def post(self,request,alert_id):
        try:dismiss_alert(request.user,alert_id)
        except PlatformAlert.DoesNotExist:return Response({"detail":"Comunicado não encontrado."},status=404)
        return Response({"alertId":alert_id})

class AdminAlertsView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):return Response([alert_json(a) for a in PlatformAlert.objects.all().order_by("-created_at")[:200]])
    def post(self,request):
        course=None
        if request.data.get("courseId"):course=get_object_or_404(Course,pk=request.data["courseId"])
        audience=request.data.get("audience") or "all"
        if audience=="course" and not course:return Response({"detail":"Selecione o curso que receberá este alerta."},status=400)
        alert=PlatformAlert.objects.create(
            level=request.data.get("level") or "improvement",title=str(request.data.get("title") or "Comunicado da plataforma")[:180],
            category_label=str(request.data.get("categoryLabel") or "")[:80],message=str(request.data.get("message") or ""),
            audience=audience,course=course,is_active=bool(request.data.get("isActive",True)),created_by=request.user)
        return Response(alert_json(alert),status=201)

class AdminAlertDetailView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def post(self,request,alert_id):
        alert=PlatformAlert.objects.filter(pk=alert_id).first()
        if not alert:return Response({"detail":"Comunicado não encontrado."},status=404)
        alert.is_active=bool(request.data.get("isActive"));alert.save(update_fields=["is_active","updated_at"])
        return Response(alert_json(alert))

class PublicSettingsView(APIView):
    permission_classes=[permissions.AllowAny];authentication_classes=[]
    def get(self,request):return Response(settings_json())

class AdminSettingsView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):return Response(settings_json())
    def put(self,request):
        contact,_=GlobalContactSettings.objects.get_or_create(pk=1)
        general,_=PlatformGeneralSettings.objects.get_or_create(pk=1)
        if "contact" in request.data:
            c=request.data["contact"] or {}
            contact.email=str(c.get("email") or "");contact.telegram_url=str(c.get("telegramUrl") or "");contact.updated_by=request.user;contact.save()
        if "general" in request.data:
            general.payload=dict(request.data["general"] or {});general.updated_by=request.user;general.save()
        return Response(settings_json())

class AdminImageUploadView(APIView):
    permission_classes=[permissions.IsAdminUser]
    MAX_BYTES=4*1024*1024
    ALLOWED={"image/jpeg":".jpg","image/png":".png","image/webp":".webp"}
    def post(self,request):
        uploaded=request.FILES.get("file")
        if not uploaded:return Response({"detail":"Arquivo não enviado."},status=400)
        if uploaded.size>self.MAX_BYTES:return Response({"detail":"A imagem deve ter no máximo 4 MB."},status=400)
        content_type=(uploaded.content_type or "").lower()
        if content_type not in self.ALLOWED:return Response({"detail":"Use uma imagem JPEG, PNG ou WebP."},status=400)
        raw=uploaded.read()
        try:image=Image.open(io.BytesIO(raw));image.verify()
        except (UnidentifiedImageError,OSError):return Response({"detail":"Arquivo de imagem inválido."},status=400)
        key="uploads/%s/%s%s"%(request.user.id,uuid.uuid4().hex,self.ALLOWED[content_type])
        saved=default_storage.save(key,ContentFile(raw))
        return Response({"key":saved,"url":request.build_absolute_uri(default_storage.url(saved))},status=201)

class CompetitionSettingsView(APIView):
    def get(self,request):
        s,_=CompetitionSettings.objects.get_or_create(pk=1)
        return Response({"pointsPerCorrect":s.points_per_correct,"pointsPerWrong":s.points_per_wrong,"questionsPerRound":s.questions_per_round,"isActive":s.is_active})

class CompetitionCoursesView(APIView):
    def get(self,request):
        qs=Course.objects.filter(course_type="concurso",is_active=True)
        return Response([{"id":c.id,"title":c.title,"track":c.track} for c in qs])

class CompetitionStartView(APIView):
    def post(self,request):
        course=get_object_or_404(Course,pk=request.data.get("courseId")) if request.data.get("courseId") else None
        try:r=start_competition_round(request.user,course)
        except PermissionError as exc:return Response({"detail":str(exc)},status=403)
        except ValueError as exc:return Response({"detail":str(exc)},status=400)
        return Response({"id":r.id,"courseId":r.course_id,"questionIds":r.question_ids},status=201)

class CompetitionRoundView(APIView):
    def get(self,request,round_id):
        payload=competition_round_payload(request.user,round_id)
        return Response(payload) if payload else Response({"detail":"Rodada não encontrada."},status=404)

class CompetitionAnswerView(APIView):
    def post(self,request,round_id):
        try:a=answer_competition_round(request.user,round_id,int(request.data.get("questionId")),request.data.get("submittedAnswer",request.data.get("answer")))
        except Exception as exc:return Response({"detail":str(exc)},status=400)
        return Response({"correct":a.correct,"pointsEarned":a.points_earned})

class CompetitionRankingView(APIView):
    def get(self,request):
        rows=ranking(request.query_params.get("courseId"))
        return Response([{"userId":r["user_id"],"username":r["user__username"],"name":r["user__first_name"],"points":r["points"]} for r in rows])

class CompetitionMyScoreView(APIView):
    def get(self,request):return Response(my_competition_score(request.user,request.query_params.get("courseId")))

class CompetitionHistoryView(APIView):
    def get(self,request):return Response(my_competition_history(request.user,request.query_params.get("courseId")))

class CompetitionMonthlyGoalView(APIView):
    def get(self,request):return Response(monthly_goal_status(request.user,request.query_params.get("courseId")))

class AdminCompetitionSettingsView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):
        s,_=CompetitionSettings.objects.get_or_create(pk=1);g,_=CompetitionMonthlyGoal.objects.get_or_create(pk=1)
        return Response({"pointsPerCorrect":s.points_per_correct,"pointsPerWrong":s.points_per_wrong,"questionsPerRound":s.questions_per_round,"isActive":s.is_active,
            "monthlyGoal":{"targetPoints":g.target_points,"targetCompletedRounds":g.target_completed_rounds,"rewardTitle":g.reward_title,"rewardDescription":g.reward_description,"isActive":g.is_active}})

class AdminCompetitionSaveView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def put(self,request):
        s,_=CompetitionSettings.objects.get_or_create(pk=1)
        for src,dst in {"pointsPerCorrect":"points_per_correct","pointsPerWrong":"points_per_wrong","questionsPerRound":"questions_per_round","isActive":"is_active"}.items():
            if src in request.data:setattr(s,dst,request.data[src])
        s.updated_by=request.user;s.save()
        goal_data=request.data.get("monthlyGoal")
        if isinstance(goal_data,dict):
            g,_=CompetitionMonthlyGoal.objects.get_or_create(pk=1)
            for src,dst in {"targetPoints":"target_points","targetCompletedRounds":"target_completed_rounds","rewardTitle":"reward_title","rewardDescription":"reward_description","isActive":"is_active"}.items():
                if src in goal_data:setattr(g,dst,goal_data[src])
            g.updated_by=request.user;g.save()
        return Response({"success":True})

class AdminCompetitionClearView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def post(self,request):
        if str(request.data.get("confirmation") or "")!="LIMPAR RANKING":return Response({"detail":"Confirmação inválida."},status=400)
        count=clear_competition_ranking(request.user,request.data.get("courseId") or None)
        return Response({"success":True,"deletedRounds":count})
