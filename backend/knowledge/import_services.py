import json
import re
import zipfile
from io import BytesIO

from django.db import transaction
from openpyxl import Workbook,load_workbook
from openpyxl.styles import Alignment,Font,PatternFill
from openpyxl.worksheet.datavalidation import DataValidation
from pypdf import PdfReader

from audit.models import AdminAuditLog
from .models import Content,Discipline,DisciplineContent,KnowledgeStatus,Question,QuestionContentLink

MAX_XLSX_BYTES=10*1024*1024
MAX_PDF_BYTES=15*1024*1024
MAX_ROWS=2000
MAX_PDF_PAGES=300
MAX_PDF_TEXT=2_000_000

STATUS_ALIASES={
    "rascunho":"draft","draft":"draft","revisao":"review","revisão":"review","review":"review",
    "aprovado":"approved","approved":"approved","publicado":"published","published":"published",
    "inativo":"inactive","inactive":"inactive",
}
DIFFICULTY_ALIASES={
    "basica":"basic","básica":"basic","basic":"basic","facil":"basic","fácil":"basic",
    "intermediaria":"intermediate","intermediária":"intermediate","intermediate":"intermediate","media":"intermediate","média":"intermediate",
    "avancada":"advanced","avançada":"advanced","advanced":"advanced","dificil":"advanced","difícil":"advanced",
}
TYPE_ALIASES={
    "certo_errado":"certo_errado","certo/errado":"certo_errado","certo ou errado":"certo_errado","ce":"certo_errado",
    "multipla_escolha":"multipla_escolha","múltipla escolha":"multipla_escolha","multipla escolha":"multipla_escolha","me":"multipla_escolha",
}


def _clean(value):
    if value is None:return ""
    text=str(value).replace("\x00","").strip()
    return text


def _norm(value):
    return re.sub(r"\s+"," ",_clean(value)).strip().casefold()


def _bool(value,default=False):
    key=_norm(value)
    if key in {"1","true","sim","s","yes","y","x"}:return True
    if key in {"0","false","nao","não","n","no",""}:return False if value is not None else default
    raise ValueError("use SIM/NÃO ou TRUE/FALSE")


def _split_ids(value):
    if value is None or _clean(value)=="" :return []
    raw=re.split(r"[|;,]",_clean(value))
    values=[]
    for item in raw:
        item=item.strip()
        if not item:continue
        try:values.append(int(item))
        except ValueError:raise ValueError(f"ID inválido: {item}")
    return values


def _split_names(value):
    if value is None:return []
    return [item.strip() for item in re.split(r"[|;]",_clean(value)) if item.strip()]


def _safe_status(value):
    status=STATUS_ALIASES.get(_norm(value) or "draft")
    if not status:raise ValueError("status inválido")
    return status


def _safe_difficulty(value):
    difficulty=DIFFICULTY_ALIASES.get(_norm(value) or "intermediate")
    if not difficulty:raise ValueError("dificuldade inválida")
    return difficulty


def _safe_type(value):
    qtype=TYPE_ALIASES.get(_norm(value) or "certo_errado")
    if not qtype:raise ValueError("tipo inválido")
    return qtype


def _check_upload(upload,max_bytes,extensions):
    name=(getattr(upload,"name","") or "").lower()
    if not any(name.endswith(ext) for ext in extensions):raise ValueError(f"Formato inválido. Use {', '.join(extensions)}.")
    size=getattr(upload,"size",None)
    if size is not None and size>max_bytes:raise ValueError(f"Arquivo excede o limite de {max_bytes//1024//1024} MB.")


