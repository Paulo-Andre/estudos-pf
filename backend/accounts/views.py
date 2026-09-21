import os
from django.contrib.auth import authenticate,login,logout,get_user_model
from django.contrib.auth.password_validation import validate_password
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django.utils.decorators import method_decorator
from rest_framework import permissions,status
from rest_framework.response import Response
from rest_framework.views import APIView
from .email import send_password_reset
from .models import AccountProfile
from .rate_limit import allowed,clear_success,keys,record_failure
from .serializers import LoginSerializer,RegisterSerializer,SafeUserSerializer
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

class PasswordResetRequestView(APIView):
    permission_classes=[permissions.AllowAny];authentication_classes=[]
    def post(self,request):
        identifier=str(request.data.get("identifier") or "").strip()
        User=get_user_model()
        user=User.objects.filter(email__iexact=identifier).first() or User.objects.filter(username__iexact=identifier).first()
        if user and user.email:
            raw,_=create_password_reset(user)
            origin=os.getenv("PUBLIC_APP_URL","").rstrip("/") or request.build_absolute_uri("/").rstrip("/")
            try:send_password_reset(user.email,user.get_full_name() or user.username,origin+"/?reset_token="+raw)
            except RuntimeError:pass
        return Response({"success":True})

class PasswordResetConfirmView(APIView):
    permission_classes=[permissions.AllowAny];authentication_classes=[]
    def post(self,request):
        token=str(request.data.get("token") or "")
        password=str(request.data.get("password") or "")
        confirmation=str(request.data.get("confirmation") or "")
        if password!=confirmation:return Response({"detail":"A confirmação de senha não confere."},status=400)
        try:validate_password(password)
        except Exception as exc:return Response({"detail":" ".join(getattr(exc,"messages",[str(exc)]))},status=400)
        try:consume_password_reset(token,password)
        except ValueError as exc:return Response({"detail":str(exc)},status=400)
        return Response({"success":True})

class DeleteAccountView(APIView):
    def delete(self,request):
        username=str(request.data.get("confirmationUsername") or "").strip().lower()
        if username!=request.user.username.lower():
            return Response({"detail":"Confirmação de usuário inválida."},status=400)
        user=request.user
        logout(request)
        user.delete()
        return Response({"success":True})
