from django.db import migrations,models

class Migration(migrations.Migration):
    dependencies=[("study","0005_simulation_reflection")]
    operations=[
        migrations.AddField(
            model_name="studyanswer",
            name="confidence",
            field=models.PositiveSmallIntegerField(blank=True,null=True),
        ),
        migrations.AddConstraint(
            model_name="studyanswer",
            constraint=models.CheckConstraint(
                condition=models.Q(confidence__isnull=True)|models.Q(confidence__gte=1,confidence__lte=3),
                name="study_answer_confidence_valid",
            ),
        ),
    ]
