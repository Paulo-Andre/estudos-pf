from datetime import date
from django.db import transaction
from .models import StudyProfile,CompletedModule,StudyAnswer,SimulationRecord,StudyNote
def profile(user): return StudyProfile.objects.get_or_create(user=user)[0]
def state(user):
    p=profile(user)
    return {"completedModules":[x.module_id for x in CompletedModule.objects.filter(user=user)],
    "answers":[{"questionId":x.question_id,"correct":x.correct,"answeredAt":x.answered_at.isoformat()} for x in StudyAnswer.objects.filter(user=user).order_by("answered_at")],
    "simulations":[{"id":x.id,"date":x.completed_at.isoformat(),"total":x.total,"correct":x.correct,"errors":x.errors,"elapsedSeconds":x.elapsed_seconds,"byDiscipline":x.by_discipline,"byBlock":x.by_block} for x in SimulationRecord.objects.filter(user=user).order_by("completed_at")],
    "xp":p.xp,"lastStudyDate":p.last_study_date.isoformat() if p.last_study_date else None,"studyDates":p.study_dates,"usedQuestionIds":p.used_question_ids}
def activity(user,xp,questions=()):
    p=profile(user); today=date.today(); p.xp+=xp; p.last_study_date=today
    p.study_dates=list(dict.fromkeys([*p.study_dates,today.isoformat()])); p.used_question_ids=list(dict.fromkeys([*p.used_question_ids,*questions])); p.save()
@transaction.atomic
def answer(user,qid,correct):
    StudyAnswer.objects.create(user=user,question_id=qid,correct=correct); activity(user,8 if correct else 2); return state(user)
@transaction.atomic
def complete(user,module):
    _,created=CompletedModule.objects.get_or_create(user=user,module_id=module)
    if created:activity(user,20)
    return state(user)
