from datetime import date,timedelta
from django.db.models import Q
from django.utils import timezone

from accounts.models import AccountPreferences
from courses.permissions import has_active_enrollment
from knowledge.models import Question
from .advanced_services import course_progress_payload,queue_review
from .models import SimulationRecord,StudyAnswer,StudyProfile,StudyReviewItem,StudyRoadmapItem


def _review_payload(item):
    return {
        "id":item.id,
        "questionKey":item.question_key,
        "snapshot":item.snapshot_json,
        "source":item.source,
        "dueAt":item.due_at,
        "intervalDays":item.interval_days,
        "repetitions":item.repetitions,
        "lapseCount":item.lapse_count,
        "lastRating":item.last_rating,
    }


def due_reviews(user,limit=20):
    now=timezone.now()
    qs=StudyReviewItem.objects.filter(user=user,status="pending").filter(Q(due_at__isnull=True)|Q(due_at__lte=now)).order_by("due_at","created_at")
    return list(qs[:limit])


def queue_question_error(user,question_key,source="answer_error",snapshot=None):
    key=str(question_key or "")[:80]
    question=None
    numeric=key.removeprefix("central-")
    if numeric.isdigit():
        question=Question.objects.filter(pk=int(numeric)).first()
    if not question:
        question=Question.objects.filter(legacy_key=key).first()
    if question:
        disciplines=[]
        subjects=[]
        for link in question.content_links.select_related("content").prefetch_related("content__discipline_links__discipline"):
            subjects.append(link.content.title)
            for dlink in link.content.discipline_links.all():
                if dlink.discipline.name not in disciplines:disciplines.append(dlink.discipline.name)
        snapshot={
            "statement":question.statement,
            "answer":question.answer_json,
            "explanation":question.explanation or "",
            "discipline":disciplines[0] if disciplines else "Biblioteca central",
            "subject":" · ".join(subjects) or "Conteúdo geral",
            "source":question.source or "Questão respondida",
            **(snapshot or {}),
        }
        key=question.legacy_key or f"central-{question.pk}"
    if not snapshot:
        snapshot={"statement":"Questão respondida incorretamente","answer":None,"explanation":"","discipline":"Revisão","subject":"Erro recente","source":"Sistema"}
    return queue_review(user,key,snapshot,source=source)


def _simulation_metrics(user):
    totals={}
    for sim in SimulationRecord.objects.filter(user=user).order_by("-completed_at")[:8]:
        for discipline,value in (sim.by_discipline or {}).items():
            metric=totals.setdefault(discipline,{"correct":0,"total":0})
            try:
                metric["correct"]+=int(value.get("correct",0))
                metric["total"]+=int(value.get("total",0))
            except (AttributeError,TypeError,ValueError):
                continue
    rows=[]
    for discipline,metric in totals.items():
        if metric["total"]<2:continue
        accuracy=round(metric["correct"]*100/metric["total"])
        rows.append({"discipline":discipline,"accuracy":accuracy,**metric})
    return sorted(rows,key=lambda row:(row["accuracy"],-row["total"]))


def _metacognition(user):
    answers=list(StudyAnswer.objects.filter(user=user,confidence__isnull=False).order_by("-answered_at")[:200])
    if not answers:
        return {"sample":0,"score":None,"label":"coletando","overconfident":0,"underconfident":0,
            "tip":"Marque seu nível de confiança antes de responder para o sistema comparar percepção e desempenho."}
    probability={1:0.55,2:0.75,3:0.9}
    errors=[(probability.get(int(item.confidence),0.75)-(1 if item.correct else 0))**2 for item in answers]
    score=max(0,min(100,round(100*(1-(sum(errors)/len(errors))))))
    over=sum(1 for item in answers if item.confidence==3 and not item.correct)
    under=sum(1 for item in answers if item.confidence==1 and item.correct)
    if len(answers)<5:
        label="coletando"
        tip="Continue registrando confiança; com cinco ou mais respostas o diagnóstico fica mais útil."
    elif over/len(answers)>=0.2:
        label="excesso_de_confianca"
        tip="Você está errando algumas respostas com confiança alta. Antes de responder, procure a evidência que justificaria sua escolha."
    elif under/len(answers)>=0.25:
        label="subestimando"
        tip="Você acerta várias respostas mesmo com confiança baixa. Use a revisão para consolidar e reconhecer melhor o que já domina."
    else:
        label="calibrada"
        tip="Sua percepção está razoavelmente alinhada ao desempenho. Continue usando a confiança como sinal de revisão."
    return {"sample":len(answers),"score":score,"label":label,"overconfident":over,"underconfident":under,"tip":tip}


