import uuid
from django.conf import settings
from django.db import models

class AccountProfile(models.Model):
    class Role(models.TextChoices):
        USER="user","Usuário"
        ADMIN="admin","Administrador"
    id=models.BigAutoField(primary_key=True)
    user=models.OneToOneField(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="account_profile")
    display_name=models.CharField(max_length=160)
    # Campo legado temporário. Novas gravações usam cpf_encrypted/cpf_hash.
    cpf=models.CharField(max_length=11,unique=True,null=True,blank=True)
    cpf_encrypted=models.TextField(blank=True,default="")
    cpf_hash=models.CharField(max_length=64,unique=True,null=True,blank=True)
    role=models.CharField(max_length=16,choices=Role.choices,default=Role.USER)
    is_blocked=models.BooleanField(default=False)
    legacy_open_id=models.CharField(max_length=128,null=True,blank=True)
    legacy_password_hash=models.CharField(max_length=255,blank=True,default="")
    last_signed_in=models.DateTimeField(null=True,blank=True)
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)

class AccountPreferences(models.Model):
    user=models.OneToOneField(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="account_preferences")
    email_security_alerts=models.BooleanField(default=True)
    email_course_updates=models.BooleanField(default=True)
    weekly_goal_questions=models.PositiveIntegerField(default=50)
    weekly_goal_days=models.PositiveSmallIntegerField(default=5)
    exam_date=models.DateField(null=True,blank=True)
    reduced_motion=models.BooleanField(default=False)
    compact_mode=models.BooleanField(default=False)
    updated_at=models.DateTimeField(auto_now=True)

class TrackedSession(models.Model):
    id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False)
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="tracked_sessions")
    session_hash=models.CharField(max_length=64,unique=True)
    user_agent=models.CharField(max_length=500,blank=True,default="")
    ip_hash=models.CharField(max_length=64,blank=True,default="")
    created_at=models.DateTimeField(auto_now_add=True)
    last_seen_at=models.DateTimeField(auto_now=True)
    revoked_at=models.DateTimeField(null=True,blank=True)
    class Meta:
        indexes=[
            models.Index(fields=["user","revoked_at","-last_seen_at"],name="session_user_active_idx"),
        ]

class SecurityEvent(models.Model):
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.SET_NULL,null=True,blank=True,related_name="security_events")
    event_type=models.CharField(max_length=64)
    ip_hash=models.CharField(max_length=64,blank=True,default="")
    user_agent=models.CharField(max_length=500,blank=True,default="")
    metadata=models.JSONField(default=dict,blank=True)
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering=["-created_at"]
        indexes=[
            models.Index(fields=["event_type","-created_at"],name="security_event_type_idx"),
            models.Index(fields=["user","-created_at"],name="security_event_user_idx"),
        ]

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