def _xlsx_rows(upload):
    _check_upload(upload,MAX_XLSX_BYTES,(".xlsx",))
    upload.seek(0);raw=upload.read()
    try:
        with zipfile.ZipFile(BytesIO(raw)) as archive:
            entries=archive.infolist()
            if len(entries)>250:raise ValueError("XLSX possui estrutura interna excessiva.")
            unpacked=sum(item.file_size for item in entries)
            if unpacked>50*1024*1024:raise ValueError("XLSX excede o limite interno descompactado.")
            names={item.filename for item in entries}
            if any(name.startswith("xl/externalLinks/") for name in names) or "xl/connections.xml" in names:
                raise ValueError("XLSX com conexões ou links externos não é aceito.")
    except zipfile.BadZipFile as exc:raise ValueError("O arquivo não é um XLSX válido.") from exc
    try:wb=load_workbook(filename=BytesIO(raw),read_only=True,data_only=False,keep_links=False)
    except Exception as exc:raise ValueError("Não foi possível abrir o XLSX. Verifique se o arquivo não está corrompido.") from exc
    ws=wb[wb.sheetnames[0]]
    if ws.max_row>MAX_ROWS+1:raise ValueError(f"A planilha possui mais de {MAX_ROWS} linhas de dados.")
    rows=list(ws.iter_rows(values_only=False))
    if not rows:return [],[]
    headers=[_norm(cell.value).replace(" ","_") for cell in rows[0]]
    if any(cell.data_type=="f" for row in rows for cell in row):
        raise ValueError("Planilhas com fórmulas não são aceitas. Cole apenas valores antes de importar.")
    data=[]
    for idx,row in enumerate(rows[1:],start=2):
        values=[cell.value for cell in row]
        if not any(_clean(value) for value in values):continue
        data.append((idx,{headers[i]:values[i] if i<len(values) else None for i in range(len(headers)) if headers[i]}))
    return headers,data


def _content_ids(row):
    ids=_split_ids(row.get("conteudo_ids"))
    if ids:
        existing={item.id:item for item in Content.objects.filter(id__in=ids)}
        missing=[item for item in ids if item not in existing]
        if missing:raise ValueError("conteudo_ids inexistente(s): "+", ".join(map(str,missing)))
        return ids
    names=_split_names(row.get("conteudos"))
    resolved=[]
    for name in names:
        matches=list(Content.objects.filter(title__iexact=name).values_list("id",flat=True)[:2])
        if not matches:raise ValueError(f"conteúdo não encontrado: {name}")
        if len(matches)>1:raise ValueError(f"título de conteúdo ambíguo: {name}; use conteudo_ids")
        resolved.append(matches[0])
    return resolved


def _discipline_ids(row):
    ids=_split_ids(row.get("disciplina_ids"))
    if ids:
        existing=set(Discipline.objects.filter(id__in=ids).values_list("id",flat=True))
        missing=[item for item in ids if item not in existing]
        if missing:raise ValueError("disciplina_ids inexistente(s): "+", ".join(map(str,missing)))
        return ids
    short_names=_split_names(row.get("disciplinas"))
    resolved=[]
    for short in short_names:
        match=Discipline.objects.filter(short_name__iexact=short).first()
        if not match:raise ValueError(f"sigla de disciplina não encontrada: {short}")
        resolved.append(match.id)
    return resolved


