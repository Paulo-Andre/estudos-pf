from datetime import date
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from courses.permissions import has_active_enrollment
from knowledge.models import Question
from knowledge.services import can_use_question
from .models import CompetitionAnswer,CompetitionRound,CompetitionSettings,PlatformAlert,PlatformAlertDismissal

def visible_alerts(user):
    dismissed=set(PlatformAlertDismissal.objects.filter(user=user).values_list("alert_id",flat=True))
    alerts=PlatformAlert.objects.filter(is_active=True).order_by("-created_at")
    result=[]
    for alert in alerts:
        if alert.id in dismissed:
            continue
        if alert.audience==PlatformAlert.Audience.COURSE and (not alert.course_id or not has_active_enrollment(user,alert.course_id)):
            continue
        result.append(alert)
    return result

@transaction.atomic
def dismiss_alert(user,alert_id):
    alert=PlatformAlert.objects.select_for_update().get(pk=alert_id,is_active=True)
    PlatformAlertDismissal.objects.get_or_create(alert=alert,user=user)
    return alert

@transaction.atomic
def start_competition_round(user,course,question_count=None):
    if course and not has_active_enrollment(user,course.id):
        raise PermissionError("Matrícula vigente necessária.")
    settings_obj,_=CompetitionSettings.objects.get_or_create(pk=1)
    if not settings_obj.is_active:
        raise ValueError("Competição desativada.")
    total=question_count or settings_obj.questions_per_round
    qs=Question.objects.all().order_by("id")
    eligible=[q for q in qs if can_use_question(q)]
    if course:
        eligible=[q for q in eligible if q.content_links.filter(content__discipline_links__discipline__course_links__course=course).exists()]
    selected=eligible[:max(1,total)]
    if not selected:
        raise ValueError("Não há questões elegíveis.")
    import secrets
    rid=secrets.token_urlsafe(24)[:64]
    return CompetitionRound.objects.create(id=rid,user=user,course=course,question_ids=[q.id for q in selected])

@transaction.atomic
def answer_competition_round(user,round_id,question_id,submitted):
    round_obj=CompetitionRound.objects.select_for_update().get(pk=round_id,user=user,completed_at__isnull=True)
    if int(question_id) not in [int(x) for x in round_obj.question_ids]:
        raise ValueError("Questão não pertence a esta rodada.")
    question=Question.objects.get(pk=question_id)
    expected=question.answer_json
    correct=submitted==expected
    cfg,_=CompetitionSettings.objects.get_or_create(pk=1)
    points=cfg.points_per_correct if correct else cfg.points_per_wrong
    answer=CompetitionAnswer.objects.create(round=round_obj,user=user,question=question,course=round_obj.course,submitted_answer_json=submitted,correct=correct,points_earned=points)
    if round_obj.answers.count()>=len(round_obj.question_ids):
        round_obj.completed_at=timezone.now()
        round_obj.save(update_fields=["completed_at"])
    return answer

def ranking(course_id=None):
    qs=CompetitionAnswer.objects.all()
    if course_id:
        qs=qs.filter(course_id=course_id)
    rows=qs.values("user_id","user__username","user__first_name").annotate(points=Sum("points_earned")).order_by("-points","user_id")[:100]
    return list(rows)
