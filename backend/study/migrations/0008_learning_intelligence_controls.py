from django.conf import settings
from django.db import migrations,models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies=[
        ("courses","0002_expand_course_catalog"),
        ("study","0007_learning_intelligence"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations=[
        migrations.AddField(
            model_name="studyanswer",
            name="course",
            field=models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.SET_NULL,related_name="study_answers",to="courses.course"),
        ),
        migrations.CreateModel(
            name="LearningIntelligenceSettings",
            fields=[
                ("course",models.OneToOneField(on_delete=django.db.models.deletion.CASCADE,primary_key=True,related_name="learning_intelligence_settings",serialize=False,to="courses.course")),
                ("is_active",models.BooleanField(default=True)),
                ("radar_enabled",models.BooleanField(default=True)),
                ("error_coach_enabled",models.BooleanField(default=True)),
                ("domain_proof_enabled",models.BooleanField(default=True)),
                ("mastery_map_enabled",models.BooleanField(default=True)),
                ("real_exam_enabled",models.BooleanField(default=True)),
                ("telemetry_enabled",models.BooleanField(default=True)),
                ("diagnostic_min_answers",models.PositiveSmallIntegerField(default=5)),
                ("domain_proof_question_count",models.PositiveSmallIntegerField(default=10)),
                ("real_exam_min_questions",models.PositiveSmallIntegerField(default=10)),
                ("real_exam_question_count",models.PositiveSmallIntegerField(default=60)),
                ("validating_score_threshold",models.PositiveSmallIntegerField(default=60)),
                ("retained_score_threshold",models.PositiveSmallIntegerField(default=80)),
                ("retention_min_correct_days",models.PositiveSmallIntegerField(default=2)),
                ("retention_min_span_days",models.PositiveSmallIntegerField(default=2)),
                ("retained_recheck_days",models.PositiveSmallIntegerField(default=14)),
                ("updated_at",models.DateTimeField(auto_now=True)),
                ("updated_by",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.SET_NULL,related_name="+",to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
