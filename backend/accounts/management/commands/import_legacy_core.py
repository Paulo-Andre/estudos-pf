import json
from datetime import datetime, time

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django.utils import timezone

from accounts.models import AccountProfile
from audit.models import AdminAuditLog
from commerce.models import (
    CommerceCoupon,
    CommerceOrder,
    CommerceOrderItem,
    CommercePlan,
    CommercePlanCourse,
    CommerceTransaction,
)
from courses.models import Course, CourseEnrollment
from knowledge.models import (
    Content,
    ContentChangelog,
    CourseDiscipline,
    Discipline,
    DisciplineContent,
    Question,
    QuestionChangelog,
    QuestionContentLink,
    ReviewQueue,
    SimulationQuestion,
)
from platformapp.models import (
    CompetitionAnswer,
    CompetitionMonthlyGoal,
    CompetitionRound,
    CompetitionSettings,
    GlobalContactSettings,
    PlatformAlert,
    PlatformAlertDismissal,
    PlatformGeneralSettings,
)
from study.models import (
    CompletedModule,
    SimulationRecord,
    StudyAnswer,
    StudyContentProgress,
    StudyNote,
    StudyProfile,
    StudyReviewItem,
    StudyRoadmapItem,
)


def rows(cursor, table):
    cursor.execute("SELECT * FROM " + table)
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def parse_json(value, fallback):
    if value is None:
        return fallback
    if isinstance(value, (list, dict, bool, int, float)):
        return value
    try:
        return json.loads(value)
    except (TypeError, ValueError, json.JSONDecodeError):
        return fallback


def aware(value):
    if not value:
        return None
    if timezone.is_aware(value):
        return value
    return timezone.make_aware(value)


def date_value(value):
    if not value:
        return None
    if hasattr(value, "year") and not isinstance(value, str):
        return value
    return datetime.strptime(str(value), "%Y-%m-%d").date()


def time_value(value):
    if not value:
        return time(0, 0)
    if isinstance(value, time):
        return value
    return time.fromisoformat(str(value))


def restore_timestamps(model, pk, **values):
    cleaned = {key: aware(value) for key, value in values.items() if value}
    if cleaned:
        model.objects.filter(pk=pk).update(**cleaned)


