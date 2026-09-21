import base64
import hashlib
import hmac
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings

_VERSION="v1"

def _master():
    value=str(getattr(settings,"PII_MASTER_KEY","") or "").encode("utf-8")
    if not value:
        raise RuntimeError("PII_MASTER_KEY não configurada.")
    return value

def _derive(label: bytes) -> bytes:
    return hmac.new(_master(),label,hashlib.sha256).digest()

def encrypt_value(value: str) -> str:
    raw=(value or "").strip()
    if not raw:return ""
    nonce=os.urandom(12)
    encrypted=AESGCM(_derive(b"estudos-pf:pii:encryption")).encrypt(nonce,raw.encode("utf-8"),None)
    return _VERSION+":"+base64.urlsafe_b64encode(nonce+encrypted).decode("ascii")

def decrypt_value(value: str) -> str:
    if not value:return ""
    try:
        version,payload=value.split(":",1)
        if version!=_VERSION:raise ValueError("versão de criptografia desconhecida")
        data=base64.urlsafe_b64decode(payload.encode("ascii"))
        return AESGCM(_derive(b"estudos-pf:pii:encryption")).decrypt(data[:12],data[12:],None).decode("utf-8")
    except Exception as exc:
        raise ValueError("Não foi possível descriptografar o dado protegido.") from exc

def lookup_hash(value: str) -> str:
    normalized=(value or "").strip().encode("utf-8")
    if not normalized:return ""
    return hmac.new(_derive(b"estudos-pf:pii:lookup"),normalized,hashlib.sha256).hexdigest()

def set_profile_cpf(profile, cpf: str | None):
    normalized=(cpf or "").strip()
    if not normalized:
        profile.cpf=None
        profile.cpf_encrypted=""
        profile.cpf_hash=None
        return
    profile.cpf=None
    profile.cpf_encrypted=encrypt_value(normalized)
    profile.cpf_hash=lookup_hash(normalized)

def get_profile_cpf(profile) -> str | None:
    if profile.cpf_encrypted:
        return decrypt_value(profile.cpf_encrypted)
    return profile.cpf or None
