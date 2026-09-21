from django.conf import settings
from django.db import models

class StudyProfile(models.Model):
    id=models.BigAutoField(primary_key=True)
    user=models.OneToOneField(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="study_profile")
    xp=models.PositiveIntegerField(default=0)
    last_study_date=models.DateField(null=True,blank=True)
    study_dates=models.JSONField(default=list)
    used_question_ids=models.JSONField(default=list)

class CompletedModule(models.Model):
    id=models.BigAutoField(primary_key=True)
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="completed_modules")
    module_id=models.CharField(max_length=80)
    completed_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["user","module_id"],name="completed_user_module_uniq")]

class StudyAnswer(models.Model):
    id=models.BigAutoField(primary_key=True)
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="study_answers")
    question_id=models.CharField(max_length=80)
    correct=models.BooleanField()
    answered_at=models.DateTimeField(auto_now_add=True)

class SimulationRecord(models.Model):
    id=models.CharField(max_length=64,primary_key=True)
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="simulation_records")
    completed_at=models.DateTimeField(auto_now_add=True)
    total=models.PositiveIntegerField()
    correct=models.PositiveIntegerField()
    errors=models.PositiveIntegerField()
    elapsed_seconds=models.PositiveIntegerField()
    by_discipline=models.JSONField(default=dict)
    by_block=models.JSONField(default=dict)

class StudyNote(models.Model):
    id=models.BigAutoField(primary_key=True)
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="study_notes")
    module_id=models.CharField(max_length=80)
    content=models.TextField(blank=True,default="")
    class Meta:
        constraints=[models.UniqueConstraint(fields=["user","module_id"],name="note_user_module_uniq")]
