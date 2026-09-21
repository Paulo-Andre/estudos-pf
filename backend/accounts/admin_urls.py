from django.urls import path
from .admin_api import AdminBlockUserView,AdminResetPasswordView,AdminSecurityEventsView,AdminSecurityOverviewView,AdminStatsView,AdminUnlockLoginView,AdminUserDetailView,AdminUserListView,AdminUserSessionDetailView,AdminUserSessionsView

urlpatterns=[
    path("users/",AdminUserListView.as_view()),
    path("stats/",AdminStatsView.as_view()),
    path("users/<int:user_id>/",AdminUserDetailView.as_view()),
    path("users/<int:user_id>/reset-password/",AdminResetPasswordView.as_view()),
    path("users/<int:user_id>/block/",AdminBlockUserView.as_view()),
    path("security/",AdminSecurityOverviewView.as_view()),
    path("security/events/",AdminSecurityEventsView.as_view()),
    path("users/<int:user_id>/sessions/",AdminUserSessionsView.as_view()),
    path("users/<int:user_id>/sessions/<uuid:session_id>/",AdminUserSessionDetailView.as_view()),
    path("users/<int:user_id>/unlock-login/",AdminUnlockLoginView.as_view()),
]
