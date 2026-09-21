import json
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand,CommandError
from django.db import transaction

from courses.models import Course,CourseContent
from knowledge.models import Content,CourseDiscipline,Discipline,DisciplineContent,Question,QuestionContentLink

DIFFICULTY_MAP={"Fácil":"basic","Médio":"intermediate","Difícil":"advanced","Facil":"basic","Medio":"intermediate","Dificil":"advanced"}

class Command(BaseCommand):
    help="Importa o seed protegido exportado pelo frontend legado para tabelas Django."

    def add_arguments(self,parser):
        parser.add_argument("seed_path")
        parser.add_argument("--admin-username",default="")
        parser.add_argument("--course-id",default="")
        parser.add_argument("--dry-run",action="store_true")

    @transaction.atomic
    def handle(self,*args,**opts):
        path=Path(opts["seed_path"])
        if not path.exists():
            raise CommandError(f"Seed não encontrado: {path}")
        data=json.loads(path.read_text(encoding="utf-8"))
        User=get_user_model()
        admin=None
        if opts["admin_username"]:
            admin=User.objects.filter(username=opts["admin_username"],is_staff=True).first()
        if admin is None:
            admin=User.objects.filter(is_superuser=True).order_by("id").first()
        if admin is None:
            raise CommandError("É necessário um usuário administrador para registrar a importação.")

        course_id=opts["course_id"] or data.get("activeContestId") or "pf-agente"
        contest=next((x for x in data.get("contestCatalog",[]) if x.get("id")==course_id),None) or {}
        course,_=Course.objects.update_or_create(
            pk=course_id,
            defaults={
                "title":contest.get("name") or course_id.replace("-"," ").title(),
                "track":contest.get("role") or "",
                "course_type":"concurso",
                "description":contest.get("description") or "",
                "is_active":True,
                "created_by":admin,
            },
        )

        discipline_by_name={}
        discipline_by_id={}
        for item in data.get("disciplineCatalog",[]):
            slug=str(item.get("id") or item.get("shortName") or item.get("name") or "").strip().lower()[:48]
            if not slug:
                continue
            d,_=Discipline.objects.update_or_create(
                short_name=slug,
                defaults={
                    "name":str(item.get("name") or slug)[:160],
                    "description":str(item.get("description") or ""),
                    "status":"published",
                    "requires_review":False,
                    "created_by":admin,
                    "updated_by":admin,
                },
            )
            CourseDiscipline.objects.get_or_create(course=course,discipline=d,defaults={"linked_by":admin})
            discipline_by_name[d.name]=d
            discipline_by_id[str(item.get("id") or "")]=d

        chapter_map=data.get("chapters") or {}
        content_by_module={}
        modules=data.get("modules") or []
        for order,module in enumerate(modules):
            module_id=str(module.get("id") or "").strip()
            if not module_id:
                continue
            discipline=discipline_by_name.get(str(module.get("discipline") or ""))
            chapter=chapter_map.get(module_id) or {}
            content,_=Content.objects.update_or_create(
                title=str(module.get("title") or module_id)[:220],
                defaults={
                    "objective":str(module.get("summary") or ""),
                    "description":str(module.get("summary") or ""),
                    "card_text":str(module.get("summary") or ""),
                    "body":json.dumps(chapter,ensure_ascii=False),
                    "status":"published",
                    "requires_review":False,
                    "created_by":admin,
                    "updated_by":admin,
                },
            )
            if discipline:
                DisciplineContent.objects.get_or_create(discipline=discipline,content=content,defaults={"linked_by":admin})
            CourseContent.objects.update_or_create(
                course=course,module_id=module_id,
                defaults={
                    "discipline":str(module.get("discipline") or "")[:160],
                    "title":str(module.get("title") or module_id)[:220],
                    "summary":str(module.get("summary") or ""),
                    "body_json":{"module":module,"chapter":chapter},
                    "source":str(module.get("source") or "")[:500],
                    "order":order,
                    "is_published":True,
                },
            )
            content_by_module[module_id]=content

        contents_by_discipline={}
        for content in Content.objects.filter(discipline_links__discipline__course_links__course=course).distinct():
            for link in content.discipline_links.select_related("discipline").all():
                contents_by_discipline.setdefault(link.discipline.name,[]).append(content)

        qcount=0
        for q in data.get("questions") or []:
            legacy_key=str(q.get("id") or "").strip()
            if not legacy_key:
                continue
            question,_=Question.objects.update_or_create(
                legacy_key=legacy_key,
                defaults={
                    "statement":str(q.get("statement") or ""),
                    "question_type":"certo_errado",
                    "options_json":None,
                    "answer_json":bool(q.get("answer")),
                    "explanation":str(q.get("explanation") or ""),
                    "difficulty":DIFFICULTY_MAP.get(str(q.get("difficulty") or ""),"intermediate"),
                    "source":str(q.get("source") or "")[:240],
                    "banca":"Cebraspe",
                    "status":"published",
                    "requires_review":False,
                    "created_by":admin,
                    "updated_by":admin,
                },
            )
            target=(contents_by_discipline.get(str(q.get("discipline") or "")) or [None])[0]
            if target:
                QuestionContentLink.objects.get_or_create(question=question,content=target,defaults={"linked_by":admin})
            qcount+=1

        summary={"course":course_id,"disciplines":len(discipline_by_id),"modules":len(content_by_module),"questions":qcount}
        if opts["dry_run"]:
            transaction.set_rollback(True)
            self.stdout.write("DRY RUN: "+json.dumps(summary,ensure_ascii=False))
        else:
            self.stdout.write(self.style.SUCCESS(json.dumps(summary,ensure_ascii=False)))
