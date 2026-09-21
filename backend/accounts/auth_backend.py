import base64, hashlib, hmac
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q
from .models import AccountProfile

def _b64url(v):
    return base64.urlsafe_b64decode(v + "="*((4-len(v)%4)%4))

def verify_legacy_node_scrypt(password, stored_hash):
    try:
        algorithm,salt,encoded=stored_hash.split("$",2)
        if algorithm!="scrypt": return False
        expected=_b64url(encoded)
        actual=hashlib.scrypt(password.encode(),salt=salt.encode(),n=2**14,r=8,p=1,dklen=len(expected))
        return hmac.compare_digest(expected,actual)
    except Exception:
        return False

class IdentifierBackend(ModelBackend):
    def authenticate(self,request,username=None,password=None,**kwargs):
        identifier=(username or kwargs.get("identifier") or "").strip()
        if not identifier or password is None: return None
        User=get_user_model()
        try:
            user=User.objects.get(Q(username__iexact=identifier)|Q(email__iexact=identifier))
        except (User.DoesNotExist,User.MultipleObjectsReturned):
            return None
        try: profile=user.account_profile
        except AccountProfile.DoesNotExist: profile=None
        if not self.user_can_authenticate(user) or (profile and profile.is_blocked): return None
        if user.check_password(password): return user
        if profile and profile.legacy_password_hash and verify_legacy_node_scrypt(password,profile.legacy_password_hash):
            user.set_password(password); user.save(update_fields=["password"])
            profile.legacy_password_hash=""; profile.save(update_fields=["legacy_password_hash","updated_at"])
            return user
        return None
