from django.conf import settings
from django.db import models

class PlatformAlert(models.Model):
    class Level(models.TextChoices):
        IMPROVEMENT="improvement","Melhoria"
        WARNING="warning","Aviso"
        URGENT="urgent","Urgente"
    class Audience(models.TextChoices):
        ALL="all","Todos"
        COURSE="course","Curso"

    level=models.CharField(max_length=16,choices=Level.choices,default=Level.IMPROVEMENT)
    title=models.CharField(max_length=180,default="Comunicado da plataforma")
    category_label=models.CharField(max_length=80,blank=True,default="")
    message=models.TextField()
    audience=models.CharField(max_length=16,choices=Audience.choices,default=Audience.ALL)
    course=models.ForeignKey("courses.Course",on_delete=models.CASCADE,null=True,blank=True,related_name="platform_alerts")
    is_active=models.BooleanField(default=True)
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name="platform_alerts_created")
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)
    class Meta:
        indexes=[models.Index(fields=["is_active","created_at"],name="alert_active_created_idx")]

class PlatformAlertDismissal(models.Model):
    alert=models.ForeignKey(PlatformAlert,on_delete=models.CASCADE,related_name="dismissals")
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="alert_dismissals")
    dismissed_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["alert","user"],name="alert_user_dismiss_uniq")]

class GlobalContactSettings(models.Model):
    id=models.PositiveSmallIntegerField(primary_key=True,default=1,editable=False)
    email=models.EmailField(max_length=320,blank=True,default="")
    telegram_url=models.URLField(max_length=500,blank=True,default="")
    updated_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.SET_NULL,null=True,blank=True)
    updated_at=models.DateTimeField(auto_now=True)

class PlatformGeneralSettings(models.Model):
    id=models.PositiveSmallIntegerField(primary_key=True,default=1,editable=False)
    payload=models.JSONField(default=dict)
    updated_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.SET_NULL,null=True,blank=True)
    updated_at=models.DateTimeField(auto_now=True)

class CompetitionSettings(models.Model):
    id=models.PositiveSmallIntegerField(primary_key=True,default=1,editable=False)
    points_per_correct=models.IntegerField(default=10)
    points_per_wrong=models.IntegerField(default=0)
    questions_per_round=models.PositiveIntegerField(default=10)
    is_active=models.BooleanField(default=True)
    weekly_cycle_key=models.CharField(max_length=16,blank=True,default="")
    weekly_cycle_started_at=models.DateTimeField(null=True,blank=True)
    weekly_reset_cron_task_uid=models.CharField(max_length=65,blank=True,default="")
    updated_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.SET_NULL,null=True,blank=True,related_name="+")
    updated_at=models.DateTimeField(auto_now=True)

class CompetitionMonthlyGoal(models.Model):
    id=models.PositiveSmallIntegerField(primary_key=True,default=1,editable=False)
    target_points=models.PositiveIntegerField(default=100)
    target_completed_rounds=models.PositiveIntegerField(default=5)
    reward_title=models.CharField(max_length=160,default="Destaque mensal")
    reward_description=models.CharField(max_length=500,default="Reconhecimento definido pela administração para quem concluir a meta do mês.")
    is_active=models.BooleanField(default=True)
    updated_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.SET_NULL,null=True,blank=True,related_name="+")
    updated_at=models.DateTimeField(auto_now=True)

class CompetitionRound(models.Model):
    id=models.CharField(max_length=64,primary_key=True)
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="competition_rounds")
    course=models.ForeignKey("courses.Course",on_delete=models.SET_NULL,null=True,blank=True,related_name="competition_rounds")
    question_ids=models.JSONField(default=list)
    completed_at=models.DateTimeField(null=True,blank=True)
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        indexes=[models.Index(fields=["user","created_at"],name="comp_round_user_created_idx")]

class CompetitionAnswer(models.Model):
    round=models.ForeignKey(CompetitionRound,on_delete=models.CASCADE,related_name="answers")
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="competition_answers")
    question=models.ForeignKey("knowledge.Question",on_delete=models.PROTECT,related_name="competition_answers")
    course=models.ForeignKey("courses.Course",on_delete=models.SET_NULL,null=True,blank=True,related_name="competition_answers")
    submitted_answer_json=models.JSONField()
    correct=models.BooleanField()
    points_earned=models.IntegerField()
    answered_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["round","question"],name="comp_round_question_uniq")]
        indexes=[models.Index(fields=["user","course"],name="comp_user_course_idx"),models.Index(fields=["course","points_earned"],name="comp_ranking_idx")]
