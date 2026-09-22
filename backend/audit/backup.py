from django.contrib.auth import get_user_model
from django.forms.models import model_to_dict
from django.utils import timezone

from accounts.models import AccountPreferences,AccountProfile
from courses.models import Course,CourseEnrollment
from study.models import CompletedModule,SimulationRecord,SimulationReflection,StudyAnswer,StudyBookmark,StudyContentProgress,StudyNote,StudyProfile,StudyReviewItem,StudyRoadmapItem
from knowledge.models import Content,ContentChangelog,CourseDiscipline,Discipline,DisciplineContent,Question,QuestionChangelog,QuestionContentLink,ReviewQueue,SimulationQuestion
from platformapp.models import CompetitionAnswer,CompetitionMonthlyGoal,CompetitionRound,CompetitionSettings,GlobalContactSettings,PlatformAlert,PlatformAlertDismissal,PlatformGeneralSettings
from commerce.models import CommerceCoupon,CommerceOrder,CommerceOrderItem,CommercePlan,CommercePlanCourse,CommerceTransaction
from .models import AdminAuditLog

MODELS=[
 AccountProfile,AccountPreferences,Course,CourseEnrollment,StudyProfile,CompletedModule,StudyAnswer,SimulationRecord,SimulationReflection,StudyNote,StudyReviewItem,StudyContentProgress,StudyRoadmapItem,StudyBookmark,
 Discipline,Content,Question,CourseDiscipline,DisciplineContent,QuestionContentLink,SimulationQuestion,ReviewQueue,QuestionChangelog,ContentChangelog,
 PlatformAlert,PlatformAlertDismissal,GlobalContactSettings,PlatformGeneralSettings,CompetitionSettings,CompetitionMonthlyGoal,CompetitionRound,CompetitionAnswer,
 CommercePlan,CommercePlanCourse,CommerceCoupon,CommerceOrder,CommerceOrderItem,CommerceTransaction,AdminAuditLog,
]

SENSITIVE_FIELDS={
    "accounts.accountprofile":{"cpf","legacy_password_hash","legacy_open_id"},
}

def _json_safe(value):
    if hasattr(value,"isoformat"):return value.isoformat()
    if hasattr(value,"pk"):return value.pk
    if isinstance(value,(list,tuple)):return [_json_safe(v) for v in value]
    if isinstance(value,dict):return {k:_json_safe(v) for k,v in value.items()}
    return value

def _safe_row(model,obj):
    raw=model_to_dict(obj)
    raw["id"]=obj.pk
    for field in SENSITIVE_FIELDS.get(model._meta.label_lower,set()):
        raw.pop(field,None)
    return _json_safe(raw)

def logical_backup():
    User=get_user_model()
    users=[]
    for u in User.objects.all():
        users.append({"id":u.id,"username":u.username,"email":u.email,"first_name":u.first_name,"last_name":u.last_name,
            "is_staff":u.is_staff,"is_active":u.is_active,"date_joined":u.date_joined.isoformat(),
            "last_login":u.last_login.isoformat() if u.last_login else None})
    data={"users":users}
    for model in MODELS:
        key=model._meta.label_lower
        data[key]=[_safe_row(model,obj) for obj in model.objects.all().iterator()]
    return {
        "format":"nucleo-concursos-django-logical-backup",
        "version":2,
        "generatedAt":timezone.now().isoformat(),
        "restoreNotes":[
            "Backup lógico sanitizado: não contém senhas Django, hashes legados de senha, tokens, cookies, sessões ou segredos MFA.",
            "O CPF em texto puro nunca é exportado. O ciphertext/hash de CPF pode ser restaurado somente mantendo PII_MASTER_KEY com segurança fora deste arquivo.",
            "Para recuperação integral de desastre, mantenha também snapshots criptografados do MySQL no provedor.",
            "Restaure primeiro em banco vazio de homologação e valide integridade antes de produção.",
        ],
        "excluded":[
            "auth_user.password","accounts.AccountProfile.cpf","accounts.AccountProfile.legacy_password_hash",
            "accounts.AccountProfile.legacy_open_id","accounts.AccountMFA","accounts.PasswordResetToken",
            "accounts.TrackedSession","accounts.SecurityEvent","accounts.LoginAttempt","django_session",
        ],
        "tableCounts":{k:len(v) for k,v in data.items()},
        "data":data,
    }
