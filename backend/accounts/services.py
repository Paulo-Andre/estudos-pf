import hashlib,secrets
from datetime import timedelta

from django.contrib.sessions.models import Session
from django.db import transaction
from django.utils import timezone

from .models import PasswordResetToken,SecurityEvent,TrackedSession
from .pii import lookup_hash
from .rate_limit import request_ip

def _session_hash(key):
    return hashlib.sha256((key or "").encode()).hexdigest()

def _ip_hash(request):
    return lookup_hash("ip:"+request_ip(request)) if request else ""

def record_security_event(request,event_type,user=None,metadata=None):
    SecurityEvent.objects.create(
        user=user if getattr(user,"pk",None) else None,
        event_type=event_type,
        ip_hash=_ip_hash(request),
        user_agent=str(request.META.get("HTTP_USER_AGENT",""))[:500] if request else "",
        metadata=dict(metadata or {}),
    )

def _delete_session_by_hash(session_hash):
    for session in Session.objects.filter(expire_date__gt=timezone.now()).iterator():
        if secrets.compare_digest(_session_hash(session.session_key),session_hash):
            session.delete()
            return True
    return False

def track_current_session(request,user,max_active=5):
    if not request.session.session_key:
        request.session.save()
    digest=_session_hash(request.session.session_key)
    tracked,_=TrackedSession.objects.update_or_create(
        session_hash=digest,
        defaults={
            "user":user,
            "user_agent":str(request.META.get("HTTP_USER_AGENT",""))[:500],
            "ip_hash":_ip_hash(request),
            "revoked_at":None,
        },
    )
    active=list(TrackedSession.objects.filter(user=user,revoked_at__isnull=True).order_by("-last_seen_at"))
    for stale in active[max_active:]:
        _delete_session_by_hash(stale.session_hash)
        stale.revoked_at=timezone.now()
        stale.save(update_fields=["revoked_at"])
    return tracked

def touch_current_session(request):
    if not request.user.is_authenticated or not request.session.session_key:return
    digest=_session_hash(request.session.session_key)
    TrackedSession.objects.filter(user=request.user,session_hash=digest,revoked_at__isnull=True).update(last_seen_at=timezone.now())

def list_user_sessions(user,current_session_key=None):
    current_hash=_session_hash(current_session_key) if current_session_key else ""
    return [{
        "id":str(item.id),
        "current":bool(current_hash and secrets.compare_digest(item.session_hash,current_hash)),
        "userAgent":item.user_agent,
        "createdAt":item.created_at,
        "lastSeenAt":item.last_seen_at,
        "revokedAt":item.revoked_at,
    } for item in TrackedSession.objects.filter(user=user).order_by("-last_seen_at")[:20]]

def revoke_tracked_session(user,session_id):
    item=TrackedSession.objects.filter(pk=session_id,user=user).first()
    if not item:return False
    _delete_session_by_hash(item.session_hash)
    if not item.revoked_at:
        item.revoked_at=timezone.now()
        item.save(update_fields=["revoked_at"])
    return True

def delete_user_sessions(user_id):
    for session in Session.objects.filter(expire_date__gt=timezone.now()).iterator():
        try:data=session.get_decoded()
        except Exception:continue
        if str(data.get("_auth_user_id"))==str(user_id):
            session.delete()
    TrackedSession.objects.filter(user_id=user_id,revoked_at__isnull=True).update(revoked_at=timezone.now())

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
