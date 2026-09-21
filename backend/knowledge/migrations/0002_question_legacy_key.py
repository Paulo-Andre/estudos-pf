from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies=[("knowledge","0001_initial")]
    operations=[
        migrations.AddField(
            model_name="question",
            name="legacy_key",
            field=models.CharField(blank=True,max_length=80,null=True,unique=True),
        ),
    ]
