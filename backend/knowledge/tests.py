from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase
from courses.models import Course,CourseEnrollment
from .models import Content,CourseDiscipline,Discipline,DisciplineContent,Question,QuestionContentLink,ReviewQueue
from .services import can_use_question,decide_review,submit_for_review

class KnowledgeTests(APITestCase):
    def setUp(self):
        User=get_user_model()
        self.admin=User.objects.create_superuser("root","root@example.com","Admin-F0rte!2026")
        self.student=User.objects.create_user("aluno","aluno@example.com","Aluno-F0rte!2026")
        self.course=Course.objects.create(id="pf",title="PF",created_by=self.admin)
        self.discipline=Discipline.objects.create(name="Português",short_name="port",created_by=self.admin,updated_by=self.admin,status="published")
        CourseDiscipline.objects.create(course=self.course,discipline=self.discipline,linked_by=self.admin)
        self.content=Content.objects.create(title="Interpretação",body="conteúdo protegido",created_by=self.admin,updated_by=self.admin,status="published")
        DisciplineContent.objects.create(discipline=self.discipline,content=self.content,linked_by=self.admin)
        self.question=Question.objects.create(statement="Questão?",answer_json={"value":True},created_by=self.admin,updated_by=self.admin,status="published")
        QuestionContentLink.objects.create(question=self.question,content=self.content,linked_by=self.admin)

    def test_library_requires_enrollment(self):
        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.get("/api/v1/knowledge/courses/pf/library/").status_code,403)
        CourseEnrollment.objects.create(user=self.student,course=self.course,created_by=self.admin,start_at=timezone.now()-timedelta(days=1),expires_at=timezone.now()+timedelta(days=30))
        response=self.client.get("/api/v1/knowledge/courses/pf/library/")
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.data[0]["contents"][0]["title"],"Interpretação")

    def test_review_decision_is_single_use(self):
        review=submit_for_review("question",self.question.id,self.admin)
        decided=decide_review(review.id,self.admin,"approved","ok")
        self.assertEqual(decided.status,"approved")
        with self.assertRaises(ValueError):
            decide_review(review.id,self.admin,"rejected","late")

    def test_review_required_question_is_not_used_until_approved(self):
        self.question.requires_review=True
        self.question.status="review"
        self.question.save()
        self.assertFalse(can_use_question(self.question))
        self.question.status="approved"
        self.assertTrue(can_use_question(self.question))
