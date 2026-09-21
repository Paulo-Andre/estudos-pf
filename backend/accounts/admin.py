from django.contrib import admin
from .models import AccountProfile,LoginAttempt
admin.site.register(AccountProfile)
admin.site.register(LoginAttempt)
