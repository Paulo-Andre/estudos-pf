from datetime import timedelta
from io import BytesIO
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APITestCase
from openpyxl import Workbook
from courses.models import Course,CourseEnrollment
from .models import Content,CourseDiscipline,Discipline,DisciplineContent,Question,QuestionContentLink,ReviewQueue
from .services import can_use_question,decide_review,submit_for_review

def make_xlsx(headers,rows):
    wb=Workbook();ws=wb.active
    ws.append(headers)
    for row in rows:ws.append(row)
    stream=BytesIO();wb.save(stream)
    return stream.getvalue()

def make_text_pdf(text):
    objects=[]
    def add(value):
        objects.append(value.encode("latin-1"));return len(objects)
    add("<< /Type /Catalog /Pages 2 0 R >>")
    add("<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>")
    safe=text.replace("\\","\\\\").replace("(","\\(").replace(")","\\)")
    stream=f"BT /F1 12 Tf 72 720 Td ({safe}) Tj ET".encode("latin-1")
    add(f"<< /Length {len(stream)} >>\nstream\n{stream.decode('latin-1')}\nendstream")
    add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    out=BytesIO();out.write(b"%PDF-1.4\n");offsets=[0]
    for index,obj in enumerate(objects,start=1):
        offsets.append(out.tell());out.write(f"{index} 0 obj\n".encode());out.write(obj);out.write(b"\nendobj\n")
    xref=out.tell();out.write(f"xref\n0 {len(objects)+1}\n".encode());out.write(b"0000000000 65535 f \n")
    for offset in offsets[1:]:out.write(f"{offset:010d} 00000 n \n".encode())
    out.write(f"trailer\n<< /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return out.getvalue()

class KnowledgeTests(APITestCase):
    def setUp(self):
        User=get_user_model()
        self.admin=User.objects.create_superuser("root","root@example.com","Admin-F0rte!2026")
        self.student=User.objects.create_user("aluno","aluno@example.com","Aluno-F0rte!2026")
        self.course=Course.objects.create(id="pf",title="PF",created_by=self.admin)
        self.discipline=Discipline.objects.create(name="Português",short_name="port",created_by=self.admin,updated_by=self.admin,status="published")
        CourseDiscipline.objects.create(course=self.course,discipline=self.discipline,linked_by=self.admin)
        self.content=Content.objects.create(title="Interpretação",body="conteúdo protegido",created_by=self.admin,updated_by=self.admin,status="published")
        DisciplineContent.objects.create(discipline=self.discipline,content=self.content,linked_by=self.admin)
        self.question=Question.objects.create(statement="Questão?",answer_json={"value":True},created_by=self.admin,updated_by=self.admin,status="published")
        QuestionContentLink.objects.create(question=self.question,content=self.content,linked_by=self.admin)

    def test_library_requires_enrollment(self):
        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.get("/api/v1/knowledge/courses/pf/library/").status_code,403)
        CourseEnrollment.objects.create(user=self.student,course=self.course,created_by=self.admin,start_at=timezone.now()-timedelta(days=1),expires_at=timezone.now()+timedelta(days=30))
        response=self.client.get("/api/v1/knowledge/courses/pf/library/")
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.data[0]["contents"][0]["title"],"Interpretação")

    def test_review_decision_is_single_use(self):
        review=submit_for_review("question",self.question.id,self.admin)
        decided=decide_review(review.id,self.admin,"approved","ok")
        self.assertEqual(decided.status,"approved")
        with self.assertRaises(ValueError):
            decide_review(review.id,self.admin,"rejected","late")

    def test_review_required_question_is_not_used_until_approved(self):
        self.question.requires_review=True
        self.question.status="review"
        self.question.save()
        self.assertFalse(can_use_question(self.question))
        self.question.status="approved"
        self.assertTrue(can_use_question(self.question))


    def test_question_xlsx_preview_and_commit(self):
        self.client.force_authenticate(self.admin)
        payload=make_xlsx(
            ["enunciado","tipo","resposta","comentario","dificuldade","banca","ano","conteudo_ids","status","exigir_revisao"],
            [["A administração pública deve obedecer ao princípio da legalidade?","certo_errado","CERTO","Fundamento de teste.","intermediate","CEBRASPE",2025,str(self.content.id),"draft","SIM"]],
        )
        preview=self.client.post("/api/v1/knowledge/admin/import/questions/",{"file":SimpleUploadedFile("questoes.xlsx",payload,content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),"dryRun":"true"},format="multipart")
        self.assertEqual(preview.status_code,200)
        self.assertEqual(preview.data["validRows"],1)
        self.assertEqual(preview.data["invalidRows"],0)
        self.assertFalse(Question.objects.filter(statement__startswith="A administração pública").exists())
        commit=self.client.post("/api/v1/knowledge/admin/import/questions/",{"file":SimpleUploadedFile("questoes.xlsx",payload,content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),"dryRun":"false"},format="multipart")
        self.assertEqual(commit.status_code,201)
        created=Question.objects.get(pk=commit.data["createdIds"][0])
        self.assertEqual(created.content_links.first().content_id,self.content.id)
        self.assertTrue(created.requires_review)

    def test_question_xlsx_invalid_row_blocks_commit(self):
        self.client.force_authenticate(self.admin)
        payload=make_xlsx(["enunciado","tipo","resposta"],[["curta","certo_errado","TALVEZ"]])
        response=self.client.post("/api/v1/knowledge/admin/import/questions/",{"file":SimpleUploadedFile("ruim.xlsx",payload),"dryRun":"false"},format="multipart")
        self.assertEqual(response.status_code,400)
        self.assertEqual(response.data["invalidRows"],1)

    def test_content_xlsx_preview_and_commit(self):
        self.client.force_authenticate(self.admin)
        payload=make_xlsx(
            ["titulo","objetivo","descricao","resumo_card","corpo","disciplinas","status","exigir_revisao","aviso","capa_url","video_url","video_rotulo","material_url","material_rotulo"],
            [["Princípios Administrativos","Dominar princípios.","Descrição pedagógica.","Resumo do card.","Conteúdo didático importado com texto suficiente.","port","draft","NÃO","NOVO","https://exemplo.com/capa.webp","https://www.youtube.com/watch?v=abc","Assistir videoaula","https://exemplo.com/apostila.pdf","Baixar PDF"]],
        )
        preview=self.client.post("/api/v1/knowledge/admin/import/contents/",{"file":SimpleUploadedFile("conteudos.xlsx",payload),"dryRun":"true"},format="multipart")
        self.assertEqual(preview.status_code,200)
        self.assertEqual(preview.data["validRows"],1)
        commit=self.client.post("/api/v1/knowledge/admin/import/contents/",{"file":SimpleUploadedFile("conteudos.xlsx",payload),"dryRun":"false"},format="multipart")
        self.assertEqual(commit.status_code,201)
        created=Content.objects.get(pk=commit.data["createdIds"][0])
        self.assertEqual(created.notice_kind,"new")
        self.assertEqual(created.video_url,"https://www.youtube.com/watch?v=abc")
        self.assertEqual(created.video_label,"Assistir videoaula")
        self.assertEqual(created.material_url,"https://exemplo.com/apostila.pdf")
        self.assertEqual(created.material_label,"Baixar PDF")
        self.assertEqual(created.cover_image_url,"https://exemplo.com/capa.webp")
        self.assertEqual(created.discipline_links.first().discipline,self.discipline)

    def test_content_import_rejects_unsafe_or_invalid_urls(self):
        self.client.force_authenticate(self.admin)
        payload=make_xlsx(
            ["titulo","video_url"],
            [["Conteúdo com link inválido","javascript:alert(1)"]],
        )
        response=self.client.post("/api/v1/knowledge/admin/import/contents/",{"file":SimpleUploadedFile("conteudos.xlsx",payload),"dryRun":"true"},format="multipart")
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.data["invalidRows"],1)
        self.assertIn("video_url",response.data["preview"][0]["errors"][0])

    def test_pdf_content_preview_and_commit(self):
        self.client.force_authenticate(self.admin)
        pdf=make_text_pdf("Conteudo textual de Direito Administrativo para importacao com explicacoes e conceitos suficientes para uma aula.")
        base={"dryRun":"true","title":"Aula importada do PDF","disciplineIds":str(self.discipline.id),"status":"draft","requiresReview":"true","coverImageUrl":"https://exemplo.com/capa.webp","videoUrl":"https://www.youtube.com/watch?v=pdf","videoLabel":"Video complementar","materialUrl":"https://exemplo.com/material.pdf","materialLabel":"Baixar material","noticeKind":"updated"}
        preview=self.client.post("/api/v1/knowledge/admin/import/contents/",{"file":SimpleUploadedFile("aula.pdf",pdf,content_type="application/pdf"),**base},format="multipart")
        self.assertEqual(preview.status_code,200)
        self.assertEqual(preview.data["format"],"pdf")
        self.assertGreater(preview.data["pdf"]["characters"],50)
        commit=self.client.post("/api/v1/knowledge/admin/import/contents/",{"file":SimpleUploadedFile("aula.pdf",pdf,content_type="application/pdf"),**{**base,"dryRun":"false"}},format="multipart")
        self.assertEqual(commit.status_code,201)
        created=Content.objects.get(pk=commit.data["createdIds"][0])
        self.assertIn("Direito Administrativo",created.body)
        self.assertTrue(created.requires_review)
        self.assertEqual(created.video_url,"https://www.youtube.com/watch?v=pdf")
        self.assertEqual(created.video_label,"Video complementar")
        self.assertEqual(created.material_url,"https://exemplo.com/material.pdf")
        self.assertEqual(created.material_label,"Baixar material")
        self.assertEqual(created.cover_image_url,"https://exemplo.com/capa.webp")
        self.assertEqual(created.notice_kind,"updated")

    def test_import_templates_are_downloadable_xlsx(self):
        self.client.force_authenticate(self.admin)
        for kind in ("questions","contents"):
            response=self.client.get(f"/api/v1/knowledge/admin/import/templates/{kind}/")
            self.assertEqual(response.status_code,200)
            self.assertEqual(response["Content-Type"],"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            self.assertTrue(response.content.startswith(b"PK"))

    def test_xlsx_formulas_are_rejected(self):
        self.client.force_authenticate(self.admin)
        payload=make_xlsx(["enunciado","tipo","resposta"],[['=CONCAT("texto"," executavel")',"certo_errado","CERTO"]])
        response=self.client.post("/api/v1/knowledge/admin/import/questions/",{"file":SimpleUploadedFile("formula.xlsx",payload),"dryRun":"true"},format="multipart")
        self.assertEqual(response.status_code,400)
        self.assertIn("fórmulas",response.data["detail"])
