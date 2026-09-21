from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Course,CourseEnrollment,CourseContent
from .permissions import has_active_enrollment

def enrollment_json(e):
    now=timezone.now()
    computed="revoked" if e.status=="revoked" else ("scheduled" if e.start_at>now else ("expired" if e.expires_at<=now else "active"))
    return {"id":e.id,"userId":e.user_id,"courseId":e.course_id,"startAt":e.start_at,"expiresAt":e.expires_at,"status":e.status,"computedStatus":computed}

class CourseListView(APIView):
    def get(self,request):
        qs=Course.objects.filter(is_active=True)
        if not request.user.is_staff:
            qs=qs.filter(enrollments__user=request.user,enrollments__status="active",enrollments__start_at__lte=timezone.now(),enrollments__expires_at__gt=timezone.now()).distinct()
        return Response([{"id":c.id,"title":c.title,"track":c.track,"isActive":c.is_active} for c in qs])

class AccessView(APIView):
    def get(self,request):return Response([enrollment_json(e) for e in request.user.course_enrollments.all()])

class ContentView(APIView):
    def get(self,request,course_id):
        if not has_active_enrollment(request.user,course_id):return Response({"detail":"Matrícula vigente necessária."},status=403)
        qs=CourseContent.objects.filter(course_id=course_id,is_published=True)
        return Response([{"id":x.id,"moduleId":x.module_id,"discipline":x.discipline,"title":x.title,"summary":x.summary,"body":x.body_json,"source":x.source} for x in qs])
