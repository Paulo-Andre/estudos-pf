from django.contrib.auth import authenticate, get_user_model
from accounts.models import AccountProfile
from audit.models import AdminAuditLog
from commerce.models import CommerceCoupon, CommerceOrder, CommercePlan, CommerceTransaction
from courses.models import CourseEnrollment
from knowledge.models import Content, CourseDiscipline, Discipline, Question, QuestionContentLink, ReviewQueue, SimulationQuestion
from platformapp.models import CompetitionAnswer, CompetitionRound, CompetitionSettings, PlatformAlert, PlatformGeneralSettings
from study.models import CompletedModule, SimulationRecord, StudyAnswer, StudyContentProgress, StudyNote, StudyProfile, StudyReviewItem, StudyRoadmapItem

User=get_user_model()
user=User.objects.get(username="legacy.student")
profile=AccountProfile.objects.get(user=user)
question=Question.objects.get(source="CI legacy")
content=Content.objects.get(title="Conteúdo Legado CI")
discipline=Discipline.objects.get(short_name="legacy-ci")

assert profile.legacy_password_hash.startswith("scrypt$")
assert StudyProfile.objects.get(user=user).xp == 321
assert CourseEnrollment.objects.filter(user=user,course_id="legacy-pf",status="active",source_order_id="legacy-order-1").count() == 1
assert CompletedModule.objects.filter(user=user,module_id="legacy-module-1").count() == 1
assert StudyAnswer.objects.filter(user=user,question_id=f"central-{question.pk}").exists()
assert StudyReviewItem.objects.filter(user=user,question_key=f"central-{question.pk}",status="pending").exists()
assert SimulationRecord.objects.filter(user=user,pk="legacy-sim-1").count() == 1
assert SimulationQuestion.objects.filter(simulation_id="legacy-sim-1",question=question).count() == 1
assert StudyNote.objects.filter(user=user,module_id="legacy-module-1").count() == 1
assert StudyContentProgress.objects.filter(user=user,course_id="legacy-pf",content=content,status="completed").count() == 1
assert StudyRoadmapItem.objects.filter(user=user,course_id="legacy-pf",content=content,discipline=discipline).count() == 1
assert CourseDiscipline.objects.filter(course_id="legacy-pf",discipline=discipline).exists()
assert QuestionContentLink.objects.filter(question=question,content=content).exists()
assert ReviewQueue.objects.filter(item_type="question",item_id=question.pk,status="approved").exists()
assert PlatformAlert.objects.filter(title="Alerta legado",course_id="legacy-pf").exists()
assert PlatformGeneralSettings.objects.get(pk=1).payload.get("brandName") == "Marca Legada"
assert CompetitionSettings.objects.get(pk=1).weekly_reset_cron_task_uid == ""
assert CompetitionRound.objects.filter(pk="legacy-round-1",user=user).exists()
assert CompetitionAnswer.objects.filter(round_id="legacy-round-1",user=user,question=question,points_earned=10).exists()
assert CommercePlan.objects.filter(pk="legacy-plan-1",price_cents=1990).exists()
assert CommerceCoupon.objects.filter(pk="legacy-coupon-1",redeemed_count=1).exists()
assert CommerceOrder.objects.filter(pk="legacy-order-1",user=user,status="paid",total_cents=1791).exists()
assert CommerceTransaction.objects.filter(pk="legacy-tx-1",order_id="legacy-order-1",status="approved").exists()
assert AdminAuditLog.objects.filter(affected_user=user,action="CI_MIGRATION_FIXTURE").exists()

authenticated=authenticate(username="legacy.student",password="Legacy-Migration-Only-2026!")
assert authenticated and authenticated.pk == user.pk
profile.refresh_from_db()
user.refresh_from_db()
assert profile.legacy_password_hash == ""
assert user.has_usable_password()
print("Complete legacy platform migration verified")
