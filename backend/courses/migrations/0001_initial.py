from django.conf import settings
from django.db import migrations,models
import django.db.models.deletion
class Migration(migrations.Migration):
 initial=True
 dependencies=[migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
 operations=[
  migrations.CreateModel(name="Course",fields=[
   ("id",models.CharField(max_length=80,primary_key=True,serialize=False)),("title",models.CharField(max_length=180)),
   ("track",models.CharField(blank=True,default="",max_length=32)),("is_active",models.BooleanField(default=True)),
   ("created_at",models.DateTimeField(auto_now_add=True)),("updated_at",models.DateTimeField(auto_now=True)),
   ("created_by",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.PROTECT,related_name="created_courses",to=settings.AUTH_USER_MODEL))]),
  migrations.CreateModel(name="CourseContent",fields=[
   ("id",models.BigAutoField(primary_key=True,serialize=False)),("module_id",models.CharField(max_length=80)),
   ("discipline",models.CharField(blank=True,default="",max_length=160)),("title",models.CharField(max_length=220)),
   ("summary",models.TextField(blank=True,default="")),("body_json",models.JSONField(default=dict)),
   ("source",models.CharField(blank=True,default="",max_length=500)),("order",models.PositiveIntegerField(default=0)),
   ("is_published",models.BooleanField(default=False)),("course",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="contents",to="courses.course"))],
   options={"ordering":["order","id"],"constraints":[models.UniqueConstraint(fields=("course","module_id"),name="course_content_module_uniq")]}),
  migrations.CreateModel(name="CourseEnrollment",fields=[
   ("id",models.BigAutoField(primary_key=True,serialize=False)),("start_at",models.DateTimeField()),("expires_at",models.DateTimeField()),
   ("status",models.CharField(choices=[("active","Ativa"),("revoked","Revogada")],default="active",max_length=16)),
   ("revoked_at",models.DateTimeField(blank=True,null=True)),("created_at",models.DateTimeField(auto_now_add=True)),("updated_at",models.DateTimeField(auto_now=True)),
   ("course",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="enrollments",to="courses.course")),
   ("created_by",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="granted_enrollments",to=settings.AUTH_USER_MODEL)),
   ("user",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="course_enrollments",to=settings.AUTH_USER_MODEL))],
   options={"constraints":[models.UniqueConstraint(fields=("user","course"),name="enroll_user_course_uniq"),
   models.CheckConstraint(condition=models.Q(expires_at__gt=models.F("start_at")),name="enroll_valid_period")]})
 ]