class Command(BaseCommand):
    help = (
        "Importa dados funcionais das tabelas Node/Drizzle para Django sem apagar a origem. "
        "Sessões e tokens de recuperação legados são descartados deliberadamente."
    )

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument(
            "--strict",
            action="store_true",
            help="Falha e faz rollback se houver referência órfã durante a migração.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        tables = set(connection.introspection.table_names())
        if "users" not in tables:
            raise CommandError("Tabela legada 'users' não encontrada.")

        User = get_user_model()
        counts = {}
        skipped = []

        def count(name):
            counts[name] = counts.get(name, 0) + 1

        def skip(table, row_id, reason):
            skipped.append({"table": table, "id": row_id, "reason": reason})

        def get_user(user_id):
            return User.objects.filter(pk=user_id).first() if user_id else None

        def get_course(course_id):
            return Course.objects.filter(pk=course_id).first() if course_id else None

        def get_discipline(discipline_id):
            return Discipline.objects.filter(pk=discipline_id).first() if discipline_id else None

        def get_content(content_id):
            return Content.objects.filter(pk=content_id).first() if content_id else None

        def get_question(question_id):
            return Question.objects.filter(pk=question_id).first() if question_id else None

        with connection.cursor() as cursor:
            # 1. Identidade. Sessões e reset tokens não são importados por segurança.
            for row in rows(cursor, "users"):
                username = (row.get("username") or f"legacy-{row['id']}").strip().lower()
                is_admin = row.get("role") == "admin"
                blocked = bool(row.get("isBlocked"))
                user, created = User.objects.update_or_create(
                    pk=row["id"],
                    defaults={
                        "username": username,
                        "email": (row.get("email") or "").strip().lower(),
                        "first_name": (row.get("name") or username)[:150],
                        "is_staff": is_admin,
                        "is_superuser": is_admin,
                        "is_active": not blocked,
                        "date_joined": aware(row.get("createdAt")) or timezone.now(),
                        "last_login": aware(row.get("lastSignedIn")),
                    },
                )
                if created:
                    user.set_unusable_password()
                    user.save(update_fields=["password"])
                profile, _ = AccountProfile.objects.update_or_create(
                    user=user,
                    defaults={
                        "display_name": row.get("name") or username,
                        "cpf": row.get("cpf") or None,
                        "role": AccountProfile.Role.ADMIN if is_admin else AccountProfile.Role.USER,
                        "is_blocked": blocked,
                        "legacy_open_id": row.get("openId"),
                        "last_signed_in": aware(row.get("lastSignedIn")),
                    },
                )
                # Nunca substitui uma senha Django já migrada por um hash legado.
                if not user.has_usable_password() and not profile.legacy_password_hash:
                    profile.legacy_password_hash = row.get("passwordHash") or ""
                    profile.save(update_fields=["legacy_password_hash", "updated_at"])
                restore_timestamps(
                    AccountProfile,
                    profile.pk,
                    created_at=row.get("createdAt"),
                    updated_at=row.get("updatedAt"),
                )
                count("users")

            if "authSessions" in tables:
                counts["discardedAuthSessions"] = len(rows(cursor, "authSessions"))
            if "passwordResetTokens" in tables:
                counts["discardedPasswordResetTokens"] = len(rows(cursor, "passwordResetTokens"))

            # 2. Catálogo de cursos antes de qualquer relação.
            if "courses" in tables:
                for row in rows(cursor, "courses"):
                    actor = get_user(row.get("createdByUserId"))
                    if not actor:
                        skip("courses", row.get("id"), "createdByUserId inexistente")
                        continue
                    course, _ = Course.objects.update_or_create(
                        pk=row["id"],
                        defaults={
                            "title": row.get("title") or row["id"],
                            "track": row.get("track") or "",
                            "course_type": row.get("courseType") or "concurso",
                            "course_area": row.get("courseArea") or "Policial/Militar",
                            "state_code": row.get("stateCode") or "Nacional",
                            "description": row.get("description") or "",
                            "cover_image_url": row.get("coverImageUrl") or "",
                            "panel_label": row.get("panelLabel") or "",
                            "panel_badge": row.get("panelBadge") or "",
                            "panel_title": row.get("panelTitle") or "",
                            "panel_description": row.get("panelDescription") or "",
                            "panel_cta_text": row.get("panelCtaText") or "",
                            "is_active": bool(row.get("isActive")),
                            "created_by": actor,
                        },
                    )
                    restore_timestamps(
                        Course, course.pk, created_at=row.get("createdAt"), updated_at=row.get("updatedAt")
                    )
                    count("courses")

            # 3. Base de conhecimento: preserva IDs para relações, competição e histórico.
            if "disciplines" in tables:
                for row in rows(cursor, "disciplines"):
                    created_by = get_user(row.get("createdByUserId"))
                    updated_by = get_user(row.get("updatedByUserId"))
                    if not created_by or not updated_by:
                        skip("disciplines", row.get("id"), "autor inexistente")
                        continue
                    obj, _ = Discipline.objects.update_or_create(
                        pk=row["id"],
                        defaults={
                            "name": row.get("name") or "",
                            "short_name": row.get("shortName") or f"legacy-{row['id']}",
                            "description": row.get("description") or "",
                            "status": row.get("status") or "draft",
                            "requires_review": bool(row.get("requiresReview")),
                            "created_by": created_by,
                            "updated_by": updated_by,
                        },
                    )
                    restore_timestamps(
                        Discipline, obj.pk, created_at=row.get("createdAt"), updated_at=row.get("updatedAt")
                    )
                    count("disciplines")

            if "contents" in tables:
                for row in rows(cursor, "contents"):
                    created_by = get_user(row.get("createdByUserId"))
                    updated_by = get_user(row.get("updatedByUserId"))
                    if not created_by or not updated_by:
                        skip("contents", row.get("id"), "autor inexistente")
                        continue
                    obj, _ = Content.objects.update_or_create(
                        pk=row["id"],
                        defaults={
                            "title": row.get("title") or "",
                            "objective": row.get("objective") or "",
                            "description": row.get("description") or "",
                            "card_text": row.get("cardText") or "",
                            "body": row.get("body") or "",
                            "cover_image_url": row.get("coverImageUrl") or "",
                            "video_url": row.get("videoUrl") or "",
                            "video_label": row.get("videoLabel") or "",
                            "material_url": row.get("materialUrl") or "",
                            "material_label": row.get("materialLabel") or "",
                            "notice_kind": row.get("noticeKind") or None,
                            "notice_activated_at": aware(row.get("noticeActivatedAt")),
                            "status": row.get("status") or "draft",
                            "requires_review": bool(row.get("requiresReview")),
                            "created_by": created_by,
                            "updated_by": updated_by,
                        },
                    )
                    restore_timestamps(
                        Content, obj.pk, created_at=row.get("createdAt"), updated_at=row.get("updatedAt")
                    )
                    count("contents")

            if "questions" in tables:
                for row in rows(cursor, "questions"):
                    created_by = get_user(row.get("createdByUserId"))
                    updated_by = get_user(row.get("updatedByUserId"))
                    if not created_by or not updated_by:
                        skip("questions", row.get("id"), "autor inexistente")
                        continue
                    obj, _ = Question.objects.update_or_create(
                        pk=row["id"],
                        defaults={
                            "legacy_key": f"central-{row['id']}",
                            "statement": row.get("statement") or "",
                            "question_type": row.get("questionType") or "certo_errado",
                            "options_json": parse_json(row.get("optionsJson"), None),
                            "answer_json": parse_json(row.get("answerJson"), row.get("answerJson")),
                            "explanation": row.get("explanation") or "",
                            "difficulty": row.get("difficulty") or "intermediate",
                            "source": row.get("source") or "",
                            "banca": row.get("banca") or "",
                            "year": row.get("year"),
                            "status": row.get("status") or "draft",
                            "requires_review": bool(row.get("requiresReview")),
                            "created_by": created_by,
                            "updated_by": updated_by,
                        },
                    )
                    restore_timestamps(
                        Question, obj.pk, created_at=row.get("createdAt"), updated_at=row.get("updatedAt")
                    )
                    count("questions")

            for table_name, model, resolver, defaults_factory in [
                (
                    "courseDisciplines",
                    CourseDiscipline,
                    lambda row: (
                        get_course(row.get("courseId")),
                        get_discipline(row.get("disciplineId")),
                        get_user(row.get("linkedByUserId")),
                    ),
                    lambda row, values: {
                        "course": values[0],
                        "discipline": values[1],
                        "linked_by": values[2],
                    },
                ),
                (
                    "disciplineContents",
                    DisciplineContent,
                    lambda row: (
                        get_discipline(row.get("disciplineId")),
                        get_content(row.get("contentId")),
                        get_user(row.get("linkedByUserId")),
                    ),
                    lambda row, values: {
                        "discipline": values[0],
                        "content": values[1],
                        "linked_by": values[2],
                    },
                ),
                (
                    "questionContentLinks",
                    QuestionContentLink,
                    lambda row: (
                        get_question(row.get("questionId")),
                        get_content(row.get("contentId")),
                        get_user(row.get("linkedByUserId")),
                    ),
                    lambda row, values: {
                        "question": values[0],
                        "content": values[1],
                        "linked_by": values[2],
                    },
                ),
            ]:
                if table_name not in tables:
                    continue
                for row in rows(cursor, table_name):
                    values = resolver(row)
                    if any(value is None for value in values):
                        skip(table_name, row.get("id"), "relação inexistente")
                        continue
                    obj, _ = model.objects.update_or_create(
                        pk=row["id"], defaults=defaults_factory(row, values)
                    )
                    restore_timestamps(model, obj.pk, linked_at=row.get("linkedAt"))
                    count(table_name)

            # 4. Matrículas.
            if "courseEnrollments" in tables:
                for row in rows(cursor, "courseEnrollments"):
                    user = get_user(row.get("userId"))
                    actor = get_user(row.get("createdByUserId"))
                    course = get_course(row.get("courseId"))
                    if not user or not actor or not course:
                        skip("courseEnrollments", row.get("id"), "usuário/curso/autor inexistente")
                        continue
                    obj, _ = CourseEnrollment.objects.update_or_create(
                        pk=row["id"],
                        defaults={
                            "user": user,
                            "course": course,
                            "start_at": aware(row.get("startAt")),
                            "expires_at": aware(row.get("expiresAt")),
                            "status": row.get("status") or "active",
                            "created_by": actor,
                            "source_order_id": row.get("sourceOrderId"),
                            "source_plan_id": row.get("sourcePlanId"),
                            "revoked_at": aware(row.get("revokedAt")),
                        },
                    )
                    restore_timestamps(
                        CourseEnrollment,
                        obj.pk,
                        created_at=row.get("createdAt"),
                        updated_at=row.get("updatedAt"),
                    )
                    count("courseEnrollments")

            # 5. Estado do estudo.
            if "studyProfiles" in tables:
                for row in rows(cursor, "studyProfiles"):
                    user = get_user(row.get("userId"))
                    if not user:
                        skip("studyProfiles", row.get("id"), "usuário inexistente")
                        continue
                    daily_question = None
                    raw_daily_question = row.get("dailyQuickCheckQuestionId")
                    if raw_daily_question:
                        if str(raw_daily_question).isdigit():
                            daily_question = get_question(int(raw_daily_question))
                        if not daily_question:
                            daily_question = Question.objects.filter(
                                legacy_key=str(raw_daily_question)
                            ).first()
                    daily_course = get_course(row.get("dailyQuickCheckCourseId"))
                    StudyProfile.objects.update_or_create(
                        user=user,
                        defaults={
                            "xp": row.get("xp") or 0,
                            "last_study_date": date_value(row.get("lastStudyDate")),
                            "study_dates": parse_json(row.get("studyDatesJson"), []),
                            "used_question_ids": parse_json(row.get("usedQuestionIdsJson"), []),
                            "daily_quick_check_date": date_value(row.get("dailyQuickCheckDate")),
                            "daily_quick_check_course": daily_course,
                            "daily_quick_check_question": daily_question,
                            "daily_quick_check_dismissed": bool(row.get("dailyQuickCheckDismissed")),
                        },
                    )
                    count("studyProfiles")

            if "completedModules" in tables:
                for row in rows(cursor, "completedModules"):
                    user = get_user(row.get("userId"))
                    if not user:
                        skip("completedModules", row.get("id"), "usuário inexistente")
                        continue
                    obj, _ = CompletedModule.objects.update_or_create(
                        pk=row["id"],
                        defaults={"user": user, "module_id": row.get("moduleId") or ""},
                    )
                    restore_timestamps(CompletedModule, obj.pk, completed_at=row.get("completedAt"))
                    count("completedModules")

            if "studyAnswers" in tables:
                for row in rows(cursor, "studyAnswers"):
                    user = get_user(row.get("userId"))
                    if not user:
                        skip("studyAnswers", row.get("id"), "usuário inexistente")
                        continue
                    obj, _ = StudyAnswer.objects.update_or_create(
                        pk=row["id"],
                        defaults={
                            "user": user,
                            "question_id": row.get("questionId") or "",
                            "correct": bool(row.get("correct")),
                        },
                    )
                    restore_timestamps(StudyAnswer, obj.pk, answered_at=row.get("answeredAt"))
                    count("studyAnswers")

            if "studyReviewItems" in tables:
                for row in rows(cursor, "studyReviewItems"):
                    user = get_user(row.get("userId"))
                    if not user:
                        skip("studyReviewItems", row.get("id"), "usuário inexistente")
                        continue
                    obj, _ = StudyReviewItem.objects.update_or_create(
                        pk=row["id"],
                        defaults={
                            "user": user,
                            "question_key": row.get("questionKey") or "",
                            "snapshot_json": parse_json(row.get("snapshotJson"), {}),
                            "status": row.get("status") or "pending",
                            "reviewed_at": aware(row.get("reviewedAt")),
                        },
                    )
                    restore_timestamps(StudyReviewItem, obj.pk, created_at=row.get("createdAt"))
                    count("studyReviewItems")

            if "simulationRecords" in tables:
                for row in rows(cursor, "simulationRecords"):
                    user = get_user(row.get("userId"))
                    if not user:
                        skip("simulationRecords", row.get("id"), "usuário inexistente")
                        continue
                    obj, _ = SimulationRecord.objects.update_or_create(
                        pk=row["id"],
                        defaults={
                            "user": user,
                            "total": row.get("total") or 0,
                            "correct": row.get("correct") or 0,
                            "errors": row.get("errors") or 0,
                            "elapsed_seconds": row.get("elapsedSeconds") or 0,
                            "by_discipline": parse_json(row.get("byDisciplineJson"), {}),
                            "by_block": parse_json(row.get("byBlockJson"), {}),
                        },
                    )
                    restore_timestamps(SimulationRecord, obj.pk, completed_at=row.get("completedAt"))
                    count("simulationRecords")

            if "studyNotes" in tables:
                for row in rows(cursor, "studyNotes"):
                    user = get_user(row.get("userId"))
                    if not user:
                        skip("studyNotes", row.get("id"), "usuário inexistente")
                        continue
                    StudyNote.objects.update_or_create(
                        pk=row["id"],
                        defaults={
                            "user": user,
                            "module_id": row.get("moduleId") or "",
                            "content": row.get("content") or "",
                        },
                    )
                    count("studyNotes")

            if "studyContentProgress" in tables:
                for row in rows(cursor, "studyContentProgress"):
                    user = get_user(row.get("userId"))
                    course = get_course(row.get("courseId"))
                    content = get_content(row.get("contentId"))
                    if not user or not course or not content:
                        skip("studyContentProgress", row.get("id"), "relação inexistente")
                        continue
                    obj, _ = StudyContentProgress.objects.update_or_create(
                        pk=row["id"],
                        defaults={
                            "user": user,
                            "course": course,
                            "content": content,
                            "status": row.get("status") or "started",
                            "completed_at": aware(row.get("completedAt")),
                        },
                    )
                    restore_timestamps(
                        StudyContentProgress,
                        obj.pk,
                        started_at=row.get("startedAt"),
                        last_opened_at=row.get("lastOpenedAt"),
                    )
                    count("studyContentProgress")

            if "studyRoadmapItems" in tables:
                for row in rows(cursor, "studyRoadmapItems"):
                    user = get_user(row.get("userId"))
                    course = get_course(row.get("courseId"))
                    content = get_content(row.get("contentId"))
                    discipline = get_discipline(row.get("disciplineId"))
                    if not user or not course or not content:
                        skip("studyRoadmapItems", row.get("id"), "relação obrigatória inexistente")
                        continue
                    obj, _ = StudyRoadmapItem.objects.update_or_create(
                        pk=row["id"],
                        defaults={
                            "user": user,
                            "course": course,
                            "content": content,
                            "discipline": discipline,
                            "weekday": row.get("weekday") or 0,
                            "start_time": time_value(row.get("startTime")),
                            "is_active": bool(row.get("isActive")),
                        },
                    )
                    restore_timestamps(
                        StudyRoadmapItem,
                        obj.pk,
                        created_at=row.get("createdAt"),
                        updated_at=row.get("updatedAt"),
                    )
                    count("studyRoadmapItems")

            # 6. Questões de simulado e histórico editorial.
            if "simulationQuestions" in tables:
                for row in rows(cursor, "simulationQuestions"):
                    simulation = SimulationRecord.objects.filter(pk=row.get("simulationId")).first()
                    question = get_question(row.get("questionId"))
                    if not simulation or not question:
                        skip("simulationQuestions", row.get("id"), "simulado/questão inexistente")
                        continue
                    obj, _ = SimulationQuestion.objects.update_or_create(
                        pk=row["id"],
                        defaults={
                            "simulation": simulation,
                            "question": question,
                            "position": row.get("position") or 0,
                            "answered_correctly": row.get("answeredCorrectly"),
                            "snapshot_json": parse_json(row.get("snapshotJson"), {}),
                        },
                    )
                    restore_timestamps(SimulationQuestion, obj.pk, created_at=row.get("createdAt"))
                    count("simulationQuestions")

            if "reviewQueue" in tables:
                for row in rows(cursor, "reviewQueue"):
                    submitted = get_user(row.get("submittedByUserId"))
                    reviewed = get_user(row.get("reviewedByUserId"))
                    if not submitted:
                        skip("reviewQueue", row.get("id"), "autor inexistente")
                        continue
                    obj, _ = ReviewQueue.objects.update_or_create(
                        pk=row["id"],
                        defaults={
                            "item_type": row.get("itemType") or "question",
                            "item_id": row.get("itemId") or 0,
                            "status": row.get("status") or "pending",
                            "submitted_by": submitted,
                            "reviewed_by": reviewed,
                            "notes": row.get("notes") or "",
                        },
                    )
                    restore_timestamps(
                        ReviewQueue,
                        obj.pk,
                        created_at=row.get("createdAt"),
                        updated_at=row.get("updatedAt"),
                    )
                    count("reviewQueue")

            for table_name, model, target_getter, fk_name in [
                ("questionChangelog", QuestionChangelog, get_question, "question"),
                ("contentChangelog", ContentChangelog, get_content, "content"),
            ]:
                if table_name not in tables:
                    continue
                target_key = "questionId" if table_name == "questionChangelog" else "contentId"
                for row in rows(cursor, table_name):
                    target = target_getter(row.get(target_key))
                    actor = get_user(row.get("actorUserId"))
                    if not target or not actor:
                        skip(table_name, row.get("id"), "alvo/ator inexistente")
                        continue
                    defaults = {
                        fk_name: target,
                        "actor": actor,
                        "changed_field": row.get("changedField") or "",
                        "old_value": row.get("oldValue"),
                        "new_value": row.get("newValue"),
                    }
                    obj, _ = model.objects.update_or_create(pk=row["id"], defaults=defaults)
                    restore_timestamps(model, obj.pk, created_at=row.get("createdAt"))
                    count(table_name)

            # 7. Plataforma, alertas e competição.
            if "globalContactSettings" in tables:
                for row in rows(cursor, "globalContactSettings"):
                    obj, _ = GlobalContactSettings.objects.update_or_create(
                        pk=row.get("id") or 1,
                        defaults={
                            "email": row.get("email") or "",
                            "telegram_url": row.get("telegramUrl") or "",
                            "updated_by": get_user(row.get("updatedByUserId")),
                        },
                    )
                    restore_timestamps(GlobalContactSettings, obj.pk, updated_at=row.get("updatedAt"))
                    count("globalContactSettings")

            if "platformGeneralSettings" in tables:
                metadata = {"id", "updatedByUserId", "updatedAt"}
                for row in rows(cursor, "platformGeneralSettings"):
                    payload = {key: value for key, value in row.items() if key not in metadata and value is not None}
                    obj, _ = PlatformGeneralSettings.objects.update_or_create(
                        pk=row.get("id") or 1,
                        defaults={
                            "payload": payload,
                            "updated_by": get_user(row.get("updatedByUserId")),
                        },
                    )
                    restore_timestamps(PlatformGeneralSettings, obj.pk, updated_at=row.get("updatedAt"))
                    count("platformGeneralSettings")

            if "platformAlerts" in tables:
                for row in rows(cursor, "platformAlerts"):
                    actor = get_user(row.get("createdByUserId"))
                    course = get_course(row.get("courseId"))
                    if not actor:
                        skip("platformAlerts", row.get("id"), "autor inexistente")
                        continue
                    if row.get("courseId") and not course:
                        skip("platformAlerts", row.get("id"), "curso inexistente")
                        continue
                    obj, _ = PlatformAlert.objects.update_or_create(
                        pk=row["id"],
                        defaults={
                            "level": row.get("level") or "improvement",
                            "title": row.get("title") or "Comunicado da plataforma",
                            "category_label": row.get("categoryLabel") or "",
                            "message": row.get("message") or "",
                            "audience": row.get("audience") or "all",
                            "course": course,
                            "is_active": bool(row.get("isActive")),
                            "created_by": actor,
                        },
                    )
                    restore_timestamps(
                        PlatformAlert,
                        obj.pk,
                        created_at=row.get("createdAt"),
                        updated_at=row.get("updatedAt"),
                    )
                    count("platformAlerts")

            if "platformAlertDismissals" in tables:
                for row in rows(cursor, "platformAlertDismissals"):
                    alert = PlatformAlert.objects.filter(pk=row.get("alertId")).first()
                    user = get_user(row.get("userId"))
                    if not alert or not user:
                        skip("platformAlertDismissals", row.get("id"), "alerta/usuário inexistente")
                        continue
                    obj, _ = PlatformAlertDismissal.objects.update_or_create(
                        pk=row["id"], defaults={"alert": alert, "user": user}
                    )
                    restore_timestamps(
                        PlatformAlertDismissal, obj.pk, dismissed_at=row.get("dismissedAt")
                    )
                    count("platformAlertDismissals")

            if "competitionSettings" in tables:
                for row in rows(cursor, "competitionSettings"):
                    obj, _ = CompetitionSettings.objects.update_or_create(
                        pk=row.get("id") or 1,
                        defaults={
                            "points_per_correct": row.get("pointsPerCorrect") or 10,
                            "points_per_wrong": row.get("pointsPerWrong") or 0,
                            "questions_per_round": row.get("questionsPerRound") or 10,
                            "is_active": bool(row.get("isActive")),
                            "weekly_cycle_key": row.get("weeklyCycleKey") or "",
                            "weekly_cycle_started_at": aware(row.get("weeklyCycleStartedAt")),
                            # UID do Heartbeat Manus não é portável e não deve ser reaproveitado.
                            "weekly_reset_cron_task_uid": "",
                            "updated_by": get_user(row.get("updatedByUserId")),
                        },
                    )
                    restore_timestamps(CompetitionSettings, obj.pk, updated_at=row.get("updatedAt"))
                    count("competitionSettings")

            if "competitionMonthlyGoals" in tables:
                for row in rows(cursor, "competitionMonthlyGoals"):
                    obj, _ = CompetitionMonthlyGoal.objects.update_or_create(
                        pk=row.get("id") or 1,
                        defaults={
                            "target_points": row.get("targetPoints") or 100,
                            "target_completed_rounds": row.get("targetCompletedRounds") or 5,
                            "reward_title": row.get("rewardTitle") or "Destaque mensal",
                            "reward_description": row.get("rewardDescription") or "",
                            "is_active": bool(row.get("isActive")),
                            "updated_by": get_user(row.get("updatedByUserId")),
                        },
                    )
                    restore_timestamps(
                        CompetitionMonthlyGoal, obj.pk, updated_at=row.get("updatedAt")
                    )
                    count("competitionMonthlyGoals")

            if "competitionRounds" in tables:
                for row in rows(cursor, "competitionRounds"):
                    user = get_user(row.get("userId"))
                    course = get_course(row.get("courseId"))
                    if not user:
                        skip("competitionRounds", row.get("id"), "usuário inexistente")
                        continue
                    obj, _ = CompetitionRound.objects.update_or_create(
                        pk=row["id"],
                        defaults={
                            "user": user,
                            "course": course,
                            "question_ids": parse_json(row.get("questionIdsJson"), []),
                            "completed_at": aware(row.get("completedAt")),
                        },
                    )
                    restore_timestamps(CompetitionRound, obj.pk, created_at=row.get("createdAt"))
                    count("competitionRounds")

            if "competitionAnswers" in tables:
                for row in rows(cursor, "competitionAnswers"):
                    round_obj = CompetitionRound.objects.filter(pk=row.get("roundId")).first()
                    user = get_user(row.get("userId"))
                    question = get_question(row.get("questionId"))
                    course = get_course(row.get("courseId"))
                    if not round_obj or not user or not question:
                        skip("competitionAnswers", row.get("id"), "rodada/usuário/questão inexistente")
                        continue
                    obj, _ = CompetitionAnswer.objects.update_or_create(
                        pk=row["id"],
                        defaults={
                            "round": round_obj,
                            "user": user,
                            "question": question,
                            "course": course,
                            "submitted_answer_json": parse_json(row.get("submittedAnswerJson"), row.get("submittedAnswerJson")),
                            "correct": bool(row.get("correct")),
                            "points_earned": row.get("pointsEarned") or 0,
                        },
                    )
                    restore_timestamps(CompetitionAnswer, obj.pk, answered_at=row.get("answeredAt"))
                    count("competitionAnswers")

            # 8. Comércio. Preserva pedidos e transações; nunca reprocessa pagamentos.
            if "commercePlans" in tables:
                for row in rows(cursor, "commercePlans"):
                    actor = get_user(row.get("createdByUserId"))
                    if not actor:
                        skip("commercePlans", row.get("id"), "autor inexistente")
                        continue
                    obj, _ = CommercePlan.objects.update_or_create(
                        pk=row["id"],
                        defaults={
                            "code": row.get("code") or str(row["id"]),
                            "title": row.get("title") or "",
                            "description": row.get("description") or "",
                            "cover_image_urls": parse_json(row.get("coverImageUrlsJson"), []),
                            "plan_type": row.get("planType") or "course_access",
                            "access_duration_days": row.get("accessDurationDays") or 1,
                            "price_cents": row.get("priceCents") or 0,
                            "currency": row.get("currency") or "BRL",
                            "is_active": bool(row.get("isActive")),
                            "is_highlighted": bool(row.get("isHighlighted")),
                            "created_by": actor,
                        },
                    )
                    restore_timestamps(
                        CommercePlan, obj.pk, created_at=row.get("createdAt"), updated_at=row.get("updatedAt")
                    )
                    count("commercePlans")

            if "commercePlanCourses" in tables:
                for row in rows(cursor, "commercePlanCourses"):
                    plan = CommercePlan.objects.filter(pk=row.get("planId")).first()
                    course = get_course(row.get("courseId"))
                    if not plan or not course:
                        skip("commercePlanCourses", row.get("id"), "plano/curso inexistente")
                        continue
                    obj, _ = CommercePlanCourse.objects.update_or_create(
                        pk=row["id"], defaults={"plan": plan, "course": course}
                    )
                    restore_timestamps(CommercePlanCourse, obj.pk, created_at=row.get("createdAt"))
                    count("commercePlanCourses")

            if "commerceCoupons" in tables:
                for row in rows(cursor, "commerceCoupons"):
                    actor = get_user(row.get("createdByUserId"))
                    if not actor:
                        skip("commerceCoupons", row.get("id"), "autor inexistente")
                        continue
                    obj, _ = CommerceCoupon.objects.update_or_create(
                        pk=row["id"],
                        defaults={
                            "code": row.get("code") or "",
                            "description": row.get("description") or "",
                            "discount_type": row.get("discountType") or "percentage",
                            "discount_value": row.get("discountValue") or 0,
                            "max_redemptions": row.get("maxRedemptions"),
                            "redeemed_count": row.get("redeemedCount") or 0,
                            "starts_at": aware(row.get("startsAt")),
                            "ends_at": aware(row.get("endsAt")),
                            "is_active": bool(row.get("isActive")),
                            "created_by": actor,
                        },
                    )
                    restore_timestamps(
                        CommerceCoupon, obj.pk, created_at=row.get("createdAt"), updated_at=row.get("updatedAt")
                    )
                    count("commerceCoupons")

            if "commerceOrders" in tables:
                for row in rows(cursor, "commerceOrders"):
                    user = get_user(row.get("userId"))
                    plan = CommercePlan.objects.filter(pk=row.get("planId")).first()
                    if not user or not plan:
                        skip("commerceOrders", row.get("id"), "usuário/plano inexistente")
                        continue
                    obj, _ = CommerceOrder.objects.update_or_create(
                        pk=row["id"],
                        defaults={
                            "user": user,
                            "plan": plan,
                            "coupon_code": row.get("couponCode") or "",
                            "status": row.get("status") or "pending_payment",
                            "subtotal_cents": row.get("subtotalCents") or 0,
                            "discount_cents": row.get("discountCents") or 0,
                            "total_cents": row.get("totalCents") or 0,
                            "currency": row.get("currency") or "BRL",
                            "provider": row.get("provider") or "manual",
                            "provider_reference": row.get("providerReference") or "",
                            "paid_at": aware(row.get("paidAt")),
                            "access_granted_at": aware(row.get("accessGrantedAt")),
                            "cancelled_at": aware(row.get("cancelledAt")),
                            "expires_at": aware(row.get("expiresAt")),
                        },
                    )
                    restore_timestamps(
                        CommerceOrder, obj.pk, created_at=row.get("createdAt"), updated_at=row.get("updatedAt")
                    )
                    count("commerceOrders")

            if "commerceOrderItems" in tables:
                for row in rows(cursor, "commerceOrderItems"):
                    order = CommerceOrder.objects.filter(pk=row.get("orderId")).first()
                    if not order:
                        skip("commerceOrderItems", row.get("id"), "pedido inexistente")
                        continue
                    obj, _ = CommerceOrderItem.objects.update_or_create(
                        pk=row["id"],
                        defaults={
                            "order": order,
                            "plan_id_snapshot": row.get("planId") or "",
                            "title_snapshot": row.get("titleSnapshot") or "",
                            "plan_type_snapshot": row.get("planTypeSnapshot") or "course_access",
                            "access_duration_days_snapshot": row.get("accessDurationDaysSnapshot") or 1,
                            "course_ids_snapshot": parse_json(row.get("courseIdsSnapshotJson"), []),
                            "unit_price_cents": row.get("unitPriceCents") or 0,
                        },
                    )
                    restore_timestamps(CommerceOrderItem, obj.pk, created_at=row.get("createdAt"))
                    count("commerceOrderItems")

            if "commerceTransactions" in tables:
                for row in rows(cursor, "commerceTransactions"):
                    order = CommerceOrder.objects.filter(pk=row.get("orderId")).first()
                    if not order:
                        skip("commerceTransactions", row.get("id"), "pedido inexistente")
                        continue
                    obj, _ = CommerceTransaction.objects.update_or_create(
                        pk=row["id"],
                        defaults={
                            "order": order,
                            "provider": row.get("provider") or "manual",
                            "provider_reference": row.get("providerReference") or "",
                            "status": row.get("status") or "pending",
                            "amount_cents": row.get("amountCents") or 0,
                            "currency": row.get("currency") or "BRL",
                            "processed_at": aware(row.get("processedAt")),
                        },
                    )
                    restore_timestamps(CommerceTransaction, obj.pk, created_at=row.get("createdAt"))
                    count("commerceTransactions")

            # 9. Auditoria por último, depois que os usuários existem.
            if "adminAuditLogs" in tables:
                for row in rows(cursor, "adminAuditLogs"):
                    actor = get_user(row.get("actorUserId"))
                    affected = get_user(row.get("affectedUserId"))
                    if not actor:
                        skip("adminAuditLogs", row.get("id"), "ator inexistente")
                        continue
                    obj, _ = AdminAuditLog.objects.update_or_create(
                        pk=row["id"],
                        defaults={
                            "actor": actor,
                            "affected_user": affected,
                            "action": row.get("action") or "",
                            "detail": row.get("detail") or "",
                        },
                    )
                    restore_timestamps(AdminAuditLog, obj.pk, created_at=row.get("createdAt"))
                    count("adminAuditLogs")

        if skipped:
            self.stdout.write(
                self.style.WARNING(
                    "Referências não importadas: " + json.dumps(skipped[:50], ensure_ascii=False)
                )
            )
            if options["strict"]:
                raise CommandError(
                    f"Migração interrompida em modo strict: {len(skipped)} referência(s) órfã(s)."
                )

        if options["dry_run"]:
            transaction.set_rollback(True)
            self.stdout.write(
                self.style.WARNING(
                    "DRY RUN; nenhuma alteração persistida. "
                    + json.dumps(counts, ensure_ascii=False, sort_keys=True)
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    "Importação concluída. "
                    + json.dumps(counts, ensure_ascii=False, sort_keys=True)
                )
            )
