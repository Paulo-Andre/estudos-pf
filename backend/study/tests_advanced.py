from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.test import TestCase
from courses.models import Course,CourseEnrollment
from knowledge.models import Content,CourseDiscipline,Discipline,DisciplineContent,Question,QuestionContentLink
from .advanced_services import daily_quick_check,mark_content_opened,queue_review,resume_content

class AdvancedStudyTests(TestCase):
    def setUp(self):
        User=get_user_model()
        self.admin=User.objects.create_superuser("root","root@example.com","Admin-F0rte!2026")
        self.user=User.objects.create_user("aluno","a@example.com","Aluno-F0rte!2026")
        self.course=Course.objects.create(id="pf",title="PF",created_by=self.admin)
        CourseEnrollment.objects.create(user=self.user,course=self.course,created_by=self.admin,start_at=timezone.now()-timedelta(days=1),expires_at=timezone.now()+timedelta(days=30))
        d=Discipline.objects.create(name="Português",short_name="pt",status="published",created_by=self.admin,updated_by=self.admin)
        CourseDiscipline.objects.create(course=self.course,discipline=d,linked_by=self.admin)
        self.content=Content.objects.create(title="Texto",status="published",created_by=self.admin,updated_by=self.admin)
        DisciplineContent.objects.create(discipline=d,content=self.content,linked_by=self.admin)
        q=Question.objects.create(statement="Certo?",question_type="certo_errado",difficulty="basic",answer_json=True,status="published",created_by=self.admin,updated_by=self.admin)
        QuestionContentLink.objects.create(question=q,content=self.content,linked_by=self.admin)

    def test_daily_check_is_stable_for_same_day(self):
        first=daily_quick_check(self.user,self.course)
        second=daily_quick_check(self.user,self.course)
        self.assertEqual(first["id"],second["id"])

    def test_resume_points_to_last_opened_content(self):
        mark_content_opened(self.user,self.course,self.content)
        self.assertEqual(resume_content(self.user,self.course).content_id,self.content.id)

    def test_review_queue_is_upserted_per_question(self):
        first=queue_review(self.user,"q-1",{"a":1})
        second=queue_review(self.user,"q-1",{"a":2})
        self.assertEqual(first.id,second.id)
        second.refresh_from_db()
        self.assertEqual(second.snapshot_json["a"],2)
