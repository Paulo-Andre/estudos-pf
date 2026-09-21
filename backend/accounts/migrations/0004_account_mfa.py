from django.conf import settings
from django.db import migrations,models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies=[
        ("accounts","0003_privacy_and_sessions"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations=[
        migrations.CreateModel(
            name="AccountMFA",
            fields=[
                ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),
                ("secret_encrypted",models.TextField(blank=True,default="")),
                ("enabled",models.BooleanField(default=False)),
                ("backup_code_hashes",models.JSONField(blank=True,default=list)),
                ("confirmed_at",models.DateTimeField(blank=True,null=True)),
                ("updated_at",models.DateTimeField(auto_now=True)),
                ("user",models.OneToOneField(on_delete=django.db.models.deletion.CASCADE,related_name="account_mfa",to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
