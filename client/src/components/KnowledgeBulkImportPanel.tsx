import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, FileText, UploadCloud } from "lucide-react";
import { trpc } from "@/lib/trpc";

type Discipline = { id: number; name: string; shortName: string; status: string };
type ImportPreview = {
  kind: "questions" | "contents";
  format?: "xlsx" | "pdf";
  fileName: string;
  dryRun: boolean;
  validRows: number;
  skippedRows: number;
  invalidRows: number;
  preview: Array<{ row: number; status: "valid" | "invalid" | "skip"; label: string; errors: string[]; warnings: string[] }>;
  pdf?: { pages: number; characters: number; textPreview?: string };
  createdIds?: number[];
};

function PreviewBox({ preview }: { preview: ImportPreview | null }) {
  if (!preview) return null;
  return <section className="mt-4 rounded-2xl border border-[#d4dfdb] bg-[#fbfdfc] p-4">
    <div className="grid gap-2 sm:grid-cols-3">
      <div className="rounded-xl bg-[#edf8f4] p-3"><p className="text-[9px] font-black uppercase tracking-wider text-[#4f7770]">Válidas</p><p className="font-display mt-1 text-xl font-extrabold text-[#17644e]">{preview.validRows}</p></div>
      <div className="rounded-xl bg-[#fff9ea] p-3"><p className="text-[9px] font-black uppercase tracking-wider text-[#82672d]">Ignoradas</p><p className="font-display mt-1 text-xl font-extrabold text-[#8a6732]">{preview.skippedRows}</p></div>
      <div className="rounded-xl bg-[#fff1ed] p-3"><p className="text-[9px] font-black uppercase tracking-wider text-[#8f5440]">Inválidas</p><p className="font-display mt-1 text-xl font-extrabold text-[#a14f35]">{preview.invalidRows}</p></div>
    </div>
    {preview.pdf&&<div className="mt-3 rounded-xl border border-[#dbe5e1] bg-white p-3"><p className="text-[10px] font-bold text-[#49676d]">{preview.pdf.pages} página(s) · {preview.pdf.characters.toLocaleString("pt-BR")} caracteres extraídos</p>{preview.pdf.textPreview&&<p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-[11px] leading-5 text-[#66797d]">{preview.pdf.textPreview}</p>}</div>}
    <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">{preview.preview.map(item=><article key={item.row} className={"rounded-xl border p-3 "+(item.status==="valid"?"border-[#cbe2d9] bg-white":item.status==="skip"?"border-[#ead9ad] bg-[#fffaf0]":"border-[#e2bbb0] bg-[#fff5f1]")}>
      <div className="flex items-start justify-between gap-3"><p className="line-clamp-2 text-xs font-bold text-[#294a53]">Linha {item.row} · {item.label || "Sem título"}</p><span className="shrink-0 text-[9px] font-black uppercase tracking-wider">{item.status==="valid"?"OK":item.status==="skip"?"IGNORAR":"CORRIGIR"}</span></div>
      {item.errors.map(error=><p key={error} className="mt-1 text-[10px] leading-4 text-[#9a4933]">{error}</p>)}
      {item.warnings.map(warning=><p key={warning} className="mt-1 text-[10px] leading-4 text-[#80662d]">{warning}</p>)}
    </article>)}</div>
  </section>;
}

export function KnowledgeBulkImportPanel({ disciplines, onImported }: { disciplines: Discipline[]; onImported: () => Promise<void> | void }) {
  const [questionFile,setQuestionFile]=useState<File|null>(null);
  const [questionPreview,setQuestionPreview]=useState<ImportPreview|null>(null);
  const [contentFile,setContentFile]=useState<File|null>(null);
  const [contentPreview,setContentPreview]=useState<ImportPreview|null>(null);
  const [message,setMessage]=useState<string|null>(null);
  const [pdfMeta,setPdfMeta]=useState({title:"",objective:"",description:"",cardText:"",coverImageUrl:"",videoUrl:"",videoLabel:"",materialUrl:"",materialLabel:"",noticeKind:"",status:"draft",requiresReview:false,disciplineIds:[] as number[]});
  const questionImport=(trpc.admin as any).questions.importXlsx.useMutation();
  const contentImport=(trpc.admin as any).contents.importFile.useMutation();
  const contentIsPdf=contentFile?.name.toLowerCase().endsWith(".pdf")===true;
  const canConfirmQuestion=Boolean(questionPreview&&questionPreview.invalidRows===0&&questionPreview.validRows>0);
  const canConfirmContent=Boolean(contentPreview&&contentPreview.invalidRows===0&&contentPreview.validRows>0);
  const pending=questionImport.isPending||contentImport.isPending;
  const publishedDisciplines=useMemo(()=>disciplines.filter(item=>item.status!=="inactive"),[disciplines]);

  const validateQuestions=async()=>{
    if(!questionFile)return;
    setMessage(null);
    try{setQuestionPreview(await questionImport.mutateAsync({file:questionFile,dryRun:true}) as ImportPreview);}
    catch(error:any){setMessage(error.message);setQuestionPreview(null);}
  };
  const confirmQuestions=async()=>{
    if(!questionFile||!canConfirmQuestion)return;
    setMessage(null);
    try{const result=await questionImport.mutateAsync({file:questionFile,dryRun:false}) as ImportPreview;setQuestionPreview(result);setMessage(`${result.createdIds?.length??0} questão(ões) importada(s) com sucesso.`);await onImported();}
    catch(error:any){setMessage(error.message);}
  };
  const validateContent=async()=>{
    if(!contentFile)return;
    setMessage(null);
    try{setContentPreview(await contentImport.mutateAsync({file:contentFile,dryRun:true,...pdfMeta}) as ImportPreview);}
    catch(error:any){setMessage(error.message);setContentPreview(null);}
  };
  const confirmContent=async()=>{
    if(!contentFile||!canConfirmContent)return;
    setMessage(null);
    try{const result=await contentImport.mutateAsync({file:contentFile,dryRun:false,...pdfMeta}) as ImportPreview;setContentPreview(result);setMessage(`${result.createdIds?.length??0} conteúdo(s) importado(s) com sucesso.`);await onImported();}
    catch(error:any){setMessage(error.message);}
  };
  const toggleDiscipline=(id:number)=>setPdfMeta(current=>({...current,disciplineIds:current.disciplineIds.includes(id)?current.disciplineIds.filter(item=>item!==id):[...current.disciplineIds,id]}));

  return <div className="mt-5 space-y-5">
    <section className="rounded-2xl border border-[#bcd8d0] bg-[#f5fbf8] p-4 sm:p-5">
      <div className="flex items-start gap-3"><UploadCloud className="mt-0.5 h-6 w-6 text-[#0e5a70]"/><div><p className="eyebrow">IMPORTAÇÃO EM MASSA</p><h4 className="font-display mt-1 text-lg font-bold text-[#173d4a]">Valide primeiro, grave depois</h4><p className="mt-2 max-w-3xl text-xs leading-5 text-[#567471]">O ROOT envia o arquivo, recebe uma prévia com erros e duplicidades e só então confirma. Linhas inválidas bloqueiam a gravação para evitar banco inconsistente.</p></div></div>
    </section>

    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-[#d4dfdb] bg-white p-5">
        <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">QUESTÕES · XLSX</p><h4 className="font-display mt-1 text-lg font-bold text-[#173d4a]">Importar banco de questões</h4><p className="mt-2 text-xs leading-5 text-[#667b7d]">Aceita até 2.000 linhas por arquivo. Certo/Errado e múltipla escolha podem estar na mesma planilha.</p></div><FileSpreadsheet className="h-6 w-6 text-[#0e5a70]"/></div>
        <a href="/api/v1/knowledge/admin/import/templates/questions/" className="ghost-button mt-4 inline-flex"><Download className="h-4 w-4"/>Baixar modelo de questões</a>
        <label className="mt-4 block rounded-xl border border-dashed border-[#a9c8c0] bg-[#f7fbfa] p-4 text-center"><input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={event=>{setQuestionFile(event.target.files?.[0]??null);setQuestionPreview(null);setMessage(null);}}/><FileSpreadsheet className="mx-auto h-6 w-6 text-[#0e5a70]"/><span className="mt-2 block text-xs font-bold text-[#315a5d]">{questionFile?.name??"Clique para escolher o XLSX"}</span><span className="mt-1 block text-[10px] text-[#75878a]">Máximo 10 MB · fórmulas não são aceitas</span></label>
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={!questionFile||pending} onClick={()=>void validateQuestions()} className="ghost-button">1. Validar arquivo</button><button type="button" disabled={!canConfirmQuestion||pending} onClick={()=>void confirmQuestions()} className="action-button">2. Confirmar importação</button></div>
        <PreviewBox preview={questionPreview}/>
      </section>

      <section className="rounded-2xl border border-[#d4dfdb] bg-white p-5">
        <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">CONTEÚDOS · XLSX OU PDF</p><h4 className="font-display mt-1 text-lg font-bold text-[#173d4a]">Importar conteúdo didático</h4><p className="mt-2 text-xs leading-5 text-[#667b7d]">XLSX cria vários conteúdos. PDF textual cria um conteúdo por arquivo e extrai o texto das páginas.</p></div><FileText className="h-6 w-6 text-[#0e5a70]"/></div>
        <a href="/api/v1/knowledge/admin/import/templates/contents/" className="ghost-button mt-4 inline-flex"><Download className="h-4 w-4"/>Baixar modelo de conteúdos</a>
        <label className="mt-4 block rounded-xl border border-dashed border-[#a9c8c0] bg-[#f7fbfa] p-4 text-center"><input type="file" accept=".xlsx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={event=>{setContentFile(event.target.files?.[0]??null);setContentPreview(null);setMessage(null);}}/><UploadCloud className="mx-auto h-6 w-6 text-[#0e5a70]"/><span className="mt-2 block text-xs font-bold text-[#315a5d]">{contentFile?.name??"Clique para escolher XLSX ou PDF"}</span><span className="mt-1 block text-[10px] text-[#75878a]">XLSX até 10 MB · PDF até 15 MB e 300 páginas</span></label>

        {contentIsPdf&&<div className="mt-4 space-y-3 rounded-xl border border-[#d8e4e0] bg-[#fbfdfc] p-4">
          <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#49676d]">Metadados do PDF</p>
          <input value={pdfMeta.title} onChange={event=>setPdfMeta({...pdfMeta,title:event.target.value})} placeholder="Título do conteúdo (opcional: usa o nome do arquivo)" className="h-10 w-full rounded-lg border border-[#cec6b8] bg-white px-3 text-xs"/>
          <input value={pdfMeta.objective} onChange={event=>setPdfMeta({...pdfMeta,objective:event.target.value})} placeholder="Objetivo da aula" className="h-10 w-full rounded-lg border border-[#cec6b8] bg-white px-3 text-xs"/>
          <textarea value={pdfMeta.description} onChange={event=>setPdfMeta({...pdfMeta,description:event.target.value})} placeholder="Descrição curta" className="min-h-20 w-full rounded-lg border border-[#cec6b8] bg-white p-3 text-xs"/>
          <textarea value={pdfMeta.cardText} onChange={event=>setPdfMeta({...pdfMeta,cardText:event.target.value})} placeholder="Texto curto do card (opcional)" className="min-h-16 w-full rounded-lg border border-[#cec6b8] bg-white p-3 text-xs"/>
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={pdfMeta.coverImageUrl} onChange={event=>setPdfMeta({...pdfMeta,coverImageUrl:event.target.value})} placeholder="https://… imagem de capa (opcional)" className="h-10 rounded-lg border border-[#cec6b8] bg-white px-3 text-xs"/>
            <select value={pdfMeta.noticeKind} onChange={event=>setPdfMeta({...pdfMeta,noticeKind:event.target.value})} className="h-10 rounded-lg border border-[#cec6b8] bg-white px-2 text-xs"><option value="">Sem aviso</option><option value="new">Conteúdo novo</option><option value="updated">Conteúdo atualizado</option></select>
            <input value={pdfMeta.videoLabel} onChange={event=>setPdfMeta({...pdfMeta,videoLabel:event.target.value})} placeholder="Nome do vídeo / botão (opcional)" className="h-10 rounded-lg border border-[#cec6b8] bg-white px-3 text-xs"/>
            <input value={pdfMeta.videoUrl} onChange={event=>setPdfMeta({...pdfMeta,videoUrl:event.target.value})} placeholder="https://… vídeo complementar (opcional)" className="h-10 rounded-lg border border-[#cec6b8] bg-white px-3 text-xs"/>
            <input value={pdfMeta.materialLabel} onChange={event=>setPdfMeta({...pdfMeta,materialLabel:event.target.value})} placeholder="Nome do PDF/material (opcional)" className="h-10 rounded-lg border border-[#cec6b8] bg-white px-3 text-xs"/>
            <input value={pdfMeta.materialUrl} onChange={event=>setPdfMeta({...pdfMeta,materialUrl:event.target.value})} placeholder="https://… PDF/material para baixar (opcional)" className="h-10 rounded-lg border border-[#cec6b8] bg-white px-3 text-xs"/>
          </div>
          <div className="grid gap-2 sm:grid-cols-2"><select value={pdfMeta.status} onChange={event=>setPdfMeta({...pdfMeta,status:event.target.value})} className="h-10 border border-[#cec6b8] bg-white px-2 text-xs"><option value="draft">Rascunho</option><option value="review">Em revisão</option><option value="approved">Aprovado</option><option value="published">Publicado</option></select><label className="flex items-center gap-2 border border-[#d6d0c5] bg-white px-3 text-[11px] font-bold"><input type="checkbox" checked={pdfMeta.requiresReview} onChange={event=>setPdfMeta({...pdfMeta,requiresReview:event.target.checked})} className="accent-[#0e5a70]"/>Exigir revisão ROOT</label></div>
          <div><p className="text-[10px] font-bold text-[#49676d]">Vincular às disciplinas</p><div className="mt-2 max-h-32 space-y-1 overflow-y-auto">{publishedDisciplines.map(item=><label key={item.id} className="flex items-center gap-2 rounded border border-[#e0e7e4] bg-white px-2 py-1.5 text-[11px]"><input type="checkbox" checked={pdfMeta.disciplineIds.includes(item.id)} onChange={()=>toggleDiscipline(item.id)} className="accent-[#0e5a70]"/><span><b>{item.shortName}</b> · {item.name}</span></label>)}</div></div>
          <p className="flex items-start gap-2 rounded-lg border border-[#ead8ae] bg-[#fff9ea] p-2 text-[10px] leading-4 text-[#755d2d]"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0"/>PDF somente imagem/escaneado não é importado automaticamente. Primeiro aplique OCR para gerar texto pesquisável.</p>
        </div>}

        <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={!contentFile||pending} onClick={()=>void validateContent()} className="ghost-button">1. Validar arquivo</button><button type="button" disabled={!canConfirmContent||pending} onClick={()=>void confirmContent()} className="action-button">2. Confirmar importação</button></div>
        <PreviewBox preview={contentPreview}/>
      </section>
    </div>

    {message&&<p role="status" className={"flex items-start gap-2 rounded-xl border p-3 text-xs font-semibold "+(message.toLowerCase().includes("sucesso")?"border-[#b7d8c9] bg-[#edf8f4] text-[#17644e]":"border-[#e0b6a8] bg-[#fff2ed] text-[#97452d]")}>{message.toLowerCase().includes("sucesso")?<CheckCircle2 className="h-4 w-4 shrink-0"/>:<AlertTriangle className="h-4 w-4 shrink-0"/>}{message}</p>}
  </div>;
}
