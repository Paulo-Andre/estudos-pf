from django.contrib import admin
from .models import AdminAuditLog
@admin.register(AdminAuditLog)
class AuditAdmin(admin.ModelAdmin):
    readonly_fields=("actor","affected_user","action","detail","created_at")
    def has_add_permission(self,request):return False
    def has_change_permission(self,request,obj=None):return False
