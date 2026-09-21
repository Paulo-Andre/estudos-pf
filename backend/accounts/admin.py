from django.contrib import admin
from .models import AccountMFA,AccountPreferences,AccountProfile,LoginAttempt,PasswordResetToken,SecurityEvent,TrackedSession

@admin.register(AccountProfile)
class AccountProfileAdmin(admin.ModelAdmin):
    list_display=("user","display_name","role","is_blocked","last_signed_in")
    search_fields=("user__username","user__email","display_name")
    readonly_fields=("cpf_encrypted","cpf_hash","legacy_password_hash")

admin.site.register(AccountPreferences)
admin.site.register(AccountMFA)
admin.site.register(LoginAttempt)

@admin.register(TrackedSession)
class TrackedSessionAdmin(admin.ModelAdmin):
    list_display=("user","created_at","last_seen_at","revoked_at")
    search_fields=("user__username","user__email")
    readonly_fields=("session_hash","ip_hash","user_agent","created_at","last_seen_at")

@admin.register(SecurityEvent)
class SecurityEventAdmin(admin.ModelAdmin):
    list_display=("event_type","user","created_at")
    list_filter=("event_type",)
    search_fields=("user__username","user__email")
    readonly_fields=("ip_hash","user_agent","metadata","created_at")

@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display=("user","expires_at","used_at","created_at")
    readonly_fields=("token_hash","created_at")
