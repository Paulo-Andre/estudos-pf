import { Brain, FileSearch, Gauge, RefreshCw, ShieldCheck, Target, TimerReset, TriangleAlert } from "lucide-react";

export type IntelligenceTopic = {
  key: string;
  disciplineId: number;
  discipline: string;
  contentId: number;
  subject: string;
  updatedAt: string;
  score: number;
  state: "new" | "learning" | "validating" | "retained";
  completed: boolean;
  accuracy: number;
  answerCount: number;
  correctDays: number;
  questionCount: number;
  proofReady: boolean;
  proofDue: boolean;
  nextProofAt: string;
};

export type LearningIntelligence = {
  courseId: string;
  radar: {
    version: number;
    fingerprint: string;
    capturedAt: string;
    totalTopics: number;
    coveredTopics: number;
    coveragePercent: number;
    message: string;
    changes: {
      baseline?: boolean;
      changedCount?: number;
      addedCount?: number;
      removedCount?: number;
      updatedCount?: number;
      added?: IntelligenceTopic[];
      removed?: IntelligenceTopic[];
      updated?: IntelligenceTopic[];
    };
  };
  errorCoach: {
    sample: number;
    wrong: number;
    primaryPattern: { id: string; label: string; count: number; share: number; action: string } | null;
    patterns: { id: string; label: string; count: number; share: number; action: string }[];
    hotspots: { discipline: string; subject: string; errors: number }[];
  };
  mastery: {
    score: number;
    retainedTopics: number;
    totalTopics: number;
    proofCandidates: IntelligenceTopic[];
    disciplines: { discipline: string; score: number; retained: number; total: number; topics: IntelligenceTopic[] }[];
  };
  telemetry: {
    examCount: number;
    averagePerformanceDrop: number | null;
    lastExam: {
      id: string;
      date: string;
      score: number;
      elapsedSeconds: number;
      summary: {
        averageSeconds?: number;
        answerChanges?: number;
        highConfidenceErrors?: number;
        firstHalfAccuracy?: number;
        secondHalfAccuracy?: number;
        performanceDrop?: number;
        slowestQuestion?: { questionId: string; seconds: number; subject: string };
      };
    } | null;
  };
};

