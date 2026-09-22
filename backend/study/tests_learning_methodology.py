from datetime import timedelta
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from courses.models import Course,CourseEnrollment
from knowledge.models import Content,CourseDiscipline,Discipline,DisciplineContent,Question,QuestionContentLink
from .advanced_services import queue_review,rate_review
from .learning_services import learning_plan
from .models import SimulationRecord,SimulationReflection,StudyReviewItem


class LearningMethodologyTests(TestCase):
    def setUp(self):
        User=get_user_model()
        self.admin=User.objects.create_superuser("pedagogy-admin","pedagogy-admin@example.com","Admin-F0rte!2026")
        self.user=User.objects.create_user("pedagogy-user","pedagogy@example.com","Aluno-F0rte!2026")
        self.course=Course.objects.create(id="pedagogy-course",title="Curso Metodologia",created_by=self.admin)
        CourseEnrollment.objects.create(user=self.user,course=self.course,created_by=self.admin,start_at=timezone.now()-timedelta(days=1),expires_at=timezone.now()+timedelta(days=30))
        self.discipline=Discipline.objects.create(name="Constitucional",short_name="const-ped",status="published",created_by=self.admin,updated_by=self.admin)
        CourseDiscipline.objects.create(course=self.course,discipline=self.discipline,linked_by=self.admin)
        self.content=Content.objects.create(title="Direitos fundamentais",status="published",created_by=self.admin,updated_by=self.admin)
        DisciplineContent.objects.create(discipline=self.discipline,content=self.content,linked_by=self.admin)
        self.question=Question.objects.create(statement="A Constituição protege direitos fundamentais?",question_type="certo_errado",answer_json=True,explanation="Sim.",status="published",created_by=self.admin,updated_by=self.admin)
        QuestionContentLink.objects.create(question=self.question,content=self.content,linked_by=self.admin)

    def test_spaced_repetition_schedules_review_by_rating(self):
        item=queue_review(self.user,f"central-{self.question.pk}",{"statement":self.question.statement},"manual")
        self.assertLessEqual(item.due_at,timezone.now()+timedelta(seconds=2))
        again=rate_review(self.user,item.id,"again")
        self.assertEqual(again.interval_days,0)
        self.assertGreater(again.due_at,timezone.now())
        again.due_at=timezone.now()-timedelta(seconds=1);again.save(update_fields=["due_at"])
        good=rate_review(self.user,item.id,"good")
        self.assertEqual(good.interval_days,3)
        self.assertEqual(good.repetitions,1)

    def test_learning_plan_prioritizes_due_review(self):
        queue_review(self.user,f"central-{self.question.pk}",{"statement":self.question.statement,"discipline":"Constitucional"},"manual")
        plan=learning_plan(self.user,self.course)
        self.assertEqual(plan["method"]["name"],"Ciclo de Domínio")
        self.assertEqual(plan["nextAction"]["type"],"review")
        self.assertEqual(len(plan["dueReviews"]),1)
        self.assertIn("readiness",plan["metrics"])

    def test_wrong_answer_is_automatically_queued_for_review(self):
        client=APIClient();client.force_authenticate(self.user)
        response=client.post("/api/v1/study/answer/",{"questionId":f"central-{self.question.pk}","correct":False},format="json")
        self.assertEqual(response.status_code,200)
        item=StudyReviewItem.objects.get(user=self.user)
        self.assertEqual(item.source,"answer_error")
        self.assertEqual(item.status,"pending")

    def test_review_rating_endpoint(self):
        item=queue_review(self.user,f"central-{self.question.pk}",{"statement":self.question.statement},"manual")
        client=APIClient();client.force_authenticate(self.user)
        response=client.post(f"/api/v1/study/review/{item.id}/rate/",{"rating":"easy"},format="json")
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.data["lastRating"],"easy")
        self.assertGreaterEqual(response.data["intervalDays"],7)


    def test_learning_plan_exposes_exam_horizon(self):
        from accounts.models import AccountPreferences
        prefs,_=AccountPreferences.objects.get_or_create(user=self.user)
        prefs.exam_date=timezone.localdate()+timedelta(days=21)
        prefs.save(update_fields=["exam_date"])
        plan=learning_plan(self.user,self.course)
        self.assertEqual(plan["metrics"]["examDays"],21)
        self.assertEqual(plan["metrics"]["intensity"],"reta_final")


    def test_simulation_reflection_is_private_and_persisted(self):
        simulation=SimulationRecord.objects.create(id="meta-sim-1",user=self.user,total=10,correct=7,errors=3,elapsed_seconds=600,by_discipline={},by_block={})
        client=APIClient();client.force_authenticate(self.user)
        response=client.put("/api/v1/study/simulations/meta-sim-1/reflection/",{
            "confidence":4,"primaryCause":"interpretation","nextAction":"review","note":"Ler o enunciado com mais calma."
        },format="json")
        self.assertEqual(response.status_code,200)
        reflection=SimulationReflection.objects.get(simulation=simulation)
        self.assertEqual(reflection.confidence,4)
        self.assertEqual(reflection.primary_cause,"interpretation")
        state_response=client.get("/api/v1/study/state/")
        record=next(item for item in state_response.data["simulations"] if item["id"]=="meta-sim-1")
        self.assertEqual(record["reflection"]["nextAction"],"review")

        other=get_user_model().objects.create_user("other-meta","other-meta@example.com","Aluno-F0rte!2026")
        CourseEnrollment.objects.create(user=other,course=self.course,created_by=self.admin,start_at=timezone.now()-timedelta(days=1),expires_at=timezone.now()+timedelta(days=30))
        other_client=APIClient();other_client.force_authenticate(other)
        forbidden=other_client.get("/api/v1/study/simulations/meta-sim-1/reflection/")
        self.assertEqual(forbidden.status_code,404)

    def test_simulation_reflection_validates_choices(self):
        SimulationRecord.objects.create(id="meta-sim-2",user=self.user,total=10,correct=5,errors=5,elapsed_seconds=700,by_discipline={},by_block={})
        client=APIClient();client.force_authenticate(self.user)
        invalid=client.put("/api/v1/study/simulations/meta-sim-2/reflection/",{
            "confidence":9,"primaryCause":"unknown","nextAction":"review"
        },format="json")
        self.assertEqual(invalid.status_code,400)
