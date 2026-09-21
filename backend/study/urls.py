from django.urls import path
from .views import AnswerView,CompleteView,ContentProgressView,DailyQuickCheckView,NoteView,ResumeView,ReviewItemsView,ReviewMasteredView,RoadmapView,SimulationDetailView,StateView,SubmitSimulationView
urlpatterns=[
    path("state/",StateView.as_view()),
    path("answer/",AnswerView.as_view()),
    path("complete-module/",CompleteView.as_view()),
    path("notes/<str:module_id>/",NoteView.as_view()),
    path("courses/<str:course_id>/daily-check/",DailyQuickCheckView.as_view()),
    path("simulation/",SubmitSimulationView.as_view()),
    path("simulations/<str:simulation_id>/",SimulationDetailView.as_view()),
    path("review/",ReviewItemsView.as_view()),
    path("review/<int:item_id>/mastered/",ReviewMasteredView.as_view()),
    path("courses/<str:course_id>/content/<int:content_id>/progress/",ContentProgressView.as_view()),
    path("courses/<str:course_id>/resume/",ResumeView.as_view()),
    path("roadmap/",RoadmapView.as_view()),
]
