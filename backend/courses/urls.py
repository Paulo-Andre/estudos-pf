from django.urls import path
from .views import AccessView,ContentView,CourseListView
urlpatterns=[path("",CourseListView.as_view()),path("access/",AccessView.as_view()),path("<str:course_id>/content/",ContentView.as_view())]
