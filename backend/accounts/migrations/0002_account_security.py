from django.conf import settings
from django.db import migrations,models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies=[("accounts","0001_initial"),migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations=[
        migrations.AddField(model_name="accountprofile",name="cpf",field=models.CharField(blank=True,max_length=11,null=True,unique=True)),
        migrations.CreateModel(name="PasswordResetToken",fields=[
            ("id",models.CharField(max_length=64,primary_key=True,serialize=False)),("token_hash",models.CharField(max_length=64,unique=True)),
            ("expires_at",models.DateTimeField()),("used_at",models.DateTimeField(blank=True,null=True)),("created_at",models.DateTimeField(auto_now_add=True)),
            ("user",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="password_reset_tokens",to=settings.AUTH_USER_MODEL)),
        ],options={"indexes":[models.Index(fields=["user","expires_at"],name="reset_user_expiry_idx")]}),
    ]
