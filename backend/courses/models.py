from django.conf import settings
from django.db import models
from django.db.models import F,Q

class Course(models.Model):
    class CourseType(models.TextChoices):
        CONTEST="concurso","Concurso"
        TUTORIAL="tutorial","Tutorial"

    id=models.CharField(max_length=80,primary_key=True)
    title=models.CharField(max_length=180)
    track=models.CharField(max_length=32,blank=True,default="")
    course_type=models.CharField(max_length=16,choices=CourseType.choices,default=CourseType.CONTEST)
    course_area=models.CharField(max_length=80,default="Policial/Militar")
    state_code=models.CharField(max_length=32,default="Nacional")
    description=models.TextField(blank=True,default="")
    cover_image_url=models.URLField(max_length=2048,blank=True,default="")
    panel_label=models.CharField(max_length=80,blank=True,default="")
    panel_badge=models.CharField(max_length=80,blank=True,default="")
    panel_title=models.CharField(max_length=240,blank=True,default="")
    panel_description=models.TextField(blank=True,default="")
    panel_cta_text=models.CharField(max_length=80,blank=True,default="")
    is_active=models.BooleanField(default=True)
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,null=True,blank=True,related_name="created_courses")
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)

class CourseEnrollment(models.Model):
    id=models.BigAutoField(primary_key=True)
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="course_enrollments")
    course=models.ForeignKey(Course,on_delete=models.PROTECT,related_name="enrollments")
    start_at=models.DateTimeField()
    expires_at=models.DateTimeField()
    status=models.CharField(max_length=16,choices=[("active","Ativa"),("revoked","Revogada")],default="active")
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name="granted_enrollments")
    source_order_id=models.CharField(max_length=64,null=True,blank=True)
    source_plan_id=models.CharField(max_length=64,null=True,blank=True)
    revoked_at=models.DateTimeField(null=True,blank=True)
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)

    class Meta:
        constraints=[
            models.UniqueConstraint(fields=["user","course"],name="enroll_user_course_uniq"),
            models.CheckConstraint(condition=Q(expires_at__gt=F("start_at")),name="enroll_valid_period"),
        ]
        indexes=[
            models.Index(fields=["user","status"],name="enroll_user_status_idx"),
            models.Index(fields=["expires_at"],name="enroll_expiry_idx"),
            models.Index(fields=["source_order_id"],name="enroll_source_order_idx"),
        ]

class CourseContent(models.Model):
    id=models.BigAutoField(primary_key=True)
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
