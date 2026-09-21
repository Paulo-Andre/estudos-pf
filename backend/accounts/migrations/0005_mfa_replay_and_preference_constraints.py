from django.db import migrations,models

class Migration(migrations.Migration):
    dependencies=[("accounts","0004_account_mfa")]
    operations=[
        migrations.AddField(
            model_name="accountmfa",
            name="last_totp_step",
            field=models.BigIntegerField(blank=True,null=True),
        ),
        migrations.AddConstraint(
            model_name="accountpreferences",
            constraint=models.CheckConstraint(condition=models.Q(weekly_goal_questions__gte=1,weekly_goal_questions__lte=5000),name="prefs_goal_questions_valid"),
        ),
        migrations.AddConstraint(
            model_name="accountpreferences",
            constraint=models.CheckConstraint(condition=models.Q(weekly_goal_days__gte=1,weekly_goal_days__lte=7),name="prefs_goal_days_valid"),
        ),
    ]
