import hashlib
import json
from collections import defaultdict
from datetime import timedelta

from django.db import IntegrityError,transaction
from django.utils import timezone

from courses.permissions import has_active_enrollment
from knowledge.models import CourseDiscipline,DisciplineContent,Question,QuestionContentLink
from .models import SimulationRecord,SimulationReflection,StudyAnswer,StudyContentProgress,StudyReviewItem,StudySyllabusSnapshot


def _course_blueprint(course):
    discipline_links=list(
        CourseDiscipline.objects.filter(course=course,discipline__status="published")
        .select_related("discipline").order_by("discipline__name","discipline_id")
    )
    discipline_ids=[item.discipline_id for item in discipline_links]
    contents=(
        DisciplineContent.objects.filter(discipline_id__in=discipline_ids,content__status="published")
        .select_related("discipline","content").order_by("discipline__name","content__title","content_id")
    )
    rows=[]
    seen=set()
    for link in contents:
        key=f"{link.discipline_id}:{link.content_id}"
        if key in seen:continue
        seen.add(key)
        rows.append({
            "key":key,
            "disciplineId":link.discipline_id,
            "discipline":link.discipline.name,
            "contentId":link.content_id,
            "subject":link.content.title,
            "updatedAt":link.content.updated_at.isoformat(),
        })
    return rows


