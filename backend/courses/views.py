from django.contrib.auth import get_user_model
from django.db import IntegrityError,transaction
from django.utils import timezone
from rest_framework import permissions,status
from rest_framework.response import Response
from rest_framework.views import APIView
from audit.models import AdminAuditLog
from .models import Course,CourseEnrollment,CourseContent
from .permissions import has_active_enrollment

def course_json(c):
    return {"id":c.id,"title":c.title,"track":c.track,"courseType":c.course_type,"courseArea":c.course_area,"stateCode":c.state_code,
        "description":c.description,"coverImageUrl":c.cover_image_url,"panelLabel":c.panel_label,"panelBadge":c.panel_badge,
        "panelTitle":c.panel_title,"panelDescription":c.panel_description,"panelCtaText":c.panel_cta_text,"isActive":c.is_active}

def enrollment_json(e):
    now=timezone.now()
    computed="revoked" if e.status=="revoked" else ("scheduled" if e.start_at>now else ("expired" if e.expires_at<=now else "active"))
    return {"id":e.id,"userId":e.user_id,"courseId":e.course_id,"startAt":e.start_at,"expiresAt":e.expires_at,"status":e.status,
        "computedStatus":computed,"sourceOrderId":e.source_order_id,"sourcePlanId":e.source_plan_id}

class CourseListView(APIView):
    def get(self,request):
        qs=Course.objects.filter(is_active=True)
        if not request.user.is_staff:
            qs=qs.filter(enrollments__user=request.user,enrollments__status="active",enrollments__start_at__lte=timezone.now(),enrollments__expires_at__gt=timezone.now()).distinct()
        return Response([course_json(c) for c in qs.order_by("title")])

class AccessView(APIView):
    def get(self,request):return Response([enrollment_json(e) for e in request.user.course_enrollments.all().order_by("-created_at")])

class ContentView(APIView):
    def get(self,request,course_id):
        if not has_active_enrollment(request.user,course_id):return Response({"detail":"Matrícula vigente necessária."},status=403)
        qs=CourseContent.objects.filter(course_id=course_id,is_published=True)
        return Response([{"id":x.id,"moduleId":x.module_id,"discipline":x.discipline,"title":x.title,"summary":x.summary,"body":x.body_json,"source":x.source} for x in qs])

class AdminCoursesView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):
        return Response([course_json(c) for c in Course.objects.all().order_by("title")])

    def post(self,request):
        data=request.data
        cid=str(data.get("id") or "").strip().lower()
        if not cid:return Response({"detail":"ID do curso é obrigatório."},status=400)
        if Course.objects.filter(pk=cid).exists():return Response({"detail":"Já existe um curso com este ID."},status=409)
        course=Course.objects.create(
            id=cid,title=str(data.get("title") or "").strip()[:180],track=str(data.get("track") or "").strip()[:32],
            course_type=data.get("courseType") or "concurso",course_area=str(data.get("courseArea") or "Policial/Militar")[:80],
            state_code=str(data.get("stateCode") or "Nacional")[:32],description=str(data.get("description") or "")[:1200],
            cover_image_url=str(data.get("coverImageUrl") or "")[:2048],panel_label=str(data.get("panelLabel") or "")[:80],
            panel_badge=str(data.get("panelBadge") or "")[:80],panel_title=str(data.get("panelTitle") or "")[:240],
            panel_description=str(data.get("panelDescription") or "")[:1200],panel_cta_text=str(data.get("panelCtaText") or "")[:80],
            is_active=bool(data.get("isActive",True)),created_by=request.user)
        AdminAuditLog.objects.create(actor=request.user,action="CRIACAO_DE_CURSO",detail="Curso %s criado."%cid)
        return Response(course_json(course),status=201)

