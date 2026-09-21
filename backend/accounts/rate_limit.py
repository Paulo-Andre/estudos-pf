from datetime import timedelta
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from .models import LoginAttempt
from .pii import lookup_hash

WINDOW=timedelta(minutes=15)
IP_MAX=20
IDENTIFIER_MAX=8

def request_ip(request):
    if getattr(settings,"TRUST_PROXY_HEADERS",False):
        forwarded=request.META.get("HTTP_X_FORWARDED_FOR","")
        if forwarded:return forwarded.split(",",1)[0].strip()[:120]
    return (request.META.get("REMOTE_ADDR") or "unknown")[:120]

def keys(request,identifier,scope="login"):
    ip_hash=lookup_hash("rate-ip:"+request_ip(request))
    ident_hash=lookup_hash("rate-ident:"+identifier.strip().lower()[:320])
    return f"{scope}:ip:{ip_hash}",f"{scope}:identifier:{ip_hash}:{ident_hash}"

def _active(key):
    now=timezone.now()
    try:item=LoginAttempt.objects.get(pk=key)
    except LoginAttempt.DoesNotExist:return None
    if now-item.window_started_at>=WINDOW:
        item.delete();return None
    return item

def allowed(pair,ip_max=IP_MAX,identifier_max=IDENTIFIER_MAX):
    ip,ident=_active(pair[0]),_active(pair[1])
    return not ((ip and ip.failures>=ip_max) or (ident and ident.failures>=identifier_max))

@transaction.atomic
def record_failure(pair):
    now=timezone.now()
    for key in pair:
        try:
            item=LoginAttempt.objects.select_for_update().get(pk=key)
            if now-item.window_started_at>=WINDOW:
                item.failures=1;item.window_started_at=now
            else:item.failures+=1
            item.save()
        except LoginAttempt.DoesNotExist:
            LoginAttempt.objects.create(key=key,failures=1,window_started_at=now)

def clear_success(pair):
    LoginAttempt.objects.filter(pk=pair[1]).delete()
