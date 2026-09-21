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
from .models import AccountProfile
from .rate_limit import allowed,clear_success,keys,record_failure
from .serializers import LoginSerializer,RegisterSerializer,SafeUserSerializer,USERNAME_RE
from .services import consume_password_reset,create_password_reset,delete_user_sessions

class CsrfView(APIView):
    permission_classes=[permissions.AllowAny];authentication_classes=[]
    def get(self,request):return Response({"csrfToken":get_token(request)})

class MeView(APIView):
    permission_classes=[permissions.AllowAny]
    def get(self,request):return Response(SafeUserSerializer(request.user).data if request.user.is_authenticated else None)

@method_decorator(csrf_protect,name="dispatch")
class RegisterView(APIView):
    permission_classes=[permissions.AllowAny];authentication_classes=[]
    def post(self,request):
        s=RegisterSerializer(data=request.data);s.is_valid(raise_exception=True);user=s.save();delete_user_sessions(user.id);login(request,user)
        return Response(SafeUserSerializer(user).data,status=status.HTTP_201_CREATED)

@method_decorator(csrf_protect,name="dispatch")
class LoginView(APIView):
    permission_classes=[permissions.AllowAny];authentication_classes=[]
    def post(self,request):
        s=LoginSerializer(data=request.data);s.is_valid(raise_exception=True)
        pair=keys(request,s.validated_data["identifier"])
        if not allowed(pair):return Response({"detail":"Muitas tentativas de acesso."},status=429)
        user=authenticate(request,username=s.validated_data["identifier"],password=s.validated_data["password"])
        if not user:
            record_failure(pair);return Response({"detail":"Usuário ou senha inválidos."},status=401)
        clear_success(pair);delete_user_sessions(user.id)
        profile,_=AccountProfile.objects.get_or_create(user=user,defaults={"display_name":user.get_full_name() or user.username})
        profile.last_signed_in=timezone.now();profile.save()
        login(request,user);return Response(SafeUserSerializer(user).data)

class LogoutView(APIView):
    def post(self,request):logout(request);return Response({"success":True})

class ProfileView(APIView):
    @transaction.atomic
    def put(self,request):
        user=get_user_model().objects.select_for_update().get(pk=request.user.id)
        profile,_=AccountProfile.objects.select_for_update().get_or_create(user=user,defaults={"display_name":user.get_full_name() or user.username})
        name=str(request.data.get("name") or profile.display_name or user.username).strip()
        username=str(request.data.get("username") or user.username).strip().lower()
        email=str(request.data.get("email") or user.email or "").strip().lower()
        cpf=normalize_cpf(request.data.get("cpf") or "") if "cpf" in request.data else profile.cpf
        if len(name)<3:return Response({"detail":"Informe o nome completo."},status=400)
        if not USERNAME_RE.fullmatch(username):return Response({"detail":"Usuário inválido."},status=400)
        User=get_user_model()
        if User.objects.filter(username__iexact=username).exclude(pk=user.id).exists():return Response({"detail":"Este nome de usuário já está em uso."},status=409)
        if email and User.objects.filter(email__iexact=email).exclude(pk=user.id).exists():return Response({"detail":"Este e-mail já está em uso."},status=409)
        if cpf:
            if not is_valid_cpf(cpf):return Response({"detail":"CPF inválido."},status=400)
            if AccountProfile.objects.filter(cpf=cpf).exclude(pk=profile.pk).exists():return Response({"detail":"Este CPF já está em uso."},status=409)
        user.username=username;user.email=email;user.first_name=name[:150]
        user.save(update_fields=["username","email","first_name"])
        profile.display_name=name;profile.cpf=cpf or None;profile.save()
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
        delete_user_sessions(request.user.id);login(request,request.user)
        return Response({"success":True})

class PasswordResetRequestView(APIView):
    permission_classes=[permissions.AllowAny];authentication_classes=[]
    def post(self,request):
        identifier=str(request.data.get("identifier") or request.data.get("email") or "").strip()
        User=get_user_model()
        user=User.objects.filter(email__iexact=identifier).first() or User.objects.filter(username__iexact=identifier).first()
        if user and user.email:
            raw,_=create_password_reset(user)
            origin=os.getenv("PUBLIC_APP_URL","").rstrip("/") or request.build_absolute_uri("/").rstrip("/")
            try:send_password_reset(user.email,user.get_full_name() or user.username,origin+"/?reset="+raw)
            except RuntimeError:pass
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
        try:consume_password_reset(token,password)
        except ValueError as exc:return Response({"detail":str(exc)},status=400)
        return Response({"success":True})

class DeleteAccountView(APIView):
    def delete(self,request):
        confirmation=str(request.data.get("confirmation") or request.data.get("confirmationUsername") or "").strip().lower()
        profile=getattr(request.user,"account_profile",None)
        accepted={request.user.username.lower(),(profile.display_name if profile else request.user.first_name or "").strip().lower()}
        if confirmation not in accepted:return Response({"detail":"Confirmação de usuário inválida."},status=400)
        user=request.user;logout(request);user.delete()
        return Response({"success":True})
