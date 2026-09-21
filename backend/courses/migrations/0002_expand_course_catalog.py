from django.db import migrations,models

class Migration(migrations.Migration):
    dependencies=[("courses","0001_initial")]
    operations=[
        migrations.AddField(model_name="course",name="course_type",field=models.CharField(choices=[("concurso","Concurso"),("tutorial","Tutorial")],default="concurso",max_length=16)),
        migrations.AddField(model_name="course",name="course_area",field=models.CharField(default="Policial/Militar",max_length=80)),
        migrations.AddField(model_name="course",name="state_code",field=models.CharField(default="Nacional",max_length=32)),
        migrations.AddField(model_name="course",name="description",field=models.TextField(blank=True,default="")),
        migrations.AddField(model_name="course",name="cover_image_url",field=models.URLField(blank=True,default="",max_length=2048)),
        migrations.AddField(model_name="course",name="panel_label",field=models.CharField(blank=True,default="",max_length=80)),
        migrations.AddField(model_name="course",name="panel_badge",field=models.CharField(blank=True,default="",max_length=80)),
        migrations.AddField(model_name="course",name="panel_title",field=models.CharField(blank=True,default="",max_length=240)),
        migrations.AddField(model_name="course",name="panel_description",field=models.TextField(blank=True,default="")),
        migrations.AddField(model_name="course",name="panel_cta_text",field=models.CharField(blank=True,default="",max_length=80)),
        migrations.AddField(model_name="courseenrollment",name="source_order_id",field=models.CharField(blank=True,max_length=64,null=True)),
        migrations.AddField(model_name="courseenrollment",name="source_plan_id",field=models.CharField(blank=True,max_length=64,null=True)),
        migrations.AddIndex(model_name="courseenrollment",index=models.Index(fields=["user","status"],name="enroll_user_status_idx")),
        migrations.AddIndex(model_name="courseenrollment",index=models.Index(fields=["expires_at"],name="enroll_expiry_idx")),
        migrations.AddIndex(model_name="courseenrollment",index=models.Index(fields=["source_order_id"],name="enroll_source_order_idx")),
    ]