const stateLabel: Record<IntelligenceTopic["state"], string> = {
  new: "Não iniciado",
  learning: "Em aprendizagem",
  validating: "Validando",
  retained: "Retido",
};

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-[#dbe5e1] bg-white/90 p-4">
    <p className="text-[9px] font-black uppercase tracking-[.14em] text-[#718184]">{label}</p>
    <p className="font-display mt-1 text-2xl font-extrabold text-[#173d49]">{value}</p>
    <p className="mt-1 text-[11px] leading-4 text-[#758589]">{detail}</p>
  </div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-[#d4dfdb] bg-[#fafcfb] p-4 text-sm text-[#748487]">{text}</div>;
}

export function IntelligenceArea({
  data,
  loading,
  onRefresh,
  onStartDomainProof,
  onStartRealExam,
}: {
  data: LearningIntelligence | null;
  loading: boolean;
  onRefresh: () => void;
  onStartDomainProof: (topic: IntelligenceTopic) => void;
  onStartRealExam: () => void;
}) {
  if (loading && !data) return <div className="grid min-h-64 place-items-center rounded-2xl border border-[#dbe5e1] bg-white"><div className="text-center"><RefreshCw className="mx-auto h-5 w-5 animate-spin text-[#0e5a70]"/><p className="mt-2 text-sm font-semibold text-[#64777a]">Montando seu mapa de inteligência...</p></div></div>;
  if (!data) return <Empty text="Ainda não foi possível montar a inteligência deste curso."/>;

  const radar=data.radar;
  const primary=data.errorCoach.primaryPattern;
  const lastExam=data.telemetry.lastExam;
  const changeRows=[
    {label:"Novos",value:radar.changes.addedCount??0},
    {label:"Atualizados",value:radar.changes.updatedCount??0},
    {label:"Removidos",value:radar.changes.removedCount??0},
  ];

  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-[1.7rem] border border-[#174d5d] bg-[#153d49] p-5 text-white shadow-[0_28px_70px_-48px_rgba(9,47,61,.85)] sm:p-8">
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#8ad2c3]/10 blur-2xl"/>
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#9fe0d2]">INTELIGÊNCIA DE PREPARAÇÃO</p><h2 className="font-display mt-2 text-3xl font-extrabold tracking-[-.025em] sm:text-4xl">Seu edital virou um sistema de decisão.</h2><p className="mt-3 text-sm leading-6 text-[#d5e6e2]">O Radar detecta mudanças, o Treinador identifica padrões de erro e a Prova de Domínio só libera retenção quando há evidência em momentos diferentes.</p></div>
        <button type="button" onClick={onRefresh} className="ghost-button shrink-0 border-white/25 bg-white/10 text-white hover:bg-white/15"><RefreshCw className="h-4 w-4"/>Atualizar leitura</button>
      </div>
      <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Cobertura do edital" value={`${radar.coveragePercent}%`} detail={`${radar.coveredTopics}/${radar.totalTopics} tópicos concluídos`}/>
        <Metric label="Domínio consolidado" value={`${data.mastery.score}%`} detail={`${data.mastery.retainedTopics}/${data.mastery.totalTopics} tópicos retidos`}/>
        <Metric label="Versão monitorada" value={`v${radar.version}`} detail={radar.changes.baseline?"linha de base criada":`${radar.changes.changedCount??0} mudança(s) detectada(s)`}/>
        <Metric label="Provas reais" value={String(data.telemetry.examCount)} detail={lastExam?`última: ${lastExam.score}%`:"telemetria ainda sem amostra"}/>
      </div>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
      <article className="shell-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">RADAR DE EDITAL VIVO · V{radar.version}</p><h3 className="font-display mt-1 text-xl font-extrabold text-[#24434d]">Mudanças que alteram sua preparação</h3><p className="mt-2 text-sm leading-6 text-[#64777a]">{radar.message}</p></div><FileSearch className="h-6 w-6 shrink-0 text-[#0e5a70]"/></div>
        <div className="mt-5 grid grid-cols-3 gap-2">{changeRows.map(item=><div key={item.label} className="rounded-xl border border-[#dfe8e5] bg-[#f8fbfa] p-3 text-center"><p className="font-display text-xl font-extrabold text-[#173d49]">{item.value}</p><p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#758589]">{item.label}</p></div>)}</div>
        {!radar.changes.baseline && (radar.changes.changedCount??0)>0 ? <div className="mt-5 space-y-2">
          {[...(radar.changes.added??[]).map(item=>({...item,kind:"Novo"})),...(radar.changes.updated??[]).map(item=>({...item,kind:"Atualizado"})),...(radar.changes.removed??[]).map(item=>({...item,kind:"Removido"}))].slice(0,6).map((item,index)=><div key={`${item.key}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-[#e4ebe8] bg-white p-3"><div className="min-w-0"><p className="truncate text-xs font-extrabold text-[#294a53]">{item.subject}</p><p className="mt-1 truncate text-[10px] text-[#758589]">{item.discipline}</p></div><span className="rounded-full bg-[#edf5f2] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-[#0e5a70]">{item.kind}</span></div>)}
        </div> : <div className="mt-5"><Empty text={radar.changes.baseline?"Esta é a primeira fotografia. A próxima alteração de conteúdo publicado gera automaticamente uma nova versão e o comparativo.":"Nenhuma mudança estrutural desde a versão anterior."}/></div>}
      </article>

      <article className="shell-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">TREINADOR DE ERROS</p><h3 className="font-display mt-1 text-xl font-extrabold text-[#24434d]">{primary?.label??"Coletando padrão"}</h3></div><Brain className="h-6 w-6 shrink-0 text-[#0e5a70]"/></div>
        {primary ? <><p className="mt-3 text-sm leading-6 text-[#64777a]">{primary.action}</p><div className="mt-4 rounded-xl border border-[#d8e5e0] bg-[#f5faf8] p-4"><div className="flex items-center justify-between"><span className="text-xs font-bold text-[#33545d]">Sinal dominante</span><span className="font-display text-xl font-extrabold text-[#0e5a70]">{primary.share}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#dfe9e5]"><div className="h-full rounded-full bg-[#0e5a70]" style={{width:`${primary.share}%`}}/></div></div>
          <div className="mt-4 space-y-2">{data.errorCoach.patterns.slice(0,4).map(pattern=><div key={pattern.id} className="flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-[#49636a]">{pattern.label}</span><span className="font-bold text-[#0e5a70]">{pattern.count} evidência(s)</span></div>)}</div>
        </> : <div className="mt-4"><Empty text="Resolva mais questões e registre sua confiança. O sistema precisa de erros reais para separar lacuna de conteúdo, falsa confiança, interpretação, tempo e esquecimento."/></div>}
        {!!data.errorCoach.hotspots.length&&<div className="mt-5 border-t border-[#e3eae7] pt-4"><p className="text-[9px] font-black uppercase tracking-[.12em] text-[#78888b]">Tópicos com mais retorno necessário</p><div className="mt-2 space-y-2">{data.errorCoach.hotspots.slice(0,3).map(item=><div key={`${item.discipline}-${item.subject}`} className="flex items-center justify-between gap-3 rounded-lg bg-[#fafcfb] px-3 py-2 text-xs"><span className="truncate text-[#536d73]">{item.discipline} · {item.subject}</span><span className="shrink-0 font-bold text-[#a06432]">{item.errors} erro(s)</span></div>)}</div></div>}
      </article>
    </section>

    <section className="shell-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="eyebrow">PROVA DE DOMÍNIO</p><h3 className="font-display mt-1 text-2xl font-extrabold text-[#24434d]">Prove que aprendeu sem repetir por memória curta.</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-[#64777a]">O sistema exige prática suficiente e recuperação em dias diferentes. Acertar uma questão uma vez não transforma o tópico em “dominado”.</p></div><Target className="h-7 w-7 text-[#0e5a70]"/></div>
      {data.mastery.proofCandidates.length ? <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.mastery.proofCandidates.map(topic=><article key={topic.key} className="rounded-2xl border border-[#d9e5e1] bg-[#fafcfb] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.1em] text-[#8a6732]">{topic.proofDue?"PROVA VENCIDA":"PRONTO PARA VALIDAR"}</p><h4 className="mt-1 text-sm font-extrabold text-[#294a53]">{topic.subject}</h4><p className="mt-1 text-[11px] text-[#758589]">{topic.discipline}</p></div><span className="font-display text-xl font-extrabold text-[#0e5a70]">{topic.score}%</span></div><div className="mt-3 flex gap-2 text-[9px] font-bold text-[#728285]"><span>{topic.answerCount} resposta(s)</span><span>·</span><span>{topic.correctDays} dia(s) de acerto</span></div><button type="button" onClick={()=>onStartDomainProof(topic)} className="action-button mt-4 w-full justify-center">Iniciar Prova de Domínio</button></article>)}</div> : <div className="mt-5"><Empty text="Nenhum tópico está pronto para uma prova de domínio agora. Continue o ciclo de conteúdo, questões e revisão espaçada."/></div>}
    </section>

    <section className="shell-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">MAPA DE DOMÍNIO DO EDITAL</p><h3 className="font-display mt-1 text-2xl font-extrabold text-[#24434d]">O que foi visto, o que está validando e o que está realmente retido.</h3></div><ShieldCheck className="h-7 w-7 shrink-0 text-[#0e5a70]"/></div>
      <div className="mt-5 space-y-4">{data.mastery.disciplines.map(group=><details key={group.discipline} className="group rounded-2xl border border-[#dce6e2] bg-[#fbfdfc]" open={group.score<80}><summary className="cursor-pointer list-none p-4"><div className="flex items-center gap-4"><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><h4 className="truncate text-sm font-extrabold text-[#294a53]">{group.discipline}</h4><span className="font-display text-lg font-extrabold text-[#0e5a70]">{group.score}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e3ece8]"><div className="h-full rounded-full bg-[#0e5a70]" style={{width:`${group.score}%`}}/></div><p className="mt-2 text-[10px] text-[#78888b]">{group.retained}/{group.total} tópico(s) com retenção comprovada</p></div></div></summary><div className="border-t border-[#e3eae7] p-4"><div className="grid gap-2 md:grid-cols-2">{group.topics.map(topic=><div key={topic.key} className="rounded-xl border border-[#e2eae7] bg-white p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-bold text-[#36565e]">{topic.subject}</p><p className="mt-1 text-[9px] font-black uppercase tracking-wider text-[#829094]">{stateLabel[topic.state]}</p></div><span className="shrink-0 text-sm font-extrabold text-[#0e5a70]">{topic.score}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e6eeeb]"><div className="h-full rounded-full bg-[#0e5a70]" style={{width:`${topic.score}%`}}/></div></div>)}</div></div></details>)}</div>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1fr_auto]">
      <article className="rounded-2xl border border-[#d8e3df] bg-[#f7faf9] p-5 sm:p-6"><div className="flex items-start gap-3"><TimerReset className="mt-0.5 h-6 w-6 shrink-0 text-[#0e5a70]"/><div><p className="eyebrow">MODO PROVA REAL · TELEMETRIA</p><h3 className="font-display mt-1 text-xl font-extrabold text-[#24434d]">Meça execução, não apenas acertos.</h3><p className="mt-2 text-sm leading-6 text-[#64777a]">Sem feedback durante os itens. O sistema mede tempo por questão, trocas antes da confirmação, confiança e diferença de desempenho entre a primeira e a segunda metade.</p></div></div>
        {lastExam ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Tempo médio/item" value={lastExam.summary.averageSeconds!=null?`${lastExam.summary.averageSeconds}s`:"—"} detail="ritmo da última prova"/><Metric label="Trocas de resposta" value={String(lastExam.summary.answerChanges??0)} detail="antes da confirmação"/><Metric label="Erros com confiança alta" value={String(lastExam.summary.highConfidenceErrors??0)} detail="sinal de falsa segurança"/><Metric label="Queda 1ª → 2ª metade" value={lastExam.summary.performanceDrop!=null?`${lastExam.summary.performanceDrop>0?"+":""}${lastExam.summary.performanceDrop} p.p.`:"—"} detail={data.telemetry.averagePerformanceDrop!=null?`média recente: ${data.telemetry.averagePerformanceDrop} p.p.`:"fadiga ainda sem série"}/></div> : <div className="mt-5"><Empty text="Faça a primeira Prova Real para criar sua linha de base de ritmo, confiança e resistência."/></div>}
      </article>
      <button type="button" onClick={onStartRealExam} className="action-button min-h-14 self-stretch px-6 xl:min-w-52 xl:self-center"><Gauge className="h-5 w-5"/>Iniciar Prova Real</button>
    </section>

    <section className="rounded-xl border border-[#ead8ae] bg-[#fff9ea] p-4 text-xs leading-5 text-[#755d2d]"><div className="flex items-start gap-2"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0"/><p><strong>Como interpretar:</strong> o mapa mede evidência dentro da plataforma. Ele não garante aprovação e não substitui leitura do edital oficial; serve para orientar onde investir seu próximo bloco de estudo.</p></div></section>
  </div>;
}
