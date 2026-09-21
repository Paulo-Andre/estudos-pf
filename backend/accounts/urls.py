from django.urls import path
from .views import ChangePasswordView,CsrfView,DeleteAccountView,LoginView,LogoutView,MeView,PasswordResetConfirmView,PasswordResetRequestView,ProfileView,RegisterView
urlpatterns=[
 path("csrf/",CsrfView.as_view()),path("me/",MeView.as_view()),path("register/",RegisterView.as_view()),
 path("login/",LoginView.as_view()),path("logout/",LogoutView.as_view()),
 path("profile/",ProfileView.as_view()),path("change-password/",ChangePasswordView.as_view()),
 path("password-reset/request/",PasswordResetRequestView.as_view()),
 path("password-reset/confirm/",PasswordResetConfirmView.as_view()),
 path("delete/",DeleteAccountView.as_view()),
]
