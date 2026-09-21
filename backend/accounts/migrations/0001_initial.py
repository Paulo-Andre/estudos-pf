from django.conf import settings
from django.db import migrations,models
import django.db.models.deletion
class Migration(migrations.Migration):
 initial=True
 dependencies=[migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
 operations=[
  migrations.CreateModel(name="LoginAttempt",fields=[
   ("key",models.CharField(max_length=255,primary_key=True,serialize=False)),("failures",models.PositiveIntegerField(default=0)),
   ("window_started_at",models.DateTimeField()),("updated_at",models.DateTimeField(auto_now=True))]),
  migrations.CreateModel(name="AccountProfile",fields=[
   ("id",models.BigAutoField(primary_key=True,serialize=False)),("display_name",models.CharField(max_length=160)),
   ("role",models.CharField(choices=[("user","Usuário"),("admin","Administrador")],default="user",max_length=16)),
   ("is_blocked",models.BooleanField(default=False)),("legacy_open_id",models.CharField(blank=True,max_length=128,null=True)),
   ("legacy_password_hash",models.CharField(blank=True,default="",max_length=255)),("last_signed_in",models.DateTimeField(blank=True,null=True)),
   ("created_at",models.DateTimeField(auto_now_add=True)),("updated_at",models.DateTimeField(auto_now=True)),
   ("user",models.OneToOneField(on_delete=django.db.models.deletion.CASCADE,related_name="account_profile",to=settings.AUTH_USER_MODEL))])
 ]