class AdminCourseDetailView(APIView):
    permission_classes=[permissions.IsAdminUser]
    @transaction.atomic
    def put(self,request,course_id):
        course=Course.objects.select_for_update().filter(pk=course_id).first()
        if not course:return Response({"detail":"Curso não encontrado."},status=404)
        data=request.data
        mapping={"title":"title","track":"track","courseType":"course_type","courseArea":"course_area","stateCode":"state_code","description":"description",
            "coverImageUrl":"cover_image_url","panelLabel":"panel_label","panelBadge":"panel_badge","panelTitle":"panel_title","panelDescription":"panel_description",
            "panelCtaText":"panel_cta_text","isActive":"is_active"}
        for src,dst in mapping.items():
            if src in data:setattr(course,dst,data[src])
        course.save()
        AdminAuditLog.objects.create(actor=request.user,action="ATUALIZACAO_DE_CURSO",detail="Curso %s atualizado."%course_id)
        return Response(course_json(course))

    @transaction.atomic
    def delete(self,request,course_id):
        confirmation=str(request.data.get("confirmation") or "").strip().lower()
        if confirmation!=course_id.lower():return Response({"detail":"Confirmação do ID do curso inválida."},status=400)
        course=Course.objects.select_for_update().filter(pk=course_id).first()
        if not course:return Response({"detail":"Curso não encontrado."},status=404)
        if CourseEnrollment.objects.filter(course=course).exists():
            return Response({"detail":"O curso possui matrículas e não pode ser excluído. Desative-o para preservar o histórico."},status=409)
        try:course.delete()
        except IntegrityError:return Response({"detail":"O curso possui registros vinculados e não pode ser excluído."},status=409)
        AdminAuditLog.objects.create(actor=request.user,action="EXCLUSAO_DE_CURSO",detail="Curso %s excluído."%course_id)
        return Response({"success":True})

class AdminCourseActiveView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def post(self,request,course_id):
        course=Course.objects.filter(pk=course_id).first()
        if not course:return Response({"detail":"Curso não encontrado."},status=404)
        course.is_active=bool(request.data.get("isActive"));course.save(update_fields=["is_active","updated_at"])
        return Response(course_json(course))

class AdminEnrollmentListView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request,user_id):
        return Response([enrollment_json(e) for e in CourseEnrollment.objects.filter(user_id=user_id).order_by("-created_at")])

class AdminGrantEnrollmentView(APIView):
    permission_classes=[permissions.IsAdminUser]
    @transaction.atomic
    def post(self,request):
        user=get_user_model().objects.filter(pk=request.data.get("userId")).first()
        course=Course.objects.filter(pk=request.data.get("courseId")).first()
        if not user or not course:return Response({"detail":"Usuário ou curso não encontrado."},status=404)
        start=timezone.datetime.fromisoformat(str(request.data.get("startAt")).replace("Z","+00:00"))
        end=timezone.datetime.fromisoformat(str(request.data.get("expiresAt")).replace("Z","+00:00"))
        if timezone.is_naive(start):start=timezone.make_aware(start)
        if timezone.is_naive(end):end=timezone.make_aware(end)
        if end<=start:return Response({"detail":"O vencimento deve ser posterior ao início."},status=400)
        e,_=CourseEnrollment.objects.update_or_create(user=user,course=course,defaults={"start_at":start,"expires_at":end,"status":"active","revoked_at":None,"created_by":request.user})
        AdminAuditLog.objects.create(actor=request.user,affected_user=user,action="LIBERACAO_DE_CURSO",detail="Curso %s liberado."%course.id)
        return Response(enrollment_json(e))

class AdminRevokeEnrollmentView(APIView):
    permission_classes=[permissions.IsAdminUser]
    @transaction.atomic
    def post(self,request):
        e=CourseEnrollment.objects.select_for_update().filter(user_id=request.data.get("userId"),course_id=request.data.get("courseId")).first()
        if not e:return Response({"detail":"Matrícula não encontrada."},status=404)
        e.status="revoked";e.revoked_at=timezone.now();e.save()
        AdminAuditLog.objects.create(actor=request.user,affected_user=e.user,action="REVOGACAO_DE_CURSO",detail="Curso %s revogado."%e.course_id)
        return Response(enrollment_json(e))
