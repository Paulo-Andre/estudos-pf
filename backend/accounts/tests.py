import json
import base64
import hashlib

from rest_framework.test import APITestCase

from .auth_backend import verify_legacy_node_scrypt

class AuthTests(APITestCase):
    def test_register_login_and_me(self):
        payload={
            "name":"Aluno Teste",
            "username":"aluno.teste",
            "email":"aluno@example.com",
            "password":"F0rte!Senha-2026",
            "passwordConfirmation":"F0rte!Senha-2026",
        }
        response=self.client.post("/api/v1/auth/register/",payload,format="json")
        self.assertEqual(response.status_code,201)
        self.assertEqual(response.data["username"],"aluno.teste")
        me=self.client.get("/api/v1/auth/me/")
        self.assertEqual(me.status_code,200)
        self.assertEqual(me.data["username"],"aluno.teste")

    def test_legacy_node_scrypt_compatibility(self):
        password="Senha-Legada-123!"
        salt="salt-node-test"
        derived=hashlib.scrypt(password.encode(),salt=salt.encode(),n=2**14,r=8,p=1,dklen=64)
        encoded=base64.urlsafe_b64encode(derived).decode().rstrip("=")
        stored="scrypt$"+salt+"$"+encoded
        self.assertTrue(verify_legacy_node_scrypt(password,stored))
        self.assertFalse(verify_legacy_node_scrypt("errada",stored))


class HealthCheckTests(APITestCase):
    def test_health_checks_database(self):
        response=self.client.get("/api/v1/health/")
        self.assertEqual(response.status_code,200)
        self.assertEqual(json.loads(response.content)["database"],"ok")
