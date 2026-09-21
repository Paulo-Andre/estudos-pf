from datetime import timedelta,time
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.test import TestCase
from courses.models import Course,CourseEnrollment
from knowledge.models import Content,CourseDiscipline,Discipline,DisciplineContent,Question,QuestionContentLink
from .advanced_services import (
    course_progress,daily_quick_check,mark_content_opened,queue_review,
    remove_review_item,remove_roadmap_item,resume_content,roadmap_items,save_roadmap_item,
)
from .models import StudyReviewItem,StudyRoadmapItem

class AdvancedStudyTests(TestCase):
    def setUp(self):
        User=get_user_model()
        self.admin=User.objects.create_superuser("root","root@example.com","Admin-F0rte!2026")
        self.user=User.objects.create_user("aluno","a@example.com","Aluno-F0rte!2026")
        self.other=User.objects.create_user("outro","o@example.com","Outro-F0rte!2026")
        self.course=Course.objects.create(id="pf",title="PF",created_by=self.admin)
        CourseEnrollment.objects.create(user=self.user,course=self.course,created_by=self.admin,start_at=timezone.now()-timedelta(days=1),expires_at=timezone.now()+timedelta(days=30))
        self.discipline=Discipline.objects.create(name="Português",short_name="pt",status="published",created_by=self.admin,updated_by=self.admin)
        CourseDiscipline.objects.create(course=self.course,discipline=self.discipline,linked_by=self.admin)
        self.content=Content.objects.create(title="Texto",status="published",created_by=self.admin,updated_by=self.admin)
        DisciplineContent.objects.create(discipline=self.discipline,content=self.content,linked_by=self.admin)
        q=Question.objects.create(statement="Certo?",question_type="certo_errado",difficulty="basic",answer_json=True,status="published",created_by=self.admin,updated_by=self.admin)
        QuestionContentLink.objects.create(question=q,content=self.content,linked_by=self.admin)

    def test_daily_check_is_stable_for_same_day(self):
        first=daily_quick_check(self.user,self.course)
        second=daily_quick_check(self.user,self.course)
        self.assertEqual(first["id"],second["id"])

    def test_resume_points_to_last_opened_content(self):
        mark_content_opened(self.user,self.course,self.content)
        self.assertEqual(resume_content(self.user,self.course).content_id,self.content.id)
        self.assertEqual(course_progress(self.user,self.course).count(),1)

    def test_review_queue_is_upserted_and_owner_can_remove(self):
        first=queue_review(self.user,"q-1",{"a":1})
        second=queue_review(self.user,"q-1",{"a":2})
        self.assertEqual(first.id,second.id)
        second.refresh_from_db()
        self.assertEqual(second.snapshot_json["a"],2)
        with self.assertRaises(StudyReviewItem.DoesNotExist):
            remove_review_item(self.other,second.id)
        self.assertTrue(remove_review_item(self.user,second.id))

    def test_roadmap_is_course_scoped_and_owner_can_remove(self):
        item=save_roadmap_item(self.user,self.course,self.content,self.discipline,2,time(8,30))
        self.assertEqual(list(roadmap_items(self.user,self.course)),[item])
        with self.assertRaises(StudyRoadmapItem.DoesNotExist):
            remove_roadmap_item(self.other,item.id)
        self.assertTrue(remove_roadmap_item(self.user,item.id))
