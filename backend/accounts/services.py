import hashlib,secrets
from datetime import timedelta
from django.contrib.sessions.models import Session
from django.db import transaction
from django.utils import timezone
from .models import PasswordResetToken

def delete_user_sessions(user_id):
    for session in Session.objects.filter(expire_date__gt=timezone.now()).iterator():
        try:data=session.get_decoded()
        except Exception:continue
        if str(data.get("_auth_user_id"))==str(user_id):
            session.delete()

def create_password_reset(user):
    raw=secrets.token_urlsafe(32)
    digest=hashlib.sha256(raw.encode()).hexdigest()
    PasswordResetToken.objects.filter(user=user,used_at__isnull=True).delete()
    token=PasswordResetToken.objects.create(id=secrets.token_hex(24),user=user,token_hash=digest,expires_at=timezone.now()+timedelta(hours=1))
    return raw,token

@transaction.atomic
def consume_password_reset(raw_token,new_password):
    digest=hashlib.sha256(raw_token.encode()).hexdigest()
    token=PasswordResetToken.objects.select_for_update().select_related("user").filter(token_hash=digest,used_at__isnull=True,expires_at__gt=timezone.now()).first()
    if not token:
        raise ValueError("Token inválido ou expirado.")
    user=token.user
    user.set_password(new_password)
    user.save(update_fields=["password"])
    token.used_at=timezone.now()
    token.save(update_fields=["used_at"])
    delete_user_sessions(user.id)
    return user
