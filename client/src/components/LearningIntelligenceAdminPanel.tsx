import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, FileSearch, Gauge, RefreshCw, Save, ShieldCheck, SlidersHorizontal, Target, TriangleAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";

type LearningSettingsForm = {
  enabled: boolean;
  radarEnabled: boolean;
  errorCoachEnabled: boolean;
  domainProofEnabled: boolean;
  masteryMapEnabled: boolean;
  realExamEnabled: boolean;
  telemetryEnabled: boolean;
  diagnosticMinAnswers: number;
  domainProofQuestionCount: number;
  realExamMinQuestions: number;
  realExamQuestionCount: number;
  validatingScoreThreshold: number;
  retainedScoreThreshold: number;
  retentionMinCorrectDays: number;
  retentionMinSpanDays: number;
  retainedRecheckDays: number;
};

const defaults: LearningSettingsForm = {
  enabled: true,
  radarEnabled: true,
  errorCoachEnabled: true,
  domainProofEnabled: true,
  masteryMapEnabled: true,
  realExamEnabled: true,
  telemetryEnabled: true,
  diagnosticMinAnswers: 5,
  domainProofQuestionCount: 10,
  realExamMinQuestions: 10,
  realExamQuestionCount: 60,
  validatingScoreThreshold: 60,
  retainedScoreThreshold: 80,
  retentionMinCorrectDays: 2,
  retentionMinSpanDays: 2,
  retainedRecheckDays: 14,
};

const featureCards: Array<{ key: keyof Pick<LearningSettingsForm,"radarEnabled"|"errorCoachEnabled"|"domainProofEnabled"|"masteryMapEnabled"|"realExamEnabled"|"telemetryEnabled">; title: string; detail: string; icon: typeof FileSearch }> = [
  { key:"radarEnabled", title:"Radar de Edital Vivo", detail:"Versiona o conteúdo liberado e mostra alterações detectadas no curso.", icon:FileSearch },
  { key:"errorCoachEnabled", title:"Treinador de Erros", detail:"Analisa lacunas, confiança, interpretação, tempo e recaídas.", icon:BrainCircuit },
  { key:"domainProofEnabled", title:"Prova de Domínio", detail:"Permite validar retenção com blocos focais e evidência espaçada.", icon:Target },
  { key:"masteryMapEnabled", title:"Mapa de Domínio", detail:"Exibe o estado de cada disciplina e tópico para o aluno.", icon:ShieldCheck },
  { key:"realExamEnabled", title:"Modo Prova Real", detail:"Libera prova sem feedback imediato, com regras próprias por curso.", icon:Gauge },
  { key:"telemetryEnabled", title:"Telemetria detalhada", detail:"Registra ritmo por item, trocas, confiança e queda entre metades.", icon:SlidersHorizontal },
];

function NumberField({ label, detail, value, min, max, onChange }: { label: string; detail: string; value: number; min: number; max: number; onChange: (value:number)=>void }) {
  return <label className="block rounded-xl border border-[#dce6e2] bg-white p-3">
    <span className="text-[10px] font-black uppercase tracking-[.1em] text-[#49676d]">{label}</span>
    <input type="number" min={min} max={max} value={value} onChange={event=>onChange(Number(event.target.value))} className="mt-2 h-10 w-full rounded-lg border border-[#cfc7ba] bg-[#fffdf8] px-3 text-sm font-bold text-[#173d4a] outline-none focus:border-[#0e5a70] focus:ring-2 focus:ring-[#8ad2c3]/45" />
    <span className="mt-2 block text-[10px] leading-4 text-[#748487]">{detail} · permitido: {min}–{max}</span>
  </label>;
}

