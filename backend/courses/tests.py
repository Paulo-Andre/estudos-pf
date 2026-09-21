from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import Course,CourseContent,CourseEnrollment

class CourseAccessTests(APITestCase):
    def setUp(self):
        User=get_user_model()
        self.admin=User.objects.create_superuser(username="root",email="root@example.com",password="Admin-F0rte!2026")
        self.student=User.objects.create_user(username="aluno",email="aluno@example.com",password="Aluno-F0rte!2026")
        self.course=Course.objects.create(id="pf-2025",title="PF 2025",created_by=self.admin)
        CourseContent.objects.create(course=self.course,module_id="lp-01",title="Módulo protegido",body_json={"texto":"segredo"},is_published=True)

    def test_content_requires_active_enrollment(self):
        self.client.force_authenticate(self.student)
        denied=self.client.get("/api/v1/courses/pf-2025/content/")
        self.assertEqual(denied.status_code,403)

        CourseEnrollment.objects.create(
            user=self.student,course=self.course,created_by=self.admin,
            start_at=timezone.now()-timedelta(days=1),
            expires_at=timezone.now()+timedelta(days=30),
        )
        allowed=self.client.get("/api/v1/courses/pf-2025/content/")
        self.assertEqual(allowed.status_code,200)
        self.assertEqual(allowed.data[0]["moduleId"],"lp-01")

    def test_expired_enrollment_is_rejected(self):
        CourseEnrollment.objects.create(
            user=self.student,course=self.course,created_by=self.admin,
            start_at=timezone.now()-timedelta(days=30),
            expires_at=timezone.now()-timedelta(days=1),
        )
        self.client.force_authenticate(self.student)
        response=self.client.get("/api/v1/courses/pf-2025/content/")
        self.assertEqual(response.status_code,403)
