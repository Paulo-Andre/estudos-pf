import json
from datetime import datetime
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand,CommandError
from django.db import connection,transaction
from django.utils import timezone
from accounts.models import AccountProfile
from courses.models import Course,CourseEnrollment
from study.models import StudyProfile,CompletedModule,StudyAnswer,SimulationRecord,StudyNote

def rows(cursor,table):
    cursor.execute("SELECT * FROM "+table)
    cols=[c[0] for c in cursor.description]
    return [dict(zip(cols,r)) for r in cursor.fetchall()]
def j(v,f):
    try:return json.loads(v) if isinstance(v,str) else (v if v is not None else f)
    except:return f
def aware(v):
    if not v:return None
    return v if timezone.is_aware(v) else timezone.make_aware(v)

class Command(BaseCommand):
    help="Importa o núcleo das tabelas Node/Drizzle sem apagar a origem."
    def add_arguments(self,p): p.add_argument("--dry-run",action="store_true")
    @transaction.atomic
    def handle(self,*args,**opts):
        tables=set(connection.introspection.table_names())
        if "users" not in tables: raise CommandError("Tabela users não encontrada.")
        User=get_user_model(); counts={}
        with connection.cursor() as c:
            counts["users"]=0
            for r in rows(c,"users"):
                username=(r.get("username") or f"legacy-{r['id']}").lower()
                admin=r.get("role")=="admin"; blocked=bool(r.get("isBlocked"))
                u,created=User.objects.update_or_create(pk=r["id"],defaults={"username":username,"email":(r.get("email") or "").lower(),
                 "first_name":(r.get("name") or username)[:150],"is_staff":admin,"is_superuser":admin,"is_active":not blocked,
                 "date_joined":aware(r.get("createdAt")) or timezone.now(),"last_login":aware(r.get("lastSignedIn"))})
                if created: u.set_unusable_password(); u.save(update_fields=["password"])
                p,_=AccountProfile.objects.update_or_create(user=u,defaults={"display_name":r.get("name") or username,"role":"admin" if admin else "user",
                 "is_blocked":blocked,"legacy_open_id":r.get("openId"),"last_signed_in":aware(r.get("lastSignedIn"))})
                if not u.has_usable_password() and not p.legacy_password_hash:
                    p.legacy_password_hash=r.get("passwordHash") or ""; p.save()
                counts["users"]+=1
            if "courseEnrollments" in tables:
                counts["enrollments"]=0
                for r in rows(c,"courseEnrollments"):
                    u=User.objects.filter(pk=r["userId"]).first(); a=User.objects.filter(pk=r["createdByUserId"]).first()
                    if not u or not a: continue
                    course,_=Course.objects.get_or_create(pk=r["courseId"],defaults={"title":r["courseId"].replace("-"," ").title(),"created_by":a})
                    CourseEnrollment.objects.update_or_create(pk=r["id"],defaults={"user":u,"course":course,"start_at":aware(r["startAt"]),
                     "expires_at":aware(r["expiresAt"]),"status":r.get("status") or "active","created_by":a,"revoked_at":aware(r.get("revokedAt"))})
                    counts["enrollments"]+=1
            if "studyProfiles" in tables:
                counts["profiles"]=0
                for r in rows(c,"studyProfiles"):
                    u=User.objects.filter(pk=r["userId"]).first()
                    if not u: continue
                    day=datetime.strptime(r["lastStudyDate"],"%Y-%m-%d").date() if r.get("lastStudyDate") else None
                    StudyProfile.objects.update_or_create(user=u,defaults={"xp":r.get("xp") or 0,"last_study_date":day,
                    "study_dates":j(r.get("studyDatesJson"),[]),"used_question_ids":j(r.get("usedQuestionIdsJson"),[])})
                    counts["profiles"]+=1
            for legacy,Model,mapper in [
                ("completedModules",CompletedModule,lambda r,u:{"user":u,"module_id":r["moduleId"]}),
                ("studyAnswers",StudyAnswer,lambda r,u:{"user":u,"question_id":r["questionId"],"correct":bool(r["correct"])}),
                ("studyNotes",StudyNote,lambda r,u:{"user":u,"module_id":r["moduleId"],"content":r.get("content") or ""}),
            ]:
                if legacy in tables:
                    counts[legacy]=0
                    for r in rows(c,legacy):
                        u=User.objects.filter(pk=r["userId"]).first()
                        if not u: continue
                        Model.objects.update_or_create(pk=r["id"],defaults=mapper(r,u)); counts[legacy]+=1
            if "simulationRecords" in tables:
                counts["simulations"]=0
                for r in rows(c,"simulationRecords"):
                    u=User.objects.filter(pk=r["userId"]).first()
                    if not u:continue
                    SimulationRecord.objects.update_or_create(pk=r["id"],defaults={"user":u,"total":r["total"],"correct":r["correct"],
                    "errors":r["errors"],"elapsed_seconds":r["elapsedSeconds"],"by_discipline":j(r.get("byDisciplineJson"),{}),"by_block":j(r.get("byBlockJson"),{})})
                    counts["simulations"]+=1
        if opts["dry_run"]:
            transaction.set_rollback(True); self.stdout.write("DRY RUN: "+str(counts))
        else:self.stdout.write(self.style.SUCCESS("Importado: "+str(counts)))
