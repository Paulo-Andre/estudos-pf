from django.urls import path
from .views import AnswerView,CompleteView,NoteView,StateView
urlpatterns=[path("state/",StateView.as_view()),path("answer/",AnswerView.as_view()),path("complete-module/",CompleteView.as_view()),path("notes/<str:module_id>/",NoteView.as_view())]
