from django.urls import path
from .views import AdminAlertsView,AdminCompetitionSettingsView,AdminSettingsView,AdminImageUploadView,AlertDismissView,AlertListView,CompetitionAnswerView,CompetitionRankingView,CompetitionStartView,PublicSettingsView
urlpatterns=[
    path("settings/",PublicSettingsView.as_view()),
    path("alerts/",AlertListView.as_view()),
    path("alerts/<int:alert_id>/dismiss/",AlertDismissView.as_view()),
    path("admin/alerts/",AdminAlertsView.as_view()),
    path("admin/settings/",AdminSettingsView.as_view()),
    path("admin/uploads/images/",AdminImageUploadView.as_view()),
    path("competition/start/",CompetitionStartView.as_view()),
    path("competition/<str:round_id>/answer/",CompetitionAnswerView.as_view()),
    path("competition/ranking/",CompetitionRankingView.as_view()),
    path("admin/competition/",AdminCompetitionSettingsView.as_view()),
]
