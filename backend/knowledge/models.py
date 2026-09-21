from django.conf import settings
from django.db import models

class KnowledgeStatus(models.TextChoices):
    DRAFT="draft","Rascunho"
    REVIEW="review","Em revisão"
    APPROVED="approved","Aprovado"
    PUBLISHED="published","Publicado"
    INACTIVE="inactive","Inativo"

class Discipline(models.Model):
    name=models.CharField(max_length=160)
    short_name=models.CharField(max_length=48,unique=True)
    description=models.TextField(blank=True,default="")
    status=models.CharField(max_length=16,choices=KnowledgeStatus.choices,default=KnowledgeStatus.DRAFT)
    requires_review=models.BooleanField(default=False)
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name="disciplines_created")
    updated_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name="disciplines_updated")
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)
    class Meta:
        indexes=[models.Index(fields=["status"],name="discipline_status_idx")]

class Content(models.Model):
    title=models.CharField(max_length=220)
    objective=models.TextField(blank=True,default="")
    description=models.TextField(blank=True,default="")
    card_text=models.TextField(blank=True,default="")
    body=models.TextField(blank=True,default="")
    cover_image_url=models.URLField(max_length=2048,blank=True,default="")
    video_url=models.URLField(max_length=2048,blank=True,default="")
    video_label=models.CharField(max_length=160,blank=True,default="")
    material_url=models.URLField(max_length=2048,blank=True,default="")
    material_label=models.CharField(max_length=160,blank=True,default="")
    notice_kind=models.CharField(max_length=16,choices=[("new","Novo"),("updated","Atualizado")],null=True,blank=True)
    notice_activated_at=models.DateTimeField(null=True,blank=True)
    status=models.CharField(max_length=16,choices=KnowledgeStatus.choices,default=KnowledgeStatus.DRAFT)
    requires_review=models.BooleanField(default=False)
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name="contents_created")
    updated_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name="contents_updated")
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)
    class Meta:
        indexes=[
            models.Index(fields=["status"],name="content_status_idx"),
            models.Index(fields=["title"],name="content_title_idx"),
        ]

class Question(models.Model):
    class QuestionType(models.TextChoices):
        TRUE_FALSE="certo_errado","Certo/Errado"
        MULTIPLE_CHOICE="multipla_escolha","Múltipla escolha"
    class Difficulty(models.TextChoices):
        BASIC="basic","Básica"
        INTERMEDIATE="intermediate","Intermediária"
        ADVANCED="advanced","Avançada"

    statement=models.TextField()
    question_type=models.CharField(max_length=24,choices=QuestionType.choices,default=QuestionType.TRUE_FALSE)
    options_json=models.JSONField(null=True,blank=True)
    answer_json=models.JSONField()
    explanation=models.TextField(blank=True,default="")
    difficulty=models.CharField(max_length=16,choices=Difficulty.choices,default=Difficulty.INTERMEDIATE)
    source=models.CharField(max_length=240,blank=True,default="")
    banca=models.CharField(max_length=120,blank=True,default="")
    year=models.PositiveIntegerField(null=True,blank=True)
    status=models.CharField(max_length=16,choices=KnowledgeStatus.choices,default=KnowledgeStatus.DRAFT)
    requires_review=models.BooleanField(default=False)
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name="questions_created")
    updated_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name="questions_updated")
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)
    class Meta:
        indexes=[
            models.Index(fields=["status"],name="question_status_idx"),
            models.Index(fields=["requires_review","status"],name="question_review_idx"),
            models.Index(fields=["banca","year"],name="question_banca_year_idx"),
        ]

class CourseDiscipline(models.Model):
    course=models.ForeignKey("courses.Course",on_delete=models.CASCADE,related_name="discipline_links")
    discipline=models.ForeignKey(Discipline,on_delete=models.CASCADE,related_name="course_links")
    linked_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT)
    linked_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["course","discipline"],name="course_discipline_uniq")]

class DisciplineContent(models.Model):
    discipline=models.ForeignKey(Discipline,on_delete=models.CASCADE,related_name="content_links")
    content=models.ForeignKey(Content,on_delete=models.CASCADE,related_name="discipline_links")
    linked_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT)
    linked_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["discipline","content"],name="discipline_content_uniq")]

class QuestionContentLink(models.Model):
    question=models.ForeignKey(Question,on_delete=models.CASCADE,related_name="content_links")
    content=models.ForeignKey(Content,on_delete=models.CASCADE,related_name="question_links")
    linked_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT)
    linked_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["question","content"],name="question_content_uniq")]

class ReviewQueue(models.Model):
    class ItemType(models.TextChoices):
        QUESTION="question","Questão"
        CONTENT="content","Conteúdo"
    class Status(models.TextChoices):
        PENDING="pending","Pendente"
        APPROVED="approved","Aprovado"
        REJECTED="rejected","Rejeitado"
        CORRECTION_REQUESTED="correction_requested","Correção solicitada"

    item_type=models.CharField(max_length=16,choices=ItemType.choices)
    item_id=models.PositiveBigIntegerField()
    status=models.CharField(max_length=24,choices=Status.choices,default=Status.PENDING)
    submitted_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name="reviews_submitted")
    reviewed_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name="reviews_decided",null=True,blank=True)
    notes=models.TextField(blank=True,default="")
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)
    class Meta:
        indexes=[
            models.Index(fields=["status","item_type"],name="review_pending_idx"),
            models.Index(fields=["item_type","item_id"],name="review_item_idx"),
        ]

class QuestionChangelog(models.Model):
    question=models.ForeignKey(Question,on_delete=models.CASCADE,related_name="changelog")
    actor=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT)
    changed_field=models.CharField(max_length=80)
    old_value=models.TextField(null=True,blank=True)
    new_value=models.TextField(null=True,blank=True)
    created_at=models.DateTimeField(auto_now_add=True)

class ContentChangelog(models.Model):
    content=models.ForeignKey(Content,on_delete=models.CASCADE,related_name="changelog")
    actor=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT)
    changed_field=models.CharField(max_length=80)
    old_value=models.TextField(null=True,blank=True)
    new_value=models.TextField(null=True,blank=True)
    created_at=models.DateTimeField(auto_now_add=True)

class SimulationQuestion(models.Model):
    simulation=models.ForeignKey("study.SimulationRecord",on_delete=models.CASCADE,related_name="question_snapshots")
    question=models.ForeignKey(Question,on_delete=models.PROTECT,related_name="simulation_snapshots")
    position=models.PositiveIntegerField()
    answered_correctly=models.BooleanField(null=True,blank=True)
    snapshot_json=models.JSONField()
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints=[
            models.UniqueConstraint(fields=["simulation","position"],name="sim_question_position_uniq"),
            models.UniqueConstraint(fields=["simulation","question"],name="sim_question_question_uniq"),
        ]
