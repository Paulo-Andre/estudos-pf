import re
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .cpf import is_valid_cpf,normalize_cpf
from .models import AccountProfile
from .pii import get_profile_cpf,lookup_hash,set_profile_cpf
USERNAME_RE=re.compile(r"^[a-z0-9._-]+$")

class SafeUserSerializer(serializers.Serializer):
    id=serializers.IntegerField(read_only=True)
    name=serializers.SerializerMethodField()
    username=serializers.CharField(read_only=True)
    email=serializers.EmailField(read_only=True)
    cpf=serializers.SerializerMethodField()
    role=serializers.SerializerMethodField()
    isBlocked=serializers.SerializerMethodField()
    createdAt=serializers.DateTimeField(source="date_joined",read_only=True)
    lastSignedIn=serializers.SerializerMethodField()
    def get_name(self,u):
        try:return u.account_profile.display_name
        except AccountProfile.DoesNotExist:return u.get_full_name() or u.username
    def get_cpf(self,u):
        try:return get_profile_cpf(u.account_profile)
        except AccountProfile.DoesNotExist:return None
    def get_role(self,u):return "admin" if u.is_staff else "user"
    def get_isBlocked(self,u):
        try:return u.account_profile.is_blocked
        except AccountProfile.DoesNotExist:return False
    def get_lastSignedIn(self,u):
        try:return u.account_profile.last_signed_in
        except AccountProfile.DoesNotExist:return u.last_login

class RegisterSerializer(serializers.Serializer):
    name=serializers.CharField(min_length=3,max_length=160)
    username=serializers.CharField(min_length=3,max_length=48)
    email=serializers.EmailField(max_length=320)
    cpf=serializers.CharField(required=False,allow_blank=True,max_length=18)
    password=serializers.CharField(min_length=8,max_length=128,write_only=True)
    passwordConfirmation=serializers.CharField(min_length=8,max_length=128,write_only=True)
    def validate_username(self,v):
        v=v.strip().lower()
        if not USERNAME_RE.fullmatch(v):raise serializers.ValidationError("Usuário inválido.")
        if get_user_model().objects.filter(username__iexact=v).exists():raise serializers.ValidationError("Usuário em uso.")
        return v
    def validate_email(self,v):
        v=v.strip().lower()
        if get_user_model().objects.filter(email__iexact=v).exists():raise serializers.ValidationError("E-mail em uso.")
        return v
    def validate_cpf(self,v):
        if not v:return ""
        v=normalize_cpf(v)
        if not is_valid_cpf(v):raise serializers.ValidationError("CPF inválido.")
        digest=lookup_hash(v)
        if AccountProfile.objects.filter(cpf_hash=digest).exists() or AccountProfile.objects.filter(cpf=v).exists():raise serializers.ValidationError("CPF em uso.")
        return v
    def validate(self,a):
        if a["password"]!=a["passwordConfirmation"]:raise serializers.ValidationError("A confirmação de senha não confere.")
        validate_password(a["password"]);return a
    def create(self,a):
        pwd=a.pop("password");a.pop("passwordConfirmation");name=a.pop("name");cpf=a.pop("cpf","") or None
        user=get_user_model().objects.create_user(username=a["username"],email=a["email"],password=pwd,first_name=name[:150])
        profile=AccountProfile(user=user,display_name=name)
        set_profile_cpf(profile,cpf)
        profile.save()
        return user

class LoginSerializer(serializers.Serializer):
    identifier=serializers.CharField(min_length=3,max_length=320)
    password=serializers.CharField(min_length=8,max_length=128,write_only=True)
    otp=serializers.CharField(required=False,allow_blank=True,max_length=32,write_only=True)