def parse_question_xlsx(upload):
    headers,rows=_xlsx_rows(upload)
    seen=set()
    required={"enunciado","tipo","resposta"}
    missing=sorted(required-set(headers))
    if missing:raise ValueError("Colunas obrigatórias ausentes: "+", ".join(missing))
    result=[]
    for row_number,row in rows:
        errors=[];warnings=[]
        try:
            statement=_clean(row.get("enunciado"))
            if len(statement)<12:raise ValueError("enunciado deve ter ao menos 12 caracteres")
            qtype=_safe_type(row.get("tipo"))
            options=[]
            for letter in "abcde":
                value=_clean(row.get(f"alternativa_{letter}"))
                if value:options.append(value)
            raw_answer=_clean(row.get("resposta"))
            if qtype=="certo_errado":
                key=_norm(raw_answer)
                if key in {"certo","true","verdadeiro","1"}:answer=True
                elif key in {"errado","false","falso","0"}:answer=False
                else:raise ValueError("resposta de Certo/Errado deve ser CERTO ou ERRADO")
                options=[]
            else:
                if len(options)<2:raise ValueError("múltipla escolha exige ao menos alternativa_a e alternativa_b")
                key=raw_answer.strip().upper().replace(")","").replace(".","")
                if key in {"A","B","C","D","E"}:
                    position=ord(key)-65
                    if position>=len(options):raise ValueError("resposta aponta para alternativa vazia")
                    answer=options[position]
                elif raw_answer in options:answer=raw_answer
                else:raise ValueError("resposta deve ser A/B/C/D/E ou o texto exato de uma alternativa")
            year=None
            if _clean(row.get("ano")):
                year=int(float(row.get("ano")))
                if year<1900 or year>2100:raise ValueError("ano fora do intervalo 1900-2100")
            content_ids=_content_ids(row)
            signature=(statement.casefold(),qtype)
            duplicate=signature in seen or Question.objects.filter(statement__iexact=statement,question_type=qtype).exists()
            seen.add(signature)
            if duplicate:warnings.append("questão idêntica já existe no arquivo ou banco e será ignorada")
            result.append({"row":row_number,"valid":not duplicate,"skip":duplicate,"errors":[],"warnings":warnings,"data":{
                "statement":statement,"question_type":qtype,"options_json":options,"answer_json":answer,
                "explanation":_clean(row.get("comentario")),"difficulty":_safe_difficulty(row.get("dificuldade")),
                "source":_clean(row.get("fonte"))[:240],"banca":_clean(row.get("banca"))[:120],"year":year,
                "status":_safe_status(row.get("status")),"requires_review":_bool(row.get("exigir_revisao")),
                "content_ids":content_ids,
            }})
        except Exception as exc:
            errors.append(str(exc))
            result.append({"row":row_number,"valid":False,"skip":False,"errors":errors,"warnings":warnings,"data":{"statement":_clean(row.get("enunciado"))}})
    return result


def apply_question_import(rows,user):
    created=[]
    with transaction.atomic():
        for item in rows:
            if not item["valid"] or item["skip"]:continue
            data=item["data"];content_ids=data.pop("content_ids")
            question=Question.objects.create(created_by=user,updated_by=user,**data)
            for content_id in content_ids:QuestionContentLink.objects.get_or_create(question=question,content_id=content_id,defaults={"linked_by":user})
            created.append(question.id)
        AdminAuditLog.objects.create(actor=user,action="IMPORTACAO_QUESTOES_XLSX",detail=f"{len(created)} questão(ões) importada(s) pela biblioteca ROOT.")
    return created


def parse_content_xlsx(upload):
    headers,rows=_xlsx_rows(upload)
    seen=set()
    if "titulo" not in headers:raise ValueError("Coluna obrigatória ausente: titulo")
    result=[]
    for row_number,row in rows:
        errors=[];warnings=[]
        try:
            title=_clean(row.get("titulo"))
            if len(title)<3:raise ValueError("título deve ter ao menos 3 caracteres")
            discipline_ids=_discipline_ids(row)
            signature=title.casefold()
            duplicate=signature in seen or Content.objects.filter(title__iexact=title).exists()
            seen.add(signature)
            if duplicate:warnings.append("conteúdo com este título já existe no arquivo ou banco e será ignorado")
            notice=_norm(row.get("aviso"))
            notice_kind={"novo":"new","new":"new","atualizado":"updated","updated":"updated","":"None","nenhum":"None"}.get(notice)
            if notice_kind is None:raise ValueError("aviso deve ser NENHUM, NOVO ou ATUALIZADO")
            result.append({"row":row_number,"valid":not duplicate,"skip":duplicate,"errors":[],"warnings":warnings,"data":{
                "title":title,"objective":_clean(row.get("objetivo")),"description":_clean(row.get("descricao")),
                "card_text":_clean(row.get("resumo_card")),"body":_clean(row.get("corpo")),
                "cover_image_url":_clean(row.get("capa_url"))[:2048],"video_url":_clean(row.get("video_url"))[:2048],
                "video_label":_clean(row.get("video_rotulo"))[:160],"material_url":_clean(row.get("material_url"))[:2048],
                "material_label":_clean(row.get("material_rotulo"))[:160],"notice_kind":None if notice_kind=="None" else notice_kind,
                "status":_safe_status(row.get("status")),"requires_review":_bool(row.get("exigir_revisao")),
                "discipline_ids":discipline_ids,
            }})
        except Exception as exc:
            errors.append(str(exc))
            result.append({"row":row_number,"valid":False,"skip":False,"errors":errors,"warnings":warnings,"data":{"title":_clean(row.get("titulo"))}})
    return result


