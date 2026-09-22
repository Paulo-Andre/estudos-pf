from datetime import timedelta
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from courses.models import Course,CourseEnrollment
from knowledge.models import Content,CourseDiscipline,Discipline,DisciplineContent,Question,QuestionContentLink
from .advanced_services import queue_review,rate_review
from .intelligence_services import learning_intelligence
from .learning_services import learning_plan
from .models import SimulationRecord,StudyAnswer,StudyContentProgress,StudyReviewItem,StudySyllabusSnapshot


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


    def test_learning_plan_builds_interleaved_session(self):
        plan=learning_plan(self.user,self.course)
        self.assertEqual(plan["sessionPlan"]["totalMinutes"],50)
        self.assertEqual(plan["sessionPlan"]["intensity"],"base")
        self.assertEqual(sum(block["minutes"] for block in plan["sessionPlan"]["blocks"]),50)
        self.assertIn("Constitucional",plan["interleaving"]["disciplines"])

    def test_confidence_is_saved_and_used_for_metacognition(self):
        client=APIClient();client.force_authenticate(self.user)
        for _ in range(5):
            response=client.post("/api/v1/study/answer/",{
                "questionId":f"central-{self.question.pk}",
                "correct":False,
                "confidence":3,
            },format="json")
            self.assertEqual(response.status_code,200)
        plan=learning_plan(self.user,self.course)
        self.assertEqual(plan["metacognition"]["sample"],5)
        self.assertEqual(plan["metacognition"]["label"],"excesso_de_confianca")
        self.assertEqual(plan["metacognition"]["overconfident"],5)

    def test_invalid_confidence_is_rejected(self):
        client=APIClient();client.force_authenticate(self.user)
        response=client.post("/api/v1/study/answer/",{
            "questionId":f"central-{self.question.pk}",
            "correct":True,
            "confidence":5,
        },format="json")
        self.assertEqual(response.status_code,400)

    def test_learning_intelligence_creates_radar_and_mastery_map(self):
        client=APIClient();client.force_authenticate(self.user)
        response=client.get(f"/api/v1/study/intelligence/?courseId={self.course.id}")
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.data["radar"]["version"],1)
        self.assertEqual(response.data["radar"]["totalTopics"],1)
        self.assertEqual(response.data["mastery"]["disciplines"][0]["discipline"],"Constitucional")
        self.assertEqual(StudySyllabusSnapshot.objects.filter(course=self.course).count(),1)

    def test_radar_versions_when_published_content_changes(self):
        first=learning_intelligence(self.user,self.course)
        self.assertEqual(first["radar"]["version"],1)
        self.content.title="Direitos fundamentais e garantias"
        self.content.save()
        second=learning_intelligence(self.user,self.course)
        self.assertEqual(second["radar"]["version"],2)
        self.assertEqual(second["radar"]["changes"]["updatedCount"],1)
        self.assertEqual(StudySyllabusSnapshot.objects.filter(course=self.course).count(),2)

    def test_error_coach_detects_overconfidence(self):
        client=APIClient();client.force_authenticate(self.user)
        for _ in range(5):
            response=client.post("/api/v1/study/answer/",{
                "questionId":f"central-{self.question.pk}",
                "correct":False,
                "confidence":3,
            },format="json")
            self.assertEqual(response.status_code,200)
        intelligence=learning_intelligence(self.user,self.course)
        self.assertEqual(intelligence["errorCoach"]["primaryPattern"]["id"],"overconfidence")
        self.assertEqual(intelligence["errorCoach"]["wrong"],5)

    def test_mastery_requires_spaced_evidence_for_retention(self):
        StudyContentProgress.objects.create(
            user=self.user,course=self.course,content=self.content,
            status=StudyContentProgress.Status.COMPLETED,completed_at=timezone.now(),
        )
        answers=[
            StudyAnswer.objects.create(
                user=self.user,question_id=f"central-{self.question.pk}",correct=True,confidence=3,
            )
            for _ in range(5)
        ]
        StudyAnswer.objects.filter(pk__in=[item.pk for item in answers[:3]]).update(answered_at=timezone.now()-timedelta(days=3))
        intelligence=learning_intelligence(self.user,self.course)
        topic=intelligence["mastery"]["disciplines"][0]["topics"][0]
        self.assertEqual(topic["state"],"retained")
        self.assertGreaterEqual(topic["score"],80)
        self.assertEqual(topic["correctDays"],2)

    def test_real_exam_telemetry_is_sanitized_and_summarized(self):
        client=APIClient();client.force_authenticate(self.user)
        response=client.post("/api/v1/study/simulation/",{
            "id":"sim-real-telemetry",
            "courseId":self.course.id,
            "mode":"real_exam",
            "total":2,
            "correct":1,
            "errors":1,
            "elapsedSeconds":75,
            "byDiscipline":{"Constitucional":{"correct":1,"total":2}},
            "byBlock":{"I":{"correct":1,"total":2}},
            "questionIds":["a","b"],
            "answers":[
                {"questionId":"a","correct":True,"confidence":3},
                {"questionId":"b","correct":False,"confidence":3},
            ],
            "telemetry":{"questions":[
                {"questionId":"a","elapsedMs":20000,"changes":1,"confidence":3,"correct":True,"discipline":"Constitucional","subject":"Direitos fundamentais"},
                {"questionId":"b","elapsedMs":55000,"changes":0,"confidence":3,"correct":False,"discipline":"Constitucional","subject":"Direitos fundamentais"},
            ]},
        },format="json")
        self.assertEqual(response.status_code,200)
        record=SimulationRecord.objects.get(pk="sim-real-telemetry")
        self.assertEqual(record.course,self.course)
        self.assertEqual(record.mode,SimulationRecord.Mode.REAL_EXAM)
        self.assertEqual(record.telemetry_json["summary"]["answerChanges"],1)
        self.assertEqual(record.telemetry_json["summary"]["highConfidenceErrors"],1)
        self.assertEqual(record.telemetry_json["summary"]["performanceDrop"],100)
