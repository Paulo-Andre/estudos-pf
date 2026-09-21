from django.contrib import admin
from pathlib import Path
from django.conf import settings
from django.db import connection
from django.http import FileResponse, HttpResponseNotFound, JsonResponse
from django.urls import include, path, re_path

def health(_request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:
        return JsonResponse({"ok": False, "service": "estudos-pf-django", "database": "unavailable"}, status=503)
    return JsonResponse({"ok": True, "service": "estudos-pf-django", "database": "ok"})

def spa_index(_request):
    index_path=Path(settings.FRONTEND_DIST)/"index.html"
    if not index_path.exists():
        return HttpResponseNotFound("Frontend build not found.")
    response=FileResponse(index_path.open("rb"),content_type="text/html; charset=utf-8")
    response["Cache-Control"]="no-cache, no-store, must-revalidate"
    return response

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", health),
    path("api/v1/auth/", include("accounts.urls")),
    path("api/v1/admin/", include("accounts.admin_urls")),
    path("api/v1/courses/", include("courses.urls")),
    path("api/v1/study/", include("study.urls")),
    path("api/v1/audit/", include("audit.urls")),
    path("api/v1/knowledge/", include("knowledge.urls")),
    path("api/v1/platform/", include("platformapp.urls")),
    path("api/v1/commerce/", include("commerce.urls")),
    re_path(r"^(?!api/|admin/).*$", spa_index),
]
