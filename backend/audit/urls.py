from django.urls import path
from .views import AuditView,BackupView
urlpatterns=[path("",AuditView.as_view()),path("backup/",BackupView.as_view())]
