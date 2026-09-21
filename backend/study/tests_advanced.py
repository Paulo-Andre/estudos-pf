from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.test import TestCase
from courses.models import Course,CourseEnrollment
from knowledge.models import Content,CourseDiscipline,Discipline,DisciplineContent,Question,QuestionContentLink
from .advanced_services import (
    course_progress_payload,daily_quick_check,mark_content_opened,queue_review,
    remove_review_item,remove_roadmap_item,resume_content,roadmap_items,save_roadmap_item,
)
from .models import StudyBookmark,StudyReviewItem,StudyRoadmapItem

class AdvancedStudyTests(TestCase):
    def setUp(self):
        User=get_user_model()
        self.admin=User.objects.create_superuser("root","root@example.com","Admin-F0rte!2026")
        self.user=User.objects.create_user("aluno","a@example.com","Aluno-F0rte!2026")
        self.other=User.objects.create_user("outro","o@example.com","Outro-F0rte!2026")
        self.course=Course.objects.create(id="pf",title="PF",created_by=self.admin)
        CourseEnrollment.objects.create(
            user=self.user,course=self.course,created_by=self.admin,
            start_at=timezone.now()-timedelta(days=1),expires_at=timezone.now()+timedelta(days=30),
        )
        self.discipline=Discipline.objects.create(
            name="Português",short_name="pt",status="published",created_by=self.admin,updated_by=self.admin,
        )
        CourseDiscipline.objects.create(course=self.course,discipline=self.discipline,linked_by=self.admin)
        self.content=Content.objects.create(title="Texto",status="published",created_by=self.admin,updated_by=self.admin)
        DisciplineContent.objects.create(discipline=self.discipline,content=self.content,linked_by=self.admin)
        q=Question.objects.create(
            statement="Certo?",question_type="certo_errado",difficulty="basic",answer_json=True,
            status="published",created_by=self.admin,updated_by=self.admin,
        )
        QuestionContentLink.objects.create(question=q,content=self.content,linked_by=self.admin)

    def test_daily_check_is_stable_for_same_day(self):
        first=daily_quick_check(self.user,self.course)
        second=daily_quick_check(self.user,self.course)
        self.assertEqual(first["id"],second["id"])

    def test_progress_payload_and_resume(self):
        mark_content_opened(self.user,self.course,self.content)
        payload=course_progress_payload(self.user,self.course)
        self.assertEqual(payload["courseId"],self.course.id)
        self.assertEqual(len(payload["contents"]),1)
        self.assertEqual(payload["contents"][0]["progress"]["status"],"started")
        self.assertEqual(payload["continueItem"]["id"],self.content.id)
        self.assertEqual(resume_content(self.user,self.course).content_id,self.content.id)

    def test_review_queue_is_upserted_and_owner_can_remove(self):
        first=queue_review(self.user,"q-1",{"a":1})
        second=queue_review(self.user,"q-1",{"a":2})
        self.assertEqual(first.id,second.id)
        second.refresh_from_db()
        self.assertEqual(second.snapshot_json["a"],2)
        with self.assertRaises(StudyReviewItem.DoesNotExist):
            remove_review_item(self.other,second.id)
        self.assertTrue(remove_review_item(self.user,second.id))

    def test_roadmap_matches_existing_contract_and_owner_can_remove(self):
        rows=save_roadmap_item(self.user,self.course,self.discipline,2,True)
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]["disciplineId"],self.discipline.id)
        self.assertEqual(rows[0]["contentId"],self.content.id)
        self.assertEqual(rows[0]["startTime"],"00:00")
        item=StudyRoadmapItem.objects.get(pk=rows[0]["id"])
        self.assertEqual(list(roadmap_items(self.user,self.course)),[item])
        with self.assertRaises(StudyRoadmapItem.DoesNotExist):
            remove_roadmap_item(self.other,item.id)
        self.assertTrue(remove_roadmap_item(self.user,item.id))


class StudyProductivityApiTests(TestCase):
    def setUp(self):
        User=get_user_model()
        self.admin=User.objects.create_superuser("admin-productivity","admin-productivity@example.com","Admin-F0rte!2026")
        self.user=User.objects.create_user("bookmark-user","bookmark@example.com","Aluno-F0rte!2026")
        self.other=User.objects.create_user("bookmark-other","bookmark2@example.com","Aluno-F0rte!2026")
        self.course=Course.objects.create(id="bookmark-course",title="Curso",created_by=self.admin)
        CourseEnrollment.objects.create(user=self.user,course=self.course,created_by=self.admin,start_at=timezone.now()-timedelta(days=1),expires_at=timezone.now()+timedelta(days=30))
        CourseEnrollment.objects.create(user=self.other,course=self.course,created_by=self.admin,start_at=timezone.now()-timedelta(days=1),expires_at=timezone.now()+timedelta(days=30))
        self.discipline=Discipline.objects.create(name="Disciplina",short_name="bookmark-disc",status="published",created_by=self.admin,updated_by=self.admin)
        CourseDiscipline.objects.create(course=self.course,discipline=self.discipline,linked_by=self.admin)
        self.content=Content.objects.create(title="Favorito",status="published",created_by=self.admin,updated_by=self.admin)
        DisciplineContent.objects.create(discipline=self.discipline,content=self.content,linked_by=self.admin)

    def test_bookmarks_are_private_to_each_user(self):
        client=__import__("rest_framework.test",fromlist=["APIClient"]).APIClient()
        client.force_authenticate(self.user)
        created=client.post("/api/v1/study/bookmarks/",{"courseId":self.course.id,"contentId":self.content.id,"note":"Revisar"},format="json")
        self.assertEqual(created.status_code,201)
        self.assertEqual(client.get("/api/v1/study/bookmarks/").data[0]["note"],"Revisar")
        other=__import__("rest_framework.test",fromlist=["APIClient"]).APIClient();other.force_authenticate(self.other)
        self.assertEqual(other.get("/api/v1/study/bookmarks/").data,[])
        self.assertEqual(other.delete(f"/api/v1/study/bookmarks/{created.data['id']}/").status_code,404)
        self.assertTrue(StudyBookmark.objects.filter(user=self.user).exists())

    def test_weekly_goal_endpoint_returns_targets_and_progress(self):
        client=__import__("rest_framework.test",fromlist=["APIClient"]).APIClient();client.force_authenticate(self.user)
        response=client.get("/api/v1/study/weekly-goal/")
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.data["questions"]["target"],50)
        self.assertEqual(response.data["days"]["target"],5)
