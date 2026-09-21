import io
import uuid
from pathlib import Path
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image,UnidentifiedImageError
from django.shortcuts import get_object_or_404
from rest_framework import permissions,status
from rest_framework.response import Response
from rest_framework.views import APIView
from courses.models import Course
from .models import CompetitionMonthlyGoal,CompetitionSettings,GlobalContactSettings,PlatformAlert,PlatformGeneralSettings
from .services import answer_competition_round,dismiss_alert,ranking,start_competition_round,visible_alerts

def alert_json(a):
    return {"id":a.id,"level":a.level,"title":a.title,"categoryLabel":a.category_label,"message":a.message,"audience":a.audience,"courseId":a.course_id,"createdAt":a.created_at}

class AlertListView(APIView):
    def get(self,request):
        return Response([alert_json(a) for a in visible_alerts(request.user)])

class AlertDismissView(APIView):
    def post(self,request,alert_id):
        try:dismiss_alert(request.user,alert_id)
        except PlatformAlert.DoesNotExist:return Response({"detail":"Comunicado não encontrado."},status=404)
        return Response({"success":True})

class AdminAlertsView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):
        return Response([alert_json(a) for a in PlatformAlert.objects.all().order_by("-created_at")[:200]])
    def post(self,request):
        course=None
        if request.data.get("courseId"):
            course=get_object_or_404(Course,pk=request.data["courseId"])
        alert=PlatformAlert.objects.create(
            level=request.data.get("level") or "improvement",title=str(request.data.get("title") or "Comunicado da plataforma")[:180],
            category_label=str(request.data.get("categoryLabel") or "")[:80],message=str(request.data.get("message") or ""),
            audience=request.data.get("audience") or "all",course=course,is_active=bool(request.data.get("isActive",True)),created_by=request.user)
        return Response(alert_json(alert),status=201)

class PublicSettingsView(APIView):
    permission_classes=[permissions.AllowAny]
    authentication_classes=[]
    def get(self,request):
        contact,_=GlobalContactSettings.objects.get_or_create(pk=1)
        general,_=PlatformGeneralSettings.objects.get_or_create(pk=1)
        return Response({"contact":{"email":contact.email,"telegramUrl":contact.telegram_url},"general":general.payload})

class AdminSettingsView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def put(self,request):
        contact,_=GlobalContactSettings.objects.get_or_create(pk=1)
        general,_=PlatformGeneralSettings.objects.get_or_create(pk=1)
        if "contact" in request.data:
            c=request.data["contact"] or {}
            contact.email=str(c.get("email") or "")
            contact.telegram_url=str(c.get("telegramUrl") or "")
            contact.updated_by=request.user
            contact.save()
        if "general" in request.data:
            general.payload=dict(request.data["general"] or {})
            general.updated_by=request.user
            general.save()
        return Response({"success":True})

class CompetitionStartView(APIView):
    def post(self,request):
        course=get_object_or_404(Course,pk=request.data.get("courseId")) if request.data.get("courseId") else None
        try:r=start_competition_round(request.user,course)
        except PermissionError as exc:return Response({"detail":str(exc)},status=403)
        except ValueError as exc:return Response({"detail":str(exc)},status=400)
        return Response({"id":r.id,"courseId":r.course_id,"questionIds":r.question_ids},status=201)

class CompetitionAnswerView(APIView):
    def post(self,request,round_id):
        try:a=answer_competition_round(request.user,round_id,int(request.data.get("questionId")),request.data.get("answer"))
        except Exception as exc:return Response({"detail":str(exc)},status=400)
        return Response({"correct":a.correct,"pointsEarned":a.points_earned})

class CompetitionRankingView(APIView):
    def get(self,request):
        rows=ranking(request.query_params.get("courseId"))
        return Response([{"userId":r["user_id"],"username":r["user__username"],"name":r["user__first_name"],"points":r["points"]} for r in rows])

class AdminCompetitionSettingsView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):
        s,_=CompetitionSettings.objects.get_or_create(pk=1)
        g,_=CompetitionMonthlyGoal.objects.get_or_create(pk=1)
        return Response({"pointsPerCorrect":s.points_per_correct,"pointsPerWrong":s.points_per_wrong,"questionsPerRound":s.questions_per_round,"isActive":s.is_active,
            "monthlyGoal":{"targetPoints":g.target_points,"targetCompletedRounds":g.target_completed_rounds,"rewardTitle":g.reward_title,"rewardDescription":g.reward_description,"isActive":g.is_active}})


class AdminImageUploadView(APIView):
    permission_classes=[permissions.IsAdminUser]
    MAX_BYTES=4*1024*1024
    ALLOWED={"image/jpeg":".jpg","image/png":".png","image/webp":".webp"}

    def post(self,request):
        uploaded=request.FILES.get("file")
        if not uploaded:
            return Response({"detail":"Arquivo não enviado."},status=400)
        if uploaded.size>self.MAX_BYTES:
            return Response({"detail":"A imagem deve ter no máximo 4 MB."},status=400)
        content_type=(uploaded.content_type or "").lower()
        if content_type not in self.ALLOWED:
            return Response({"detail":"Use uma imagem JPEG, PNG ou WebP."},status=400)
        raw=uploaded.read()
        try:
            image=Image.open(io.BytesIO(raw))
            image.verify()
        except (UnidentifiedImageError,OSError):
            return Response({"detail":"Arquivo de imagem inválido."},status=400)
        key="uploads/%s/%s%s"%(request.user.id,uuid.uuid4().hex,self.ALLOWED[content_type])
        saved=default_storage.save(key,ContentFile(raw))
        return Response({"key":saved,"url":request.build_absolute_uri(default_storage.url(saved))},status=201)
