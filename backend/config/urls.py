from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

def health(_request):
    return JsonResponse({"ok": True, "service": "estudos-pf-django"})

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
]
