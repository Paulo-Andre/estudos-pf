from django.conf import settings
from django.db import migrations,models
import django.db.models.deletion

class Migration(migrations.Migration):
    initial=True
    dependencies=[migrations.swappable_dependency(settings.AUTH_USER_MODEL),("courses","0002_expand_course_catalog"),("knowledge","0001_initial")]
    operations=[
        migrations.CreateModel(name="CompetitionMonthlyGoal",fields=[
            ("id",models.PositiveSmallIntegerField(default=1,editable=False,primary_key=True,serialize=False)),
            ("target_points",models.PositiveIntegerField(default=100)),("target_completed_rounds",models.PositiveIntegerField(default=5)),
            ("reward_title",models.CharField(default="Destaque mensal",max_length=160)),
            ("reward_description",models.CharField(default="Reconhecimento definido pela administração para quem concluir a meta do mês.",max_length=500)),
            ("is_active",models.BooleanField(default=True)),("updated_at",models.DateTimeField(auto_now=True)),
            ("updated_by",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.SET_NULL,related_name="+",to=settings.AUTH_USER_MODEL)),
        ]),
        migrations.CreateModel(name="CompetitionSettings",fields=[
            ("id",models.PositiveSmallIntegerField(default=1,editable=False,primary_key=True,serialize=False)),
            ("points_per_correct",models.IntegerField(default=10)),("points_per_wrong",models.IntegerField(default=0)),
            ("questions_per_round",models.PositiveIntegerField(default=10)),("is_active",models.BooleanField(default=True)),
            ("weekly_cycle_key",models.CharField(blank=True,default="",max_length=16)),("weekly_cycle_started_at",models.DateTimeField(blank=True,null=True)),
            ("weekly_reset_cron_task_uid",models.CharField(blank=True,default="",max_length=65)),("updated_at",models.DateTimeField(auto_now=True)),
            ("updated_by",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.SET_NULL,related_name="+",to=settings.AUTH_USER_MODEL)),
        ]),
        migrations.CreateModel(name="GlobalContactSettings",fields=[
            ("id",models.PositiveSmallIntegerField(default=1,editable=False,primary_key=True,serialize=False)),
            ("email",models.EmailField(blank=True,default="",max_length=320)),("telegram_url",models.URLField(blank=True,default="",max_length=500)),
            ("updated_at",models.DateTimeField(auto_now=True)),("updated_by",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.SET_NULL,to=settings.AUTH_USER_MODEL)),
        ]),
        migrations.CreateModel(name="PlatformGeneralSettings",fields=[
            ("id",models.PositiveSmallIntegerField(default=1,editable=False,primary_key=True,serialize=False)),("payload",models.JSONField(default=dict)),
            ("updated_at",models.DateTimeField(auto_now=True)),("updated_by",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.SET_NULL,to=settings.AUTH_USER_MODEL)),
        ]),
        migrations.CreateModel(name="PlatformAlert",fields=[
            ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),
            ("level",models.CharField(choices=[("improvement","Melhoria"),("warning","Aviso"),("urgent","Urgente")],default="improvement",max_length=16)),
            ("title",models.CharField(default="Comunicado da plataforma",max_length=180)),("category_label",models.CharField(blank=True,default="",max_length=80)),
            ("message",models.TextField()),("audience",models.CharField(choices=[("all","Todos"),("course","Curso")],default="all",max_length=16)),
            ("is_active",models.BooleanField(default=True)),("created_at",models.DateTimeField(auto_now_add=True)),("updated_at",models.DateTimeField(auto_now=True)),
            ("course",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.CASCADE,related_name="platform_alerts",to="courses.course")),
            ("created_by",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="platform_alerts_created",to=settings.AUTH_USER_MODEL)),
        ],options={"indexes":[models.Index(fields=["is_active","created_at"],name="alert_active_created_idx")]}),
        migrations.CreateModel(name="PlatformAlertDismissal",fields=[
            ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),("dismissed_at",models.DateTimeField(auto_now_add=True)),
            ("alert",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="dismissals",to="platformapp.platformalert")),
            ("user",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="alert_dismissals",to=settings.AUTH_USER_MODEL)),
        ],options={"constraints":[models.UniqueConstraint(fields=("alert","user"),name="alert_user_dismiss_uniq")]}),
        migrations.CreateModel(name="CompetitionRound",fields=[
            ("id",models.CharField(max_length=64,primary_key=True,serialize=False)),("question_ids",models.JSONField(default=list)),
            ("completed_at",models.DateTimeField(blank=True,null=True)),("created_at",models.DateTimeField(auto_now_add=True)),
            ("course",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.SET_NULL,related_name="competition_rounds",to="courses.course")),
            ("user",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="competition_rounds",to=settings.AUTH_USER_MODEL)),
        ],options={"indexes":[models.Index(fields=["user","created_at"],name="comp_round_user_created_idx")]}),
        migrations.CreateModel(name="CompetitionAnswer",fields=[
            ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),("submitted_answer_json",models.JSONField()),
            ("correct",models.BooleanField()),("points_earned",models.IntegerField()),("answered_at",models.DateTimeField(auto_now_add=True)),
            ("course",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.SET_NULL,related_name="competition_answers",to="courses.course")),
            ("question",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="competition_answers",to="knowledge.question")),
            ("round",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="answers",to="platformapp.competitionround")),
            ("user",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="competition_answers",to=settings.AUTH_USER_MODEL)),
        ],options={"indexes":[models.Index(fields=["user","course"],name="comp_user_course_idx"),models.Index(fields=["course","points_earned"],name="comp_ranking_idx")],
        "constraints":[models.UniqueConstraint(fields=("round","question"),name="comp_round_question_uniq")]}),
    ]
