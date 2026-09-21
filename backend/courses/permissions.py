from django.utils import timezone
from rest_framework.permissions import BasePermission
from .models import CourseEnrollment

def active_enrollments(user):
    if not user or not user.is_authenticated:
        return CourseEnrollment.objects.none()
    return CourseEnrollment.objects.filter(
        user=user,status="active",start_at__lte=timezone.now(),expires_at__gt=timezone.now()
    )

def has_active_enrollment(user,course_id=None):
    if not user or not user.is_authenticated:return False
    if user.is_staff:return True
    qs=active_enrollments(user)
    return qs.filter(course_id=course_id).exists() if course_id else qs.exists()

def has_active_contest_enrollment(user,course_id=None):
    if not user or not user.is_authenticated:return False
    if user.is_staff:return True
    qs=active_enrollments(user).filter(course__course_type="concurso")
    return qs.filter(course_id=course_id).exists() if course_id else qs.exists()

class HasStudyAccess(BasePermission):
    message="É necessária uma matrícula vigente para acessar o conteúdo."
    def has_permission(self,request,view):return has_active_enrollment(request.user)

class HasContestAccess(BasePermission):
    message="Este recurso exige matrícula vigente em curso do tipo Concurso."
    def has_permission(self,request,view):return has_active_contest_enrollment(request.user)