def apply_content_import(rows,user):
    created=[]
    with transaction.atomic():
        for item in rows:
            if not item["valid"] or item["skip"]:continue
            data=item["data"];discipline_ids=data.pop("discipline_ids")
            content=Content.objects.create(created_by=user,updated_by=user,**data)
            for discipline_id in discipline_ids:DisciplineContent.objects.get_or_create(discipline_id=discipline_id,content=content,defaults={"linked_by":user})
            created.append(content.id)
        AdminAuditLog.objects.create(actor=user,action="IMPORTACAO_CONTEUDOS_XLSX",detail=f"{len(created)} conteúdo(s) importado(s) pela biblioteca ROOT.")
    return created


def pdf_to_content(upload,metadata):
    _check_upload(upload,MAX_PDF_BYTES,(".pdf",))
    upload.seek(0)
    try:reader=PdfReader(BytesIO(upload.read()))
    except Exception as exc:raise ValueError("Não foi possível abrir o PDF.") from exc
    if reader.is_encrypted:
        try:
            if not reader.decrypt(""):raise ValueError("PDF protegido por senha não pode ser importado.")
        except Exception as exc:raise ValueError("PDF protegido por senha não pode ser importado.") from exc
    if len(reader.pages)>MAX_PDF_PAGES:raise ValueError(f"PDF excede o limite de {MAX_PDF_PAGES} páginas.")
    chunks=[];raw_pages=[];total=0
    for index,page in enumerate(reader.pages,start=1):
        text=(page.extract_text() or "").replace("\x00","").strip()
        if not text:continue
        raw_pages.append(text)
        chunk=f"Página {index}\n\n{text}"
        total+=len(chunk)
        if total>MAX_PDF_TEXT:raise ValueError("Texto extraído do PDF excede o limite permitido.")
        chunks.append(chunk)
    body="\n\n".join(chunks).strip()
    raw_text="\n\n".join(raw_pages).strip()
    if len(body)<50:raise ValueError("O PDF não possui texto extraível suficiente. PDFs escaneados precisam de OCR antes da importação.")
    def marker(name):
        match=re.search(rf"(?im)^\s*{name}\s*:\s*(.+?)\s*$",raw_text)
        return _clean(match.group(1)) if match else ""
    structured_body=""
    content_match=re.search(r"(?ims)^\s*CONTEUDO\s*:\s*(.+)$",raw_text)
    if content_match:structured_body=_clean(content_match.group(1))
    title=_clean(metadata.get("title")) or marker("TITULO") or re.sub(r"\.pdf$","",getattr(upload,"name","conteudo"),flags=re.I)
    if len(title)<3:raise ValueError("Informe um título válido.")
    discipline_ids=_split_ids(metadata.get("disciplineIds"))
    missing=set(discipline_ids)-set(Discipline.objects.filter(id__in=discipline_ids).values_list("id",flat=True))
    if missing:raise ValueError("Disciplina(s) inexistente(s): "+", ".join(map(str,sorted(missing))))
    duplicate=Content.objects.filter(title__iexact=title).exists()
    return {
        "title":title[:220],"objective":_clean(metadata.get("objective")) or marker("OBJETIVO"),"description":_clean(metadata.get("description")) or marker("DESCRICAO"),
        "card_text":_clean(metadata.get("cardText")) or marker("RESUMO_CARD"),"body":structured_body or body,"status":_safe_status(metadata.get("status")),
        "requires_review":_bool(metadata.get("requiresReview")),"discipline_ids":discipline_ids,"duplicate":duplicate,
        "pages":len(reader.pages),"characters":len(body),
    }


