from django.conf import settings
from django.db import models
from django.utils import timezone

class StudyProfile(models.Model):
    id=models.BigAutoField(primary_key=True)
    user=models.OneToOneField(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="study_profile")
    xp=models.PositiveIntegerField(default=0)
    last_study_date=models.DateField(null=True,blank=True)
    study_dates=models.JSONField(default=list)
    used_question_ids=models.JSONField(default=list)
    daily_quick_check_date=models.DateField(null=True,blank=True)
    daily_quick_check_course=models.ForeignKey("courses.Course",on_delete=models.SET_NULL,null=True,blank=True,related_name="+")
    daily_quick_check_question=models.ForeignKey("knowledge.Question",on_delete=models.SET_NULL,null=True,blank=True,related_name="+")
    daily_quick_check_dismissed=models.BooleanField(default=False)

class CompletedModule(models.Model):
    id=models.BigAutoField(primary_key=True)
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="completed_modules")
    module_id=models.CharField(max_length=80)
    completed_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["user","module_id"],name="completed_user_module_uniq")]

class StudyAnswer(models.Model):
    id=models.BigAutoField(primary_key=True)
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="study_answers")
    course=models.ForeignKey("courses.Course",on_delete=models.SET_NULL,null=True,blank=True,related_name="study_answers")
    question_id=models.CharField(max_length=80)
    correct=models.BooleanField()
    confidence=models.PositiveSmallIntegerField(null=True,blank=True)
    answered_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints=[
            models.CheckConstraint(
                condition=models.Q(confidence__isnull=True)|models.Q(confidence__gte=1,confidence__lte=3),
                name="study_answer_confidence_valid",
            ),
        ]

class SimulationRecord(models.Model):
    class Mode(models.TextChoices):
        PRACTICE="practice","Treino"
        DOMAIN="domain","Prova de domínio"
        REAL_EXAM="real_exam","Prova real"
    id=models.CharField(max_length=64,primary_key=True)
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="simulation_records")
    course=models.ForeignKey("courses.Course",on_delete=models.SET_NULL,null=True,blank=True,related_name="simulation_records")
    mode=models.CharField(max_length=16,choices=Mode.choices,default=Mode.PRACTICE)
    completed_at=models.DateTimeField(auto_now_add=True)
    total=models.PositiveIntegerField()
    correct=models.PositiveIntegerField()
    errors=models.PositiveIntegerField()
    elapsed_seconds=models.PositiveIntegerField()
    by_discipline=models.JSONField(default=dict)
    by_block=models.JSONField(default=dict)
    telemetry_json=models.JSONField(default=dict)

class SimulationReflection(models.Model):
    class Cause(models.TextChoices):
        KNOWLEDGE="knowledge","Conteúdo"
        ATTENTION="attention","Atenção"
        TIME="time","Tempo"
        INTERPRETATION="interpretation","Interpretação"
        STRATEGY="strategy","Estratégia"
    class NextAction(models.TextChoices):
        REVIEW="review","Revisar erros"
        PRACTICE="practice","Praticar questões"
        CONTENT="content","Retomar conteúdo"
        TIME_STRATEGY="time_strategy","Treinar gestão de tempo"
        SIMULATE="simulate","Novo simulado"
    simulation=models.OneToOneField(SimulationRecord,on_delete=models.CASCADE,related_name="reflection")
    confidence=models.PositiveSmallIntegerField(default=3)
    primary_cause=models.CharField(max_length=24,choices=Cause.choices)
    next_action=models.CharField(max_length=24,choices=NextAction.choices)
    note=models.CharField(max_length=600,blank=True,default="")
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)
    class Meta:
        constraints=[
            models.CheckConstraint(condition=models.Q(confidence__gte=1,confidence__lte=5),name="reflection_confidence_valid"),
        ]

class StudyNote(models.Model):
    id=models.BigAutoField(primary_key=True)
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="study_notes")
    module_id=models.CharField(max_length=80)
    content=models.TextField(blank=True,default="")
    class Meta:
        constraints=[models.UniqueConstraint(fields=["user","module_id"],name="note_user_module_uniq")]

class StudyReviewItem(models.Model):
    class Status(models.TextChoices):
        PENDING="pending","Pendente"
        MASTERED="mastered","Dominada"
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="study_review_items")
    question_key=models.CharField(max_length=80)
    snapshot_json=models.JSONField(default=dict)
    status=models.CharField(max_length=16,choices=Status.choices,default=Status.PENDING)
    created_at=models.DateTimeField(auto_now_add=True)
    reviewed_at=models.DateTimeField(null=True,blank=True)
    source=models.CharField(max_length=24,default="manual")
    due_at=models.DateTimeField(null=True,blank=True,default=timezone.now)
    interval_days=models.PositiveIntegerField(default=0)
    ease_factor=models.FloatField(default=2.5)
    repetitions=models.PositiveSmallIntegerField(default=0)
    lapse_count=models.PositiveSmallIntegerField(default=0)
    last_rating=models.CharField(max_length=16,blank=True,default="")
    class Meta:
        constraints=[models.UniqueConstraint(fields=["user","question_key"],name="review_user_question_uniq")]
        indexes=[
            models.Index(fields=["user","status"],name="review_user_status_idx"),
            models.Index(fields=["user","status","due_at"],name="review_user_due_idx"),
        ]

