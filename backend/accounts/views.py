import os
from django.contrib.auth import authenticate,login,logout,get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django.utils.decorators import method_decorator
from rest_framework import permissions,status
from rest_framework.response import Response
from rest_framework.views import APIView
from .cpf import is_valid_cpf,normalize_cpf
from .email import send_password_reset
from .models import AccountMFA,AccountPreferences,AccountProfile,SecurityEvent,TrackedSession
from .rate_limit import allowed,clear_success,keys,record_failure
from .serializers import LoginSerializer,RegisterSerializer,SafeUserSerializer,USERNAME_RE
from .mfa import begin_setup,confirm_setup,disable as disable_mfa,regenerate_backup_codes,status_for as mfa_status,verify_code as verify_mfa_code
from .pii import get_profile_cpf,lookup_hash,set_profile_cpf
from .services import consume_password_reset,create_password_reset,delete_user_sessions,list_user_sessions,record_security_event,revoke_tracked_session,touch_current_session,track_current_session

class CsrfView(APIView):
    permission_classes=[permissions.AllowAny];authentication_classes=[]
    def get(self,request):return Response({"csrfToken":get_token(request)})

class MeView(APIView):
    permission_classes=[permissions.AllowAny]
    def get(self,request):
        if request.user.is_authenticated:touch_current_session(request)
        return Response(SafeUserSerializer(request.user).data if request.user.is_authenticated else None)

@method_decorator(csrf_protect,name="dispatch")
class RegisterView(APIView):
    permission_classes=[permissions.AllowAny];authentication_classes=[]
    def post(self,request):
        limiter=keys(request,str(request.data.get("email") or request.data.get("username") or ""),"register")
        if not allowed(limiter,10,5):return Response({"detail":"Muitas tentativas de cadastro. Tente novamente mais tarde."},status=429)
        record_failure(limiter)
        s=RegisterSerializer(data=request.data);s.is_valid(raise_exception=True);user=s.save();clear_success(limiter);login(request,user)
        track_current_session(request,user);record_security_event(request,"register_success",user)
        return Response({"user":SafeUserSerializer(user).data,"hadActiveSession":False},status=status.HTTP_201_CREATED)

@method_decorator(csrf_protect,name="dispatch")
class LoginView(APIView):
    permission_classes=[permissions.AllowAny];authentication_classes=[]
    def post(self,request):
        s=LoginSerializer(data=request.data);s.is_valid(raise_exception=True)
        pair=keys(request,s.validated_data["identifier"])
        if not allowed(pair):return Response({"detail":"Muitas tentativas de acesso."},status=429)
        user=authenticate(request,username=s.validated_data["identifier"],password=s.validated_data["password"])
        if not user:
            record_failure(pair);record_security_event(request,"login_failed",metadata={"identifierHash":lookup_hash(s.validated_data["identifier"].strip().lower())})
            return Response({"detail":"Usuário ou senha inválidos."},status=401)
        mfa=AccountMFA.objects.filter(user=user,enabled=True).first()
        if mfa and not s.validated_data.get("otp"):
            record_security_event(request,"mfa_challenge",user)
            return Response({"detail":"Código de autenticação necessário.","mfaRequired":True},status=428)
        if mfa and not verify_mfa_code(user,s.validated_data.get("otp")):
            record_failure(pair);record_security_event(request,"mfa_failed",user)
            return Response({"detail":"Código de autenticação inválido.","mfaRequired":True},status=401)
        clear_success(pair)
        had_active=TrackedSession.objects.filter(user=user,revoked_at__isnull=True).exists()
        profile,_=AccountProfile.objects.get_or_create(user=user,defaults={"display_name":user.get_full_name() or user.username})
        profile.last_signed_in=timezone.now();profile.save()
        login(request,user);track_current_session(request,user);record_security_event(request,"login_success",user,{"mfa":bool(mfa)})
        return Response({"user":SafeUserSerializer(user).data,"hadActiveSession":had_active})

class LogoutView(APIView):
    def post(self,request):
        record_security_event(request,"logout",request.user)
        logout(request)
        return Response({"success":True})

class ProfileView(APIView):
    @transaction.atomic
    def put(self,request):
        user=get_user_model().objects.select_for_update().get(pk=request.user.id)
        profile,_=AccountProfile.objects.select_for_update().get_or_create(user=user,defaults={"display_name":user.get_full_name() or user.username})
        name=str(request.data.get("name") or profile.display_name or user.username).strip()
        username=str(request.data.get("username") or user.username).strip().lower()
        email=str(request.data.get("email") or user.email or "").strip().lower()
        cpf=normalize_cpf(request.data.get("cpf") or "") if "cpf" in request.data else get_profile_cpf(profile)
        if len(name)<3:return Response({"detail":"Informe o nome completo."},status=400)
        if not USERNAME_RE.fullmatch(username):return Response({"detail":"Usuário inválido."},status=400)
        User=get_user_model()
        if User.objects.filter(username__iexact=username).exclude(pk=user.id).exists():return Response({"detail":"Este nome de usuário já está em uso."},status=409)
        if email and User.objects.filter(email__iexact=email).exclude(pk=user.id).exists():return Response({"detail":"Este e-mail já está em uso."},status=409)
        if cpf:
            if not is_valid_cpf(cpf):return Response({"detail":"CPF inválido."},status=400)
            digest=lookup_hash(cpf)
            if AccountProfile.objects.filter(cpf_hash=digest).exclude(pk=profile.pk).exists() or AccountProfile.objects.filter(cpf=cpf).exclude(pk=profile.pk).exists():return Response({"detail":"Este CPF já está em uso."},status=409)
        user.username=username;user.email=email;user.first_name=name[:150]
        user.save(update_fields=["username","email","first_name"])
        profile.display_name=name;set_profile_cpf(profile,cpf or None);profile.save()
        record_security_event(request,"profile_changed",user)
        return Response(SafeUserSerializer(user).data)

