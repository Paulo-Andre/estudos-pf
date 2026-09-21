from django.urls import path
from .views import AdminContentDetailView,AdminContentsView,AdminDisciplineDetailView,AdminDisciplinesView,AdminQuestionDetailView,AdminQuestionsView,AdminReviewDecisionView,AdminReviewPendingCountView,AdminReviewQueueView,AdminReviewSubmitView,ContentChangelogView,CourseLibraryView,CourseStudyBundleView,EligibleQuestionsView,QuestionChangelogView

urlpatterns=[
    path("courses/<str:course_id>/library/",CourseLibraryView.as_view()),
    path("courses/<str:course_id>/questions/",EligibleQuestionsView.as_view()),
    path("courses/<str:course_id>/study-bundle/",CourseStudyBundleView.as_view()),
    path("admin/disciplines/",AdminDisciplinesView.as_view()),
    path("admin/disciplines/<int:discipline_id>/",AdminDisciplineDetailView.as_view()),
    path("admin/contents/",AdminContentsView.as_view()),
    path("admin/contents/<int:content_id>/",AdminContentDetailView.as_view()),
    path("admin/contents/<int:content_id>/changelog/",ContentChangelogView.as_view()),
    path("admin/questions/",AdminQuestionsView.as_view()),
    path("admin/questions/<int:question_id>/",AdminQuestionDetailView.as_view()),
    path("admin/questions/<int:question_id>/changelog/",QuestionChangelogView.as_view()),
    path("admin/reviews/",AdminReviewQueueView.as_view()),
    path("admin/reviews/pending-count/",AdminReviewPendingCountView.as_view()),
    path("admin/reviews/submit/",AdminReviewSubmitView.as_view()),
    path("admin/reviews/<int:review_id>/decision/",AdminReviewDecisionView.as_view()),
]
