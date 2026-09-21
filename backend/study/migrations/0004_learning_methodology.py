from django.db import migrations,models
import django.utils.timezone

class Migration(migrations.Migration):
    dependencies=[("study","0003_study_bookmarks")]
    operations=[
        migrations.AddField(model_name="studyreviewitem",name="source",field=models.CharField(default="manual",max_length=24)),
        migrations.AddField(model_name="studyreviewitem",name="due_at",field=models.DateTimeField(blank=True,default=django.utils.timezone.now,null=True)),
        migrations.AddField(model_name="studyreviewitem",name="interval_days",field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name="studyreviewitem",name="ease_factor",field=models.FloatField(default=2.5)),
        migrations.AddField(model_name="studyreviewitem",name="repetitions",field=models.PositiveSmallIntegerField(default=0)),
        migrations.AddField(model_name="studyreviewitem",name="lapse_count",field=models.PositiveSmallIntegerField(default=0)),
        migrations.AddField(model_name="studyreviewitem",name="last_rating",field=models.CharField(blank=True,default="",max_length=16)),
        migrations.AddIndex(model_name="studyreviewitem",index=models.Index(fields=["user","status","due_at"],name="review_user_due_idx")),
    ]
