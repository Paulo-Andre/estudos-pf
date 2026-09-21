import os
import dj_database_url
from django.core.exceptions import ImproperlyConfigured

def env_bool(name, default=False):
    return os.getenv(name, "1" if default else "0").strip().lower() in {"1","true","yes","on"}

def env_list(name, default=""):
    return [v.strip() for v in os.getenv(name, default).split(",") if v.strip()]

DEBUG = env_bool("DEBUG", True)
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "").strip()
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY is required when DEBUG=False")
    SECRET_KEY = "dev-only-estudos-pf-secret"

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS")
CORS_ALLOWED_ORIGINS = env_list("DJANGO_CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True

INSTALLED_APPS = [
    "django.contrib.admin","django.contrib.auth","django.contrib.contenttypes",
    "django.contrib.sessions","django.contrib.messages","django.contrib.staticfiles",
    "corsheaders","rest_framework","accounts","courses","study","audit",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware","whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware","django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware","django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware","django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"
TEMPLATES=[{"BACKEND":"django.template.backends.django.DjangoTemplates","DIRS":[],"APP_DIRS":True,"OPTIONS":{"context_processors":[
    "django.template.context_processors.request","django.contrib.auth.context_processors.auth","django.contrib.messages.context_processors.messages"
]}}]

DATABASES={"default":dj_database_url.parse(os.getenv("DATABASE_URL","mysql://root@127.0.0.1:3306/estudos_pf"),conn_max_age=60,conn_health_checks=True)}
DATABASES["default"].setdefault("OPTIONS",{})["charset"]="utf8mb4"

AUTHENTICATION_BACKENDS=["accounts.auth_backend.IdentifierBackend"]
AUTH_PASSWORD_VALIDATORS=[
    {"NAME":"django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME":"django.contrib.auth.password_validation.MinimumLengthValidator","OPTIONS":{"min_length":8}},
    {"NAME":"django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME":"django.contrib.auth.password_validation.NumericPasswordValidator"},
]
REST_FRAMEWORK={
    "DEFAULT_AUTHENTICATION_CLASSES":["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES":["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES":["rest_framework.renderers.JSONRenderer"],
}
LANGUAGE_CODE="pt-br"
TIME_ZONE="America/Sao_Paulo"
USE_I18N=True
USE_TZ=True
STATIC_URL="/static/"
STATIC_ROOT="staticfiles"
MEDIA_URL="/media/"
MEDIA_ROOT="media"
STORAGES={
    "default":{"BACKEND":os.getenv("DJANGO_STORAGE_BACKEND","django.core.files.storage.FileSystemStorage")},
    "staticfiles":{"BACKEND":"whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
DEFAULT_AUTO_FIELD="django.db.models.BigAutoField"
SESSION_COOKIE_NAME="estudos_pf_django_session"
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE="Lax"
CSRF_COOKIE_SAMESITE="Lax"
SECURE_COOKIES=env_bool("DJANGO_SECURE_COOKIES",not DEBUG)
SESSION_COOKIE_SECURE=SECURE_COOKIES
CSRF_COOKIE_SECURE=SECURE_COOKIES
TRUST_PROXY_HEADERS=env_bool("DJANGO_TRUST_PROXY_HEADERS",False)
if TRUST_PROXY_HEADERS:
    SECURE_PROXY_SSL_HEADER=("HTTP_X_FORWARDED_PROTO","https")
X_FRAME_OPTIONS="DENY"
SECURE_CONTENT_TYPE_NOSNIFF=True
SECURE_REFERRER_POLICY="strict-origin-when-cross-origin"
