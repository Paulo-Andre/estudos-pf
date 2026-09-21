from django.conf import settings
from django.db import models

class AdminAuditLog(models.Model):
    id=models.BigAutoField(primary_key=True)
    actor=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name="admin_actions")
    affected_user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.SET_NULL,null=True,blank=True,related_name="audit_events")
    action=models.CharField(max_length=80)
    detail=models.TextField()
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering=["-created_at"]
