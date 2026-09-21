from django.contrib import admin
from .models import AccountProfile,LoginAttempt,PasswordResetToken
admin.site.register(AccountProfile)
admin.site.register(LoginAttempt)
@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display=("user","expires_at","used_at","created_at")
    readonly_fields=("token_hash","created_at")
