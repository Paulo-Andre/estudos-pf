import json
import tempfile
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from courses.models import CourseEnrollment
from knowledge.models import Question

class ProtectedSeedImportTests(TestCase):
    def setUp(self):
        User=get_user_model()
        self.admin=User.objects.create_superuser(username="root",email="root@example.com",password="Root-F0rte!2026")
        self.student=User.objects.create_user(username="student",email="student@example.com",password="Aluno-F0rte!2026")

    def _seed_file(self):
        data={
            "activeContestId":"pf-agente",
            "contestCatalog":[{"id":"pf-agente","name":"Polícia Federal","role":"Agente","description":"Curso"}],
            "disciplineCatalog":[{"id":"lingua-portuguesa","name":"Língua Portuguesa","description":"Português"}],
            "modules":[{"id":"lp-01","discipline":"Língua Portuguesa","block":"I","code":"LP-01","title":"Leitura","summary":"Resumo","concepts":["A"],"attention":["B"],"example":"C","source":"Edital","estimatedMinutes":20,"fastTrack":[],"mnemonic":"M","checklist":[],"lesson":{"challenge":{"prompt":"P?","options":["A","B"],"correct":0,"feedback":"F"},"recall":{"prompt":"R?","answer":"R"}}}],
            "chapters":{"lp-01":{"abertura":"Introdução","secoes":[],"praticaAtiva":"Explique."}},
            "questions":[{"id":"q-001","block":"I","discipline":"Língua Portuguesa","subject":"Leitura","difficulty":"Fácil","statement":"Item","answer":True,"explanation":"Exp","tip":"Dica","source":"Autoral"}],
        }
        f=tempfile.NamedTemporaryFile(mode="w",suffix=".json",encoding="utf-8",delete=False)
        json.dump(data,f,ensure_ascii=False);f.close();return f.name

    def test_import_is_idempotent_and_bundle_requires_enrollment(self):
        path=self._seed_file()
        call_command("import_protected_study_seed",path,admin_username="root")
        call_command("import_protected_study_seed",path,admin_username="root")
        self.assertEqual(Question.objects.filter(legacy_key="q-001").count(),1)

        client=APIClient();client.force_authenticate(self.student)
        denied=client.get("/api/v1/knowledge/courses/pf-agente/study-bundle/")
        self.assertEqual(denied.status_code,403)

        course_id="pf-agente"
        CourseEnrollment.objects.create(
            user=self.student,course_id=course_id,created_by=self.admin,
            start_at=timezone.now()-timedelta(days=1),expires_at=timezone.now()+timedelta(days=30),status="active"
        )
        allowed=client.get("/api/v1/knowledge/courses/pf-agente/study-bundle/")
        self.assertEqual(allowed.status_code,200)
        self.assertEqual(allowed.data["modules"][0]["id"],"lp-01")
        self.assertEqual(allowed.data["questions"][0]["legacyKey"],"q-001")
