from django.conf import settings
from django.db import migrations,models
import django.db.models.deletion
class Migration(migrations.Migration):
 initial=True
 dependencies=[migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
 operations=[
  migrations.CreateModel(name="StudyProfile",fields=[("id",models.BigAutoField(primary_key=True,serialize=False)),("xp",models.PositiveIntegerField(default=0)),
   ("last_study_date",models.DateField(blank=True,null=True)),("study_dates",models.JSONField(default=list)),("used_question_ids",models.JSONField(default=list)),
   ("user",models.OneToOneField(on_delete=django.db.models.deletion.CASCADE,related_name="study_profile",to=settings.AUTH_USER_MODEL))]),
  migrations.CreateModel(name="CompletedModule",fields=[("id",models.BigAutoField(primary_key=True,serialize=False)),("module_id",models.CharField(max_length=80)),
   ("completed_at",models.DateTimeField(auto_now_add=True)),("user",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="completed_modules",to=settings.AUTH_USER_MODEL))],
   options={"constraints":[models.UniqueConstraint(fields=("user","module_id"),name="completed_user_module_uniq")]}),
  migrations.CreateModel(name="StudyAnswer",fields=[("id",models.BigAutoField(primary_key=True,serialize=False)),("question_id",models.CharField(max_length=80)),
   ("correct",models.BooleanField()),("answered_at",models.DateTimeField(auto_now_add=True)),("user",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="study_answers",to=settings.AUTH_USER_MODEL))]),
  migrations.CreateModel(name="SimulationRecord",fields=[("id",models.CharField(max_length=64,primary_key=True,serialize=False)),("completed_at",models.DateTimeField(auto_now_add=True)),
   ("total",models.PositiveIntegerField()),("correct",models.PositiveIntegerField()),("errors",models.PositiveIntegerField()),("elapsed_seconds",models.PositiveIntegerField()),
   ("by_discipline",models.JSONField(default=dict)),("by_block",models.JSONField(default=dict)),("user",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="simulation_records",to=settings.AUTH_USER_MODEL))]),
  migrations.CreateModel(name="StudyNote",fields=[("id",models.BigAutoField(primary_key=True,serialize=False)),("module_id",models.CharField(max_length=80)),("content",models.TextField(blank=True,default="")),
   ("user",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="study_notes",to=settings.AUTH_USER_MODEL))],
   options={"constraints":[models.UniqueConstraint(fields=("user","module_id"),name="note_user_module_uniq")]})
 ]
