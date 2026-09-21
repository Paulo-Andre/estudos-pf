from django.conf import settings
from django.db import migrations,models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies=[
        ("study","0002_advanced_study_workflow"),
        ("courses","0002_expand_course_catalog"),
        ("knowledge","0002_question_legacy_key"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations=[
        migrations.CreateModel(
            name="StudyBookmark",
            fields=[
                ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),
                ("note",models.CharField(blank=True,default="",max_length=240)),
                ("created_at",models.DateTimeField(auto_now_add=True)),
                ("content",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="bookmarks",to="knowledge.content")),
                ("course",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="bookmarks",to="courses.course")),
                ("user",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="study_bookmarks",to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "indexes":[models.Index(fields=["user","-created_at"],name="bookmark_user_created_idx")],
                "constraints":[models.UniqueConstraint(fields=("user","course","content"),name="bookmark_user_course_content_uniq")],
            },
        ),
    ]
