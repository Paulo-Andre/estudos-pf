from django.conf import settings
from django.db import models
from django.db.models import F,Q

class Course(models.Model):
    id=models.CharField(max_length=80,primary_key=True)
    title=models.CharField(max_length=180)
    track=models.CharField(max_length=32,blank=True,default="")
    is_active=models.BooleanField(default=True)
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,null=True,blank=True,related_name="created_courses")
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)

class CourseEnrollment(models.Model):
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="course_enrollments")
    course=models.ForeignKey(Course,on_delete=models.PROTECT,related_name="enrollments")
    start_at=models.DateTimeField()
    expires_at=models.DateTimeField()
    status=models.CharField(max_length=16,choices=[("active","Ativa"),("revoked","Revogada")],default="active")
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name="granted_enrollments")
    revoked_at=models.DateTimeField(null=True,blank=True)
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["user","course"],name="enroll_user_course_uniq"),
                     models.CheckConstraint(condition=Q(expires_at__gt=F("start_at")),name="enroll_valid_period")]

class CourseContent(models.Model):
    course=models.ForeignKey(Course,on_delete=models.CASCADE,related_name="contents")
    module_id=models.CharField(max_length=80)
    discipline=models.CharField(max_length=160,blank=True,default="")
    title=models.CharField(max_length=220)
    summary=models.TextField(blank=True,default="")
    body_json=models.JSONField(default=dict)
    source=models.CharField(max_length=500,blank=True,default="")
    order=models.PositiveIntegerField(default=0)
    is_published=models.BooleanField(default=False)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["course","module_id"],name="course_content_module_uniq")]
        ordering=["order","id"]
