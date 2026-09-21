import re
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import AccountProfile
USERNAME_RE=re.compile(r"^[a-z0-9._-]+$")

class SafeUserSerializer(serializers.Serializer):
    id=serializers.IntegerField(read_only=True)
    name=serializers.SerializerMethodField()
    username=serializers.CharField(read_only=True)
    email=serializers.EmailField(read_only=True)
    role=serializers.SerializerMethodField()
    isBlocked=serializers.SerializerMethodField()
    createdAt=serializers.DateTimeField(source="date_joined",read_only=True)
    def get_name(self,u):
        try:return u.account_profile.display_name
        except AccountProfile.DoesNotExist:return u.get_full_name() or u.username
    def get_role(self,u): return "admin" if u.is_staff else "user"
    def get_isBlocked(self,u):
        try:return u.account_profile.is_blocked
        except AccountProfile.DoesNotExist:return False

class RegisterSerializer(serializers.Serializer):
    name=serializers.CharField(min_length=3,max_length=160)
    username=serializers.CharField(min_length=3,max_length=48)
    email=serializers.EmailField(max_length=320)
    password=serializers.CharField(min_length=8,max_length=128,write_only=True)
    passwordConfirmation=serializers.CharField(min_length=8,max_length=128,write_only=True)
    def validate_username(self,v):
        v=v.strip().lower()
        if not USERNAME_RE.fullmatch(v): raise serializers.ValidationError("Usuário inválido.")
        if get_user_model().objects.filter(username__iexact=v).exists(): raise serializers.ValidationError("Usuário em uso.")
        return v
    def validate_email(self,v):
        v=v.strip().lower()
        if get_user_model().objects.filter(email__iexact=v).exists(): raise serializers.ValidationError("E-mail em uso.")
        return v
    def validate(self,a):
        if a["password"]!=a["passwordConfirmation"]: raise serializers.ValidationError("A confirmação de senha não confere.")
        validate_password(a["password"]); return a
    def create(self,a):
        pwd=a.pop("password"); a.pop("passwordConfirmation"); name=a.pop("name")
        user=get_user_model().objects.create_user(username=a["username"],email=a["email"],password=pwd,first_name=name[:150])
        AccountProfile.objects.create(user=user,display_name=name)
        return user

class LoginSerializer(serializers.Serializer):
    identifier=serializers.CharField(min_length=3,max_length=320)
    password=serializers.CharField(min_length=8,max_length=128,write_only=True)
