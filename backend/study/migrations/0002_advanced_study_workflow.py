from django.conf import settings
from django.db import migrations,models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies=[("study","0001_initial"),("courses","0002_expand_course_catalog"),("knowledge","0001_initial"),migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations=[
        migrations.AddField(model_name="studyprofile",name="daily_quick_check_date",field=models.DateField(blank=True,null=True)),
        migrations.AddField(model_name="studyprofile",name="daily_quick_check_dismissed",field=models.BooleanField(default=False)),
        migrations.AddField(model_name="studyprofile",name="daily_quick_check_course",field=models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.SET_NULL,related_name="+",to="courses.course")),
        migrations.AddField(model_name="studyprofile",name="daily_quick_check_question",field=models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.SET_NULL,related_name="+",to="knowledge.question")),
        migrations.CreateModel(name="StudyReviewItem",fields=[
            ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),
            ("question_key",models.CharField(max_length=80)),("snapshot_json",models.JSONField(default=dict)),
            ("status",models.CharField(choices=[("pending","Pendente"),("mastered","Dominada")],default="pending",max_length=16)),
            ("created_at",models.DateTimeField(auto_now_add=True)),("reviewed_at",models.DateTimeField(blank=True,null=True)),
            ("user",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="study_review_items",to=settings.AUTH_USER_MODEL)),
        ],options={"indexes":[models.Index(fields=["user","status"],name="review_user_status_idx")],"constraints":[models.UniqueConstraint(fields=("user","question_key"),name="review_user_question_uniq")]}),
        migrations.CreateModel(name="StudyContentProgress",fields=[
            ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),
            ("status",models.CharField(choices=[("started","Iniciado"),("completed","Concluído")],default="started",max_length=16)),
            ("started_at",models.DateTimeField(auto_now_add=True)),("last_opened_at",models.DateTimeField(auto_now=True)),("completed_at",models.DateTimeField(blank=True,null=True)),
            ("content",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="student_progress",to="knowledge.content")),
            ("course",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="student_progress",to="courses.course")),
            ("user",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="content_progress",to=settings.AUTH_USER_MODEL)),
        ],options={"indexes":[models.Index(fields=["user","last_opened_at"],name="progress_user_last_idx")],"constraints":[models.UniqueConstraint(fields=("user","course","content"),name="progress_user_course_content_uniq")]}),
        migrations.CreateModel(name="StudyRoadmapItem",fields=[
            ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),
            ("weekday",models.PositiveSmallIntegerField()),("start_time",models.TimeField()),("is_active",models.BooleanField(default=True)),
            ("created_at",models.DateTimeField(auto_now_add=True)),("updated_at",models.DateTimeField(auto_now=True)),
            ("content",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="roadmap_items",to="knowledge.content")),
            ("course",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="roadmap_items",to="courses.course")),
            ("discipline",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.SET_NULL,related_name="roadmap_items",to="knowledge.discipline")),
            ("user",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="roadmap_items",to=settings.AUTH_USER_MODEL)),
        ],options={"indexes":[models.Index(fields=["user","weekday","start_time"],name="roadmap_user_day_time_idx")],
        "constraints":[models.UniqueConstraint(fields=("user","course","discipline"),name="roadmap_user_course_disc_uniq"),models.CheckConstraint(condition=models.Q(weekday__gte=0,weekday__lte=6),name="roadmap_weekday_valid")]}),
    ]