def learning_plan(user,course):
    if not has_active_enrollment(user,course.id):raise PermissionError("Matrícula vigente necessária.")
    progress=course_progress_payload(user,course)
    contents=progress["contents"]
    completed=sum(1 for item in contents if item.get("progress") and item["progress"]["status"]=="completed")
    progress_percent=round(completed*100/len(contents)) if contents else 0

    prefs,_=AccountPreferences.objects.get_or_create(user=user)
    today=date.today()
    week_start=today-timedelta(days=today.weekday())
    questions_week=StudyAnswer.objects.filter(user=user,answered_at__date__gte=week_start).count()
    profile,_=StudyProfile.objects.get_or_create(user=user)
    days_week=len({str(d) for d in profile.study_dates if str(d)>=week_start.isoformat()})

    reviews=list(StudyReviewItem.objects.filter(user=user,status="pending"))
    due=list(StudyReviewItem.objects.filter(user=user,status="pending").filter(Q(due_at__isnull=True)|Q(due_at__lte=timezone.now())).order_by("due_at","created_at"))
    review_health=100 if not reviews else max(0,round((len(reviews)-len(due))*100/len(reviews)))

    weaknesses=_simulation_metrics(user)
    weak=weaknesses[0] if weaknesses and weaknesses[0]["accuracy"]<80 else None
    recent_sim=SimulationRecord.objects.filter(user=user).order_by("-completed_at").first()
    sim_accuracy=round(recent_sim.correct*100/recent_sim.total) if recent_sim and recent_sim.total else None
    accuracy_values=[row["accuracy"] for row in weaknesses]
    accuracy=round(sum(accuracy_values)/len(accuracy_values)) if accuracy_values else (sim_accuracy if sim_accuracy is not None else 0)
    readiness=round(progress_percent*0.4+accuracy*0.4+review_health*0.2) if (contents or accuracy_values or reviews) else 0

    exam_days=None
    if prefs.exam_date:
        exam_days=(prefs.exam_date-today).days

    recommendations=[]
    if due:
        recommendations.append({"type":"review","priority":1,"title":f"Revise {len(due)} item(ns) vencido(s)","detail":"Comece pelas lembranças que estão no ponto de esquecimento.","cta":"Revisar agora"})
    if weak:
        recommendations.append({"type":"practice","priority":2,"title":f"Pratique {weak['discipline']}","detail":f"Seu aproveitamento recente é {weak['accuracy']}%. Faça recuperação ativa antes de reler teoria.","cta":"Praticar questões"})
    if progress.get("continueItem"):
        recommendations.append({"type":"learn","priority":3,"title":"Avance na próxima aula","detail":progress["continueItem"]["title"],"cta":"Continuar conteúdo","contentId":progress["continueItem"]["id"]})
    last_sim_days=None
    if recent_sim:
        last_sim_days=max(0,(timezone.now()-recent_sim.completed_at).days)
    if not recent_sim or last_sim_days>=7:
        recommendations.append({"type":"simulate","priority":4,"title":"Faça um diagnóstico","detail":"Use um simulado curto para recalibrar as prioridades do próximo ciclo.","cta":"Iniciar simulado"})
    if not StudyRoadmapItem.objects.filter(user=user,course=course,is_active=True).exists():
        recommendations.append({"type":"plan","priority":5,"title":"Organize sua semana","detail":"Distribua poucas disciplinas por dia para reduzir troca de contexto.","cta":"Montar roteiro"})

    metacognition=_metacognition(user)

    return {
        "courseId":course.id,
        "metacognition":metacognition,
        "method":{"name":"Ciclo de Domínio","steps":[
            {"id":"learn","label":"Aprender","principle":"Compreensão guiada","status":f"{completed}/{len(contents)} aulas"},
            {"id":"practice","label":"Praticar","principle":"Recuperação ativa","status":f"{questions_week}/{prefs.weekly_goal_questions} questões na semana"},
            {"id":"review","label":"Revisar","principle":"Repetição espaçada","status":f"{len(due)} revisão(ões) para hoje"},
            {"id":"simulate","label":"Simular","principle":"Prática de prova","status":"Sem simulado" if not recent_sim else f"Último: {sim_accuracy}%"},
        ]},
        "nextAction":recommendations[0] if recommendations else {"type":"maintain","priority":9,"title":"Mantenha o ritmo","detail":"Seu ciclo está equilibrado hoje.","cta":"Continuar"},
        "recommendations":recommendations[:4],
        "dueReviews":[_review_payload(item) for item in due[:5]],
        "weaknesses":weaknesses[:5],
        "metrics":{
            "readiness":readiness,
            "progressPercent":progress_percent,
            "reviewHealth":review_health,
            "questionsThisWeek":questions_week,
            "questionGoal":prefs.weekly_goal_questions,
            "studyDaysThisWeek":days_week,
            "studyDayGoal":prefs.weekly_goal_days,
            "examDays":exam_days,
            "intensity":"reta_final" if exam_days is not None and 0 <= exam_days <= 30 else "acelerado" if exam_days is not None and 31 <= exam_days <= 90 else "base",
        },
    }
