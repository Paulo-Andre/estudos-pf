from django.urls import path
from .views import AdminQuestionsView,AdminReviewDecisionView,AdminReviewQueueView,AdminReviewSubmitView,CourseLibraryView,EligibleQuestionsView

urlpatterns=[
    path("courses/<str:course_id>/library/",CourseLibraryView.as_view()),
    path("courses/<str:course_id>/questions/",EligibleQuestionsView.as_view()),
    path("admin/questions/",AdminQuestionsView.as_view()),
    path("admin/reviews/",AdminReviewQueueView.as_view()),
    path("admin/reviews/submit/",AdminReviewSubmitView.as_view()),
    path("admin/reviews/<int:review_id>/decision/",AdminReviewDecisionView.as_view()),
]
