from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from rest_framework import permissions,status
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.models import AdminAuditLog
from study.models import StudyAnswer,SimulationRecord
from .cpf import is_valid_cpf,normalize_cpf
from .models import AccountProfile,LoginAttempt,PasswordResetToken,SecurityEvent,TrackedSession
from .serializers import SafeUserSerializer
from .pii import lookup_hash,set_profile_cpf
from .services import delete_user_sessions,list_user_sessions,record_security_event,revoke_tracked_session

def audit(actor,target,action,detail):
    AdminAuditLog.objects.create(actor=actor,affected_user=target,action=action,detail=detail)

class AdminUserListView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):
        term=str(request.query_params.get("search") or "").strip()
        qs=get_user_model().objects.all().order_by("-date_joined")
        if term:
            qs=qs.filter(Q(username__icontains=term)|Q(email__icontains=term)|Q(first_name__icontains=term)|Q(account_profile__display_name__icontains=term))
        return Response(SafeUserSerializer(qs[:200],many=True).data)

class AdminStatsView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):
        User=get_user_model()
        return Response({
            "users":User.objects.count(),
            "blocked":AccountProfile.objects.filter(is_blocked=True).count(),
            "answers":StudyAnswer.objects.count(),
            "simulations":SimulationRecord.objects.count(),
        })

class AdminUserDetailView(APIView):
    permission_classes=[permissions.IsAdminUser]

    @transaction.atomic
    def put(self,request,user_id):
        User=get_user_model()
        user=User.objects.select_for_update().filter(pk=user_id).first()
        if not user:return Response({"detail":"Conta não encontrada."},status=404)
        data=request.data
        username=str(data.get("username") or user.username).strip().lower()
        email=str(data.get("email") or user.email or "").strip().lower()
        name=str(data.get("name") or user.first_name or user.username).strip()
        cpf_raw=data.get("cpf")
        if User.objects.filter(username__iexact=username).exclude(pk=user.id).exists():
            return Response({"detail":"Este nome de usuário já está em uso."},status=409)
        if email and User.objects.filter(email__iexact=email).exclude(pk=user.id).exists():
            return Response({"detail":"Este e-mail já está em uso."},status=409)
        profile,_=AccountProfile.objects.select_for_update().get_or_create(user=user,defaults={"display_name":name})
        if cpf_raw is not None:
            cpf=normalize_cpf(cpf_raw)
            if cpf and not is_valid_cpf(cpf):return Response({"detail":"CPF inválido."},status=400)
            if cpf and (AccountProfile.objects.filter(cpf_hash=lookup_hash(cpf)).exclude(pk=profile.pk).exists() or AccountProfile.objects.filter(cpf=cpf).exclude(pk=profile.pk).exists()):
                return Response({"detail":"Este CPF já está em uso."},status=409)
            set_profile_cpf(profile,cpf or None)
        user.username=username
        user.email=email
        user.first_name=name[:150]
        user.save(update_fields=["username","email","first_name"])
        profile.display_name=name
        profile.save()
        audit(request.user,user,"ATUALIZACAO_DE_CONTA","Dados da conta atualizados pelo administrador.")
        return Response(SafeUserSerializer(user).data)

    @transaction.atomic
    def delete(self,request,user_id):
        User=get_user_model()
        if user_id==request.user.id:return Response({"detail":"A conta administrativa não pode excluir a si mesma."},status=400)
        user=User.objects.select_for_update().filter(pk=user_id).first()
        if not user:return Response({"detail":"Conta não encontrada."},status=404)
        confirmation=str(request.data.get("confirmation") or "").strip().lower()
        accepted={user.username.lower(),(user.account_profile.display_name if hasattr(user,"account_profile") else user.first_name).strip().lower()}
        if confirmation not in accepted:return Response({"detail":"Confirmação inválida."},status=400)
        label=user.username
        audit(request.user,user,"EXCLUSAO_DE_CONTA","Conta %s excluída pelo administrador."%label)
        user.delete()
        return Response({"success":True})

class AdminResetPasswordView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def post(self,request,user_id):
        user=get_user_model().objects.filter(pk=user_id).first()
        if not user:return Response({"detail":"Conta não encontrada."},status=404)
        password=str(request.data.get("newPassword") or "")
        confirmation=str(request.data.get("confirmation") or "")
        if password!=confirmation:return Response({"detail":"A confirmação de senha não confere."},status=400)
        try:validate_password(password,user)
        except Exception as exc:return Response({"detail":" ".join(getattr(exc,"messages",[str(exc)]))},status=400)
        user.set_password(password);user.save(update_fields=["password"])
        delete_user_sessions(user.id)
        profile,_=AccountProfile.objects.get_or_create(user=user,defaults={"display_name":user.get_full_name() or user.username})
        profile.legacy_password_hash="";profile.save(update_fields=["legacy_password_hash","updated_at"])
        audit(request.user,user,"REDEFINICAO_DE_SENHA","Senha redefinida pelo administrador.")
        return Response({"success":True})

