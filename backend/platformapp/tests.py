from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase
from courses.models import Course,CourseEnrollment
from knowledge.models import Question
from .models import PlatformAlert
from .services import answer_competition_round,start_competition_round,visible_alerts

class PlatformTests(APITestCase):
    def setUp(self):
        User=get_user_model()
        self.admin=User.objects.create_superuser("root","root@example.com","Admin-F0rte!2026")
        self.student=User.objects.create_user("aluno","aluno@example.com","Aluno-F0rte!2026")
        self.course=Course.objects.create(id="pf",title="PF",created_by=self.admin)
        self.question=Question.objects.create(statement="Certo?",answer_json=True,status="published",created_by=self.admin,updated_by=self.admin)

    def test_course_alert_requires_active_enrollment(self):
        PlatformAlert.objects.create(message="aviso",audience="course",course=self.course,created_by=self.admin)
        self.assertEqual(len(visible_alerts(self.student)),0)
        CourseEnrollment.objects.create(user=self.student,course=self.course,created_by=self.admin,start_at=timezone.now()-timedelta(days=1),expires_at=timezone.now()+timedelta(days=2))
        self.assertEqual(len(visible_alerts(self.student)),1)

    def test_competition_answer_is_unique_per_round_question(self):
        r=start_competition_round(self.admin,None,1)
        first=answer_competition_round(self.admin,r.id,self.question.id,True)
        self.assertTrue(first.correct)
        with self.assertRaises(Exception):
            answer_competition_round(self.admin,r.id,self.question.id,True)