def apply_pdf_content(data,user):
    if data.get("duplicate"):return None
    payload={key:value for key,value in data.items() if key not in {"discipline_ids","duplicate","pages","characters"}}
    discipline_ids=data["discipline_ids"]
    with transaction.atomic():
        content=Content.objects.create(created_by=user,updated_by=user,**payload)
        for discipline_id in discipline_ids:DisciplineContent.objects.get_or_create(discipline_id=discipline_id,content=content,defaults={"linked_by":user})
        AdminAuditLog.objects.create(actor=user,action="IMPORTACAO_CONTEUDO_PDF",detail=f"Conteúdo #{content.id} importado do PDF pela biblioteca ROOT.")
    return content.id


def import_summary(rows):
    valid=sum(1 for item in rows if item["valid"] and not item["skip"])
    skipped=sum(1 for item in rows if item["skip"])
    invalid=sum(1 for item in rows if not item["valid"] and not item["skip"])
    preview=[]
    for item in rows[:100]:
        data=item.get("data") or {}
        preview.append({
            "row":item["row"],"status":"skip" if item["skip"] else "valid" if item["valid"] else "invalid",
            "label":data.get("statement") or data.get("title") or "",
            "errors":item["errors"],"warnings":item["warnings"],
        })
    return {"validRows":valid,"skippedRows":skipped,"invalidRows":invalid,"preview":preview}


def _style_template(ws,widths):
    header_fill=PatternFill("solid",fgColor="173D49")
    header_font=Font(color="FFFFFF",bold=True)
    for cell in ws[1]:
        cell.fill=header_fill;cell.font=header_font;cell.alignment=Alignment(horizontal="center",vertical="center",wrap_text=True)
    ws.freeze_panes="A2";ws.auto_filter.ref=ws.dimensions
    for letter,width in widths.items():ws.column_dimensions[letter].width=width
    for row in ws.iter_rows(min_row=2):
        for cell in row:cell.alignment=Alignment(vertical="top",wrap_text=True)


def _list_validation(ws,column,values,start=2,end=2001):
    quoted='"'+",".join(values)+'"'
    dv=DataValidation(type="list",formula1=quoted,allow_blank=True)
    ws.add_data_validation(dv);dv.add(f"{column}{start}:{column}{end}")


def question_template_bytes():
    wb=Workbook();ws=wb.active;ws.title="QUESTOES"
    headers=["enunciado","tipo","alternativa_a","alternativa_b","alternativa_c","alternativa_d","alternativa_e","resposta","comentario","dificuldade","banca","ano","fonte","conteudo_ids","conteudos","status","exigir_revisao"]
    ws.append(headers)
    _style_template(ws,{"A":58,"B":20,"C":28,"D":28,"E":28,"F":28,"G":28,"H":18,"I":48,"J":20,"K":18,"L":10,"M":24,"N":20,"O":34,"P":18,"Q":18})
    _list_validation(ws,"B",["certo_errado","multipla_escolha"])
    _list_validation(ws,"J",["basic","intermediate","advanced"])
    _list_validation(ws,"P",["draft","review","approved","published","inactive"])
    _list_validation(ws,"Q",["SIM","NÃO"])
    examples=wb.create_sheet("EXEMPLOS")
    examples.append(headers)
    examples.append(["A Constituição Federal assegura o direito de reunião pacífica?","certo_errado","","","","","","CERTO","Exemplo de comentário didático.","intermediate","CEBRASPE",2025,"Prova exemplo","","","draft","NÃO"])
    examples.append(["Assinale a alternativa correta sobre o tema.","multipla_escolha","Alternativa um","Alternativa dois","Alternativa três","Alternativa quatro","","B","A alternativa B é a correta.","intermediate","FGV",2025,"Prova exemplo","","","draft","SIM"])
    _style_template(examples,{"A":58,"B":20,"C":28,"D":28,"E":28,"F":28,"G":28,"H":18,"I":48,"J":20,"K":18,"L":10,"M":24,"N":20,"O":34,"P":18,"Q":18})
    guide=wb.create_sheet("INSTRUCOES")
    guide_rows=[
        ["CAMPO","REGRA"],
        ["enunciado","Obrigatório. Mínimo de 12 caracteres."],
        ["tipo","certo_errado ou multipla_escolha."],
        ["alternativa_a até alternativa_e","Use apenas para múltipla escolha; mínimo de 2 alternativas."],
        ["resposta","CERTO/ERRADO ou A/B/C/D/E."],
        ["conteudo_ids","Opcional. IDs separados por |, ; ou vírgula. É a forma mais precisa de vínculo."],
        ["conteudos","Opcional. Títulos exatos separados por | ou ;. Use quando não souber o ID."],
        ["status","draft, review, approved, published ou inactive."],
        ["exigir_revisao","SIM ou NÃO."],
        ["segurança","Não use fórmulas. O sistema rejeita planilhas com fórmulas, links externos e linhas inválidas antes de gravar."],
    ]
    for row in guide_rows:guide.append(row)
    _style_template(guide,{"A":26,"B":95})
    ref=wb.create_sheet("CONTEUDOS_ATUAIS");ref.append(["id","titulo","status"])
    for item in Content.objects.all().order_by("title").values("id","title","status")[:5000]:ref.append([item["id"],item["title"],item["status"]])
    _style_template(ref,{"A":12,"B":60,"C":18})
    out=BytesIO();wb.save(out);return out.getvalue()