class AdminBlockUserView(APIView):
    permission_classes=[permissions.IsAdminUser]
    @transaction.atomic
    def post(self,request,user_id):
        if user_id==request.user.id:return Response({"detail":"A conta administrativa não pode bloquear a si mesma."},status=400)
        user=get_user_model().objects.select_for_update().filter(pk=user_id).first()
        if not user:return Response({"detail":"Conta não encontrada."},status=404)
        blocked=bool(request.data.get("isBlocked"))
        profile,_=AccountProfile.objects.get_or_create(user=user,defaults={"display_name":user.get_full_name() or user.username})
        profile.is_blocked=blocked;profile.save(update_fields=["is_blocked","updated_at"])
        user.is_active=not blocked;user.save(update_fields=["is_active"])
        if blocked:delete_user_sessions(user.id)
        audit(request.user,user,"BLOQUEIO_DE_CONTA" if blocked else "DESBLOQUEIO_DE_CONTA","Conta bloqueada." if blocked else "Conta desbloqueada.")
        return Response({"success":True,"isBlocked":blocked})


class AdminSecurityOverviewView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):
        since=timezone.now()-timedelta(hours=24)
        return Response({
            "activeSessions":TrackedSession.objects.filter(revoked_at__isnull=True).count(),
            "securityEvents24h":SecurityEvent.objects.filter(created_at__gte=since).count(),
            "failedLogins24h":SecurityEvent.objects.filter(event_type="login_failed",created_at__gte=since).count(),
            "activeResetTokens":PasswordResetToken.objects.filter(used_at__isnull=True,expires_at__gt=timezone.now()).count(),
            "rateLimitEntries":LoginAttempt.objects.count(),
            "plaintextCpfRecords":AccountProfile.objects.exclude(cpf__isnull=True).exclude(cpf="").count(),
        })

class AdminSecurityEventsView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):
        qs=SecurityEvent.objects.select_related("user").all()
        event_type=str(request.query_params.get("type") or "").strip()
        if event_type:qs=qs.filter(event_type=event_type)
        return Response([{"id":e.id,"type":e.event_type,"userId":e.user_id,
            "username":e.user.username if e.user else None,"userAgent":e.user_agent,
            "createdAt":e.created_at,"metadata":e.metadata} for e in qs[:200]])

class AdminUserSessionsView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request,user_id):
        user=get_user_model().objects.filter(pk=user_id).first()
        if not user:return Response({"detail":"Conta não encontrada."},status=404)
        return Response(list_user_sessions(user))
    def delete(self,request,user_id):
        user=get_user_model().objects.filter(pk=user_id).first()
        if not user:return Response({"detail":"Conta não encontrada."},status=404)
        delete_user_sessions(user.id);audit(request.user,user,"REVOGACAO_DE_SESSOES","Todas as sessões da conta foram revogadas.")
        record_security_event(request,"admin_sessions_revoked",user,{"actorUserId":request.user.id})
        return Response({"success":True})

class AdminUserSessionDetailView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def delete(self,request,user_id,session_id):
        user=get_user_model().objects.filter(pk=user_id).first()
        if not user:return Response({"detail":"Conta não encontrada."},status=404)
        if not revoke_tracked_session(user,session_id):return Response({"detail":"Sessão não encontrada."},status=404)
        audit(request.user,user,"REVOGACAO_DE_SESSAO","Uma sessão específica foi revogada.")
        return Response({"success":True})

class AdminUnlockLoginView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def post(self,request,user_id):
        user=get_user_model().objects.filter(pk=user_id).first()
        if not user:return Response({"detail":"Conta não encontrada."},status=404)
        identifiers=[user.username.lower()]
        if user.email:identifiers.append(user.email.lower())
        query=Q()
        for ident in identifiers:query|=Q(key__contains=lookup_hash("rate-ident:"+ident))
        removed,_=LoginAttempt.objects.filter(query).delete()
        audit(request.user,user,"DESBLOQUEIO_DE_LOGIN",f"Contadores de tentativa removidos: {removed}.")
        return Response({"success":True,"removed":removed})
