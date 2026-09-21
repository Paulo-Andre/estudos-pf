from django.urls import path
from .admin_api import AdminBlockUserView,AdminResetPasswordView,AdminStatsView,AdminUserDetailView,AdminUserListView

urlpatterns=[
    path("users/",AdminUserListView.as_view()),
    path("stats/",AdminStatsView.as_view()),
    path("users/<int:user_id>/",AdminUserDetailView.as_view()),
    path("users/<int:user_id>/reset-password/",AdminResetPasswordView.as_view()),
    path("users/<int:user_id>/block/",AdminBlockUserView.as_view()),
]
