import { useEffect, useState } from "react";
import { Award, Save, Target, Trash2, Trophy } from "lucide-react";
import { trpc } from "@/lib/trpc";

type CompetitionForm = { pointsPerCorrect: number; pointsPerWrong: number; questionsPerRound: number; isActive: boolean };
type MonthlyGoalForm = { targetPoints: number; targetCompletedRounds: number; rewardTitle: string; rewardDescription: string; isActive: boolean };

const initialForm: CompetitionForm = { pointsPerCorrect: 10, pointsPerWrong: 0, questionsPerRound: 10, isActive: true };
const initialMonthlyGoal: MonthlyGoalForm = { targetPoints: 100, targetCompletedRounds: 5, rewardTitle: "Destaque mensal", rewardDescription: "Reconhecimento definido pela administração para quem concluir a meta do mês.", isActive: true };

export function CompetitionAdminPanel() {
  const utils = trpc.useUtils();
  const settings = trpc.admin.competition.getSettings.useQuery(undefined, { refetchOnWindowFocus: false });
  const monthlyGoal = trpc.admin.competition.getMonthlyGoal.useQuery(undefined, { refetchOnWindowFocus: false });
  const courses = trpc.competition.courses.useQuery(undefined, { refetchOnWindowFocus: false });
  const [form, setForm] = useState<CompetitionForm>(initialForm);
  const [goalForm, setGoalForm] = useState<MonthlyGoalForm>(initialMonthlyGoal);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");
  const [courseId, setCourseId] = useState("all");
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    if (settings.data) setForm({
      pointsPerCorrect: settings.data.pointsPerCorrect ?? initialForm.pointsPerCorrect,
      pointsPerWrong: settings.data.pointsPerWrong ?? initialForm.pointsPerWrong,
      questionsPerRound: settings.data.questionsPerRound ?? initialForm.questionsPerRound,
      isActive: settings.data.isActive ?? initialForm.isActive,
    });
  }, [settings.data]);
  useEffect(() => {
    if (monthlyGoal.data) setGoalForm({
      targetPoints: monthlyGoal.data.targetPoints ?? initialMonthlyGoal.targetPoints,
      targetCompletedRounds: monthlyGoal.data.targetCompletedRounds ?? initialMonthlyGoal.targetCompletedRounds,
      rewardTitle: monthlyGoal.data.rewardTitle ?? initialMonthlyGoal.rewardTitle,
      rewardDescription: monthlyGoal.data.rewardDescription ?? initialMonthlyGoal.rewardDescription,
      isActive: monthlyGoal.data.isActive ?? initialMonthlyGoal.isActive,
    });
  }, [monthlyGoal.data]);

  const report = (text: string, kind: "success" | "error" = "success") => { setMessage(text); setMessageKind(kind); };
  const save = trpc.admin.competition.saveSettings.useMutation({
    onSuccess: async () => { report("Regras da competição salvas."); await Promise.all([utils.admin.competition.getSettings.invalidate(), utils.competition.settings.invalidate()]); },
    onError: error => report(error.message, "error"),
  });
  const saveMonthlyGoal = trpc.admin.competition.saveMonthlyGoal.useMutation({
    onSuccess: async () => { report("Meta mensal e reconhecimento salvos."); await Promise.all([utils.admin.competition.getMonthlyGoal.invalidate(), utils.competition.monthlyGoal.invalidate()]); },
    onError: error => report(error.message, "error"),
  });
  const clear = trpc.admin.competition.clearRanking.useMutation({
    onSuccess: async ({ deletedAnswers }) => {
      setConfirmation("");
      report(`Ranking limpo com segurança. ${deletedAnswers} resposta(s) competitiva(s) foram removida(s).`);
      await Promise.all([utils.competition.ranking.invalidate(), utils.competition.myScore.invalidate(), utils.competition.history.invalidate(), utils.competition.monthlyGoal.invalidate()]);
    },
    onError: error => report(error.message, "error"),
  });

  const update = <K extends keyof CompetitionForm>(key: K, value: CompetitionForm[K]) => setForm(current => ({ ...current, [key]: value }));
  const updateGoal = <K extends keyof MonthlyGoalForm>(key: K, value: MonthlyGoalForm[K]) => setGoalForm(current => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => { event.preventDefault(); setMessage(null); save.mutate(form); };
  const submitGoal = (event: React.FormEvent) => { event.preventDefault(); setMessage(null); saveMonthlyGoal.mutate(goalForm); };
  const clearRanking = () => { setMessage(null); clear.mutate({ courseId: courseId === "all" ? undefined : courseId, confirmation: "LIMPAR RANKING" }); };

  return <section className="h-full overflow-y-auto bg-[#f5f1e8] p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-4xl"><div className="rounded-2xl border border-[#274a54] bg-[#183542] p-5 text-white sm:p-7"><div className="flex items-center gap-2 text-[#9be0d2]"><Trophy className="h-4 w-4" /><p className="text-[10px] font-bold tracking-[0.2em]">ROOT / COMPETIÇÃO</p></div><h3 className="font-display mt-3 text-2xl font-bold">Ranking, metas e regras da competição</h3><p className="mt-3 max-w-2xl text-sm leading-6 text-[#d3e6e1]">Esta área controla apenas o quiz competitivo. As respostas e pontos não alteram XP, revisão, progresso ou simulados dos alunos.</p></div>
    <div className="mt-5 space-y-5"><form onSubmit={submit} className="rounded-2xl border border-[#d4dfdb] bg-[#fffdf8] p-5 shadow-[0_12px_28px_rgba(22,61,74,.06)] sm:p-7"><h4 className="text-sm font-bold text-[#315a5d]">Regras de pontuação</h4><div className="mt-5 grid gap-4 sm:grid-cols-3"><label className="block"><span className="mb-2 block text-xs font-bold tracking-wide text-[#315a5d]">PONTOS POR ACERTO</span><input type="number" min={1} max={1000} value={form.pointsPerCorrect} onChange={event => update("pointsPerCorrect", Number(event.target.value))} className="h-11 w-full rounded-xl border border-[#cfc7ba] bg-white px-3 text-sm text-[#173d4a] outline-none focus:border-[#0e5a70] focus:ring-2 focus:ring-[#8ad2c3]/45" /></label><label className="block"><span className="mb-2 block text-xs font-bold tracking-wide text-[#315a5d]">DESCONTO POR ERRO</span><input type="number" min={0} max={100} value={form.pointsPerWrong} onChange={event => update("pointsPerWrong", Number(event.target.value))} className="h-11 w-full rounded-xl border border-[#cfc7ba] bg-white px-3 text-sm text-[#173d4a] outline-none focus:border-[#0e5a70] focus:ring-2 focus:ring-[#8ad2c3]/45" /></label><label className="block"><span className="mb-2 block text-xs font-bold tracking-wide text-[#315a5d]">QUESTÕES POR RODADA</span><input type="number" min={5} max={50} value={form.questionsPerRound} onChange={event => update("questionsPerRound", Number(event.target.value))} className="h-11 w-full rounded-xl border border-[#cfc7ba] bg-white px-3 text-sm text-[#173d4a] outline-none focus:border-[#0e5a70] focus:ring-2 focus:ring-[#8ad2c3]/45" /></label></div><label className="mt-5 flex items-start gap-3 rounded-xl border border-[#d9e5df] bg-[#f3faf7] p-4 text-sm text-[#315a5d]"><input type="checkbox" checked={form.isActive} onChange={event => update("isActive", event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0e5a70]" /><span><strong className="block">Competição disponível aos alunos</strong><span className="mt-1 block text-xs leading-5 text-[#597674]">Ao pausar, as rodadas novas ficam indisponíveis. O ranking e o histórico são preservados.</span></span></label><div className="mt-5 flex flex-col gap-3 border-t border-[#e3dbcf] pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[#687f7e]">Última atualização: {settings.data?.updatedAt ? new Date(settings.data.updatedAt).toLocaleString("pt-BR") : "ainda não configurado"}.</p><button type="submit" disabled={save.isPending || settings.isLoading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0e5a70] px-4 text-sm font-bold text-white transition hover:bg-[#09495b] disabled:opacity-60"><Save className="h-4 w-4" />{save.isPending ? "Salvando..." : "Salvar regras"}</button></div></form>
      <form onSubmit={submitGoal} className="rounded-2xl border border-[#c7dcca] bg-[#f4fbf6] p-5 shadow-[0_12px_28px_rgba(22,61,74,.05)] sm:p-7"><div className="flex items-start gap-3"><div className="rounded-xl bg-[#dff2e8] p-2 text-[#17644e]"><Target className="h-5 w-5" /></div><div><h4 className="text-sm font-bold text-[#315a5d]">Meta e reconhecimento do mês</h4><p className="mt-1 text-sm leading-6 text-[#597674]">A apuração é feita automaticamente quando o aluno abre a competição. Não depende de tarefas agendadas e não gera pontuação extra.</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-xs font-bold tracking-wide text-[#315a5d]">META DE PONTOS</span><input type="number" min={1} max={100000} value={goalForm.targetPoints} onChange={event => updateGoal("targetPoints", Number(event.target.value))} className="h-11 w-full rounded-xl border border-[#bcd7c3] bg-white px-3 text-sm text-[#173d4a] outline-none focus:border-[#17644e] focus:ring-2 focus:ring-[#8ad2c3]/45" /></label><label className="block"><span className="mb-2 block text-xs font-bold tracking-wide text-[#315a5d]">RODADAS CONCLUÍDAS</span><input type="number" min={1} max={500} value={goalForm.targetCompletedRounds} onChange={event => updateGoal("targetCompletedRounds", Number(event.target.value))} className="h-11 w-full rounded-xl border border-[#bcd7c3] bg-white px-3 text-sm text-[#173d4a] outline-none focus:border-[#17644e] focus:ring-2 focus:ring-[#8ad2c3]/45" /></label><label className="block sm:col-span-2"><span className="mb-2 block text-xs font-bold tracking-wide text-[#315a5d]">TÍTULO DO RECONHECIMENTO</span><input value={goalForm.rewardTitle} onChange={event => updateGoal("rewardTitle", event.target.value)} maxLength={160} className="h-11 w-full rounded-xl border border-[#bcd7c3] bg-white px-3 text-sm text-[#173d4a] outline-none focus:border-[#17644e] focus:ring-2 focus:ring-[#8ad2c3]/45" /></label><label className="block sm:col-span-2"><span className="mb-2 block text-xs font-bold tracking-wide text-[#315a5d]">DESCRIÇÃO DO RECONHECIMENTO</span><textarea value={goalForm.rewardDescription} onChange={event => updateGoal("rewardDescription", event.target.value)} maxLength={500} rows={3} className="w-full rounded-xl border border-[#bcd7c3] bg-white px-3 py-2.5 text-sm text-[#173d4a] outline-none focus:border-[#17644e] focus:ring-2 focus:ring-[#8ad2c3]/45" /></label></div><label className="mt-5 flex items-start gap-3 rounded-xl border border-[#cfe4d5] bg-white/70 p-4 text-sm text-[#315a5d]"><input type="checkbox" checked={goalForm.isActive} onChange={event => updateGoal("isActive", event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#17644e]" /><span><strong className="block">Meta mensal ativa</strong><span className="mt-1 block text-xs leading-5 text-[#597674]">Ao desativar, o aluno continua vendo seu histórico, mas a meta e o reconhecimento deixam de ser exibidos como ativos.</span></span></label><div className="mt-5 flex flex-col gap-3 border-t border-[#cfe4d5] pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="inline-flex items-center gap-2 text-xs text-[#52716f]"><Award className="h-4 w-4" />Última atualização: {monthlyGoal.data?.updatedAt ? new Date(monthlyGoal.data.updatedAt).toLocaleString("pt-BR") : "ainda não configurado"}.</p><button type="submit" disabled={saveMonthlyGoal.isPending || monthlyGoal.isLoading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#17644e] px-4 text-sm font-bold text-white transition hover:bg-[#12543f] disabled:opacity-60"><Save className="h-4 w-4" />{saveMonthlyGoal.isPending ? "Salvando..." : "Salvar meta mensal"}</button></div></form>
      <div className="rounded-2xl border border-[#e3c5b7] bg-[#fff8f4] p-5 sm:p-7"><div className="flex items-center gap-2 text-[#914229]"><Trash2 className="h-4 w-4" /><h4 className="text-sm font-bold">Limpeza controlada do ranking</h4></div><p className="mt-3 text-sm leading-6 text-[#704536]">A limpeza remove somente respostas e rodadas da competição. Simulados, XP, revisões e demais dados de estudo não são modificados. A ação fica registrada na auditoria.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-xs font-bold tracking-wide text-[#704536]">ESCOPO</span><select value={courseId} onChange={event => setCourseId(event.target.value)} className="h-11 w-full rounded-xl border border-[#d9b9a8] bg-white px-3 text-sm text-[#592f24] outline-none focus:border-[#a75035] focus:ring-2 focus:ring-[#e8bbab]/50"><option value="all">Ranking global inteiro</option>{courses.data?.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><label className="block"><span className="mb-2 block text-xs font-bold tracking-wide text-[#704536]">CONFIRMAÇÃO</span><input value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder="Digite LIMPAR RANKING" className="h-11 w-full rounded-xl border border-[#d9b9a8] bg-white px-3 text-sm text-[#592f24] outline-none placeholder:text-[#a88478] focus:border-[#a75035] focus:ring-2 focus:ring-[#e8bbab]/50" /></label></div><button type="button" onClick={clearRanking} disabled={confirmation !== "LIMPAR RANKING" || clear.isPending} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#9e482f] px-4 text-sm font-bold text-white transition hover:bg-[#843720] disabled:cursor-not-allowed disabled:opacity-50"><Trash2 className="h-4 w-4" />{clear.isPending ? "Limpando..." : "Limpar ranking selecionado"}</button></div>
      {message && <p role="status" className={`rounded-xl border p-3 text-sm ${messageKind === "error" ? "border-[#e0b6a8] bg-[#fff2ed] text-[#97452d]" : "border-[#b9d6cb] bg-[#edf8f4] text-[#17644e]"}`}>{message}</p>}
    </div></div></section>;
}
