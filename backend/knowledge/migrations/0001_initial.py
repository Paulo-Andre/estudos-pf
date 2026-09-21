from django.conf import settings
from django.db import migrations,models
import django.db.models.deletion

class Migration(migrations.Migration):
    initial=True
    dependencies=[
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("courses","0002_expand_course_catalog"),
        ("study","0001_initial"),
    ]
    operations=[
        migrations.CreateModel(name="Content",fields=[
            ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),
            ("title",models.CharField(max_length=220)),("objective",models.TextField(blank=True,default="")),
            ("description",models.TextField(blank=True,default="")),("card_text",models.TextField(blank=True,default="")),
            ("body",models.TextField(blank=True,default="")),("cover_image_url",models.URLField(blank=True,default="",max_length=2048)),
            ("video_url",models.URLField(blank=True,default="",max_length=2048)),("video_label",models.CharField(blank=True,default="",max_length=160)),
            ("material_url",models.URLField(blank=True,default="",max_length=2048)),("material_label",models.CharField(blank=True,default="",max_length=160)),
            ("notice_kind",models.CharField(blank=True,choices=[("new","Novo"),("updated","Atualizado")],max_length=16,null=True)),
            ("notice_activated_at",models.DateTimeField(blank=True,null=True)),
            ("status",models.CharField(choices=[("draft","Rascunho"),("review","Em revisão"),("approved","Aprovado"),("published","Publicado"),("inactive","Inativo")],default="draft",max_length=16)),
            ("requires_review",models.BooleanField(default=False)),("created_at",models.DateTimeField(auto_now_add=True)),("updated_at",models.DateTimeField(auto_now=True)),
            ("created_by",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="contents_created",to=settings.AUTH_USER_MODEL)),
            ("updated_by",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="contents_updated",to=settings.AUTH_USER_MODEL)),
        ],options={"indexes":[models.Index(fields=["status"],name="content_status_idx"),models.Index(fields=["title"],name="content_title_idx")]}),
        migrations.CreateModel(name="Discipline",fields=[
            ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),
            ("name",models.CharField(max_length=160)),("short_name",models.CharField(max_length=48,unique=True)),
            ("description",models.TextField(blank=True,default="")),
            ("status",models.CharField(choices=[("draft","Rascunho"),("review","Em revisão"),("approved","Aprovado"),("published","Publicado"),("inactive","Inativo")],default="draft",max_length=16)),
            ("requires_review",models.BooleanField(default=False)),("created_at",models.DateTimeField(auto_now_add=True)),("updated_at",models.DateTimeField(auto_now=True)),
            ("created_by",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="disciplines_created",to=settings.AUTH_USER_MODEL)),
            ("updated_by",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="disciplines_updated",to=settings.AUTH_USER_MODEL)),
        ],options={"indexes":[models.Index(fields=["status"],name="discipline_status_idx")]}),
        migrations.CreateModel(name="Question",fields=[
            ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),
            ("statement",models.TextField()),("question_type",models.CharField(choices=[("certo_errado","Certo/Errado"),("multipla_escolha","Múltipla escolha")],default="certo_errado",max_length=24)),
            ("options_json",models.JSONField(blank=True,null=True)),("answer_json",models.JSONField()),("explanation",models.TextField(blank=True,default="")),
            ("difficulty",models.CharField(choices=[("basic","Básica"),("intermediate","Intermediária"),("advanced","Avançada")],default="intermediate",max_length=16)),
            ("source",models.CharField(blank=True,default="",max_length=240)),("banca",models.CharField(blank=True,default="",max_length=120)),("year",models.PositiveIntegerField(blank=True,null=True)),
            ("status",models.CharField(choices=[("draft","Rascunho"),("review","Em revisão"),("approved","Aprovado"),("published","Publicado"),("inactive","Inativo")],default="draft",max_length=16)),
            ("requires_review",models.BooleanField(default=False)),("created_at",models.DateTimeField(auto_now_add=True)),("updated_at",models.DateTimeField(auto_now=True)),
            ("created_by",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="questions_created",to=settings.AUTH_USER_MODEL)),
            ("updated_by",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="questions_updated",to=settings.AUTH_USER_MODEL)),
        ],options={"indexes":[models.Index(fields=["status"],name="question_status_idx"),models.Index(fields=["requires_review","status"],name="question_review_idx"),models.Index(fields=["banca","year"],name="question_banca_year_idx")]}),
        migrations.CreateModel(name="CourseDiscipline",fields=[
            ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),("linked_at",models.DateTimeField(auto_now_add=True)),
            ("course",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="discipline_links",to="courses.course")),
            ("discipline",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="course_links",to="knowledge.discipline")),
            ("linked_by",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,to=settings.AUTH_USER_MODEL)),
        ],options={"constraints":[models.UniqueConstraint(fields=("course","discipline"),name="course_discipline_uniq")]}),
        migrations.CreateModel(name="DisciplineContent",fields=[
            ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),("linked_at",models.DateTimeField(auto_now_add=True)),
            ("content",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="discipline_links",to="knowledge.content")),
            ("discipline",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="content_links",to="knowledge.discipline")),
            ("linked_by",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,to=settings.AUTH_USER_MODEL)),
        ],options={"constraints":[models.UniqueConstraint(fields=("discipline","content"),name="discipline_content_uniq")]}),
        migrations.CreateModel(name="QuestionContentLink",fields=[
            ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),("linked_at",models.DateTimeField(auto_now_add=True)),
            ("content",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="question_links",to="knowledge.content")),
            ("question",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="content_links",to="knowledge.question")),
            ("linked_by",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,to=settings.AUTH_USER_MODEL)),
        ],options={"constraints":[models.UniqueConstraint(fields=("question","content"),name="question_content_uniq")]}),
        migrations.CreateModel(name="ReviewQueue",fields=[
            ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),
            ("item_type",models.CharField(choices=[("question","Questão"),("content","Conteúdo")],max_length=16)),
            ("item_id",models.PositiveBigIntegerField()),("status",models.CharField(choices=[("pending","Pendente"),("approved","Aprovado"),("rejected","Rejeitado"),("correction_requested","Correção solicitada")],default="pending",max_length=24)),
            ("notes",models.TextField(blank=True,default="")),("created_at",models.DateTimeField(auto_now_add=True)),("updated_at",models.DateTimeField(auto_now=True)),
            ("reviewed_by",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.PROTECT,related_name="reviews_decided",to=settings.AUTH_USER_MODEL)),
            ("submitted_by",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="reviews_submitted",to=settings.AUTH_USER_MODEL)),
        ],options={"indexes":[models.Index(fields=["status","item_type"],name="review_pending_idx"),models.Index(fields=["item_type","item_id"],name="review_item_idx")]}),
        migrations.CreateModel(name="QuestionChangelog",fields=[
            ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),("changed_field",models.CharField(max_length=80)),
            ("old_value",models.TextField(blank=True,null=True)),("new_value",models.TextField(blank=True,null=True)),("created_at",models.DateTimeField(auto_now_add=True)),
            ("actor",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,to=settings.AUTH_USER_MODEL)),
            ("question",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="changelog",to="knowledge.question")),
        ]),
        migrations.CreateModel(name="ContentChangelog",fields=[
            ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),("changed_field",models.CharField(max_length=80)),
            ("old_value",models.TextField(blank=True,null=True)),("new_value",models.TextField(blank=True,null=True)),("created_at",models.DateTimeField(auto_now_add=True)),
            ("actor",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,to=settings.AUTH_USER_MODEL)),
            ("content",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="changelog",to="knowledge.content")),
        ]),
        migrations.CreateModel(name="SimulationQuestion",fields=[
            ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),("position",models.PositiveIntegerField()),
            ("answered_correctly",models.BooleanField(blank=True,null=True)),("snapshot_json",models.JSONField()),("created_at",models.DateTimeField(auto_now_add=True)),
            ("question",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="simulation_snapshots",to="knowledge.question")),
            ("simulation",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="question_snapshots",to="study.simulationrecord")),
        ],options={"constraints":[models.UniqueConstraint(fields=("simulation","position"),name="sim_question_position_uniq"),models.UniqueConstraint(fields=("simulation","question"),name="sim_question_question_uniq")]}),
    ]
