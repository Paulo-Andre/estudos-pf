import { useState } from "react";
import { AlertTriangle, BellRing, CheckCircle2, Loader2, Send, UsersRound, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

type AlertLevel = "improvement" | "warning" | "urgent";
type Audience = "all" | "course";

const levels: Record<AlertLevel, { label: string; description: string; className: string; icon: typeof CheckCircle2 }> = {
  improvement: { label: "Melhoria", description: "Novidades, orientações e aperfeiçoamentos.", className: "border-[#76bda3] bg-[#edf8f2] text-[#17634c]", icon: CheckCircle2 },
  warning: { label: "Aviso", description: "Informações importantes que exigem atenção.", className: "border-[#e0a34a] bg-[#fff6df] text-[#895509]", icon: AlertTriangle },
  urgent: { label: "Urgência", description: "Comunicado crítico e prioritário.", className: "border-[#e07b76] bg-[#fff0ef] text-[#9d2f2a]", icon: XCircle },
};

export function AlertAdminPanel() {
  const utils = trpc.useUtils();
  const alertsQuery = trpc.admin.alerts.list.useQuery();
  const coursesQuery = trpc.admin.courses.useQuery();
  const [level, setLevel] = useState<AlertLevel>("improvement");
  const [audience, setAudience] = useState<Audience>("all");
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [categoryLabel, setCategoryLabel] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const createAlert = trpc.admin.alerts.create.useMutation({
    onSuccess: () => { setTitle(""); setCategoryLabel(""); setMessage(""); setAudience("all"); setCourseId(""); setFeedback("Alerta enviado e disponível para o público selecionado."); void utils.admin.alerts.list.invalidate(); },
    onError: error => setFeedback(error.message),
  });
  const toggleAlert = trpc.admin.alerts.setActive.useMutation({ onSuccess: () => void utils.admin.alerts.list.invalidate() });
  const activeCourses = (coursesQuery.data ?? []).filter(course => course.isActive);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setFeedback(null);
    createAlert.mutate({ level, title, categoryLabel, message, audience, courseId: audience === "course" ? courseId : null });
  }

  return <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-2xl border border-[#c9dbd5] bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e7f3ef] text-[#0e5a70]"><BellRing className="h-5 w-5" /></div><div><p className="text-[10px] font-bold tracking-[0.18em] text-[#52716f]">COMUNICAÇÃO COM ALUNOS</p><h3 className="font-display mt-1 text-xl font-bold text-[#173d4a]">Alertas da plataforma</h3><p className="mt-1 text-sm leading-6 text-[#55716f]">Envie comunicados que aparecem no Painel do aluno. Cada aluno pode fechar somente a própria visualização.</p></div></div></header>

      <form onSubmit={submit} className="rounded-2xl border border-[#c9dbd5] bg-[#fffdf8] p-4 shadow-sm sm:p-6">
        <div className="flex items-center gap-2"><Send className="h-4 w-4 text-[#0e5a70]" /><h4 className="font-display text-base font-bold text-[#173d4a]">Novo alerta</h4></div>
        <fieldset className="mt-5"><legend className="text-xs font-bold uppercase tracking-[0.14em] text-[#52716f]">Nível do alerta</legend><div className="mt-2 grid gap-2 md:grid-cols-3">{(Object.keys(levels) as AlertLevel[]).map((key) => { const option = levels[key]; const Icon = option.icon; return <button key={key} type="button" onClick={() => setLevel(key)} className={`rounded-xl border p-3 text-left transition ${level === key ? `${option.className} ring-1 ring-current` : "border-[#d8ddd6] bg-white text-[#55716f] hover:border-[#86b7ac]"}`}><span className="flex items-center gap-2 text-sm font-bold"><Icon className="h-4 w-4" />{option.label}</span><span className="mt-1 block text-xs leading-5">{option.description}</span></button>; })}</div></fieldset>
        <label className="mt-4 block text-sm font-bold text-[#173d4a]">Rótulo de categoria <span className="font-medium text-[#6c8581]">(opcional)</span><input value={categoryLabel} onChange={event => setCategoryLabel(event.target.value)} maxLength={80} placeholder={`Padrão: ${levels[level].label}. Ex.: Novidade, Comunicado ou Atenção`} className="mt-2 h-11 w-full rounded-xl border border-[#c9dbd5] bg-white px-3 text-sm font-medium outline-none focus:border-[#0e5a70] focus:ring-2 focus:ring-[#8ad2c3]/50" /><span className="mt-1 block text-xs leading-5 font-medium text-[#6c8581]">Este texto aparecerá acima do título. Se ficar vazio, será usado o nome do nível selecionado.</span></label>
        <fieldset className="mt-5"><legend className="text-xs font-bold uppercase tracking-[0.14em] text-[#52716f]">Quem recebe</legend><div className="mt-2 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setAudience("all")} className={`rounded-xl border p-3 text-left ${audience === "all" ? "border-[#0e5a70] bg-[#edf8f4] text-[#0e5a70]" : "border-[#d8ddd6] bg-white text-[#55716f]"}`}><span className="flex items-center gap-2 text-sm font-bold"><UsersRound className="h-4 w-4" />Todos os alunos</span><span className="mt-1 block text-xs">Contas de aluno com acesso à plataforma.</span></button><button type="button" onClick={() => setAudience("course")} className={`rounded-xl border p-3 text-left ${audience === "course" ? "border-[#0e5a70] bg-[#edf8f4] text-[#0e5a70]" : "border-[#d8ddd6] bg-white text-[#55716f]"}`}><span className="flex items-center gap-2 text-sm font-bold"><BellRing className="h-4 w-4" />Um curso específico</span><span className="mt-1 block text-xs">Apenas matrículas ativas desse curso.</span></button></div></fieldset>
        {audience === "course" && <label className="mt-4 block text-sm font-bold text-[#173d4a]">Curso destinatário<select value={courseId} onChange={event => setCourseId(event.target.value)} required className="mt-2 h-11 w-full rounded-xl border border-[#c9dbd5] bg-white px-3 text-sm font-medium outline-none focus:border-[#0e5a70] focus:ring-2 focus:ring-[#8ad2c3]/50"><option value="">Selecione um curso ativo</option>{activeCourses.map(course => <option key={course.id} value={course.id}>{course.title} · {course.track}</option>)}</select></label>}
        <label className="mt-4 block text-sm font-bold text-[#173d4a]">Título do alerta<input value={title} onChange={event => setTitle(event.target.value)} required minLength={2} maxLength={180} placeholder="Ex.: Atualização no curso PF Agente" className="mt-2 h-11 w-full rounded-xl border border-[#c9dbd5] bg-white px-3 text-sm font-medium outline-none focus:border-[#0e5a70] focus:ring-2 focus:ring-[#8ad2c3]/50" /><span className="mt-1 block text-right text-xs font-medium text-[#6c8581]">{title.length}/180</span></label>
        <label className="mt-4 block text-sm font-bold text-[#173d4a]">Mensagem<textarea value={message} onChange={event => setMessage(event.target.value)} required minLength={4} maxLength={1600} placeholder="Escreva o comunicado que o aluno deverá ver." className="mt-2 min-h-28 w-full rounded-xl border border-[#c9dbd5] bg-white p-3 text-sm font-medium leading-6 outline-none focus:border-[#0e5a70] focus:ring-2 focus:ring-[#8ad2c3]/50" /><span className="mt-1 block text-right text-xs font-medium text-[#6c8581]">{message.length}/1600</span></label>
        {feedback && <p role="status" className={`mt-3 rounded-xl px-3 py-2 text-sm font-medium ${feedback.startsWith("Alerta enviado") ? "bg-[#edf8f2] text-[#17634c]" : "bg-[#fff0ef] text-[#9d2f2a]"}`}>{feedback}</p>}
        <div className="mt-4 flex justify-end"><button disabled={createAlert.isPending} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0e5a70] px-4 text-sm font-bold text-white disabled:opacity-60">{createAlert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Enviar alerta</button></div>
      </form>

      <section className="rounded-2xl border border-[#c9dbd5] bg-white p-4 shadow-sm sm:p-6"><div className="flex items-center justify-between gap-3"><h4 className="font-display text-base font-bold text-[#173d4a]">Histórico de alertas</h4><span className="rounded-full bg-[#edf3f1] px-2.5 py-1 text-xs font-bold text-[#52716f]">{alertsQuery.data?.length ?? 0}</span></div>{alertsQuery.isLoading ? <p className="py-7 text-sm text-[#55716f]">Carregando alertas…</p> : !alertsQuery.data?.length ? <p className="py-7 text-sm text-[#55716f]">Nenhum alerta foi enviado ainda.</p> : <div className="mt-4 space-y-3">{alertsQuery.data.map(alert => { const option = levels[alert.level as AlertLevel]; const Icon = option.icon; const label = alert.categoryLabel?.trim() || option.label; return <article key={alert.id} className={`rounded-xl border p-4 ${alert.isActive ? option.className : "border-[#d7ddda] bg-[#f4f6f5] text-[#657572]"}`}><div className="flex flex-col justify-between gap-3 sm:flex-row"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1 text-xs font-bold"><Icon className="h-4 w-4" />{label}</span><span className="rounded-full border border-current/25 px-2 py-0.5 text-[10px] font-bold">{alert.audience === "all" ? "Todos os alunos" : alert.courseTitle ?? "Curso"}</span>{!alert.isActive && <span className="rounded-full border border-current/25 px-2 py-0.5 text-[10px] font-bold">Encerrado</span>}</div><h5 className="mt-3 text-base font-extrabold">{alert.title}</h5><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{alert.message}</p><p className="mt-2 text-xs opacity-80">Fechado por {alert.dismissalCount} aluno(s) · {new Date(alert.createdAt).toLocaleString("pt-BR")}</p></div><button type="button" disabled={toggleAlert.isPending} onClick={() => toggleAlert.mutate({ alertId: alert.id, isActive: !alert.isActive })} className="h-10 shrink-0 rounded-xl border border-current/30 px-3 text-xs font-bold hover:bg-white/40">{alert.isActive ? "Encerrar alerta" : "Reativar"}</button></div></article>; })}</div>}</section>
    </div>
  </div>;
}