class ChangePasswordView(APIView):
    def post(self,request):
        current=str(request.data.get("currentPassword") or "")
        new=str(request.data.get("newPassword") or "")
        confirmation=str(request.data.get("confirmation") or "")
        if not request.user.check_password(current):return Response({"detail":"A senha atual não confere."},status=403)
        if new!=confirmation:return Response({"detail":"A confirmação de senha não confere."},status=400)
        try:validate_password(new,request.user)
        except Exception as exc:return Response({"detail":" ".join(getattr(exc,"messages",[str(exc)]))},status=400)
        request.user.set_password(new);request.user.save(update_fields=["password"])
        profile,_=AccountProfile.objects.get_or_create(user=request.user,defaults={"display_name":request.user.get_full_name() or request.user.username})
        profile.legacy_password_hash="";profile.save(update_fields=["legacy_password_hash","updated_at"])
        delete_user_sessions(request.user.id);login(request,request.user);track_current_session(request,request.user);record_security_event(request,"password_changed",request.user)
        return Response({"success":True})

class PasswordResetRequestView(APIView):
    permission_classes=[permissions.AllowAny];authentication_classes=[]
    def post(self,request):
        identifier=str(request.data.get("identifier") or request.data.get("email") or "").strip()
        limiter=keys(request,identifier,"password-reset")
        if not allowed(limiter,10,5):return Response({"success":True})
        record_failure(limiter)
        User=get_user_model()
        user=User.objects.filter(email__iexact=identifier).first() or User.objects.filter(username__iexact=identifier).first()
        if user and user.email:
            raw,_=create_password_reset(user)
            origin=os.getenv("PUBLIC_APP_URL","").rstrip("/") or request.build_absolute_uri("/").rstrip("/")
            try:send_password_reset(user.email,user.get_full_name() or user.username,origin+"/?reset="+raw)
            except RuntimeError:pass
            record_security_event(request,"password_reset_requested",user)
        return Response({"success":True})

class PasswordResetConfirmView(APIView):
    permission_classes=[permissions.AllowAny];authentication_classes=[]
    def post(self,request):
        token=str(request.data.get("token") or "")
        password=str(request.data.get("newPassword") or request.data.get("password") or "")
        confirmation=str(request.data.get("confirmation") or "")
        if password!=confirmation:return Response({"detail":"A confirmação de senha não confere."},status=400)
        try:validate_password(password)
        except Exception as exc:return Response({"detail":" ".join(getattr(exc,"messages",[str(exc)]))},status=400)
        try:user=consume_password_reset(token,password)
        except ValueError as exc:return Response({"detail":str(exc)},status=400)
        record_security_event(request,"password_reset_completed",user)
        return Response({"success":True})

class DeleteAccountView(APIView):
    def delete(self,request):
        confirmation=str(request.data.get("confirmation") or request.data.get("confirmationUsername") or "").strip().lower()
        profile=getattr(request.user,"account_profile",None)
        accepted={request.user.username.lower(),(profile.display_name if profile else request.user.first_name or "").strip().lower()}
        if confirmation not in accepted:return Response({"detail":"Confirmação de usuário inválida."},status=400)
        user=request.user;record_security_event(request,"account_deleted",user);logout(request);user.delete()
        return Response({"success":True})


class PreferencesView(APIView):
    def get(self,request):
        p,_=AccountPreferences.objects.get_or_create(user=request.user)
        return Response({"emailSecurityAlerts":p.email_security_alerts,"emailCourseUpdates":p.email_course_updates,
            "weeklyGoalQuestions":p.weekly_goal_questions,"weeklyGoalDays":p.weekly_goal_days,
            "examDate":p.exam_date,"reducedMotion":p.reduced_motion,"compactMode":p.compact_mode})
    def put(self,request):
        p,_=AccountPreferences.objects.get_or_create(user=request.user)
        if "emailSecurityAlerts" in request.data:p.email_security_alerts=bool(request.data["emailSecurityAlerts"])
        if "emailCourseUpdates" in request.data:p.email_course_updates=bool(request.data["emailCourseUpdates"])
        if "weeklyGoalQuestions" in request.data:p.weekly_goal_questions=max(1,min(5000,int(request.data["weeklyGoalQuestions"])))
        if "weeklyGoalDays" in request.data:p.weekly_goal_days=max(1,min(7,int(request.data["weeklyGoalDays"])))
        if "examDate" in request.data:p.exam_date=request.data["examDate"] or None
        if "reducedMotion" in request.data:p.reduced_motion=bool(request.data["reducedMotion"])
        if "compactMode" in request.data:p.compact_mode=bool(request.data["compactMode"])
        p.save();record_security_event(request,"preferences_changed",request.user)
        return self.get(request)

