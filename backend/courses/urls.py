from django.urls import path
from .views import AccessView,AdminCourseActiveView,AdminCourseDetailView,AdminCoursesView,AdminEnrollmentListView,AdminGrantEnrollmentView,AdminRevokeEnrollmentView,ContentView,CourseListView

urlpatterns=[
    path("",CourseListView.as_view()),
    path("access/",AccessView.as_view()),
    path("<str:course_id>/content/",ContentView.as_view()),
    path("admin/",AdminCoursesView.as_view()),
    path("admin/<str:course_id>/",AdminCourseDetailView.as_view()),
    path("admin/<str:course_id>/active/",AdminCourseActiveView.as_view()),
    path("admin/users/<int:user_id>/enrollments/",AdminEnrollmentListView.as_view()),
    path("admin/enrollments/grant/",AdminGrantEnrollmentView.as_view()),
    path("admin/enrollments/revoke/",AdminRevokeEnrollmentView.as_view()),
]
