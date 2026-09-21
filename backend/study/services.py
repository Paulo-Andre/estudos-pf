from datetime import date
from django.db import transaction
from django.utils import timezone
from knowledge.models import Question,SimulationQuestion
from .models import StudyProfile,CompletedModule,StudyAnswer,SimulationRecord,StudyNote

def profile(user): return StudyProfile.objects.get_or_create(user=user)[0]

def state(user):
    p=profile(user)
    return {"completedModules":[x.module_id for x in CompletedModule.objects.filter(user=user)],
    "answers":[{"questionId":x.question_id,"correct":x.correct,"answeredAt":x.answered_at.isoformat()} for x in StudyAnswer.objects.filter(user=user).order_by("answered_at")],
    "simulations":[{"id":x.id,"date":x.completed_at.isoformat(),"total":x.total,"correct":x.correct,"errors":x.errors,"elapsedSeconds":x.elapsed_seconds,"byDiscipline":x.by_discipline,"byBlock":x.by_block} for x in SimulationRecord.objects.filter(user=user).order_by("completed_at")],
    "xp":p.xp,"lastStudyDate":p.last_study_date.isoformat() if p.last_study_date else None,"studyDates":p.study_dates,"usedQuestionIds":p.used_question_ids}

def activity(user,xp,questions=()):
    p=profile(user);today=date.today();p.xp+=max(0,int(xp));p.last_study_date=today
    p.study_dates=list(dict.fromkeys([*p.study_dates,today.isoformat()]))
    p.used_question_ids=list(dict.fromkeys([*p.used_question_ids,*[str(q) for q in questions]]))
    p.save()

@transaction.atomic
def answer(user,qid,correct):
    StudyAnswer.objects.create(user=user,question_id=qid,correct=correct)
    activity(user,8 if correct else 2)
    return state(user)

@transaction.atomic
def complete(user,module):
    _,created=CompletedModule.objects.get_or_create(user=user,module_id=module)
    if created:activity(user,20)
    return state(user)

@transaction.atomic
def submit_simulation(user,data):
    sid=str(data.get("id") or "")[:64]
    if not sid:raise ValueError("ID do simulado obrigatório.")
    if SimulationRecord.objects.filter(pk=sid).exists():
        existing=SimulationRecord.objects.get(pk=sid)
        if existing.user_id!=user.id:raise ValueError("ID de simulado já utilizado.")
        return state(user)
    total=int(data.get("total") or 0);correct=int(data.get("correct") or 0);errors=int(data.get("errors") or 0)
    if total<1 or correct<0 or errors<0 or correct+errors>total:raise ValueError("Resultado do simulado inválido.")
    record=SimulationRecord.objects.create(
        id=sid,user=user,total=total,correct=correct,errors=errors,elapsed_seconds=max(0,int(data.get("elapsedSeconds") or 0)),
        by_discipline=dict(data.get("byDiscipline") or {}),by_block=dict(data.get("byBlock") or {}))
    answers=list(data.get("answers") or [])
    StudyAnswer.objects.bulk_create([
        StudyAnswer(user=user,question_id=str(item.get("questionId") or "")[:80],correct=bool(item.get("correct")))
        for item in answers if item.get("questionId") is not None
    ])
    persistent=list(data.get("persistentAnswers") or [])
    snapshots=[]
    for position,item in enumerate(persistent,1):
        qid=item.get("questionId")
        question=Question.objects.filter(pk=qid).first()
        if not question:continue
        snapshots.append(SimulationQuestion(
            simulation=record,question=question,position=position,answered_correctly=bool(item.get("correct")),
            snapshot_json=dict(item.get("snapshot") or {})))
    if snapshots:SimulationQuestion.objects.bulk_create(snapshots)
    question_ids=[str(x) for x in data.get("questionIds") or []]
    activity(user,correct*8+15,question_ids)
    return state(user)

def simulation_detail(user,simulation_id):
    record=SimulationRecord.objects.filter(pk=simulation_id,user=user).first()
    if not record:return None
    return {
        "id":record.id,"date":record.completed_at,"total":record.total,"correct":record.correct,"errors":record.errors,
        "elapsedSeconds":record.elapsed_seconds,"byDiscipline":record.by_discipline,"byBlock":record.by_block,
        "questions":[{"position":q.position,"questionId":q.question_id,"correct":q.answered_correctly,"snapshot":q.snapshot_json}
            for q in record.question_snapshots.order_by("position")]
    }
