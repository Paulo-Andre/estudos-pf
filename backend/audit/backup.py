from django.contrib.auth import get_user_model
from django.forms.models import model_to_dict
from accounts.models import AccountProfile
from courses.models import Course,CourseEnrollment
from study.models import CompletedModule,SimulationRecord,StudyAnswer,StudyContentProgress,StudyNote,StudyProfile,StudyReviewItem,StudyRoadmapItem
from knowledge.models import Content,ContentChangelog,CourseDiscipline,Discipline,DisciplineContent,Question,QuestionChangelog,QuestionContentLink,ReviewQueue,SimulationQuestion
from platformapp.models import CompetitionAnswer,CompetitionMonthlyGoal,CompetitionRound,CompetitionSettings,GlobalContactSettings,PlatformAlert,PlatformAlertDismissal,PlatformGeneralSettings
from commerce.models import CommerceCoupon,CommerceOrder,CommerceOrderItem,CommercePlan,CommercePlanCourse,CommerceTransaction
from .models import AdminAuditLog
from django.utils import timezone

MODELS=[
 AccountProfile,Course,CourseEnrollment,StudyProfile,CompletedModule,StudyAnswer,SimulationRecord,StudyNote,StudyReviewItem,StudyContentProgress,StudyRoadmapItem,
 Discipline,Content,Question,CourseDiscipline,DisciplineContent,QuestionContentLink,SimulationQuestion,ReviewQueue,QuestionChangelog,ContentChangelog,
 PlatformAlert,PlatformAlertDismissal,GlobalContactSettings,PlatformGeneralSettings,CompetitionSettings,CompetitionMonthlyGoal,CompetitionRound,CompetitionAnswer,
 CommercePlan,CommercePlanCourse,CommerceCoupon,CommerceOrder,CommerceOrderItem,CommerceTransaction,AdminAuditLog,
]

def _json_safe(value):
    if hasattr(value,"isoformat"):return value.isoformat()
    if hasattr(value,"pk"):return value.pk
    if isinstance(value,(list,tuple)):return [_json_safe(v) for v in value]
    if isinstance(value,dict):return {k:_json_safe(v) for k,v in value.items()}
    return value

def logical_backup():
    User=get_user_model()
    users=[]
    for u in User.objects.all():
        users.append({"id":u.id,"username":u.username,"email":u.email,"first_name":u.first_name,"last_name":u.last_name,"is_staff":u.is_staff,"is_active":u.is_active,"date_joined":u.date_joined.isoformat(),"last_login":u.last_login.isoformat() if u.last_login else None})
    data={"users":users}
    for model in MODELS:
        key=model._meta.label_lower
        rows=[]
        for obj in model.objects.all().iterator():
            raw=model_to_dict(obj)
            raw["id"]=obj.pk
            rows.append(_json_safe(raw))
        data[key]=rows
    return {"format":"nucleo-concursos-django-logical-backup","version":1,"generatedAt":timezone.now().isoformat(),
        "restoreNotes":["Backup lógico sem senhas, tokens, cookies ou sessões.","Restaure primeiro em banco vazio de homologação e valide integridade antes de produção."],
        "excluded":["auth_user.password","accounts.PasswordResetToken","django_session"],"tableCounts":{k:len(v) for k,v in data.items()},"data":data}