def _fingerprint(items):
    payload=json.dumps(items,ensure_ascii=False,sort_keys=True,separators=(",",":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _change_summary(previous,current):
    before={item["key"]:item for item in previous}
    after={item["key"]:item for item in current}
    added=[after[key] for key in sorted(after.keys()-before.keys())]
    removed=[before[key] for key in sorted(before.keys()-after.keys())]
    updated=[]
    for key in sorted(after.keys()&before.keys()):
        old=before[key];new=after[key]
        if old.get("subject")!=new.get("subject") or old.get("updatedAt")!=new.get("updatedAt"):
            updated.append(new)
    return {
        "baseline":not bool(previous),
        "added":added,"removed":removed,"updated":updated,
        "addedCount":len(added),"removedCount":len(removed),"updatedCount":len(updated),
        "changedCount":len(added)+len(removed)+len(updated),
    }


def ensure_syllabus_snapshot(course):
    items=_course_blueprint(course)
    fingerprint=_fingerprint(items)
    existing=StudySyllabusSnapshot.objects.filter(course=course,fingerprint=fingerprint).order_by("-version").first()
    if existing:return existing
    with transaction.atomic():
        latest=StudySyllabusSnapshot.objects.select_for_update().filter(course=course).order_by("-version").first()
        if latest and latest.fingerprint==fingerprint:return latest
        version=(latest.version if latest else 0)+1
        summary=_change_summary(latest.items_json if latest else [],items)
        try:
            return StudySyllabusSnapshot.objects.create(
                course=course,version=version,fingerprint=fingerprint,items_json=items,change_summary_json=summary,
            )
        except IntegrityError:
            return StudySyllabusSnapshot.objects.filter(course=course,fingerprint=fingerprint).order_by("-version").first() or StudySyllabusSnapshot.objects.filter(course=course).order_by("-version").first()


def _question_index(course,content_ids):
    questions=(
        Question.objects.filter(status="published",content_links__content_id__in=content_ids)
        .distinct().prefetch_related("content_links")
    )
    alias_to_contents=defaultdict(set)
    question_count=defaultdict(set)
    for question in questions:
        linked={link.content_id for link in question.content_links.all() if link.content_id in content_ids}
        aliases={str(question.pk),f"central-{question.pk}"}
        if question.legacy_key:aliases.add(question.legacy_key)
        for alias in aliases:alias_to_contents[alias].update(linked)
        for content_id in linked:question_count[content_id].add(question.pk)
    return alias_to_contents,{key:len(value) for key,value in question_count.items()}


def _mastery(user,course,items):
    content_ids={int(item["contentId"]) for item in items}
    alias_to_contents,question_count=_question_index(course,content_ids)
    answers=StudyAnswer.objects.filter(user=user,question_id__in=list(alias_to_contents.keys())).order_by("answered_at")
    progress=set(StudyContentProgress.objects.filter(user=user,course=course,status="completed",content_id__in=content_ids).values_list("content_id",flat=True))
    metrics={content_id:{"total":0,"correct":0,"correctDays":set(),"confidence":0,"calibrated":0,"lastCorrect":None} for content_id in content_ids}
    for answer in answers:
        for content_id in alias_to_contents.get(answer.question_id,()):
            metric=metrics[content_id];metric["total"]+=1
            if answer.correct:
                metric["correct"]+=1;metric["correctDays"].add(answer.answered_at.date())
                metric["lastCorrect"]=max(metric["lastCorrect"],answer.answered_at) if metric["lastCorrect"] else answer.answered_at
            if answer.confidence:
                metric["confidence"]+=1
                if (answer.confidence==3 and answer.correct) or (answer.confidence==1 and not answer.correct) or answer.confidence==2:
                    metric["calibrated"]+=1
    topic_rows=[]
    today=timezone.localdate()
    for item in items:
        content_id=int(item["contentId"]);metric=metrics[content_id]
        total=metric["total"];correct=metric["correct"];accuracy=round(correct*100/total) if total else 0
        evidence_factor=min(1,total/5) if total else 0
        practice=round((accuracy/100)*45*evidence_factor)
        correct_days=sorted(metric["correctDays"])
        retention=20 if len(correct_days)>=2 and (correct_days[-1]-correct_days[0]).days>=2 else 10 if correct else 0
        calibration=round((metric["calibrated"]/metric["confidence"])*10) if metric["confidence"]>=3 else 0
        score=min(100,(25 if content_id in progress else 0)+practice+retention+calibration)
        state="retained" if score>=80 and retention==20 else "validating" if score>=60 else "learning" if score>0 else "new"
        last_correct=metric["lastCorrect"]
        if state=="retained" and last_correct:next_proof=last_correct.date()+timedelta(days=14)
        elif state=="validating" and last_correct:next_proof=last_correct.date()+timedelta(days=3)
        else:next_proof=today
        qcount=question_count.get(content_id,0)
        proof_due=qcount>=3 and next_proof<=today and state!="new"
        topic_rows.append({
            **item,"score":score,"state":state,"completed":content_id in progress,
            "accuracy":accuracy,"answerCount":total,"correctDays":len(correct_days),
            "questionCount":qcount,"proofReady":qcount>=3 and score>=35 and state!="retained",
            "proofDue":proof_due,"nextProofAt":next_proof.isoformat(),
        })
    grouped=defaultdict(list)
    for topic in topic_rows:grouped[topic["discipline"]].append(topic)
    disciplines=[]
    for name,topics in sorted(grouped.items()):
        score=round(sum(item["score"] for item in topics)/len(topics)) if topics else 0
        disciplines.append({
            "discipline":name,"score":score,"topics":topics,
            "retained":sum(1 for item in topics if item["state"]=="retained"),
            "total":len(topics),
        })
    candidates=sorted(
        [item for item in topic_rows if item["proofReady"] or item["proofDue"]],
        key=lambda item:(not item["proofDue"],item["score"],-item["questionCount"]),
    )[:6]
    retained=sum(1 for item in topic_rows if item["state"]=="retained")
    return {
        "score":round(sum(item["score"] for item in topic_rows)/len(topic_rows)) if topic_rows else 0,
        "retainedTopics":retained,"totalTopics":len(topic_rows),
        "disciplines":disciplines,"proofCandidates":candidates,
    }


def _error_coach(user,course,items):
    content_ids={int(item["contentId"]) for item in items}
    alias_to_contents,_=_question_index(course,content_ids)
    recent=list(StudyAnswer.objects.filter(user=user,question_id__in=list(alias_to_contents.keys())).order_by("-answered_at")[:250])
    wrong=[item for item in recent if not item.correct]
    counts=defaultdict(int)
    hotspots=defaultdict(int)
    content_labels={int(item["contentId"]):(item["discipline"],item["subject"]) for item in items}
    for answer in wrong:
        if answer.confidence==3:counts["overconfidence"]+=1
        elif answer.confidence==2:counts["uncertain"]+=1
        else:counts["knowledge"]+=1
        for content_id in alias_to_contents.get(answer.question_id,()):
            hotspots[content_id]+=1
    reflections=SimulationReflection.objects.filter(simulation__user=user,simulation__course=course).order_by("-updated_at")[:30]
    for reflection in reflections:
        if reflection.primary_cause in {"attention","interpretation"}:counts["attention_interpretation"]+=1
        elif reflection.primary_cause in {"time","strategy"}:counts["time_strategy"]+=1
        elif reflection.primary_cause=="knowledge":counts["knowledge"]+=1
    lapses=StudyReviewItem.objects.filter(user=user,status="pending",lapse_count__gt=0)
    memory_lapses=sum(min(int(item.lapse_count),3) for item in lapses[:100])
    if memory_lapses:counts["memory"]+=memory_lapses
    labels={
        "knowledge":("Lacuna de conteúdo","Retome o conceito, faça recuperação ativa e depois resolva questões sem consultar."),
        "overconfidence":("Excesso de confiança","Antes de marcar, procure a evidência que sustenta sua escolha e revise os erros de alta confiança."),
        "uncertain":("Conhecimento instável","Faça uma prova de domínio curta e repita o tópico em dias diferentes."),
        "attention_interpretation":("Atenção e interpretação","Treine comandos, exceções e leitura deliberada antes de aumentar a velocidade."),
        "time_strategy":("Tempo e estratégia","Use o Modo Prova Real para calibrar ritmo, ordem de resolução e pressão do relógio."),
        "memory":("Esquecimento recorrente","Priorize a revisão espaçada dos itens com recaídas antes de adicionar conteúdo novo."),
    }
    patterns=[]
    total_evidence=sum(counts.values())
    for key,count in sorted(counts.items(),key=lambda item:-item[1]):
        label,action=labels[key]
        patterns.append({"id":key,"label":label,"count":count,"share":round(count*100/total_evidence) if total_evidence else 0,"action":action})
    hotspot_rows=[]
    for content_id,count in sorted(hotspots.items(),key=lambda item:-item[1])[:5]:
        discipline,subject=content_labels.get(content_id,("",""))
        hotspot_rows.append({"discipline":discipline,"subject":subject,"errors":count})
    return {
        "sample":len(recent),"wrong":len(wrong),"primaryPattern":patterns[0] if patterns else None,
        "patterns":patterns[:5],"hotspots":hotspot_rows,
    }


def _telemetry(user,course):
    exams=list(SimulationRecord.objects.filter(user=user,course=course,mode=SimulationRecord.Mode.REAL_EXAM).order_by("-completed_at")[:5])
    rows=[]
    for exam in exams:
        summary=dict((exam.telemetry_json or {}).get("summary") or {})
        rows.append({
            "id":exam.id,"date":exam.completed_at.isoformat(),"score":round(exam.correct*100/exam.total) if exam.total else 0,
            "elapsedSeconds":exam.elapsed_seconds,"summary":summary,
        })
    drops=[row["summary"].get("performanceDrop") for row in rows if isinstance(row["summary"].get("performanceDrop"),(int,float))]
    return {
        "examCount":len(exams),"lastExam":rows[0] if rows else None,"recent":rows,
        "averagePerformanceDrop":round(sum(drops)/len(drops)) if drops else None,
    }


def learning_intelligence(user,course):
    if not has_active_enrollment(user,course.id):raise PermissionError("Matrícula vigente necessária.")
    snapshot=ensure_syllabus_snapshot(course)
    items=list(snapshot.items_json or [])
    completed=set(StudyContentProgress.objects.filter(user=user,course=course,status="completed").values_list("content_id",flat=True))
    covered=sum(1 for item in items if int(item["contentId"]) in completed)
    change=dict(snapshot.change_summary_json or {})
    radar={
        "version":snapshot.version,"fingerprint":snapshot.fingerprint,"capturedAt":snapshot.created_at.isoformat(),
        "totalTopics":len(items),"coveredTopics":covered,
        "coveragePercent":round(covered*100/len(items)) if items else 0,
        "changes":change,
        "message":"Primeira fotografia do edital registrada." if change.get("baseline") else (
            f"{change.get('changedCount',0)} alteração(ões) detectada(s) desde a versão anterior."
        ),
    }
    mastery=_mastery(user,course,items)
    return {
        "courseId":course.id,
        "radar":radar,
        "errorCoach":_error_coach(user,course,items),
        "mastery":mastery,
        "telemetry":_telemetry(user,course),
    }
