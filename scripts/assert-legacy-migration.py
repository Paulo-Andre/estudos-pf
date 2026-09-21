from django.contrib.auth import authenticate, get_user_model
from accounts.models import AccountProfile
from audit.models import AdminAuditLog
from courses.models import CourseEnrollment
from study.models import CompletedModule, SimulationRecord, StudyAnswer, StudyNote, StudyProfile

User=get_user_model()
user=User.objects.get(username="legacy.student")
profile=AccountProfile.objects.get(user=user)
assert profile.legacy_password_hash.startswith("scrypt$")
assert StudyProfile.objects.get(user=user).xp == 321
assert CourseEnrollment.objects.filter(user=user,course_id="legacy-pf",status="active").count() == 1
assert CompletedModule.objects.filter(user=user,module_id="legacy-module-1").count() == 1
assert StudyAnswer.objects.filter(user=user,question_id="legacy-q-1").exists()
assert SimulationRecord.objects.filter(user=user,pk="legacy-sim-1").count() == 1
assert StudyNote.objects.filter(user=user,module_id="legacy-module-1").count() == 1
assert AdminAuditLog.objects.filter(affected_user=user,action="CI_MIGRATION_FIXTURE").exists()
authenticated=authenticate(username="legacy.student",password="Legacy-Migration-Only-2026!")
assert authenticated and authenticated.pk == user.pk
profile.refresh_from_db()
user.refresh_from_db()
assert profile.legacy_password_hash == ""
assert user.has_usable_password()
print("Legacy core migration verified")
