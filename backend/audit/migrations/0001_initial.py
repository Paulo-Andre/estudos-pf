from django.conf import settings
from django.db import migrations,models
import django.db.models.deletion
class Migration(migrations.Migration):
 initial=True
 dependencies=[migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
 operations=[migrations.CreateModel(name="AdminAuditLog",fields=[("id",models.BigAutoField(primary_key=True,serialize=False)),("action",models.CharField(max_length=80)),
 ("detail",models.TextField()),("created_at",models.DateTimeField(auto_now_add=True)),
 ("actor",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="admin_actions",to=settings.AUTH_USER_MODEL)),
 ("affected_user",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.SET_NULL,related_name="audit_events",to=settings.AUTH_USER_MODEL))],options={"ordering":["-created_at"]})]