def content_template_bytes():
    wb=Workbook();ws=wb.active;ws.title="CONTEUDOS"
    headers=["titulo","objetivo","descricao","resumo_card","corpo","disciplina_ids","disciplinas","status","exigir_revisao","aviso","capa_url","video_url","video_rotulo","material_url","material_rotulo"]
    ws.append(headers)
    _style_template(ws,{"A":36,"B":42,"C":48,"D":40,"E":90,"F":20,"G":28,"H":18,"I":18,"J":18,"K":34,"L":34,"M":24,"N":34,"O":24})
    _list_validation(ws,"H",["draft","review","approved","published","inactive"])
    _list_validation(ws,"I",["SIM","NÃO"])
    _list_validation(ws,"J",["NENHUM","NOVO","ATUALIZADO"])
    examples=wb.create_sheet("EXEMPLOS");examples.append(headers)
    examples.append(["Direitos Fundamentais","Compreender os principais direitos e garantias.","Resumo do conteúdo para administração.","Texto curto exibido no cartão do aluno.","Insira aqui o conteúdo completo da aula. Pode usar parágrafos e listas em texto.","","","draft","NÃO","NENHUM","","","","",""])
    _style_template(examples,{"A":36,"B":42,"C":48,"D":40,"E":90,"F":20,"G":28,"H":18,"I":18,"J":18,"K":34,"L":34,"M":24,"N":34,"O":24})
    guide=wb.create_sheet("INSTRUCOES")
    guide_rows=[
        ["CAMPO","REGRA"],
        ["titulo","Obrigatório. Conteúdos com título idêntico são ignorados para evitar duplicação."],
        ["corpo","Texto principal da aula."],
        ["disciplina_ids","Opcional. IDs separados por |, ; ou vírgula."],
        ["disciplinas","Opcional. Siglas exatas das disciplinas separadas por | ou ;."],
        ["status","draft, review, approved, published ou inactive."],
        ["aviso","NENHUM, NOVO ou ATUALIZADO."],
        ["exigir_revisao","SIM ou NÃO."],
        ["PDF","Para PDF, envie um arquivo textual. O modelo estruturado pode usar TITULO:, OBJETIVO:, DESCRICAO:, RESUMO_CARD: e CONTEUDO:."],
        ["segurança","Não use fórmulas. O sistema valida o arquivo inteiro antes de permitir a gravação."],
    ]
    for row in guide_rows:guide.append(row)
    _style_template(guide,{"A":26,"B":95})
    ref=wb.create_sheet("DISCIPLINAS_ATUAIS");ref.append(["id","sigla","nome","status"])
    for item in Discipline.objects.all().order_by("name").values("id","short_name","name","status")[:5000]:ref.append([item["id"],item["short_name"],item["name"],item["status"]])
    _style_template(ref,{"A":12,"B":20,"C":48,"D":18})
    out=BytesIO();wb.save(out);return out.getvalue()
