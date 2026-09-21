import hmac
import secrets
import time

import pyotp
from django.utils import timezone

from .models import AccountMFA
from .pii import decrypt_value,encrypt_value,lookup_hash

ISSUER="Núcleo Concursos"

def _hash_backup(code):
    return lookup_hash("mfa-backup:"+code.strip().upper())

def _generate_backup_codes(count=8):
    return [secrets.token_hex(4).upper() for _ in range(count)]

def status_for(user):
    obj=AccountMFA.objects.filter(user=user).first()
    return {"enabled":bool(obj and obj.enabled),"configured":bool(obj and obj.secret_encrypted)}

def begin_setup(user,password):
    if not user.check_password(str(password or "")):raise ValueError("Senha atual inválida.")
    secret=pyotp.random_base32()
    obj,_=AccountMFA.objects.get_or_create(user=user)
    obj.secret_encrypted=encrypt_value(secret)
    obj.enabled=False
    obj.backup_code_hashes=[]
    obj.last_totp_step=None
    obj.confirmed_at=None
    obj.save()
    identity=user.email or user.username
    uri=pyotp.TOTP(secret).provisioning_uri(name=identity,issuer_name=ISSUER)
    return {"secret":secret,"otpauthUri":uri}

def _totp(obj):
    if not obj.secret_encrypted:return None
    return pyotp.TOTP(decrypt_value(obj.secret_encrypted))

def _verify_totp(obj,value,consume=True):
    totp=_totp(obj)
    if not totp or not value.isdigit() or len(value)!=6:return False
    current=int(time.time()//totp.interval)
    for step in (current-1,current,current+1):
        expected=totp.at(step*totp.interval)
        if hmac.compare_digest(expected,value):
            if consume and obj.last_totp_step is not None and step<=obj.last_totp_step:return False
            if consume:
                obj.last_totp_step=step
                obj.save(update_fields=["last_totp_step","updated_at"])
            return True
    return False

def verify_code(user,code,consume_backup=True):
    value=str(code or "").strip().replace(" ","").upper()
    obj=AccountMFA.objects.filter(user=user,enabled=True).first()
    if not obj:return True
    if _verify_totp(obj,value,consume=consume_backup):return True
    hashed=_hash_backup(value)
    hashes=list(obj.backup_code_hashes or [])
    if hashed in hashes:
        if consume_backup:
            hashes.remove(hashed);obj.backup_code_hashes=hashes;obj.save(update_fields=["backup_code_hashes","updated_at"])
        return True
    return False

def confirm_setup(user,code):
    obj=AccountMFA.objects.filter(user=user).first()
    if not obj or not obj.secret_encrypted:raise ValueError("Configuração MFA não iniciada.")
    value=str(code or "").strip().replace(" ","")
    if not _verify_totp(obj,value,consume=True):raise ValueError("Código inválido.")
    codes=_generate_backup_codes()
    obj.enabled=True
    obj.confirmed_at=timezone.now()
    obj.backup_code_hashes=[_hash_backup(code) for code in codes]
    obj.save(update_fields=["enabled","confirmed_at","backup_code_hashes","updated_at"])
    return codes

def disable(user,password,code):
    if not user.check_password(str(password or "")):raise ValueError("Senha atual inválida.")
    obj=AccountMFA.objects.filter(user=user,enabled=True).first()
    if not obj:return
    if not verify_code(user,code):raise ValueError("Código MFA inválido.")
    obj.enabled=False;obj.secret_encrypted="";obj.backup_code_hashes=[];obj.last_totp_step=None;obj.confirmed_at=None
    obj.save(update_fields=["enabled","secret_encrypted","backup_code_hashes","last_totp_step","confirmed_at","updated_at"])

def reset_for_user(user):
    obj=AccountMFA.objects.filter(user=user).first()
    if obj:
        obj.enabled=False;obj.secret_encrypted="";obj.backup_code_hashes=[];obj.last_totp_step=None;obj.confirmed_at=None
        obj.save(update_fields=["enabled","secret_encrypted","backup_code_hashes","last_totp_step","confirmed_at","updated_at"])

def regenerate_backup_codes(user,code):
    obj=AccountMFA.objects.filter(user=user,enabled=True).first()
    if not obj:raise ValueError("MFA não está ativado.")
    if not verify_code(user,code):raise ValueError("Código MFA inválido.")
    codes=_generate_backup_codes()
    obj.backup_code_hashes=[_hash_backup(item) for item in codes]
    obj.save(update_fields=["backup_code_hashes","updated_at"])
    return codes
