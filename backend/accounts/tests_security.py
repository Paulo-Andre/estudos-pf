from django.contrib.auth import get_user_model
from django.test import TestCase
from .cpf import is_valid_cpf
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