export function LearningIntelligenceAdminPanel() {
  const utils=trpc.useUtils() as any;
  const coursesQuery=trpc.admin.courses.useQuery(undefined,{refetchOnWindowFocus:false});
  const courses=(coursesQuery.data??[]).filter((course:any)=>course.courseType==="concurso");
  const [courseId,setCourseId]=useState("");
  const [form,setForm]=useState<LearningSettingsForm>(defaults);
  const [message,setMessage]=useState<string|null>(null);
  const [messageKind,setMessageKind]=useState<"success"|"error">("success");

  useEffect(()=>{if(!courseId&&courses.length)setCourseId(courses[0].id);},[courseId,courses]);
  const settingsQuery=(trpc.admin as any).learningIntelligence.getSettings.useQuery({courseId},{enabled:Boolean(courseId),refetchOnWindowFocus:false});
  useEffect(()=>{
    if(!settingsQuery.data)return;
    setForm(Object.fromEntries(Object.entries(defaults).map(([key,fallback])=>[key,settingsQuery.data[key]??fallback])) as LearningSettingsForm);
    setMessage(null);
  },[settingsQuery.data]);

  const update=<K extends keyof LearningSettingsForm>(key:K,value:LearningSettingsForm[K])=>setForm(current=>({...current,[key]:value}));
  const validation=useMemo(()=>{
    if(form.retainedScoreThreshold<=form.validatingScoreThreshold)return "O limite de domínio retido precisa ser maior que o limite de validação.";
    if(form.realExamQuestionCount<form.realExamMinQuestions)return "A quantidade-alvo da Prova Real não pode ser menor que o mínimo.";
    return null;
  },[form]);
  const save=(trpc.admin as any).learningIntelligence.saveSettings.useMutation({
    onSuccess:async()=>{setMessageKind("success");setMessage("Configurações aplicadas ao curso. A experiência dos alunos será atualizada na próxima leitura.");await Promise.all([utils.admin.learningIntelligence.getSettings.invalidate(),utils.study.learningFeatures.invalidate(),utils.study.learningIntelligence.invalidate()]);},
    onError:(error:any)=>{setMessageKind("error");setMessage(error.message);},
  });
  const submit=(event:React.FormEvent)=>{event.preventDefault();if(!courseId||validation)return;setMessage(null);save.mutate({courseId,...form});};
  const restoreDefaults=()=>{setForm(defaults);setMessageKind("success");setMessage("Valores recomendados carregados. Clique em salvar para aplicá-los.");};
  const activeCourse=courses.find((course:any)=>course.id===courseId);

  return <section className="h-full overflow-y-auto bg-[#f5f1e8] p-4 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-5xl">
      <header className="rounded-2xl border border-[#274a54] bg-[#183542] p-5 text-white shadow-[0_20px_48px_-34px_rgba(9,47,61,.9)] sm:p-7">
        <div className="flex items-center gap-2 text-[#9be0d2]"><BrainCircuit className="h-4 w-4"/><p className="text-[10px] font-bold tracking-[.2em]">ROOT / INTELIGÊNCIA DE ESTUDO</p></div>
        <h3 className="font-display mt-3 text-2xl font-bold">Controle os novos recursos por curso</h3>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#d3e6e1]">Ative ou pause Radar, Treinador de Erros, Prova de Domínio, Mapa de Domínio e Prova Real. As regras são aplicadas no servidor, portanto chamadas diretas também respeitam estas configurações.</p>
      </header>

      <form onSubmit={submit} className="mt-5 space-y-5">
        <section className="rounded-2xl border border-[#d4dfdb] bg-[#fffdf8] p-5 shadow-[0_12px_28px_rgba(22,61,74,.06)] sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <label><span className="mb-2 block text-xs font-bold tracking-wide text-[#315a5d]">CURSO CONFIGURADO</span><select value={courseId} onChange={event=>setCourseId(event.target.value)} className="h-11 w-full rounded-xl border border-[#cfc7ba] bg-white px-3 text-sm font-semibold text-[#173d4a] outline-none focus:border-[#0e5a70] focus:ring-2 focus:ring-[#8ad2c3]/45"><option value="">Selecione um concurso</option>{courses.map((course:any)=><option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
            <button type="button" onClick={()=>void settingsQuery.refetch()} disabled={!courseId||settingsQuery.isFetching} className="ghost-button min-h-11"><RefreshCw className={"h-4 w-4 "+(settingsQuery.isFetching?"animate-spin":"")}/>Recarregar</button>
          </div>
          {activeCourse&&<p className="mt-3 text-xs leading-5 text-[#687f7e]">Configuração independente para <strong>{activeCourse.title}</strong>. Alterações não afetam outros concursos.</p>}
        </section>

        <section className={"rounded-2xl border p-5 sm:p-6 "+(form.enabled?"border-[#b7d7cd] bg-[#f1f9f6]":"border-[#e3c4b7] bg-[#fff6f1]")}>
          <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={form.enabled} onChange={event=>update("enabled",event.target.checked)} className="mt-1 h-5 w-5 accent-[#0e5a70]"/><span><strong className="font-display block text-lg text-[#24434d]">Central de Inteligência disponível aos alunos</strong><span className="mt-1 block text-sm leading-6 text-[#61777a]">Ao desativar, a aba Inteligência desaparece e Prova de Domínio/Prova Real ficam bloqueadas no backend. Histórico já coletado é preservado.</span></span></label>
        </section>

        <section className="rounded-2xl border border-[#d4dfdb] bg-[#fffdf8] p-5 shadow-[0_12px_28px_rgba(22,61,74,.06)] sm:p-6">
          <div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#315a5d]">RECURSOS DISPONÍVEIS</p><p className="mt-1 text-xs leading-5 text-[#687f7e]">Desative módulos individualmente sem apagar resultados ou versões já existentes.</p></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{featureCards.map(({key,title,detail,icon:Icon})=>{
            const disabled=!form.enabled||(key==="telemetryEnabled"&&!form.realExamEnabled);
            return <label key={key} className={"flex min-h-32 cursor-pointer flex-col rounded-2xl border p-4 transition "+(form[key]&&!disabled?"border-[#9bcfc2] bg-[#eff8f5]":"border-[#dfe6e3] bg-white")+(disabled?" opacity-55":"")}>
              <span className="flex items-start justify-between gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e4f1ed] text-[#0e5a70]"><Icon className="h-4 w-4"/></span><input type="checkbox" checked={Boolean(form[key])} disabled={disabled} onChange={event=>update(key,event.target.checked as never)} className="h-4 w-4 accent-[#0e5a70]"/></span>
              <strong className="mt-3 text-sm text-[#294a53]">{title}</strong><span className="mt-1 text-[11px] leading-5 text-[#718184]">{detail}</span>
            </label>;
          })}</div>
        </section>

        <details className="rounded-2xl border border-[#d4dfdb] bg-[#fffdf8] p-5 shadow-[0_12px_28px_rgba(22,61,74,.06)] sm:p-6">
          <summary className="cursor-pointer list-none"><div className="flex items-start gap-3"><SlidersHorizontal className="mt-0.5 h-5 w-5 text-[#0e5a70]"/><div><h4 className="font-display text-lg font-bold text-[#24434d]">Critérios avançados</h4><p className="mt-1 text-xs leading-5 text-[#687f7e]">Ajuste apenas quando houver um motivo pedagógico. Os valores recomendados funcionam como ponto de partida seguro.</p></div></div></summary>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <NumberField label="Amostra mínima do treinador" detail="Respostas antes de apontar um padrão dominante" value={form.diagnosticMinAnswers} min={3} max={50} onChange={value=>update("diagnosticMinAnswers",value)}/>
            <NumberField label="Questões na Prova de Domínio" detail="Máximo usado em cada validação focal" value={form.domainProofQuestionCount} min={3} max={20} onChange={value=>update("domainProofQuestionCount",value)}/>
            <NumberField label="Mínimo da Prova Real" detail="Banco mínimo necessário para liberar o modo" value={form.realExamMinQuestions} min={5} max={100} onChange={value=>update("realExamMinQuestions",value)}/>
            <NumberField label="Questões da Prova Real" detail="Quantidade-alvo/máxima por execução" value={form.realExamQuestionCount} min={10} max={200} onChange={value=>update("realExamQuestionCount",value)}/>
            <NumberField label="Entrada em validação" detail="Score mínimo para sair de aprendizagem" value={form.validatingScoreThreshold} min={40} max={90} onChange={value=>update("validatingScoreThreshold",value)}/>
            <NumberField label="Domínio retido" detail="Score mínimo, além da evidência espaçada" value={form.retainedScoreThreshold} min={60} max={100} onChange={value=>update("retainedScoreThreshold",value)}/>
            <NumberField label="Dias diferentes com acerto" detail="Mínimo de dias distintos para retenção" value={form.retentionMinCorrectDays} min={2} max={7} onChange={value=>update("retentionMinCorrectDays",value)}/>
            <NumberField label="Espaçamento mínimo" detail="Dias entre a primeira e última evidência" value={form.retentionMinSpanDays} min={1} max={30} onChange={value=>update("retentionMinSpanDays",value)}/>
            <NumberField label="Revalidar domínio após" detail="Dias até um tópico retido voltar para prova" value={form.retainedRecheckDays} min={3} max={60} onChange={value=>update("retainedRecheckDays",value)}/>
          </div>
          <button type="button" onClick={restoreDefaults} className="ghost-button mt-4">Restaurar valores recomendados</button>
        </details>

        <section className="rounded-2xl border border-[#c9dfd8] bg-[#f4faf8] p-5 sm:p-6">
          <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-[#17644e]"/><div><h4 className="text-sm font-bold text-[#315a5d]">Resumo do impacto para o aluno</h4><div className="mt-3 grid gap-2 text-xs leading-5 text-[#597674] sm:grid-cols-2"><p><strong>Aba Inteligência:</strong> {form.enabled?"visível":"oculta"}</p><p><strong>Prova de Domínio:</strong> {form.enabled&&form.domainProofEnabled?form.domainProofQuestionCount+" questões por validação":"desativada"}</p><p><strong>Prova Real:</strong> {form.enabled&&form.realExamEnabled?`mín. ${form.realExamMinQuestions} · alvo ${form.realExamQuestionCount}`:"desativada"}</p><p><strong>Domínio retido:</strong> {form.retainedScoreThreshold}% + {form.retentionMinCorrectDays} dias de acerto</p></div></div></div>
        </section>

        {validation&&<p role="alert" className="flex items-start gap-2 rounded-xl border border-[#e2bdad] bg-[#fff5f0] p-3 text-sm text-[#91462f]"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0"/>{validation}</p>}
        {message&&<p role="status" className={"rounded-xl border p-3 text-sm "+(messageKind==="error"?"border-[#e0b6a8] bg-[#fff2ed] text-[#97452d]":"border-[#b9d6cb] bg-[#edf8f4] text-[#17644e]")}>{message}</p>}

        <div className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-2xl border border-[#c9d9d4] bg-[#fffdf8]/95 p-4 shadow-[0_-10px_30px_-22px_rgba(16,47,58,.45)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#687f7e]">Última atualização: {settingsQuery.data?.updatedAt?new Date(settingsQuery.data.updatedAt).toLocaleString("pt-BR"):"ainda não configurado"}.</p>
          <button type="submit" disabled={!courseId||Boolean(validation)||save.isPending||settingsQuery.isLoading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0e5a70] px-5 text-sm font-bold text-white transition hover:bg-[#09495b] disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4"/>{save.isPending?"Salvando...":"Salvar configurações"}</button>
        </div>
      </form>
    </div>
  </section>;
}
