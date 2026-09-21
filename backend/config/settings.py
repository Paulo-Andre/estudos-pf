import os
from pathlib import Path
import dj_database_url
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent

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
PII_MASTER_KEY=os.getenv("PII_MASTER_KEY","").strip()
if not PII_MASTER_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("PII_MASTER_KEY is required when DEBUG=False")
    PII_MASTER_KEY=SECRET_KEY

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
if os.getenv("RENDER_EXTERNAL_HOSTNAME"):
    ALLOWED_HOSTS.append(os.getenv("RENDER_EXTERNAL_HOSTNAME"))
PUBLIC_APP_URL=os.getenv("PUBLIC_APP_URL","").strip().rstrip("/")
CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS")
CORS_ALLOWED_ORIGINS = env_list("DJANGO_CORS_ALLOWED_ORIGINS")
if PUBLIC_APP_URL.startswith(("http://","https://")):
    if PUBLIC_APP_URL not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(PUBLIC_APP_URL)
    if PUBLIC_APP_URL not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(PUBLIC_APP_URL)
CORS_ALLOW_CREDENTIALS = True

INSTALLED_APPS = [
    "django.contrib.admin","django.contrib.auth","django.contrib.contenttypes",
    "django.contrib.sessions","django.contrib.messages","django.contrib.staticfiles",
    "corsheaders","rest_framework","accounts","courses","study","audit",
    "knowledge","platformapp","commerce",
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

DATABASE_URL=os.getenv("DATABASE_URL","").strip()
if not DATABASE_URL:
    if not DEBUG:
        raise ImproperlyConfigured("DATABASE_URL is required when DEBUG=False")
    DATABASE_URL="mysql://root@127.0.0.1:3306/estudos_pf"
DATABASES={"default":dj_database_url.parse(DATABASE_URL,conn_max_age=60,conn_health_checks=True)}
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
STATIC_URL="/"
STATIC_ROOT=BASE_DIR/"staticfiles"
FRONTEND_DIST=PROJECT_ROOT/"dist"/"public"
STATICFILES_DIRS=[FRONTEND_DIST] if FRONTEND_DIST.exists() else []
MEDIA_URL="/media/"
MEDIA_ROOT=BASE_DIR/"media"
S3_BUCKET=os.getenv("S3_BUCKET","").strip()
S3_ENDPOINT_URL=os.getenv("S3_ENDPOINT_URL","").strip()
S3_ACCESS_KEY=os.getenv("S3_ACCESS_KEY","").strip()
S3_SECRET_KEY=os.getenv("S3_SECRET_KEY","").strip()
S3_REGION=os.getenv("S3_REGION","auto").strip()
S3_PUBLIC_BASE_URL=os.getenv("S3_PUBLIC_BASE_URL","").strip().rstrip("/")

if S3_BUCKET and S3_ENDPOINT_URL and S3_ACCESS_KEY and S3_SECRET_KEY:
    default_storage_options={
        "bucket_name":S3_BUCKET,
        "endpoint_url":S3_ENDPOINT_URL,
        "access_key":S3_ACCESS_KEY,
        "secret_key":S3_SECRET_KEY,
        "region_name":S3_REGION,
        "default_acl":None,
        "querystring_auth":not bool(S3_PUBLIC_BASE_URL),
        "file_overwrite":False,
    }
    if S3_PUBLIC_BASE_URL:
        default_storage_options["custom_domain"]=S3_PUBLIC_BASE_URL.replace("https://","").replace("http://","")
    DEFAULT_STORAGE={"BACKEND":"storages.backends.s3.S3Storage","OPTIONS":default_storage_options}
else:
    if not DEBUG and env_bool("REQUIRE_PERSISTENT_STORAGE",False):
        raise ImproperlyConfigured("Persistent S3-compatible storage is required in production.")
    DEFAULT_STORAGE={"BACKEND":"django.core.files.storage.FileSystemStorage"}

STORAGES={
    "default":DEFAULT_STORAGE,
    "staticfiles":{"BACKEND":"whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
DEFAULT_AUTO_FIELD="django.db.models.BigAutoField"
SESSION_COOKIE_NAME="estudos_pf_django_session"
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE="Lax"
SESSION_COOKIE_AGE=int(os.getenv("DJANGO_SESSION_AGE_SECONDS","604800"))
SESSION_SAVE_EVERY_REQUEST=True
CSRF_COOKIE_SAMESITE="Lax"
CSRF_COOKIE_HTTPONLY=True
SECURE_COOKIES=env_bool("DJANGO_SECURE_COOKIES",not DEBUG)
SESSION_COOKIE_SECURE=SECURE_COOKIES
CSRF_COOKIE_SECURE=SECURE_COOKIES
TRUST_PROXY_HEADERS=env_bool("DJANGO_TRUST_PROXY_HEADERS",False)
if TRUST_PROXY_HEADERS:
    SECURE_PROXY_SSL_HEADER=("HTTP_X_FORWARDED_PROTO","https")
X_FRAME_OPTIONS="DENY"
SECURE_CONTENT_TYPE_NOSNIFF=True
SECURE_REFERRER_POLICY="strict-origin-when-cross-origin"

SECURE_SSL_REDIRECT=env_bool("DJANGO_SECURE_SSL_REDIRECT",False)
SECURE_HSTS_SECONDS=int(os.getenv("DJANGO_SECURE_HSTS_SECONDS","0"))
SECURE_HSTS_INCLUDE_SUBDOMAINS=env_bool("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS",False)
SECURE_HSTS_PRELOAD=env_bool("DJANGO_SECURE_HSTS_PRELOAD",False)

SECURE_CROSS_ORIGIN_OPENER_POLICY="same-origin"
