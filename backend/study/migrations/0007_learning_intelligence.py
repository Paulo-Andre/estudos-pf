from django.db import migrations,models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies=[
        ("courses","0002_expand_course_catalog"),
        ("study","0006_answer_confidence"),
    ]
    operations=[
        migrations.AddField(
            model_name="simulationrecord",
            name="course",
            field=models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.SET_NULL,related_name="simulation_records",to="courses.course"),
        ),
        migrations.AddField(
            model_name="simulationrecord",
            name="mode",
            field=models.CharField(choices=[("practice","Treino"),("domain","Prova de domínio"),("real_exam","Prova real")],default="practice",max_length=16),
        ),
        migrations.AddField(
            model_name="simulationrecord",
            name="telemetry_json",
            field=models.JSONField(default=dict),
        ),
        migrations.CreateModel(
            name="StudySyllabusSnapshot",
            fields=[
                ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),
                ("version",models.PositiveIntegerField()),
                ("fingerprint",models.CharField(max_length=64)),
                ("items_json",models.JSONField(default=list)),
                ("change_summary_json",models.JSONField(default=dict)),
                ("created_at",models.DateTimeField(auto_now_add=True)),
                ("course",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="study_syllabus_snapshots",to="courses.course")),
            ],
            options={
                "indexes":[models.Index(fields=["course","-version"],name="syllabus_course_version_idx")],
                "constraints":[
                    models.UniqueConstraint(fields=("course","version"),name="syllabus_course_version_uniq"),
                    models.UniqueConstraint(fields=("course","fingerprint"),name="syllabus_course_fingerprint_uniq"),
                ],
            },
        ),
    ]
