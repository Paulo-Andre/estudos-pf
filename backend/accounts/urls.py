from django.urls import path
from .views import ChangePasswordView,CsrfView,DataExportView,DeleteAccountView,LoginView,LogoutView,MFABackupCodesView,MFAConfirmView,MFADisableView,MFASetupView,MFAStatusView,MeView,MySecurityEventsView,PasswordResetConfirmView,PasswordResetRequestView,PreferencesView,ProfileView,RegisterView,SessionRevokeView,SessionsView
urlpatterns=[
 path("csrf/",CsrfView.as_view()),path("me/",MeView.as_view()),path("register/",RegisterView.as_view()),
 path("login/",LoginView.as_view()),path("logout/",LogoutView.as_view()),
 path("profile/",ProfileView.as_view()),path("change-password/",ChangePasswordView.as_view()),
 path("password-reset/request/",PasswordResetRequestView.as_view()),
 path("password-reset/confirm/",PasswordResetConfirmView.as_view()),
 path("delete/",DeleteAccountView.as_view()),
 path("preferences/",PreferencesView.as_view()),
 path("sessions/",SessionsView.as_view()),
 path("sessions/<uuid:session_id>/",SessionRevokeView.as_view()),
 path("security-events/",MySecurityEventsView.as_view()),
 path("export/",DataExportView.as_view()),
 path("mfa/",MFAStatusView.as_view()),
 path("mfa/setup/",MFASetupView.as_view()),
 path("mfa/confirm/",MFAConfirmView.as_view()),
 path("mfa/disable/",MFADisableView.as_view()),
 path("mfa/backup-codes/",MFABackupCodesView.as_view()),
]
