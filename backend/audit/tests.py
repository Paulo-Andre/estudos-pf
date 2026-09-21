import json
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import AccountProfile
from accounts.pii import set_profile_cpf
from .backup import logical_backup
from .models import AdminAuditLog

class BackupSecurityTests(TestCase):
    def setUp(self):
        User=get_user_model()
        self.admin=User.objects.create_superuser("backup-admin","backup-admin@example.com","Senha-F0rte!2026")
        profile=AccountProfile.objects.create(user=self.admin,display_name="Backup Admin",legacy_open_id="legacy-sensitive",legacy_password_hash="scrypt$SENSITIVE")
        set_profile_cpf(profile,"52998224725")
        profile.save()

    def test_logical_backup_excludes_authentication_secrets_and_plain_cpf(self):
        payload=logical_backup()
        raw=json.dumps(payload,default=str)
        self.assertNotIn("scrypt$SENSITIVE",raw)
        self.assertNotIn("52998224725",raw)
        self.assertNotIn("legacy-sensitive",raw)
        self.assertIn("accounts.AccountMFA",payload["excluded"])
        profile_row=payload["data"]["accounts.accountprofile"][0]
        self.assertNotIn("cpf",profile_row)
        self.assertNotIn("legacy_password_hash",profile_row)
        self.assertIn("cpf_encrypted",profile_row)

    def test_backup_endpoint_is_admin_only_and_audited(self):
        anonymous=APIClient()
        self.assertIn(anonymous.get("/api/v1/audit/backup/").status_code,(401,403))
        client=APIClient();client.force_authenticate(self.admin)
        response=client.get("/api/v1/audit/backup/")
        self.assertEqual(response.status_code,200)
        self.assertTrue(AdminAuditLog.objects.filter(actor=self.admin,action="EXPORTACAO_BACKUP").exists())
