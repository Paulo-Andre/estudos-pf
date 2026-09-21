from django.urls import path
from .admin_api import AdminStatsView,AdminUserListView
urlpatterns=[path("users/",AdminUserListView.as_view()),path("stats/",AdminStatsView.as_view())]