class StudyContentProgress(models.Model):
    class Status(models.TextChoices):
        STARTED="started","Iniciado"
        COMPLETED="completed","Concluído"
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="content_progress")
    course=models.ForeignKey("courses.Course",on_delete=models.CASCADE,related_name="student_progress")
    content=models.ForeignKey("knowledge.Content",on_delete=models.CASCADE,related_name="student_progress")
    status=models.CharField(max_length=16,choices=Status.choices,default=Status.STARTED)
    started_at=models.DateTimeField(auto_now_add=True)
    last_opened_at=models.DateTimeField(auto_now=True)
    completed_at=models.DateTimeField(null=True,blank=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["user","course","content"],name="progress_user_course_content_uniq")]
        indexes=[models.Index(fields=["user","last_opened_at"],name="progress_user_last_idx")]

class StudyRoadmapItem(models.Model):
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="roadmap_items")
    course=models.ForeignKey("courses.Course",on_delete=models.CASCADE,related_name="roadmap_items")
    content=models.ForeignKey("knowledge.Content",on_delete=models.CASCADE,related_name="roadmap_items")
    discipline=models.ForeignKey("knowledge.Discipline",on_delete=models.SET_NULL,null=True,blank=True,related_name="roadmap_items")
    weekday=models.PositiveSmallIntegerField()
    start_time=models.TimeField()
    is_active=models.BooleanField(default=True)
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)
    class Meta:
        constraints=[
            models.UniqueConstraint(fields=["user","course","discipline"],name="roadmap_user_course_disc_uniq"),
            models.CheckConstraint(condition=models.Q(weekday__gte=0,weekday__lte=6),name="roadmap_weekday_valid"),
        ]
        indexes=[models.Index(fields=["user","weekday","start_time"],name="roadmap_user_day_time_idx")]


class StudyBookmark(models.Model):
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="study_bookmarks")
    course=models.ForeignKey("courses.Course",on_delete=models.CASCADE,related_name="bookmarks")
    content=models.ForeignKey("knowledge.Content",on_delete=models.CASCADE,related_name="bookmarks")
    note=models.CharField(max_length=240,blank=True,default="")
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["user","course","content"],name="bookmark_user_course_content_uniq")]
        indexes=[models.Index(fields=["user","-created_at"],name="bookmark_user_created_idx")]


class StudySyllabusSnapshot(models.Model):
    course=models.ForeignKey("courses.Course",on_delete=models.CASCADE,related_name="study_syllabus_snapshots")
    version=models.PositiveIntegerField()
    fingerprint=models.CharField(max_length=64)
    items_json=models.JSONField(default=list)
    change_summary_json=models.JSONField(default=dict)
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints=[
            models.UniqueConstraint(fields=["course","version"],name="syllabus_course_version_uniq"),
            models.UniqueConstraint(fields=["course","fingerprint"],name="syllabus_course_fingerprint_uniq"),
        ]
        indexes=[models.Index(fields=["course","-version"],name="syllabus_course_version_idx")]


class LearningIntelligenceSettings(models.Model):
    course=models.OneToOneField("courses.Course",on_delete=models.CASCADE,primary_key=True,related_name="learning_intelligence_settings")
    is_active=models.BooleanField(default=True)
    radar_enabled=models.BooleanField(default=True)
    error_coach_enabled=models.BooleanField(default=True)
    domain_proof_enabled=models.BooleanField(default=True)
    mastery_map_enabled=models.BooleanField(default=True)
    real_exam_enabled=models.BooleanField(default=True)
    telemetry_enabled=models.BooleanField(default=True)
    diagnostic_min_answers=models.PositiveSmallIntegerField(default=5)
    domain_proof_question_count=models.PositiveSmallIntegerField(default=10)
    real_exam_min_questions=models.PositiveSmallIntegerField(default=10)
    real_exam_question_count=models.PositiveSmallIntegerField(default=60)
    validating_score_threshold=models.PositiveSmallIntegerField(default=60)
    retained_score_threshold=models.PositiveSmallIntegerField(default=80)
    retention_min_correct_days=models.PositiveSmallIntegerField(default=2)
    retention_min_span_days=models.PositiveSmallIntegerField(default=2)
    retained_recheck_days=models.PositiveSmallIntegerField(default=14)
    updated_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.SET_NULL,null=True,blank=True,related_name="+")
    updated_at=models.DateTimeField(auto_now=True)
