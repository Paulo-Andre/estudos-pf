from django.urls import path
from .views import AuditView
urlpatterns=[path("",AuditView.as_view())]
