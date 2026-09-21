from django.urls import path
from .views import (
 AdminAlertDetailView,AdminAlertsView,AdminCompetitionClearView,AdminCompetitionSaveView,AdminCompetitionSettingsView,
 AdminImageUploadView,AdminSettingsView,AlertDismissView,AlertListView,CompetitionAnswerView,CompetitionCoursesView,
 CompetitionHistoryView,CompetitionMonthlyGoalView,CompetitionMyScoreView,CompetitionRankingView,CompetitionRoundView,
 CompetitionSettingsView,CompetitionStartView,PublicSettingsView,
)
urlpatterns=[
 path("settings/",PublicSettingsView.as_view()),
 path("alerts/",AlertListView.as_view()),
 path("alerts/<int:alert_id>/dismiss/",AlertDismissView.as_view()),
 path("admin/alerts/",AdminAlertsView.as_view()),
 path("admin/alerts/<int:alert_id>/",AdminAlertDetailView.as_view()),
 path("admin/settings/",AdminSettingsView.as_view()),
 path("admin/uploads/images/",AdminImageUploadView.as_view()),
 path("competition/settings/",CompetitionSettingsView.as_view()),
 path("competition/courses/",CompetitionCoursesView.as_view()),
 path("competition/start/",CompetitionStartView.as_view()),
 path("competition/<str:round_id>/",CompetitionRoundView.as_view()),
 path("competition/my-score/",CompetitionMyScoreView.as_view()),
 path("competition/history/",CompetitionHistoryView.as_view()),
 path("competition/monthly-goal/",CompetitionMonthlyGoalView.as_view()),
 path("competition/<str:round_id>/answer/",CompetitionAnswerView.as_view()),
 path("competition/ranking/",CompetitionRankingView.as_view()),
 path("admin/competition/",AdminCompetitionSettingsView.as_view()),
 path("admin/competition/save/",AdminCompetitionSaveView.as_view()),
 path("admin/competition/clear/",AdminCompetitionClearView.as_view()),
]
