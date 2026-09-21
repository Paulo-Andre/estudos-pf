import json
from django.db import transaction
from .models import Content,ContentChangelog,KnowledgeStatus,Question,QuestionChangelog,ReviewQueue

def can_use_question(question):
    if question.status==KnowledgeStatus.INACTIVE:
        return False
    return (not question.requires_review) or question.status in {KnowledgeStatus.APPROVED,KnowledgeStatus.PUBLISHED}

@transaction.atomic
def submit_for_review(item_type,item_id,user):
    if item_type=="question":
        item=Question.objects.select_for_update().get(pk=item_id)
    elif item_type=="content":
        item=Content.objects.select_for_update().get(pk=item_id)
    else:
        raise ValueError("Tipo de item inválido.")
    item.status=KnowledgeStatus.REVIEW
    item.requires_review=True
    item.updated_by=user
    item.save(update_fields=["status","requires_review","updated_by","updated_at"])
    return ReviewQueue.objects.create(item_type=item_type,item_id=item_id,submitted_by=user)

@transaction.atomic
def decide_review(review_id,user,decision,notes=""):
    review=ReviewQueue.objects.select_for_update().get(pk=review_id)
    if review.status!=ReviewQueue.Status.PENDING:
        raise ValueError("Esta revisão já recebeu uma decisão.")
    if decision not in {ReviewQueue.Status.APPROVED,ReviewQueue.Status.REJECTED,ReviewQueue.Status.CORRECTION_REQUESTED}:
        raise ValueError("Decisão inválida.")
    model=Question if review.item_type==ReviewQueue.ItemType.QUESTION else Content
    item=model.objects.select_for_update().get(pk=review.item_id)
    old=item.status
    if decision==ReviewQueue.Status.APPROVED:
        item.status=KnowledgeStatus.APPROVED
    else:
        item.status=KnowledgeStatus.DRAFT
    item.updated_by=user
    item.save(update_fields=["status","updated_by","updated_at"])
    review.status=decision
    review.reviewed_by=user
    review.notes=notes
    review.save(update_fields=["status","reviewed_by","notes","updated_at"])
    changelog=QuestionChangelog if model is Question else ContentChangelog
    field_name="question" if model is Question else "content"
    changelog.objects.create(actor=user,changed_field="status",old_value=old,new_value=item.status,**{field_name:item})
    return review

def question_payload(question):
    return {
        "id":question.id,"statement":question.statement,"questionType":question.question_type,
        "options":question.options_json,"answer":question.answer_json,"explanation":question.explanation,
        "difficulty":question.difficulty,"source":question.source,"banca":question.banca,"year":question.year,
        "status":question.status,"requiresReview":question.requires_review,
    }
