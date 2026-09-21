from django.utils import timezone
from rest_framework.permissions import BasePermission
from .models import CourseEnrollment

def has_active_enrollment(user,course_id=None):
    if not user or not user.is_authenticated:return False
    if user.is_staff:return True
    q=CourseEnrollment.objects.filter(user=user,status="active",start_at__lte=timezone.now(),expires_at__gt=timezone.now())
    return q.filter(course_id=course_id).exists() if course_id else q.exists()

class HasStudyAccess(BasePermission):
    message="É necessária uma matrícula vigente para acessar o conteúdo."
    def has_permission(self,request,view):return has_active_enrollment(request.user)
