from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid

class Migration(migrations.Migration):
    dependencies=[
        ("accounts","0002_account_security"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations=[
        migrations.AddField(model_name="accountprofile",name="cpf_encrypted",field=models.TextField(blank=True,default="")),
        migrations.AddField(model_name="accountprofile",name="cpf_hash",field=models.CharField(blank=True,max_length=64,null=True,unique=True)),
        migrations.CreateModel(
            name="AccountPreferences",
            fields=[
                ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),
                ("email_security_alerts",models.BooleanField(default=True)),
                ("email_course_updates",models.BooleanField(default=True)),
                ("weekly_goal_questions",models.PositiveIntegerField(default=50)),
                ("weekly_goal_days",models.PositiveSmallIntegerField(default=5)),
                ("exam_date",models.DateField(blank=True,null=True)),
                ("reduced_motion",models.BooleanField(default=False)),
                ("compact_mode",models.BooleanField(default=False)),
                ("updated_at",models.DateTimeField(auto_now=True)),
                ("user",models.OneToOneField(on_delete=django.db.models.deletion.CASCADE,related_name="account_preferences",to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="TrackedSession",
            fields=[
                ("id",models.UUIDField(default=uuid.uuid4,editable=False,primary_key=True,serialize=False)),
                ("session_hash",models.CharField(max_length=64,unique=True)),
                ("user_agent",models.CharField(blank=True,default="",max_length=500)),
                ("ip_hash",models.CharField(blank=True,default="",max_length=64)),
                ("created_at",models.DateTimeField(auto_now_add=True)),
                ("last_seen_at",models.DateTimeField(auto_now=True)),
                ("revoked_at",models.DateTimeField(blank=True,null=True)),
                ("user",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="tracked_sessions",to=settings.AUTH_USER_MODEL)),
            ],
            options={"indexes":[models.Index(fields=["user","revoked_at","-last_seen_at"],name="session_user_active_idx")]},
        ),
        migrations.CreateModel(
            name="SecurityEvent",
            fields=[
                ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),
                ("event_type",models.CharField(max_length=64)),
                ("ip_hash",models.CharField(blank=True,default="",max_length=64)),
                ("user_agent",models.CharField(blank=True,default="",max_length=500)),
                ("metadata",models.JSONField(blank=True,default=dict)),
                ("created_at",models.DateTimeField(auto_now_add=True)),
                ("user",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.SET_NULL,related_name="security_events",to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering":["-created_at"],
                "indexes":[
                    models.Index(fields=["event_type","-created_at"],name="security_event_type_idx"),
                    models.Index(fields=["user","-created_at"],name="security_event_user_idx"),
                ],
            },
        ),
    ]