class SessionsView(APIView):
    def get(self,request):
        touch_current_session(request)
        return Response(list_user_sessions(request.user,request.session.session_key))

class SessionRevokeView(APIView):
    def delete(self,request,session_id):
        current=[s for s in list_user_sessions(request.user,request.session.session_key) if s["id"]==str(session_id)]
        if not current:return Response({"detail":"Sessão não encontrada."},status=404)
        is_current=current[0]["current"]
        if not revoke_tracked_session(request.user,session_id):return Response({"detail":"Sessão não encontrada."},status=404)
        record_security_event(request,"session_revoked",request.user,{"current":is_current})
        if is_current:logout(request)
        return Response({"success":True,"current":is_current})

class MySecurityEventsView(APIView):
    def get(self,request):
        rows=SecurityEvent.objects.filter(user=request.user)[:50]
        return Response([{"id":e.id,"type":e.event_type,"userAgent":e.user_agent,"createdAt":e.created_at,"metadata":e.metadata} for e in rows])

class DataExportView(APIView):
    def get(self,request):
        from courses.models import CourseEnrollment
        from commerce.models import CommerceOrder
        from study.models import CompletedModule,SimulationRecord,StudyAnswer,StudyNote,StudyProfile,StudyReviewItem,StudyRoadmapItem
        profile=getattr(request.user,"account_profile",None)
        study=StudyProfile.objects.filter(user=request.user).first()
        payload={
            "account":SafeUserSerializer(request.user).data,
            "preferences":PreferencesView().get(request).data,
            "enrollments":[{"courseId":x.course_id,"status":x.status,"startAt":x.start_at,"expiresAt":x.expires_at} for x in CourseEnrollment.objects.filter(user=request.user)],
            "studyProfile":{"xp":study.xp,"lastStudyDate":study.last_study_date,"studyDates":study.study_dates} if study else None,
            "completedModules":[{"moduleId":x.module_id,"completedAt":x.completed_at} for x in CompletedModule.objects.filter(user=request.user)],
            "answers":[{"questionId":x.question_id,"correct":x.correct,"answeredAt":x.answered_at} for x in StudyAnswer.objects.filter(user=request.user).order_by("-answered_at")[:10000]],
            "notes":[{"moduleId":x.module_id,"content":x.content} for x in StudyNote.objects.filter(user=request.user)],
            "reviewItems":[{"questionKey":x.question_key,"status":x.status,"snapshot":x.snapshot_json} for x in StudyReviewItem.objects.filter(user=request.user)],
            "roadmap":[{"courseId":x.course_id,"contentId":x.content_id,"weekday":x.weekday,"startTime":x.start_time,"isActive":x.is_active} for x in StudyRoadmapItem.objects.filter(user=request.user)],
            "simulations":[{"id":x.id,"completedAt":x.completed_at,"total":x.total,"correct":x.correct,"errors":x.errors} for x in SimulationRecord.objects.filter(user=request.user).order_by("-completed_at")],
            "orders":[{"id":x.id,"planId":x.plan_id,"status":x.status,"totalCents":x.total_cents,"currency":x.currency,"createdAt":x.created_at} for x in CommerceOrder.objects.filter(user=request.user).order_by("-created_at")],
        }
        record_security_event(request,"data_exported",request.user)
        return Response(payload)


class MFAStatusView(APIView):
    def get(self,request):return Response(mfa_status(request.user))

class MFASetupView(APIView):
    def post(self,request):
        try:data=begin_setup(request.user,request.data.get("password"))
        except ValueError as exc:return Response({"detail":str(exc)},status=403)
        record_security_event(request,"mfa_setup_started",request.user)
        return Response(data)

class MFAConfirmView(APIView):
    def post(self,request):
        try:codes=confirm_setup(request.user,request.data.get("code"))
        except ValueError as exc:return Response({"detail":str(exc)},status=400)
        record_security_event(request,"mfa_enabled",request.user)
        return Response({"enabled":True,"backupCodes":codes})

class MFADisableView(APIView):
    def post(self,request):
        try:disable_mfa(request.user,request.data.get("password"),request.data.get("code"))
        except ValueError as exc:return Response({"detail":str(exc)},status=400)
        record_security_event(request,"mfa_disabled",request.user)
        return Response({"enabled":False})

class MFABackupCodesView(APIView):
    def post(self,request):
        try:codes=regenerate_backup_codes(request.user,request.data.get("code"))
        except ValueError as exc:return Response({"detail":str(exc)},status=400)
        record_security_event(request,"mfa_backup_codes_regenerated",request.user)
        return Response({"backupCodes":codes})
