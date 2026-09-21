from django.conf import settings
from django.db import models

class AccountProfile(models.Model):
    class Role(models.TextChoices):
        USER="user","Usuário"
        ADMIN="admin","Administrador"
    id=models.BigAutoField(primary_key=True)
    user=models.OneToOneField(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="account_profile")
    display_name=models.CharField(max_length=160)
    cpf=models.CharField(max_length=11,unique=True,null=True,blank=True)
    role=models.CharField(max_length=16,choices=Role.choices,default=Role.USER)
    is_blocked=models.BooleanField(default=False)
    legacy_open_id=models.CharField(max_length=128,null=True,blank=True)
    legacy_password_hash=models.CharField(max_length=255,blank=True,default="")
    last_signed_in=models.DateTimeField(null=True,blank=True)
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)

class LoginAttempt(models.Model):
    key=models.CharField(max_length=255,primary_key=True)
    failures=models.PositiveIntegerField(default=0)
    window_started_at=models.DateTimeField()
    updated_at=models.DateTimeField(auto_now=True)

class PasswordResetToken(models.Model):
    id=models.CharField(max_length=64,primary_key=True)
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="password_reset_tokens")
    token_hash=models.CharField(max_length=64,unique=True)
    expires_at=models.DateTimeField()
    used_at=models.DateTimeField(null=True,blank=True)
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        indexes=[models.Index(fields=["user","expires_at"],name="reset_user_expiry_idx")]
