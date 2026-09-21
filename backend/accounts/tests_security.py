from django.contrib.auth import get_user_model
from django.test import RequestFactory,TestCase
from rest_framework.test import APIClient
from .cpf import is_valid_cpf
from .models import AccountProfile,LoginAttempt,SecurityEvent,TrackedSession
from .pii import get_profile_cpf
from .rate_limit import keys
from .mfa import begin_setup,confirm_setup
from .services import consume_password_reset,create_password_reset

class AccountSecurityTests(TestCase):
    def test_cpf_validation(self):
        self.assertTrue(is_valid_cpf("529.982.247-25"))
        self.assertFalse(is_valid_cpf("111.111.111-11"))

    def test_password_reset_token_is_single_use(self):
        user=get_user_model().objects.create_user("aluno","a@example.com","Senha-Antiga!2026")
        raw,_=create_password_reset(user)
        consume_password_reset(raw,"Senha-Nova!2026")
        with self.assertRaises(ValueError):
            consume_password_reset(raw,"Outra-Senha!2026")
        user.refresh_from_db()
        self.assertTrue(user.check_password("Senha-Nova!2026"))

    def test_registration_encrypts_cpf_and_never_keeps_plaintext(self):
        client=APIClient()
        response=client.post("/api/v1/auth/register/",{
            "name":"Aluno Seguro","username":"aluno.seguro","email":"seguro@example.com",
            "cpf":"529.982.247-25","password":"Senha-F0rte!2026","passwordConfirmation":"Senha-F0rte!2026",
        },format="json")
        self.assertEqual(response.status_code,201)
        profile=AccountProfile.objects.get(user__username="aluno.seguro")
        self.assertIsNone(profile.cpf)
        self.assertNotIn("52998224725",profile.cpf_encrypted)
        self.assertEqual(get_profile_cpf(profile),"52998224725")
        self.assertEqual(response.data["user"]["cpf"],"52998224725")

    def test_session_can_be_listed_and_revoked(self):
        client=APIClient()
        client.post("/api/v1/auth/register/",{
            "name":"Sessão Teste","username":"sessao.teste","email":"sessao@example.com",
            "password":"Senha-F0rte!2026","passwordConfirmation":"Senha-F0rte!2026",
        },format="json",HTTP_USER_AGENT="Browser de teste")
        sessions=client.get("/api/v1/auth/sessions/")
        self.assertEqual(sessions.status_code,200)
        self.assertEqual(len(sessions.data),1)
        self.assertTrue(sessions.data[0]["current"])
        session_id=sessions.data[0]["id"]
        revoked=client.delete(f"/api/v1/auth/sessions/{session_id}/")
        self.assertEqual(revoked.status_code,200)
        self.assertTrue(revoked.data["current"])
        self.assertIsNone(client.get("/api/v1/auth/me/").data)
        self.assertTrue(TrackedSession.objects.filter(revoked_at__isnull=False).exists())
        self.assertTrue(SecurityEvent.objects.filter(event_type="session_revoked").exists())

    def test_rate_limit_keys_do_not_store_raw_ip_or_identifier(self):
        request=RequestFactory().post("/")
        request.META["REMOTE_ADDR"]="203.0.113.77"
        pair=keys(request,"Pessoa@Example.com")
        joined=" ".join(pair)
        self.assertNotIn("203.0.113.77",joined)
        self.assertNotIn("pessoa@example.com",joined)

    def test_security_headers_are_present(self):
        response=self.client.get("/api/v1/health/")
        self.assertIn("Content-Security-Policy",response)
        self.assertEqual(response["X-Frame-Options"],"DENY")
        self.assertEqual(response["Cross-Origin-Resource-Policy"],"same-origin")

    def test_mfa_requires_second_factor_and_backup_code_is_single_use(self):
        import pyotp
        User=get_user_model()
        user=User.objects.create_user("mfa-user","mfa@example.com","Senha-F0rte!2026")
        setup=begin_setup(user,"Senha-F0rte!2026")
        code=pyotp.TOTP(setup["secret"]).now()
        backup=confirm_setup(user,code)[0]
        client=APIClient()
        challenge=client.post("/api/v1/auth/login/",{"identifier":"mfa-user","password":"Senha-F0rte!2026"},format="json")
        self.assertEqual(challenge.status_code,428)
        self.assertTrue(challenge.data["mfaRequired"])
        ok=client.post("/api/v1/auth/login/",{"identifier":"mfa-user","password":"Senha-F0rte!2026","otp":backup},format="json")
        self.assertEqual(ok.status_code,200)
        client.post("/api/v1/auth/logout/",{},format="json")
        reused=client.post("/api/v1/auth/login/",{"identifier":"mfa-user","password":"Senha-F0rte!2026","otp":backup},format="json")
        self.assertEqual(reused.status_code,401)

    def test_admin_security_overview_requires_admin(self):
        User=get_user_model()
        admin=User.objects.create_superuser("root-security","root-security@example.com","Senha-F0rte!2026")
        client=APIClient();client.force_authenticate(admin)
        response=client.get("/api/v1/admin/security/")
        self.assertEqual(response.status_code,200)
        self.assertIn("activeSessions",response.data)
        self.assertIn("plaintextCpfRecords",response.data)
