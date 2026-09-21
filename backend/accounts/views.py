from django.contrib.auth import authenticate,login,logout
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django.utils.decorators import method_decorator
from rest_framework import permissions,status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import AccountProfile
from .rate_limit import allowed,clear_success,keys,record_failure
from .serializers import LoginSerializer,RegisterSerializer,SafeUserSerializer

class CsrfView(APIView):
    permission_classes=[permissions.AllowAny]; authentication_classes=[]
    def get(self,request): return Response({"csrfToken":get_token(request)})

class MeView(APIView):
    permission_classes=[permissions.AllowAny]
    def get(self,request): return Response(SafeUserSerializer(request.user).data if request.user.is_authenticated else None)

@method_decorator(csrf_protect,name="dispatch")
class RegisterView(APIView):
    permission_classes=[permissions.AllowAny]; authentication_classes=[]
    def post(self,request):
        s=RegisterSerializer(data=request.data); s.is_valid(raise_exception=True); user=s.save(); login(request,user)
        return Response(SafeUserSerializer(user).data,status=status.HTTP_201_CREATED)

@method_decorator(csrf_protect,name="dispatch")
class LoginView(APIView):
    permission_classes=[permissions.AllowAny]; authentication_classes=[]
    def post(self,request):
        s=LoginSerializer(data=request.data); s.is_valid(raise_exception=True)
        pair=keys(request,s.validated_data["identifier"])
        if not allowed(pair): return Response({"detail":"Muitas tentativas de acesso."},status=429)
        user=authenticate(request,username=s.validated_data["identifier"],password=s.validated_data["password"])
        if not user:
            record_failure(pair); return Response({"detail":"Usuário ou senha inválidos."},status=401)
        clear_success(pair)
        profile,_=AccountProfile.objects.get_or_create(user=user,defaults={"display_name":user.get_full_name() or user.username})
        profile.last_signed_in=timezone.now(); profile.save()
        login(request,user); return Response(SafeUserSerializer(user).data)

class LogoutView(APIView):
    def post(self,request): logout(request); return Response({"success":True})
