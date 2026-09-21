/* Estudos PF — Arquivo Operacional: painel assimétrico, foco em progresso mensurável e disciplina. */
/**
 * Estilo Arquivo Operacional: dossiê institucional contemporâneo, com papel mineral,
 * filetes, códigos e progresso apresentado como registro de treinamento — não como dashboard SaaS.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Award, BarChart3, BookOpen, Brain, CalendarClock, Check, ChevronRight, CircleHelp, Clock3, CreditCard, Flame, Gauge,
  GraduationCap, History, LayoutDashboard, Menu, MessageSquareText, Play, RotateCcw, ShieldCheck, Trash2,
  Sparkles, Target, Trophy, X, Zap,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { blocks, type ApostilaChapter, type DetailedStudyModule, type StudyQuestion } from "@/types/study";
import { activeContestId, contestCatalog, getDisciplineById, getDisciplineIdForModule, getDisciplinesForContest } from "@/data/pfCurriculumCatalog";
import { ApostilaModulePanel } from "@/components/ApostilaModulePanel";
import { AnswerRecord, currentStreak, emptyState, levelFromXp, selectBalancedBooleanQuestions, SimulationRecord, StudyState } from "@/lib/studyEngine";
import { useAuth } from "@/_core/hooks/useAuth";
import AccessGate from "@/pages/AccessGate";
import { trpc } from "@/lib/trpc";
import { AccountPanel } from "@/components/AccountPanel";
import { CommercePanel } from "@/components/CommercePanel";
import { MyAccessesArea } from "@/components/MyAccessesArea";
import { PublicStorefront } from "@/components/PublicStorefront";
import { CourseMarketplace } from "@/components/CourseMarketplace";
import { RootManagementPanel, RootManagementSection } from "@/components/RootManagementPanel";
import { GlobalContactLinks } from "@/components/GlobalContactLinks";
import { CourseAccessRequired } from "@/components/CourseAccessRequired";
import { StudentAlerts } from "@/components/StudentAlerts";
import { RichContentBody } from "@/components/RichContentBody";
import { Textarea } from "@/components/ui/textarea";
import { simulationAnswerFeedback } from "@/lib/simulationReviewHelpers";
import { CompetitionIdentity, getCompetitionIdentity } from "@/lib/competitionIdentity";
import { SimulationSealIdentity, getSimulationSealIdentity } from "@/lib/simulationSeal";
import { canOpenTutorialView, isTutorialCourseExperience } from "@/lib/tutorialCourse";
import { isStorefrontPreviewMode } from "@/lib/storefrontPreview";
import { resolveVisibleStudyCourseId, visibleStudyCourses } from "@/lib/studyCourseAccess";
import { resolveStudyWorkspaceAccessState } from "@/lib/studyWorkspaceAccess";

type View = "Painel" | "Conteúdo" | "Roteiro" | "Simulados" | "Competição" | "Revisar" | "Histórico" | "Cursos" | "Acessos";
type StudyModule = DetailedStudyModule & { chapter?: ApostilaChapter };
type RestQuestion = {
  id: number;
  legacyKey?: string | null;
  questionType: "certo_errado" | "multipla_escolha";
  answer: unknown;
  difficulty: "basic" | "intermediate" | "advanced";
  statement: string;
  explanation?: string | null;
  discipline: string;
  subject: string;
  banca?: string | null;
  year?: number | null;
  source?: string | null;
};
type SimulationQuestion = StudyQuestion & { persistentQuestionId?: number };
type ActiveSimulation = { questions: SimulationQuestion[]; index: number; answers: Record<string, boolean>; startedAt: number } | null;
type PersonalReviewItem = { id: number; questionKey: string; snapshot: { statement: string; answer: boolean; explanation: string; discipline: string; subject: string; source?: string }; status: "pending" | "mastered"; createdAt: string; reviewedAt: string | null };
type StudyProgressItem = { id: number; disciplineId: number; disciplineName: string; title: string; description: string | null; objective: string | null; cardText: string | null; body: string | null; coverImageUrl: string | null; videoUrl: string | null; videoLabel: string | null; materialUrl: string | null; materialLabel: string | null; notice: { kind: "new" | "updated"; label: string; activatedAt: string } | null; progress: { status: "started" | "completed"; startedAt: string; lastOpenedAt: string; completedAt: string | null } | null };
type RoadmapItem = { id: number; contentId: number; disciplineId: number; disciplineName: string; weekday: number; startTime: string; isActive: boolean; content: Omit<StudyProgressItem, "progress" | "notice"> };
type StudyCourseOption = { id: string; title: string; track: string; courseType: "concurso" | "tutorial"; description: string | null; coverImageUrl: string | null; panelLabel: string | null; panelBadge: string | null; panelTitle: string | null; panelDescription: string | null; panelCtaText: string | null; isActive: boolean };

const navigation: { label: View; icon: typeof LayoutDashboard }[] = [
  { label: "Painel", icon: LayoutDashboard }, { label: "Conteúdo", icon: BookOpen }, { label: "Roteiro", icon: CalendarClock }, { label: "Simulados", icon: Play }, { label: "Competição", icon: Trophy }, { label: "Revisar", icon: RotateCcw }, { label: "Histórico", icon: History },
];

const imageUrls = {
  desk: "/manus-storage/estudos-pf-desk_0c4ed447.jpg",
  statistics: "/manus-storage/estudos-pf-statistics_94d69e91.jpg",
  training: "/manus-storage/estudos-pf-training_9d304fd0.jpg",
};

function formatTime(seconds: number) {
  const min = Math.floor(seconds / 60).toString().padStart(2, "0");
  const sec = Math.max(0, seconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

function percentage(numerator: number, denominator: number) { return denominator ? Math.round((numerator / denominator) * 100) : 0; }

function getDisciplinePerformance(state: StudyState, questions: StudyQuestion[]) {
  const answersById = new Map(questions.map((question) => [question.id, question]));
  const record: Record<string, { correct: number; total: number }> = {};
  state.answers.forEach((answer) => {
    const question = answersById.get(answer.questionId);
    if (!question) return;
    record[question.discipline] ??= { correct: 0, total: 0 };
    record[question.discipline].total += 1;
    if (answer.correct) record[question.discipline].correct += 1;
  });
  return record;
}

export default function Home() {
  // The useAuth hook reads the local session created by the cadastro/login screen.
  const { user, loading, isAuthenticated, logout } = useAuth();
  const storefrontPreview = isStorefrontPreviewMode(window.location.search);
  const courseMarketplacePath = window.location.pathname === "/cursos";
  const [accessMode, setAccessMode] = useState<"login" | "register" | "reset" | null>(() => new URLSearchParams(window.location.search).get("reset") ? "reset" : null);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(() => window.sessionStorage.getItem("nucleo-purchase-plan") ?? new URLSearchParams(window.location.search).get("purchase"));

  const startPlanAcquisition = (planId: string) => {
    window.sessionStorage.setItem("nucleo-purchase-plan", planId);
    setPendingPlanId(planId);
    setAccessMode("register");
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#152d38] text-sm font-bold text-[#e8e4d9]">Carregando credencial...</div>;
  if (storefrontPreview) return <PublicStorefront previewMode onLogin={() => undefined} onChoosePlan={() => undefined} />;
  if (courseMarketplacePath && !isAuthenticated) {
    const openPlan = (planId: string) => { window.sessionStorage.setItem("nucleo-purchase-plan", planId); if (isAuthenticated) window.location.assign(`/?purchase=${encodeURIComponent(planId)}`); else { setPendingPlanId(planId); setAccessMode("register"); } };
    return <CourseMarketplace onChoosePlan={openPlan} onBack={() => { window.location.assign(isAuthenticated ? "/" : "/"); }} />;
  }
  if (!isAuthenticated) {
    if (accessMode) return <AccessGate initialMode={accessMode} selectedPlanPending={Boolean(pendingPlanId)} onBackToStorefront={() => { window.history.replaceState({}, "", window.location.pathname); setAccessMode(null); }} onAuthenticated={(hadActiveSession) => { if (hadActiveSession) window.sessionStorage.setItem("nucleo-session-replaced-notice", "1"); window.location.reload(); }} />;
    return <PublicStorefront onLogin={() => setAccessMode("login")} onChoosePlan={startPlanAcquisition} />;
  }

  return <StudyWorkspace user={user!} logout={logout} initialView={courseMarketplacePath ? "Cursos" : "Painel"} initialCommercePlanId={pendingPlanId} onCommercePlanConsumed={() => { window.sessionStorage.removeItem("nucleo-purchase-plan"); setPendingPlanId(null); }} />;
}

function StudyWorkspace({ user, logout, initialView, initialCommercePlanId, onCommercePlanConsumed }: { user: { name: string; username: string | null; email: string | null; role: "user" | "admin" }; logout: () => Promise<void>; initialView: View; initialCommercePlanId?: string | null; onCommercePlanConsumed: () => void }) {

  const [state, setState] = useState<StudyState>(emptyState);
  const [view, setView] = useState<View>(initialView);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contestId, setContestId] = useState<string>(() => {
    const stored = window.localStorage.getItem("estudos-pf-active-contest");
    return stored ?? activeContestId;
  });
  const [openedModule, setOpenedModule] = useState<StudyModule | null>(null);
  const [requestedModuleId, setRequestedModuleId] = useState<string | null>(() => new URLSearchParams(window.location.search).get("aula"));
  const [manualQuickQuestion, setManualQuickQuestion] = useState<StudyQuestion | null>(null);
  const [quickAnswer, setQuickAnswer] = useState<boolean | null>(null);
  const [simulation, setSimulation] = useState<ActiveSimulation>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationRecord | null>(null);
  const [simulationNotice, setSimulationNotice] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [commerceOpen, setCommerceOpen] = useState(Boolean(initialCommercePlanId));
  const [commercePlanFocus, setCommercePlanFocus] = useState<string | null>(initialCommercePlanId ?? null);
  const [rootManagementOpen, setRootManagementOpen] = useState(false);
  const [rootManagementSection, setRootManagementSection] = useState<RootManagementSection>("business");
  const [sessionReplacementNotice, setSessionReplacementNotice] = useState(() => window.sessionStorage.getItem("nucleo-session-replaced-notice") === "1");
  const platformSettingsQuery = trpc.platform.settings.useQuery(undefined, { refetchOnWindowFocus: false });
  const brand = {
    logoUrl: platformSettingsQuery.data?.logoUrl ?? null,
    brandName: platformSettingsQuery.data?.brandName ?? "Núcleo Concursos",
    brandTagline: platformSettingsQuery.data?.brandTagline ?? "Preparo multidisciplinar",
    primaryColor: platformSettingsQuery.data?.primaryColor ?? "#152d38",
    backgroundColor: platformSettingsQuery.data?.backgroundColor ?? "#f5f1e8",
    textColor: platformSettingsQuery.data?.textColor ?? "#152d38",
    heroTextColor: platformSettingsQuery.data?.heroTextColor ?? "#fffdf7",
    heroMutedTextColor: platformSettingsQuery.data?.heroMutedTextColor ?? "#d4e7e2",
    accentColor: platformSettingsQuery.data?.accentColor ?? "#8ad2c3",
    surfaceColor: platformSettingsQuery.data?.surfaceColor ?? "#fffdf8",
    cardColor: platformSettingsQuery.data?.cardColor ?? "#ffffff",
    borderColor: platformSettingsQuery.data?.borderColor ?? "#dcd6ca",
    mutedTextColor: platformSettingsQuery.data?.mutedTextColor ?? "#52716f",
    iconBackgroundColor: platformSettingsQuery.data?.iconBackgroundColor ?? "#e9f3f0",
    iconColor: platformSettingsQuery.data?.iconColor ?? "#0e5a70",
    buttonColor: platformSettingsQuery.data?.buttonColor ?? "#0e5a70",
  };
  const courseCatalogQuery = trpc.study.courseCatalog.useQuery(undefined, { refetchOnWindowFocus: false });
  const permittedCourses = useMemo<StudyCourseOption[]>(() => visibleStudyCourses((courseCatalogQuery.data ?? []) as StudyCourseOption[]), [courseCatalogQuery.data]);
  const workspaceAccessState = resolveStudyWorkspaceAccessState({
    isAdmin: user.role === "admin",
    catalogLoading: courseCatalogQuery.isLoading,
    catalogError: courseCatalogQuery.isError,
    permittedCourseCount: permittedCourses.length,
  });
  const hasConfirmedCourseAccess = workspaceAccessState === "available";
  const permittedContestIds = useMemo(() => permittedCourses.map(course => course.id), [permittedCourses]);
  const effectiveContestId = resolveVisibleStudyCourseId(permittedCourses, contestId, activeContestId);
  const activeCourse = useMemo(() => permittedCourses.find(course => course.id === effectiveContestId) ?? null, [permittedCourses, effectiveContestId]);
  const activeContest = useMemo(() => contestCatalog.find(contest => contest.id === effectiveContestId) ?? null, [effectiveContestId]);
  const activeCourseTitle = activeCourse?.title ?? activeContest?.name ?? "Curso de estudo";
  const activeCourseRole = activeContest?.role ?? (activeCourse?.courseType === "tutorial" ? "Tutorial" : activeCourse?.track ?? "Trilha de estudo");
  const tutorialCourse = isTutorialCourseExperience(user.role, activeCourse?.courseType);
  const visibleNavigation = navigation.filter(item => canOpenTutorialView(item.label, tutorialCourse));
  const canUseActiveCourse = hasConfirmedCourseAccess && (user.role === "admin" || permittedContestIds.includes(effectiveContestId));
  const studyBundleQuery = (trpc.study as any).bundle.useQuery({ courseId: effectiveContestId }, { enabled: canUseActiveCourse, refetchOnWindowFocus: false });
  const availableModules = useMemo<StudyModule[]>(() => {
    const modules = (studyBundleQuery.data?.modules ?? []) as DetailedStudyModule[];
    const chapters = (studyBundleQuery.data?.chapters ?? {}) as Record<string, ApostilaChapter>;
    return modules.map(module => ({ ...module, chapter: chapters[module.id] }));
  }, [studyBundleQuery.data]);
  const availableModuleIds = useMemo(() => new Set(availableModules.map((module) => module.id)), [availableModules]);

  useEffect(() => {
    if (!requestedModuleId || !availableModules.length) return;
    const target = availableModules.find(module => module.id === requestedModuleId) ?? null;
    if (target) setOpenedModule(target);
    setRequestedModuleId(null);
  }, [availableModules, requestedModuleId]);

  useEffect(() => {
    if (permittedContestIds.length && !permittedContestIds.includes(contestId)) setContestId(permittedContestIds[0]);
  }, [contestId, permittedContestIds]);

  useEffect(() => {
    if (!canOpenTutorialView(view, tutorialCourse)) setView("Painel");
  }, [tutorialCourse, view]);

  useEffect(() => {
    window.localStorage.setItem("estudos-pf-active-contest", contestId);
  }, [contestId]);

  useEffect(() => {
    if (!initialCommercePlanId) return;
    setCommercePlanFocus(initialCommercePlanId);
    onCommercePlanConsumed();
  }, [initialCommercePlanId, onCommercePlanConsumed]);

  useEffect(() => {
    if (sessionReplacementNotice) window.sessionStorage.removeItem("nucleo-session-replaced-notice");
  }, [sessionReplacementNotice]);

  const privateState = trpc.study.state.useQuery(undefined, { enabled: hasConfirmedCourseAccess, refetchOnWindowFocus: false });
  const centralQuestionsQuery = (trpc.study.questions.list as any).useQuery({ courseId: effectiveContestId }, { enabled: canUseActiveCourse, refetchOnWindowFocus: false });
  const dailyCheckQuery = trpc.study.dailyCheck.useQuery({ courseId: effectiveContestId }, { enabled: user.role !== "admin" && permittedContestIds.includes(effectiveContestId), refetchOnWindowFocus: false });
  const personalReviewsQuery = trpc.study.review.list.useQuery(undefined, { enabled: hasConfirmedCourseAccess && !tutorialCourse, refetchOnWindowFocus: false });
  const contentProgressQuery = trpc.study.contentProgress.get.useQuery({ courseId: effectiveContestId }, { enabled: canUseActiveCourse, refetchOnWindowFocus: false });
  const roadmapQuery = trpc.study.roadmap.list.useQuery({ courseId: effectiveContestId }, { enabled: canUseActiveCourse, refetchOnWindowFocus: false });
  const personalCompetitionScoreQuery = trpc.competition.myScore.useQuery({}, { enabled: canUseActiveCourse && !tutorialCourse, refetchOnWindowFocus: false });
  const answerMutation = trpc.study.answer.useMutation();
  const moduleMutation = trpc.study.completeModule.useMutation();
  const openContentMutation = trpc.study.contentProgress.open.useMutation({ onSuccess: () => void contentProgressQuery.refetch() });
  const completeContentMutation = trpc.study.contentProgress.complete.useMutation({ onSuccess: () => void contentProgressQuery.refetch() });
  const saveRoadmapMutation = trpc.study.roadmap.save.useMutation({ onSuccess: () => void roadmapQuery.refetch() });
  const removeRoadmapMutation = trpc.study.roadmap.remove.useMutation({ onSuccess: () => void roadmapQuery.refetch() });
  const simulationMutation = trpc.study.submitSimulation.useMutation();
  const addPersonalReviewMutation = trpc.study.review.add.useMutation();
  const completePersonalReviewMutation = trpc.study.review.complete.useMutation();
  const removePersonalReviewMutation = trpc.study.review.remove.useMutation();
  const dismissDailyCheckMutation = trpc.study.dismissDailyCheck.useMutation({ onSuccess: () => void dailyCheckQuery.refetch() });

  useEffect(() => {
    if (privateState.data) setState(privateState.data as StudyState);
  }, [privateState.data]);

  const level = levelFromXp(state.xp);
  const totalAnswers = state.answers.length;
  const totalCorrect = state.answers.filter((answer) => answer.correct).length;
  const overallScore = percentage(totalCorrect, totalAnswers);
  const streak = currentStreak(state.studyDates);
  const performanceQuestions = useMemo<StudyQuestion[]>(() => ((centralQuestionsQuery.data?.questions ?? []) as RestQuestion[]).filter((question: RestQuestion) => question.questionType === "certo_errado" && typeof question.answer === "boolean").map((question: RestQuestion) => ({
    id: String(question.legacyKey || question.id), block: "I", discipline: question.discipline, subject: question.subject,
    difficulty: question.difficulty === "basic" ? "Fácil" : question.difficulty === "advanced" ? "Difícil" : "Médio",
    statement: question.statement, answer: question.answer as boolean, explanation: question.explanation ?? "Sem comentário cadastrado.",
    tip: question.subject, source: [question.banca, question.year, question.source].filter(Boolean).join(" · ") || "Biblioteca central",
  })), [centralQuestionsQuery.data]);
  const disciplinePerformance = useMemo(() => getDisciplinePerformance(state, performanceQuestions), [state, performanceQuestions]);
  const studiedPercent = percentage(state.completedModules.filter((moduleId) => availableModuleIds.has(moduleId)).length, availableModules.length);
  const personalCompetitionIdentity = getCompetitionIdentity({
    position: personalCompetitionScoreQuery.data?.position ?? null,
    totalPoints: personalCompetitionScoreQuery.data?.totalPoints ?? 0,
    totalAnswered: personalCompetitionScoreQuery.data?.totalAnswered ?? 0,
    totalCorrect: personalCompetitionScoreQuery.data?.totalCorrect ?? 0,
  });
  const simulationCorrectAnswers = state.weeklySimulationCorrect;
  const personalSimulationSeal = getSimulationSealIdentity(simulationCorrectAnswers);
  const focus = useMemo(() => {
    const entries = Object.entries(disciplinePerformance).filter(([, metric]) => metric.total >= 2);
    if (!entries.length) return { label: "Inicie um diagnóstico", detail: "Responda questões para liberar uma recomendação baseada no seu desempenho." };
    const [label, metric] = entries.sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))[0];
    return { label, detail: `Seu aproveitamento atual é ${percentage(metric.correct, metric.total)}%. Revise esse eixo antes de avançar.` };
  }, [disciplinePerformance]);
  const historyChart = state.simulations.slice(-6).map((sim, index) => ({ label: `S${state.simulations.length - 5 + index}`, score: percentage(sim.correct, sim.total) }));
  const persistentSimulationQuestions = useMemo<SimulationQuestion[]>(() => ((centralQuestionsQuery.data?.questions ?? []) as RestQuestion[]).filter((question: RestQuestion) => question.questionType === "certo_errado" && typeof question.answer === "boolean").map((question: RestQuestion) => ({
    id: String(question.legacyKey || question.id), persistentQuestionId: question.id, block: "I", discipline: question.discipline, subject: question.subject,
    difficulty: question.difficulty === "basic" ? "Fácil" : question.difficulty === "advanced" ? "Difícil" : "Médio",
    statement: question.statement, answer: question.answer as boolean, explanation: question.explanation ?? "Sem comentário cadastrado.", tip: question.subject,
    source: [question.banca, question.year, question.source].filter(Boolean).join(" · ") || "Biblioteca central",
  })), [centralQuestionsQuery.data]);
  const dailyQuickQuestion = useMemo<StudyQuestion | null>(() => {
    const question = dailyCheckQuery.data?.question;
    if (!question || typeof question.answer !== "boolean") return null;
    return { id: String(question.id), block: "I", discipline: question.discipline, subject: question.subject, difficulty: question.difficulty === "basic" ? "Fácil" : question.difficulty === "advanced" ? "Difícil" : "Médio", statement: question.statement, answer: question.answer, explanation: question.explanation ?? "Sem comentário cadastrado.", tip: question.subject, source: [question.banca, question.year, question.source].filter(Boolean).join(" · ") || "Biblioteca central" };
  }, [dailyCheckQuery.data]);
  const quickQuestion = manualQuickQuestion ?? dailyQuickQuestion;
  const contentByModuleId = useMemo(() => {
    const items = (contentProgressQuery.data?.contents ?? []) as StudyProgressItem[];
    return new Map(availableModules.flatMap(module => {
      const content = items.find(item => item.title === `${module.code} — ${module.title}`);
      return content ? [[module.id, content] as const] : [];
    }));
  }, [availableModules, contentProgressQuery.data]);

  useEffect(() => { setQuickAnswer(null); }, [quickQuestion?.id]);

  if (workspaceAccessState === "loading") return <div className="grid min-h-screen place-items-center bg-[#152d38] text-sm font-bold text-[#e8e4d9]">Preparando sua área de estudos...</div>;
  if (workspaceAccessState === "error") return <div className="grid min-h-screen place-items-center bg-[#152d38] p-5 text-center text-[#e8e4d9]"><div><p className="text-sm font-bold">Não foi possível confirmar seus cursos agora.</p><button type="button" onClick={() => void courseCatalogQuery.refetch()} className="mt-4 min-h-11 rounded-lg border border-[#a3d6ca] px-4 text-xs font-bold tracking-wide text-[#e8e4d9] hover:bg-white/10">TENTAR NOVAMENTE</button></div></div>;
  if (workspaceAccessState === "no-course") return <>{commerceOpen && <CommercePanel initialPlanId={commercePlanFocus} onClose={() => { setCommerceOpen(false); setCommercePlanFocus(null); }} />}<CourseAccessRequired userName={user.name} onLogout={logout} onBrowsePlans={() => setCommerceOpen(true)} /></>;

  function updateState(updater: (current: StudyState) => StudyState) { setState((current) => updater(current)); }

  function registerAnswer(question: StudyQuestion, correct: boolean) {
    const today = new Date().toISOString().slice(0, 10);
    updateState((current) => ({
      ...current,
      xp: current.xp + (correct ? 8 : 2),
      answers: [...current.answers, { questionId: question.id, correct, answeredAt: new Date().toISOString() }],
      studyDates: current.studyDates.includes(today) ? current.studyDates : [...current.studyDates, today],
      lastStudyDate: today,
    }));
    answerMutation.mutate({ questionId: question.id, correct }, { onSuccess: serverState => setState(serverState as StudyState) });
  }

  function addToPersonalReview(question: StudyQuestion) {
    addPersonalReviewMutation.mutate({ questionKey: question.id, snapshot: { statement: question.statement, answer: question.answer, explanation: question.explanation, discipline: question.discipline, subject: question.subject, source: question.source } }, { onSuccess: () => void personalReviewsQuery.refetch() });
  }

  function completePersonalReview(id: number) {
    completePersonalReviewMutation.mutate({ id }, { onSuccess: () => void personalReviewsQuery.refetch() });
  }

  function removePersonalReview(id: number) {
    removePersonalReviewMutation.mutate({ id }, { onSuccess: () => void personalReviewsQuery.refetch() });
  }

  function completeModule(module: StudyModule) {
    if (state.completedModules.includes(module.id)) return;
    const today = new Date().toISOString().slice(0, 10);
    updateState((current) => ({ ...current, completedModules: [...current.completedModules, module.id], xp: current.xp + 20, studyDates: current.studyDates.includes(today) ? current.studyDates : [...current.studyDates, today], lastStudyDate: today }));
    moduleMutation.mutate({ moduleId: module.id }, { onSuccess: serverState => setState(serverState as StudyState) });
    const content = contentByModuleId.get(module.id);
    if (content) completeContentMutation.mutate({ courseId: effectiveContestId, contentId: content.id });
  }

  function openModuleWithProgress(module: StudyModule) {
    const content = contentByModuleId.get(module.id);
    if (content) openContentMutation.mutate({ courseId: effectiveContestId, contentId: content.id });
    setOpenedModule(module);
  }

  function openScheduledContent(contentId: number) {
    const content = (contentProgressQuery.data?.contents ?? []).find(item => item.id === contentId) as StudyProgressItem | undefined;
    const module = content ? availableModules.find(item => item.title === content.title.replace(/^[^—]+—\s*/, "")) : undefined;
    if (module) openModuleWithProgress(module);
    else setView("Conteúdo");
  }

  function startSimulation(total: number) {
    setSimulationResult(null);
    setSimulationNotice(null);
    const strictReviewMode = centralQuestionsQuery.data?.requiresReviewMode === true;
    const bank = persistentSimulationQuestions;
    const questions = selectBalancedBooleanQuestions(bank, total, state.usedQuestionIds);
    if (questions.length < total) {
      setSimulationNotice(strictReviewMode ? `Há somente ${questions.length} questão(ões) central(is) aprovada(s)/publicada(s) para revisão obrigatória. Publique ao menos ${total} para iniciar este simulado.` : `Há somente ${questions.length} questões disponíveis para este simulado.`);
      return;
    }
    setSimulation({ questions, index: 0, answers: {}, startedAt: Date.now() });
  }

  function submitSimulationAnswer(answer: boolean) {
    if (!simulation) return;
    const question = simulation.questions[simulation.index];
    const hasSelectedAnswer = Object.prototype.hasOwnProperty.call(simulation.answers, question.id);
    const nextAnswers = hasSelectedAnswer ? simulation.answers : { ...simulation.answers, [question.id]: answer };
    if (!hasSelectedAnswer) {
      setSimulation({ ...simulation, answers: nextAnswers });
      return;
    }
    if (simulation.index < simulation.questions.length - 1) {
      setSimulation({ ...simulation, index: simulation.index + 1, answers: nextAnswers });
      return;
    }
    const byDiscipline: SimulationRecord["byDiscipline"] = {};
    const byBlock: SimulationRecord["byBlock"] = { I: { correct: 0, total: 0 }, II: { correct: 0, total: 0 }, III: { correct: 0, total: 0 } };
    const answerRecords: AnswerRecord[] = [];
    let correct = 0;
    simulation.questions.forEach((item) => {
      const isCorrect = nextAnswers[item.id] === item.answer;
      if (isCorrect) correct += 1;
      byDiscipline[item.discipline] ??= { correct: 0, total: 0 };
      byDiscipline[item.discipline].total += 1;
      if (isCorrect) byDiscipline[item.discipline].correct += 1;
      byBlock[item.block].total += 1;
      if (isCorrect) byBlock[item.block].correct += 1;
      answerRecords.push({ questionId: item.id, correct: isCorrect, answeredAt: new Date().toISOString() });
    });
    const result: SimulationRecord = { id: `sim-${Date.now()}`, date: new Date().toISOString(), total: simulation.questions.length, correct, errors: simulation.questions.length - correct, elapsedSeconds: Math.round((Date.now() - simulation.startedAt) / 1000), byDiscipline, byBlock };
    const today = new Date().toISOString().slice(0, 10);
    updateState((current) => ({ ...current, xp: current.xp + correct * 8 + 15, simulations: [...current.simulations, result], answers: [...current.answers, ...answerRecords], usedQuestionIds: Array.from(new Set([...current.usedQuestionIds, ...simulation.questions.map((item) => item.id)])), studyDates: current.studyDates.includes(today) ? current.studyDates : [...current.studyDates, today], lastStudyDate: today, weeklySimulationCorrect: current.weeklySimulationCorrect + correct }));
    simulationMutation.mutate({ id: result.id, total: result.total, correct: result.correct, errors: result.errors, elapsedSeconds: result.elapsedSeconds, byDiscipline: result.byDiscipline, byBlock: result.byBlock, answers: answerRecords.map(answer => ({ questionId: answer.questionId, correct: answer.correct })), questionIds: simulation.questions.map(item => item.id), persistentAnswers: simulation.questions.filter((item): item is SimulationQuestion & { persistentQuestionId: number } => typeof item.persistentQuestionId === "number").map(item => ({ questionId: item.persistentQuestionId, correct: nextAnswers[item.id] === item.answer, snapshot: { statement: item.statement, type: "certo_errado", answer: item.answer, explanation: item.explanation, discipline: item.discipline, subject: item.subject, difficulty: item.difficulty, source: item.source } })) }, { onSuccess: serverState => setState(serverState as StudyState) });
    setSimulation(null);
    setSimulationResult(result);
  }

  const currentQuestion = simulation?.questions[simulation.index];
  const quickCorrect = !quickQuestion || quickAnswer === null ? null : quickAnswer === quickQuestion.answer;

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#152d38] lg:flex" style={{ backgroundColor: brand.backgroundColor, color: brand.textColor }}>
      <aside id="study-navigation" aria-label="Navegação principal" style={{ backgroundColor: brand.primaryColor }} className={`fixed inset-y-0 left-0 z-40 flex w-[min(20rem,86vw)] flex-col overflow-y-auto overscroll-contain border-r border-white/10 px-4 py-5 shadow-[18px_0_42px_rgba(5,20,28,0.42)] transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-[272px] lg:translate-x-0 lg:px-4 lg:py-6 lg:shadow-none ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-10 flex items-center gap-3 px-2">
          <div style={{ backgroundColor: brand.cardColor, color: brand.iconColor }} className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl" role="img" aria-label={`Logo ${brand.brandName}`}>{brand.logoUrl ? <img src={brand.logoUrl} alt="" className="h-full w-full object-contain" /> : <ShieldCheck className="h-6 w-6" />}</div>
          <div className="min-w-0"><p style={{ color: brand.heroTextColor }} className="font-display truncate text-lg font-extrabold tracking-tight">{brand.brandName}</p><p style={{ color: brand.heroMutedTextColor }} className="truncate text-[9px] font-bold tracking-[0.16em] sm:tracking-[0.22em]">{brand.brandTagline}</p></div>
        </div>
          <div className="mb-5 border-y border-white/10 px-3 py-3"><p className="text-[9px] font-bold tracking-[0.2em] text-[#8faeb5]">REGISTRO DE PREPARO</p><p className="font-display mt-1 text-sm font-bold text-white">{activeCourseRole}</p></div>
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#7e99a1]">Áreas do arquivo</p>
        <nav className="space-y-1">{visibleNavigation.map(({ label, icon: Icon }) => <button key={label} onClick={() => { setView(label); setMenuOpen(false); }} className={`nav-item ${view === label ? "nav-item-active" : ""}`}><Icon className="h-4 w-4" />{label}</button>)}<button onClick={() => { setView("Cursos"); setMenuOpen(false); }} className={`nav-item ${view === "Cursos" ? "nav-item-active" : ""}`}><BookOpen className="h-4 w-4" />Cursos para comprar</button><button onClick={() => { setView("Acessos"); setMenuOpen(false); }} className={`nav-item ${view === "Acessos" ? "nav-item-active" : ""}`}><CreditCard className="h-4 w-4" />Meus acessos</button>{user.role === "admin" && <button onClick={() => { setRootManagementSection("business"); setRootManagementOpen(true); setMenuOpen(false); }} className="nav-item"><ShieldCheck className="h-4 w-4" />Gestão ROOT</button>}</nav>
        <div className="mt-auto border-t border-white/10 pt-5">
          <div className="flex gap-4 px-2"><div className="relative h-32 w-3 border border-white/15 bg-black/20"><span className="absolute inset-x-0 top-1/4 h-px bg-white/35" /><span className="absolute inset-x-0 top-1/2 h-px bg-white/35" /><span className="absolute inset-x-0 top-3/4 h-px bg-white/35" /><div className="absolute bottom-0 w-full transition-all duration-300" style={{ height: `${level.progress}%`, backgroundColor: brand.accentColor }} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span style={{ color: brand.heroMutedTextColor }} className="text-[10px] font-bold uppercase tracking-[0.17em]">Credencial</span><span style={{ borderColor: brand.accentColor, color: brand.accentColor }} className="border px-1.5 py-0.5 text-[9px] font-bold tracking-wider">REG-01</span></div><p style={{ color: brand.heroTextColor }} className="font-display mt-2 text-sm font-bold">Nível {level.index}</p><p style={{ color: brand.heroMutedTextColor }} className="text-xs">{level.label}</p><p style={{ color: brand.heroMutedTextColor }} className="mt-2 text-[10px]">{level.current} / {level.next} XP</p><p style={{ color: brand.heroMutedTextColor }} className="mt-1 text-[9px] font-bold tracking-[0.14em]">MARCO DE TREINAMENTO</p></div><div style={{ borderColor: brand.accentColor }} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 text-center"><span style={{ color: brand.heroTextColor }} className="font-display text-sm font-extrabold">{state.xp}</span><span style={{ color: brand.accentColor }} className="-mt-1 text-[7px] font-bold tracking-wider">XP</span></div></div>
          <GlobalContactLinks variant="sidebar" />
        </div>
      </aside>
      {menuOpen && <button aria-label="Fechar navegação" className="fixed inset-0 z-30 bg-[#07151b]/72 backdrop-blur-[2px] lg:hidden" onClick={() => setMenuOpen(false)} />}
      <main className="min-h-screen min-w-0 flex-1">
        {sessionReplacementNotice && <div role="alert" className="fixed inset-x-3 top-3 z-50 mx-auto flex max-w-xl items-start justify-between gap-3 border border-[#b88336]/45 bg-[#fff8e8] px-4 py-3 text-sm font-medium text-[#5e3a0b] shadow-lg sm:left-auto sm:right-6 sm:top-6 sm:mx-0"><span><strong>Acesso atualizado.</strong> Havia outra sessão ativa nesta conta; ela foi encerrada para proteger seus dados.</span><button type="button" aria-label="Fechar aviso" onClick={() => setSessionReplacementNotice(false)} className="shrink-0 text-lg leading-none" >×</button></div>}
        <header style={{ backgroundColor: brand.backgroundColor, borderColor: brand.borderColor }} className="sticky top-0 z-20 flex min-w-0 items-center justify-between gap-1 border-b px-3 backdrop-blur-md sm:gap-2 sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3"><button style={{ borderColor: brand.borderColor, backgroundColor: brand.cardColor, color: brand.textColor }} aria-label="Abrir navegação" aria-controls="study-navigation" aria-expanded={menuOpen} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border shadow-sm lg:hidden" onClick={() => setMenuOpen(true)}><Menu className="h-5 w-5" /></button><div className="min-w-0"><p style={{ color: brand.mutedTextColor }} className="eyebrow truncate">{activeCourse?.courseType === "tutorial" ? "TUTORIAL" : "CONCURSO"} · {activeCourseTitle.toUpperCase()}</p><h1 style={{ color: brand.textColor }} className="font-display truncate text-base font-bold">{view}</h1></div></div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-3"><div style={{ borderColor: brand.borderColor, backgroundColor: brand.cardColor }} className="hidden items-center gap-2 rounded-xl border px-3 py-2 sm:flex"><Flame className="h-4 w-4 text-[#d2823b]" /><span className="text-xs font-bold">{streak} dia{streak === 1 ? "" : "s"}</span></div><PersonalSimulationSeal identity={personalSimulationSeal} loading={privateState.isLoading} /><button onClick={() => setAccountOpen(true)} className="hidden text-right sm:block"><p style={{ color: brand.textColor }} className="text-xs font-bold">{user.name}</p><p style={{ color: brand.mutedTextColor }} className="text-[9px] font-bold tracking-wider">{user.role === "admin" ? "ROOT / ADMIN" : "CONTA PRIVADA"}</p></button><button style={{ borderColor: brand.borderColor, backgroundColor: brand.cardColor, color: brand.iconColor }} onClick={() => void logout()} className="shrink-0 border px-1.5 py-2 text-[9px] font-bold tracking-wide sm:px-2.5 sm:text-[10px]">SAIR</button><button style={{ backgroundColor: brand.buttonColor, color: brand.heroTextColor }} onClick={() => setAccountOpen(true)} className="hidden h-10 w-10 items-center justify-center rounded-xl text-sm font-bold sm:flex">{level.index}</button></div>
        </header>
        <div className="mx-auto max-w-[1540px] p-4 sm:p-7 lg:p-10"><ContestSelector contestId={effectiveContestId} courses={permittedCourses} onChange={setContestId} />{view === "Painel" && user.role !== "admin" && <StudentAlerts />}{simulation ? <SimulationScreen simulation={simulation} onAnswer={submitSimulationAnswer} onExit={() => setSimulation(null)} /> : simulationResult ? <SimulationResult result={simulationResult} onAgain={() => startSimulation(simulationResult.total)} onClose={() => { setSimulationResult(null); setView("Histórico"); }} /> : <>
          {view === "Painel" && <Dashboard state={state} modules={availableModules} contestName={activeCourseTitle} coverImageUrl={activeCourse?.coverImageUrl} panelLabel={activeCourse?.panelLabel} panelBadge={activeCourse?.panelBadge} panelTitle={activeCourse?.panelTitle} panelDescription={activeCourse?.panelDescription} panelCtaText={activeCourse?.panelCtaText} level={level} totalAnswers={totalAnswers} overallScore={overallScore} streak={streak} studiedPercent={studiedPercent} focus={focus} historyChart={historyChart} onStudy={() => setView("Conteúdo")} onSimulate={tutorialCourse ? undefined : () => setView("Simulados")} continueItem={(contentProgressQuery.data?.continueItem ?? null) as StudyProgressItem | null} onOpenScheduledContent={openScheduledContent} onOpenPlanner={() => setView("Roteiro")} />}
          {view === "Roteiro" && <WeeklyStudyPlanner progressItems={(contentProgressQuery.data?.contents ?? []) as StudyProgressItem[]} roadmapItems={(roadmapQuery.data ?? []) as RoadmapItem[]} onOpenScheduledContent={openScheduledContent} onSaveRoadmap={(input) => saveRoadmapMutation.mutate({ courseId: effectiveContestId, ...input })} onRemoveRoadmap={(id) => removeRoadmapMutation.mutate({ id })} saving={saveRoadmapMutation.isPending || removeRoadmapMutation.isPending} />}
          {view === "Conteúdo" && <StudyArea state={state} modules={availableModules} contestName={activeCourseTitle} contentByModuleId={contentByModuleId} onOpen={openModuleWithProgress} />}
          {!tutorialCourse && view === "Simulados" && <Simulations onStart={startSimulation} state={state} notice={simulationNotice} strictReviewMode={centralQuestionsQuery.data?.requiresReviewMode === true} centralCount={persistentSimulationQuestions.length} />}
          {!tutorialCourse && view === "Competição" && <><CompetitionMedal identity={personalCompetitionIdentity} totalPoints={personalCompetitionScoreQuery.data?.totalPoints ?? 0} position={personalCompetitionScoreQuery.data?.position ?? null} loading={personalCompetitionScoreQuery.isLoading} /><CompetitionArea defaultCourseId={effectiveContestId} /><CompetitionProgressPanel defaultCourseId={effectiveContestId} /></>}
          {!tutorialCourse && view === "Revisar" && <ReviewArea state={state} modules={availableModules} questions={persistentSimulationQuestions} personalReviews={(personalReviewsQuery.data ?? []) as PersonalReviewItem[]} personalReviewsLoading={personalReviewsQuery.isLoading} onStartQuestion={(question) => { setManualQuickQuestion(question); setQuickAnswer(null); setView("Painel"); }} onCompletePersonalReview={completePersonalReview} onRemovePersonalReview={removePersonalReview} reviewPending={completePersonalReviewMutation.isPending || removePersonalReviewMutation.isPending} />}
          {view === "Histórico" && <HistoryArea state={state} />}
          {view === "Cursos" && <CourseMarketplace onChoosePlan={(planId) => { setCommercePlanFocus(planId); setCommerceOpen(true); }} onBack={() => setView("Painel")} />}
          {view === "Acessos" && <MyAccessesArea onBuyMore={() => setView("Cursos")} />}
        </>}</div>
      </main>
          {view === "Painel" && !simulation && !simulationResult && quickQuestion && (manualQuickQuestion !== null || !dailyCheckQuery.data?.dismissed) && <QuickCheck question={quickQuestion} answer={quickAnswer} correct={quickCorrect} reviewSaved={((personalReviewsQuery.data ?? []) as PersonalReviewItem[]).some(item => item.questionKey === quickQuestion.id)} reviewPending={addPersonalReviewMutation.isPending} onSaveForReview={() => addToPersonalReview(quickQuestion)} onAnswer={(answer) => { setQuickAnswer(answer); registerAnswer(quickQuestion, answer === quickQuestion.answer); }} onDismiss={() => manualQuickQuestion ? setManualQuickQuestion(null) : dismissDailyCheckMutation.mutate({ courseId: effectiveContestId })} />}
      {openedModule && <ModulePanel module={openedModule} body={contentByModuleId.get(openedModule.id)?.body ?? null} completed={state.completedModules.includes(openedModule.id)} onComplete={() => completeModule(openedModule)} onClose={() => setOpenedModule(null)} />}
      {accountOpen && <AccountPanel user={user} onClose={() => setAccountOpen(false)} />}
      {commerceOpen && <CommercePanel initialPlanId={commercePlanFocus} onClose={() => { setCommerceOpen(false); setCommercePlanFocus(null); }} />}
      {rootManagementOpen && user.role === "admin" && <RootManagementPanel activeSection={rootManagementSection} onSectionChange={setRootManagementSection} onClose={() => setRootManagementOpen(false)} />}
    </div>
  );
}

const competitionToneClasses = {
  gold: "border-[#e8c16a] bg-[#fff7df] text-[#8d5810]",
  silver: "border-[#c5d0d5] bg-[#f4f8fa] text-[#47606b]",
  bronze: "border-[#d8a27a] bg-[#fff2e8] text-[#8a4725]",
  teal: "border-[#9bcfc2] bg-[#edf8f4] text-[#17644e]",
  slate: "border-[#c8d5d8] bg-[#f4f7f6] text-[#4e676c]",
} as const;

function PersonalSimulationSeal({ identity, loading }: { identity: SimulationSealIdentity; loading: boolean }) {
  return <div aria-label={loading ? "Carregando selo de simulados" : `Selo pessoal de simulados: ${identity.label}`} title={loading ? "Carregando seus acertos de simulados" : `${identity.label}: ${identity.description}`} className={`flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-2 sm:px-2.5 ${competitionToneClasses[identity.tone]}`}><Award className="h-4 w-4 shrink-0" /><div className="hidden min-w-0 sm:block"><p className="text-[8px] font-bold tracking-[.12em]">SELO PESSOAL</p><p className="max-w-24 truncate text-[10px] font-extrabold">{loading ? "CARREGANDO" : identity.shortLabel}</p></div><span className="text-[9px] font-extrabold sm:hidden">{loading ? "…" : identity.shortLabel}</span></div>;
}

function CompetitionMedal({ identity, totalPoints, position, loading }: { identity: CompetitionIdentity; totalPoints: number; position: number | null; loading: boolean }) {
  return <section aria-label="Sua medalha de competição" className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 ${competitionToneClasses[identity.tone]}`}><div className="absolute -right-4 -top-5 h-24 w-24 rounded-full border border-current/20" /><div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-current/30 bg-white/45"><Award className="h-6 w-6" /></div><div className="min-w-0"><p className="text-[10px] font-bold tracking-[.16em]">SUA MEDALHA</p><h2 className="font-display mt-0.5 text-xl font-extrabold">{loading ? "Calculando desempenho" : identity.label}</h2><p className="mt-1 text-sm leading-5 opacity-85">{loading ? "Atualizando sua posição e seus pontos..." : identity.description}</p></div></div><div className="flex shrink-0 gap-2"><div className="rounded-xl border border-current/25 bg-white/45 px-3 py-2 text-center"><p className="text-[8px] font-bold tracking-[.12em]">PONTOS</p><p className="font-display text-lg font-extrabold">{loading ? "—" : totalPoints}</p></div><div className="rounded-xl border border-current/25 bg-white/45 px-3 py-2 text-center"><p className="text-[8px] font-bold tracking-[.12em]">POSIÇÃO</p><p className="font-display text-lg font-extrabold">{loading || position === null ? "—" : `${position}º`}</p></div></div></div></section>;
}

function ContestSelector({ contestId, courses, onChange }: { contestId: string; courses: StudyCourseOption[]; onChange: (contestId: string) => void }) {
  const course = courses.find(item => item.id === contestId) ?? courses[0] ?? null;
  const contest = contestCatalog.find(item => item.id === contestId) ?? null;
  const disciplines = contest ? getDisciplinesForContest(contest.id) : [];
  const courseRole = contest?.role ?? (course?.courseType === "tutorial" ? "Tutorial" : course?.track ?? "Trilha de estudo");
  return <section className="mb-6 flex min-w-0 flex-col gap-4 rounded-2xl border border-[#c8dcd6] bg-[#e8f3f0] p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between xl:px-6">{course?.coverImageUrl && <img src={course.coverImageUrl} alt={`Capa do curso ${course.title}`} className="h-16 w-full rounded-xl border border-[#b7d1c8] object-cover sm:h-20 xl:w-32" />}<div className="min-w-0 flex-1"><p className="eyebrow text-[#176a5a]">{course?.courseType === "tutorial" ? "CURSO TUTORIAL" : "MATRIZ DE ESTUDO"}</p><p className="font-display mt-1 break-words text-xl font-bold leading-tight text-[#173d4a]">{course?.title ?? "Curso liberado"} · {courseRole}</p><p className="mt-2 max-w-2xl text-sm leading-6 text-[#52716f]">{course?.description || (course?.courseType === "tutorial" ? "Este curso Tutorial tem acesso somente aos conteúdos liberados para esta trilha." : "A seleção define quais disciplinas do catálogo ficam visíveis nesta trilha. O conteúdo pode ser compartilhado com outros concursos sem duplicação.")}</p></div><div className="flex min-w-0 w-full flex-col gap-2 border-t border-[#c8dcd6] pt-4 xl:w-[min(100%,24rem)] xl:flex-row xl:items-center xl:gap-3 xl:border-t-0 xl:pt-0"><span className="self-start rounded-full border border-[#c8dcd6] bg-white/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#52716f] xl:self-auto xl:shrink-0 xl:border-0 xl:bg-transparent xl:px-0 xl:py-0 xl:text-right">{disciplines.length} disciplinas</span><select aria-label="Selecionar curso liberado" value={contestId} onChange={(event) => onChange(event.target.value)} className="w-full min-w-0 rounded-xl border border-[#a9cfc4] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#173d4a] outline-none focus:ring-2 focus:ring-[#82cfbf] xl:min-w-[17rem] xl:flex-1">{courses.map(item => <option key={item.id} value={item.id}>{item.title} · {item.courseType === "tutorial" ? "Tutorial" : item.track}</option>)}</select></div></section>;
}

type CompetitionQuestionView = { id: number; statement: string; questionType: "certo_errado" | "multipla_escolha"; options: string[]; difficulty: "basic" | "intermediate" | "advanced"; source: string | null; banca: string | null; year: number | null };
type CompetitionRoundView = { id: string; courseId: string | null; total: number; questions: CompetitionQuestionView[]; index: number };
type CompetitionFeedback = { correct: boolean; pointsEarned: number; explanation: string | null; completed: boolean };
type CompetitionHistoryView = { id: string; courseId: string | null; createdAt: Date; completedAt: Date | null; totalQuestions: number; answeredQuestions: number; correctAnswers: number; earnedPoints: number };
type CompetitionMonthlyGoalView = { period: string; targetPoints: number; targetCompletedRounds: number; rewardTitle: string; rewardDescription: string; isActive: boolean; earnedPoints: number; completedRounds: number; remainingPoints: number; remainingCompletedRounds: number; achieved: boolean };

function CompetitionProgressPanel({ defaultCourseId }: { defaultCourseId: string }) {
  const [filter, setFilter] = useState("global");
  const courseId = filter === "global" ? undefined : filter;
  const courses = trpc.competition.courses.useQuery(undefined, { refetchOnWindowFocus: false });
  const history = trpc.competition.history.useQuery({ courseId }, { refetchOnWindowFocus: false });
  const goal = trpc.competition.monthlyGoal.useQuery({ courseId }, { refetchOnWindowFocus: false });
  const displayGoal = goal.data as CompetitionMonthlyGoalView | undefined;
  const pointProgress = displayGoal ? Math.min(100, (displayGoal.earnedPoints / Math.max(1, displayGoal.targetPoints)) * 100) : 0;
  const roundProgress = displayGoal ? Math.min(100, (displayGoal.completedRounds / Math.max(1, displayGoal.targetCompletedRounds)) * 100) : 0;
  const historyRows = (history.data ?? []) as CompetitionHistoryView[];
  const selectedCourse = filter === "global" ? "Geral" : (courses.data?.find(course => course.id === filter)?.title ?? defaultCourseId);
  return <section className="mx-auto mt-5 max-w-6xl space-y-5 pb-8"><div className="flex flex-col gap-3 rounded-2xl border border-[#c8dcd6] bg-[#e8f3f0] p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5"><div><p className="eyebrow text-[#176a5a]">ACOMPANHAMENTO PESSOAL</p><h3 className="font-display mt-1 text-xl font-bold text-[#173d4a]">Meta mensal e histórico</h3><p className="mt-1 text-sm leading-6 text-[#52716f]">Consulte seu desempenho por recorte sem misturar dados dos simulados.</p></div><label className="min-w-0 sm:w-64"><span className="mb-1 block text-[10px] font-bold tracking-[.14em] text-[#52716f]">RECORTE</span><select value={filter} onChange={event => setFilter(event.target.value)} className="h-10 w-full rounded-xl border border-[#a9cfc4] bg-[#fffdf8] px-3 text-sm font-semibold text-[#173d4a] outline-none focus:ring-2 focus:ring-[#82cfbf]"><option value="global">Geral</option>{courses.data?.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label></div><div className="grid gap-5 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]"><section className="shell-card min-w-0 p-5 sm:p-6">{goal.isLoading ? <p className="text-sm text-[#60717a]">Calculando a meta mensal...</p> : !displayGoal?.isActive ? <div className="rounded-xl border border-dashed border-[#cbd9d4] bg-[#fbfdfc] p-5"><p className="font-bold text-[#274952]">Meta mensal inativa</p><p className="mt-1 text-sm leading-6 text-[#60717a]">A administração ainda não habilitou uma meta para este período.</p></div> : <><div className="flex items-start justify-between gap-3"><div><p className="eyebrow text-[#176a5a]">META DE {displayGoal.period}</p><h4 className="font-display mt-1 text-2xl font-bold text-[#173d4a]">{displayGoal.achieved ? "Meta conquistada" : "Avance no seu ritmo"}</h4></div><Target className={`h-6 w-6 ${displayGoal.achieved ? "text-[#17644e]" : "text-[#c98a26]"}`} /></div><p className="mt-3 text-sm leading-6 text-[#52716f]">{displayGoal.achieved ? <><strong>{displayGoal.rewardTitle}.</strong> {displayGoal.rewardDescription}</> : <>Complete {displayGoal.remainingPoints} ponto(s) e {displayGoal.remainingCompletedRounds} rodada(s) para conquistar <strong>{displayGoal.rewardTitle}</strong>.</>}</p><div className="mt-5 space-y-4"><div><div className="flex justify-between gap-3 text-xs font-bold text-[#315a5d]"><span>PONTOS</span><span>{displayGoal.earnedPoints}/{displayGoal.targetPoints}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e2eee9]"><div className="h-full rounded-full bg-[#17644e] transition-[width] duration-300" style={{ width: `${pointProgress}%` }} /></div></div><div><div className="flex justify-between gap-3 text-xs font-bold text-[#315a5d]"><span>RODADAS CONCLUÍDAS</span><span>{displayGoal.completedRounds}/{displayGoal.targetCompletedRounds}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e2eee9]"><div className="h-full rounded-full bg-[#0e5a70] transition-[width] duration-300" style={{ width: `${roundProgress}%` }} /></div></div></div><p className="mt-5 rounded-xl border border-[#d9e5df] bg-[#f3faf7] p-3 text-xs leading-5 text-[#597674]">O período acompanha o calendário de Brasília e é calculado ao abrir esta página. O reconhecimento é informativo e não adiciona pontos automaticamente.</p></>}</section><section className="shell-card min-w-0 p-5 sm:p-6"><div className="flex items-start justify-between gap-3 border-b border-[#e5ddd0] pb-4"><div><p className="eyebrow text-[#176a5a]">SEU HISTÓRICO</p><h4 className="font-display mt-1 text-2xl font-bold text-[#173d4a]">Rodadas recentes</h4></div><span className="rounded-full bg-[#edf8f4] px-2.5 py-1 text-[10px] font-bold text-[#17644e]">{selectedCourse}</span></div><div className="mt-4 space-y-2">{history.isLoading ? <p className="text-sm text-[#60717a]">Carregando suas rodadas...</p> : historyRows.length ? historyRows.map(round => <div key={round.id} className="rounded-xl border border-[#e1e9e4] bg-[#fbfdfc] p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-[#274952]">{round.completedAt ? "Rodada concluída" : "Rodada em andamento"}</p><span className={`text-sm font-extrabold ${round.earnedPoints >= 0 ? "text-[#17644e]" : "text-[#97452d]"}`}>{round.earnedPoints >= 0 ? "+" : ""}{round.earnedPoints}</span></div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#60717a]"><span>{round.correctAnswers}/{round.answeredQuestions || round.totalQuestions} acertos</span><span>{round.answeredQuestions}/{round.totalQuestions} respondidas</span><span>{new Date(round.createdAt).toLocaleDateString("pt-BR")}</span></div></div>) : <p className="rounded-xl border border-dashed border-[#cbd9d4] p-4 text-sm leading-6 text-[#60717a]">Você ainda não tem rodadas neste recorte. Inicie uma competição para registrar seu histórico.</p>}</div></section></div></section>;
}

function CompetitionArea({ defaultCourseId }: { defaultCourseId: string }) {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState("global");
  const [round, setRound] = useState<CompetitionRoundView | null>(null);
  const [feedback, setFeedback] = useState<CompetitionFeedback | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const courseId = filter === "global" ? undefined : filter;
  const settings = trpc.competition.settings.useQuery(undefined, { refetchOnWindowFocus: false });
  const courses = trpc.competition.courses.useQuery(undefined, { refetchOnWindowFocus: false });
  const ranking = trpc.competition.ranking.useQuery({ courseId }, { refetchOnWindowFocus: false });
  const myScore = trpc.competition.myScore.useQuery({ courseId }, { refetchOnWindowFocus: false });
  const startRound = trpc.competition.startRound.useMutation({
    onSuccess: data => { setRound({ ...data, index: 0 }); setFeedback(null); setNotice(null); },
    onError: error => setNotice(error.message),
  });
  const submitAnswer = trpc.competition.submitAnswer.useMutation({
    onSuccess: async data => {
      setFeedback(data);
      await Promise.all([utils.competition.ranking.invalidate(), utils.competition.myScore.invalidate(), utils.competition.history.invalidate(), utils.competition.monthlyGoal.invalidate()]);
    },
    onError: error => setNotice(error.message),
  });
  const currentQuestion = round?.questions[round.index] ?? null;
  const advance = () => {
    if (!round || !feedback) return;
    if (feedback.completed || round.index >= round.questions.length - 1) { setRound(null); setFeedback(null); setNotice("Rodada concluída. Sua pontuação já foi registrada no ranking."); return; }
    setRound(current => current ? { ...current, index: current.index + 1 } : null);
    setFeedback(null);
  };
  const formatPoints = (points: number) => `${points >= 0 ? "+" : ""}${points} ponto${Math.abs(points) === 1 ? "" : "s"}`;

  return <section className="mx-auto max-w-6xl space-y-5 pb-5"><div className="relative overflow-hidden rounded-2xl border border-[#0c3442] bg-[#183542] px-5 py-7 text-white sm:px-8 sm:py-9"><div className="absolute -right-10 -top-14 h-48 w-48 rounded-full border border-[#9cd8cb]/25" /><div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end"><div className="max-w-2xl"><p className="text-[10px] font-bold tracking-[.18em] text-[#9fdccd]">COMPETIÇÃO INDEPENDENTE</p><h2 className="font-display mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">Teste seu ritmo no ranking.</h2><p className="mt-3 text-sm leading-6 text-[#d7ebe6]">Responda uma rodada do banco de questões e acompanhe sua posição. Os resultados desta área são separados de simulados, XP e revisões.</p></div><div className="rounded-2xl border border-[#8ad2c3]/35 bg-[#102d38]/75 p-4"><p className="text-[10px] font-bold tracking-[.16em] text-[#a8dcd1]">SUA PONTUAÇÃO</p><p className="font-display mt-1 text-3xl font-extrabold">{myScore.data?.totalPoints ?? 0}</p><p className="mt-1 text-xs text-[#c6e6df]">{myScore.data?.position ? `${myScore.data.position}º lugar neste recorte` : "Ainda sem posição no ranking"}</p></div></div></div><div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(19rem,.85fr)]"><section className="shell-card min-w-0 p-5 sm:p-6"><div className="flex flex-col gap-3 border-b border-[#e5ddd0] pb-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow text-[#176a5a]">QUIZ COMPETITIVO</p><h3 className="font-display mt-1 text-2xl font-bold text-[#173d4a]">Sua rodada</h3></div><label className="min-w-0 sm:w-64"><span className="mb-1 block text-[10px] font-bold tracking-[.14em] text-[#52716f]">RANKING E QUESTÕES</span><select value={filter} onChange={event => { setFilter(event.target.value); setRound(null); setFeedback(null); setNotice(null); }} disabled={Boolean(round)} className="h-10 w-full rounded-xl border border-[#cbd9d4] bg-[#fffdf8] px-3 text-sm font-semibold text-[#274952] outline-none focus:ring-2 focus:ring-[#82cfbf]"><option value="global">Geral</option>{courses.data?.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label></div>{!settings.data?.isActive && !settings.isLoading ? <div className="mt-5 rounded-xl border border-[#e3c5b7] bg-[#fff8f4] p-4 text-sm text-[#783c2b]"><strong>Competição pausada.</strong> A administração ainda não liberou novas rodadas.</div> : !round ? <div className="mt-6 rounded-2xl border border-dashed border-[#b9d6cb] bg-[#f3faf7] p-6 text-center"><Trophy className="mx-auto h-9 w-9 text-[#0e5a70]" /><h4 className="font-display mt-3 text-xl font-bold text-[#173d4a]">Pronto para competir?</h4><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#5d777d]">A rodada terá até {settings.data?.questionsPerRound ?? 10} questões. Acertos valem {settings.data?.pointsPerCorrect ?? 10} ponto(s){(settings.data?.pointsPerWrong ?? 0) ? ` e erros descontam ${settings.data?.pointsPerWrong} ponto(s)` : " e erros não descontam pontos"}.</p><button type="button" onClick={() => startRound.mutate({ courseId: filter === "global" ? undefined : filter || defaultCourseId })} disabled={startRound.isPending || settings.isLoading} className="action-button mt-5 min-h-11 disabled:cursor-not-allowed disabled:opacity-55">{startRound.isPending ? "Preparando rodada..." : "Iniciar competição"}</button></div> : currentQuestion ? <div className="mt-5"><div className="flex items-center justify-between gap-3"><span className="rounded-full border border-[#b8d4cc] bg-[#f1faf7] px-2.5 py-1 text-[10px] font-bold text-[#176a5a]">QUESTÃO {round.index + 1} DE {round.total}</span><span className="text-xs font-semibold text-[#60717a]">{currentQuestion.difficulty === "basic" ? "Fácil" : currentQuestion.difficulty === "advanced" ? "Avançada" : "Intermediária"}</span></div><p className="font-display mt-5 text-xl font-bold leading-8 text-[#173d4a]">{currentQuestion.statement}</p><div className="mt-5 grid gap-3">{currentQuestion.questionType === "certo_errado" ? ([{ label: "Certo", value: true }, { label: "Errado", value: false }] as const).map(option => <button key={option.label} type="button" disabled={submitAnswer.isPending || Boolean(feedback)} onClick={() => submitAnswer.mutate({ roundId: round.id, questionId: currentQuestion.id, submittedAnswer: option.value })} className="min-h-12 rounded-xl border border-[#bed5ce] bg-[#fffdf8] px-4 text-left text-sm font-bold text-[#173d4a] transition hover:border-[#0e5a70] hover:bg-[#eef8f5] disabled:cursor-not-allowed disabled:opacity-60">{option.label}</button>) : currentQuestion.options.map((option, index) => <button key={option} type="button" disabled={submitAnswer.isPending || Boolean(feedback)} onClick={() => submitAnswer.mutate({ roundId: round.id, questionId: currentQuestion.id, submittedAnswer: option })} className="min-h-12 rounded-xl border border-[#bed5ce] bg-[#fffdf8] px-4 text-left text-sm font-bold text-[#173d4a] transition hover:border-[#0e5a70] hover:bg-[#eef8f5] disabled:cursor-not-allowed disabled:opacity-60"><span className="mr-2 text-[#0e5a70]">{String.fromCharCode(65 + index)}.</span>{option}</button>)}</div>{feedback && <div className={`mt-5 rounded-xl border p-4 ${feedback.correct ? "border-[#b9d6cb] bg-[#edf8f4] text-[#17644e]" : "border-[#e0b6a8] bg-[#fff2ed] text-[#97452d]"}`}><p className="font-bold">{feedback.correct ? "Resposta correta." : "Resposta incorreta."} <span className="font-medium">{formatPoints(feedback.pointsEarned)}.</span></p>{feedback.explanation && <p className="mt-2 text-sm leading-6">{feedback.explanation}</p>}<button type="button" onClick={advance} className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-current/35 px-3 text-xs font-bold">{feedback.completed || round.index >= round.questions.length - 1 ? "Ver resultado" : "Próxima questão"}<ChevronRight className="ml-1 h-4 w-4" /></button></div>}</div> : null}{notice && <p role="status" className="mt-5 rounded-xl border border-[#b9d6cb] bg-[#edf8f4] p-3 text-sm text-[#17644e]">{notice}</p>}</section><aside className="shell-card min-w-0 p-5 sm:p-6"><div className="flex items-center justify-between gap-3 border-b border-[#e5ddd0] pb-4"><div><p className="eyebrow text-[#176a5a]">RANKING</p><h3 className="font-display mt-1 text-xl font-bold text-[#173d4a]">Classificação</h3></div><Trophy className="h-5 w-5 text-[#c98a26]" /></div><div className="mt-4 space-y-2">{ranking.isLoading ? <p className="text-sm text-[#60717a]">Carregando ranking...</p> : ranking.data?.length ? ranking.data.map(entry => <div key={entry.userId} className={`flex items-center gap-3 rounded-xl border p-3 ${entry.position <= 3 ? "border-[#d8c890] bg-[#fffaf0]" : "border-[#e1e9e4] bg-[#fbfdfc]"}`}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#183542] text-xs font-bold text-white">{entry.position}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#274952]">{entry.name}</p><p className="text-[10px] text-[#60717a]">{entry.totalCorrect}/{entry.totalAnswered} acertos</p></div><p className="text-sm font-extrabold text-[#0e5a70]">{entry.totalPoints}</p></div>) : <p className="rounded-xl border border-dashed border-[#cbd9d4] p-4 text-sm leading-6 text-[#60717a]">Ainda não há pontuações neste recorte. Inicie a primeira rodada.</p>}</div><p className="mt-5 border-t border-[#e5ddd0] pt-4 text-xs leading-5 text-[#687f7e]">O ranking soma somente respostas desta competição. Não aproveita nem modifica resultados dos simulados.</p></aside></div></section>;
}

function WeeklyStudyPlanner({ progressItems, roadmapItems, onOpenScheduledContent, onSaveRoadmap, onRemoveRoadmap, saving }: { progressItems: StudyProgressItem[]; roadmapItems: RoadmapItem[]; onOpenScheduledContent: (contentId: number) => void; onSaveRoadmap: (input: { disciplineId: number; weekday: number; isActive: boolean }) => void; onRemoveRoadmap: (id: number) => void; saving: boolean }) {
  const weekdayLabels = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const [draft, setDraft] = useState({ disciplineId: 0, weekday: 1 });
  const disciplines = useMemo(() => {
    const unique = new Map<number, { id: number; name: string; firstContentId: number; lessonCount: number }>();
    progressItems.forEach((item) => {
      const existing = unique.get(item.disciplineId);
      if (existing) existing.lessonCount += 1;
      else unique.set(item.disciplineId, { id: item.disciplineId, name: item.disciplineName, firstContentId: item.id, lessonCount: 1 });
    });
    return Array.from(unique.values()).sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  }, [progressItems]);
  const selectedDisciplineId = disciplines.some(item => item.id === draft.disciplineId) ? draft.disciplineId : (disciplines[0]?.id ?? 0);
  const plannedByWeekday = weekdayLabels.map((label, weekday) => ({ label, weekday, items: roadmapItems.filter(item => item.weekday === weekday).sort((left, right) => left.disciplineName.localeCompare(right.disciplineName, "pt-BR")) }));

  return <section className="mx-auto max-w-6xl space-y-5 pb-5">
    <div className="relative overflow-hidden rounded-2xl border border-[#0c3442] bg-[#183542] px-5 py-7 text-white sm:px-8 sm:py-9">
      <div className="absolute -right-10 -top-14 h-48 w-48 rounded-full border border-[#9cd8cb]/25" />
      <div className="relative max-w-2xl"><p className="text-[10px] font-bold tracking-[.18em] text-[#9fdccd]">ROTEIRO SEMANAL</p><h2 className="font-display mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">Organize suas disciplinas por dia.</h2><p className="mt-3 text-sm leading-6 text-[#d7ebe6]">Escolha uma disciplina e o dia da semana. Você pode incluir quantas disciplinas desejar no mesmo dia; horário não é necessário.</p></div>
    </div>
    <div className="shell-card p-5 sm:p-6"><div className="flex flex-col gap-3 border-b border-[#e5ddd0] pb-4 sm:flex-row sm:items-end"><label className="min-w-0 flex-1"><span className="eyebrow block text-[#176a5a]">DISCIPLINA</span><select aria-label="Disciplina do roteiro" value={selectedDisciplineId} onChange={event => setDraft(current => ({ ...current, disciplineId: Number(event.target.value) }))} disabled={!disciplines.length || saving} className="mt-2 w-full rounded-xl border border-[#cbd9d4] bg-[#fffdf8] px-3 py-3 text-sm font-semibold text-[#274952] outline-none focus:ring-2 focus:ring-[#82cfbf]"><option value={0}>Selecione uma disciplina</option>{disciplines.map(item => <option key={item.id} value={item.id}>{item.name} · {item.lessonCount} aula{item.lessonCount === 1 ? "" : "s"}</option>)}</select></label><label className="min-w-0 sm:w-52"><span className="eyebrow block text-[#176a5a]">DIA DA SEMANA</span><select aria-label="Dia da semana" value={draft.weekday} onChange={event => setDraft(current => ({ ...current, weekday: Number(event.target.value) }))} disabled={saving} className="mt-2 w-full rounded-xl border border-[#cbd9d4] bg-[#fffdf8] px-3 py-3 text-sm font-semibold text-[#274952] outline-none focus:ring-2 focus:ring-[#82cfbf]">{weekdayLabels.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label><button type="button" disabled={!selectedDisciplineId || saving} onClick={() => { if (selectedDisciplineId) onSaveRoadmap({ disciplineId: selectedDisciplineId, weekday: draft.weekday, isActive: true }); }} className="action-button min-h-12 shrink-0 disabled:cursor-not-allowed disabled:opacity-55">{saving ? "Salvando" : "Adicionar disciplina"}</button></div><p className="mt-3 text-xs leading-5 text-[#60717a]">Se você selecionar uma disciplina já incluída no roteiro, ela será movida para o novo dia escolhido.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{plannedByWeekday.map(({ label, weekday, items }) => <section key={label} className="min-h-44 rounded-2xl border border-[#d8e5e0] bg-[#fffdf8] p-4"><div className="flex items-center justify-between gap-3 border-b border-[#e9e2d7] pb-3"><h3 className="font-display text-base font-bold text-[#173d4a]">{label}</h3><span className="rounded-full border border-[#b8d4cc] bg-[#f1faf7] px-2 py-1 text-[10px] font-bold text-[#176a5a]">{items.length} disciplina{items.length === 1 ? "" : "s"}</span></div><div className="mt-3 space-y-2">{items.length ? items.map(item => <div key={item.id} className="rounded-xl border border-[#d9e8e3] bg-[#f8fcfa] p-3"><p className="min-w-0 truncate text-sm font-bold text-[#274952]">{item.disciplineName}</p><p className="mt-1 truncate text-xs text-[#60717a]">Começar por: {item.content.title.replace(/^[^—]+—\s*/, "")}</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => onOpenScheduledContent(item.contentId)} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-lg border border-[#b8d4cc] bg-white px-3 text-xs font-bold text-[#0e5a70]">Iniciar <Play className="h-3.5 w-3.5" /></button><button type="button" aria-label={`Remover ${item.disciplineName} de ${label}`} onClick={() => onRemoveRoadmap(item.id)} disabled={saving} className="grid h-9 w-9 place-items-center rounded-lg border border-[#e1c9c1] bg-white text-[#9c4838] disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button></div></div>) : <p className="rounded-xl border border-dashed border-[#c9d8d2] bg-[#fcfdfc] px-3 py-4 text-xs leading-5 text-[#60717a]">Nenhuma disciplina programada.</p>}</div></section>)}</div>
  </section>;
}

function Dashboard({ state, modules, contestName, coverImageUrl, panelLabel, panelBadge, panelTitle, panelDescription, panelCtaText, level, totalAnswers, overallScore, streak, studiedPercent, focus, historyChart, onStudy, onSimulate, continueItem, onOpenScheduledContent, onOpenPlanner }: { state: StudyState; modules: StudyModule[]; contestName: string; coverImageUrl?: string | null; panelLabel?: string | null; panelBadge?: string | null; panelTitle?: string | null; panelDescription?: string | null; panelCtaText?: string | null; level: ReturnType<typeof levelFromXp>; totalAnswers: number; overallScore: number; streak: number; studiedPercent: number; focus: { label: string; detail: string }; historyChart: { label: string; score: number }[]; onStudy: () => void; onSimulate?: () => void; continueItem: StudyProgressItem | null; onOpenScheduledContent: (contentId: number) => void; onOpenPlanner: () => void }) {
  const remaining = modules.filter((module) => !state.completedModules.includes(module.id));
  const contentModules = modules.filter((module) => module.chapter);
  const contentSectionCount = contentModules.reduce((total, module) => total + (module.chapter?.secoes.length ?? 0), 0);
  const presentation = {
    label: panelLabel?.trim() || "OPERAÇÃO DE HOJE",
    badge: panelBadge?.trim() || "DOSSIÊ / ABERTO",
    title: panelTitle?.trim() || "Preparação é evidência acumulada.",
    description: panelDescription?.trim() || "Leia a teoria, entenda os conceitos, veja exemplos resolvidos e pratique no ritmo da sua preparação.",
    ctaText: panelCtaText?.trim() || "Abrir conteúdo",
  };
  return <div className="space-y-7">
    <section className="relative overflow-hidden rounded-md border border-[#0c3442] bg-[#183542] px-5 py-7 text-white sm:px-9 sm:py-11" style={{ backgroundImage: `linear-gradient(90deg, rgba(21,45,56,.98) 0%, rgba(21,45,56,.9) 45%, rgba(21,45,56,.44) 100%), url(${coverImageUrl || imageUrls.desk})`, backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="absolute left-0 top-0 h-full w-1 bg-[#82cfbf]" /><div className="relative min-w-0 max-w-2xl"><div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1"><p className="text-[10px] font-bold tracking-[0.12em] text-[#9edbcf] sm:tracking-[0.22em]">{presentation.label.toUpperCase()} · {contestName.toUpperCase()}</p><span className="hidden h-px w-12 bg-[#82cfbf]/60 sm:block" /><span className="text-[9px] font-bold tracking-[0.12em] text-[#cceae2]">{presentation.badge.toUpperCase()}</span></div><h2 className="font-display break-words text-[clamp(1.8rem,8vw,2.5rem)] font-extrabold leading-[1.12] sm:text-5xl">{presentation.title}</h2><p className="mt-4 max-w-xl text-sm leading-6 text-[#d4e0df] sm:text-base">{presentation.description}</p><div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3"><button className="action-button w-full bg-[#8ad2c3] text-[#17343e] hover:bg-[#b3e7db] sm:w-auto" onClick={onStudy}><BookOpen className="h-4 w-4" />{presentation.ctaText}</button>{onSimulate && <button className="ghost-button w-full border-white/30 bg-white/10 text-white hover:bg-white/15 hover:text-white sm:w-auto" onClick={onSimulate}><Play className="h-4 w-4" />Iniciar simulado</button>}</div></div>
      <div className="absolute right-5 top-5 hidden border border-white/20 bg-[#0f2a34]/80 px-3 py-2 text-[10px] font-bold tracking-wider text-[#cceae2] sm:block">BIBLIOTECA / {modules.length} AULAS</div>
    </section>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Metric icon={Zap} label="XP ACUMULADO" value={state.xp.toString()} detail={`Nível ${level.index} · ${level.label}`} color="teal" /><Metric icon={Gauge} label="DOMÍNIO GERAL" value={`${overallScore}%`} detail={`${totalAnswers} questões respondidas`} color="blue" /><Metric icon={BookOpen} label="AULAS CONCLUÍDAS" value={`${studiedPercent}%`} detail={`${state.completedModules.filter((moduleId) => modules.some((module) => module.id === moduleId)).length}/${modules.length} aulas de conteúdo`} color="amber" /><Metric icon={Flame} label="SEQUÊNCIA" value={`${streak} dia${streak === 1 ? "" : "s"}`} detail="Constância registrada" color="orange" /></section>
    <section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <div className="relative overflow-hidden rounded-2xl border border-[#8abdb3] bg-[#153d43] p-5 text-white sm:p-6"><div className="absolute -right-10 -top-12 h-44 w-44 rounded-full border border-[#9cd8cb]/25" /><div className="relative"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[.18em] text-[#9fdccd]">CONTINUIDADE DE ESTUDO</p><h3 className="font-display mt-2 text-xl font-bold">{continueItem ? continueItem.title.replace(/^[^—]+—\s*/, "") : "Prepare sua próxima aula"}</h3></div><BookOpen className="h-5 w-5 shrink-0 text-[#9fdccd]" /></div><p className="mt-3 max-w-xl text-sm leading-6 text-[#d7ebe6]">{continueItem?.progress?.status === "started" ? "Você já iniciou esta aula. Retome do ponto em que parou e mantenha o ritmo." : continueItem ? "Esta é a próxima aula disponível da sua trilha. Comece agora para registrar sua continuidade." : "Não há conteúdo vinculado à trilha selecionada no momento."}</p>{continueItem && <button type="button" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#a5e0d2] px-4 text-sm font-bold text-[#17343e] transition hover:bg-[#d1f0e8] sm:w-auto" onClick={() => onOpenScheduledContent(continueItem.id)}>Continuar <ChevronRight className="h-4 w-4" /></button>}</div></div>
      <div className="shell-card p-5 sm:p-6"><div className="flex flex-col gap-3 border-b border-[#e5ddd0] pb-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="eyebrow">ROTEIRO SEMANAL</p><h3 className="font-display mt-1 text-xl font-bold">Organize por disciplina e dia.</h3><p className="mt-1 text-xs leading-5 text-[#60717a]">Monte sua semana sem horário fixo e inclua quantas disciplinas desejar em cada dia.</p></div><CalendarClock className="h-5 w-5 shrink-0 text-[#0e5a70]" /></div><button type="button" onClick={onOpenPlanner} className="action-button mt-5 min-h-11 w-full sm:w-auto">Organizar estudos <ChevronRight className="h-4 w-4" /></button></div>
    </section>
    <section className="grid gap-4 xl:grid-cols-[.78fr_1.22fr]">
      <div className="relative min-h-[230px] overflow-hidden rounded-md border border-[#c9dbd6] bg-[#e6f1ee] p-6" style={{ backgroundImage: `linear-gradient(135deg, rgba(230,241,238,.96), rgba(230,241,238,.72)), url(${imageUrls.statistics})`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="relative flex h-full flex-col justify-between"><div><p className="eyebrow text-[#19705d]">COMO ESTUDAR AQUI</p><h3 className="font-display mt-2 max-w-sm text-2xl font-extrabold text-[#173d4a]">Conteúdo que vira repertório.</h3><p className="mt-3 max-w-sm text-sm leading-6 text-[#41635f]">Você não precisa começar por uma lista de cobranças. Comece pela explicação, conecte os conceitos e só depois teste a retenção.</p></div><div className="mt-6 flex flex-wrap gap-2"><span className="rounded-full border border-[#a9d0c5] bg-white/75 px-3 py-1.5 text-[10px] font-bold text-[#176a5a]">{contentModules.length} AULAS</span><span className="rounded-full border border-[#a9d0c5] bg-white/75 px-3 py-1.5 text-[10px] font-bold text-[#176a5a]">{contentSectionCount} NÚCLEOS</span></div></div>
      </div>
      <div className="shell-card p-5 sm:p-6"><div className="mb-5 flex items-end justify-between gap-3"><div><p className="eyebrow">ESTRUTURA DE CADA AULA</p><h3 className="font-display mt-1 text-xl font-bold">Leia, aplique e recupere.</h3></div><BookOpen className="h-5 w-5 text-[#0e5a70]" /></div><div className="grid gap-3 md:grid-cols-3"><div className="rounded-2xl border border-[#d8e6e1] bg-[#f5fbf9] p-4"><BookOpen className="h-5 w-5 text-[#19705d]" /><p className="mt-3 font-display text-sm font-bold text-[#23424d]">Teoria guiada</p><p className="mt-2 text-xs leading-5 text-[#60757a]">Explicações em linguagem direta, com conceitos-chave e conexão entre os temas.</p></div><div className="rounded-2xl border border-[#efdbb8] bg-[#fff8ed] p-4"><Target className="h-5 w-5 text-[#a36b23]" /><p className="mt-3 font-display text-sm font-bold text-[#674d2a]">Exemplo resolvido</p><p className="mt-2 text-xs leading-5 text-[#786544]">Situações práticas para enxergar como o conhecimento aparece em uma questão.</p></div><div className="rounded-2xl border border-[#d3e0eb] bg-[#f4f9fd] p-4"><Brain className="h-5 w-5 text-[#245c70]" /><p className="mt-3 font-display text-sm font-bold text-[#23424d]">Prática ativa</p><p className="mt-2 text-xs leading-5 text-[#60717a]">Desafio, revisão sem consulta e anotação privada para consolidar a memória.</p></div></div></div>
    </section>
    <section className="grid gap-5 xl:grid-cols-[1.32fr_.68fr]">
      <div className="shell-card p-5 sm:p-6"><div className="mb-6 flex items-start justify-between"><div><p className="eyebrow">TRAJETÓRIA</p><h3 className="font-display mt-1 text-xl font-bold">Evolução nos simulados</h3></div><BarChart3 className="h-5 w-5 text-[#0e5a70]" /></div>{historyChart.length ? <div className="h-[210px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={historyChart} margin={{ top: 8, right: 5, left: -24, bottom: 0 }}><defs><linearGradient id="trajectory" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#0e5a70" stopOpacity={.25} /><stop offset="100%" stopColor="#0e5a70" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e6e0d5" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#6d7880", fontSize: 11 }} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#6d7880", fontSize: 11 }} /><Tooltip formatter={(value) => [`${value}%`, "Aproveitamento"]} contentStyle={{ borderRadius: 12, border: "1px solid #d9d3c5", fontSize: 12 }} /><Area type="monotone" dataKey="score" stroke="#0e5a70" strokeWidth={3} fill="url(#trajectory)" /></AreaChart></ResponsiveContainer></div> : <EmptyState icon={BarChart3} title="Ainda não há dados de simulado" text="Complete seu primeiro simulado para transformar desempenho em uma trajetória visual." />}</div>
      <div className="shell-card overflow-hidden"><div className="relative h-28 bg-[#d4e5e1]" style={{ backgroundImage: `linear-gradient(90deg, rgba(14,90,112,.2), rgba(14,90,112,.02)), url(${imageUrls.training})`, backgroundSize: "cover", backgroundPosition: "center" }} /><div className="p-5"><p className="eyebrow">PRÓXIMA LEITURA</p><h3 className="font-display mt-1 text-lg font-bold">{focus.label}</h3><p className="mt-2 text-sm leading-5 text-[#60717a]">{focus.detail}</p><button onClick={onStudy} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#0e5a70]">Abrir conteúdos <ChevronRight className="h-4 w-4" /></button></div></div>
    </section>
    <section className="shell-card p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="eyebrow">PRÓXIMAS AULAS</p><h3 className="font-display mt-1 text-xl font-bold">Seu roteiro de leitura</h3></div><Trophy className="h-5 w-5 text-[#be862b]" /></div><div className="grid gap-3 md:grid-cols-3">{remaining.slice(0, 3).map((module, index) => <div key={module.id} className="rounded-2xl border border-[#e4ddd0] bg-[#fffdf8] p-4"><div className="mb-4 flex items-center justify-between"><span className="rounded-lg bg-[#e7f0ee] px-2 py-1 text-[10px] font-bold tracking-wider text-[#0e5a70]">{module.code}</span><span className="text-xs font-bold text-[#8a7561]">0{index + 1}</span></div><p className="font-display text-sm font-bold">{module.title}</p><p className="mt-2 line-clamp-2 text-xs leading-5 text-[#687780]">{module.summary}</p></div>)}{!remaining.length && <p className="text-sm text-[#60717a]">Todo o conteúdo foi concluído. Faça uma revisão ou um simulado para consolidar o domínio.</p>}</div></section>
  </div>;
}

function Metric({ icon: Icon, label, value, detail, color }: { icon: typeof Zap; label: string; value: string; detail: string; color: "teal" | "blue" | "amber" | "orange" }) { const styles = { teal: "border-[#9bcabc] text-[#0e5a70]", blue: "border-[#9dbdc8] text-[#245c70]", amber: "border-[#dfc08c] text-[#a36b23]", orange: "border-[#dfb090] text-[#b45e2d]" }; return <div className="relative border border-[#d5cdbd] bg-[#fffdf8] p-5 shadow-[0_8px_18px_-20px_rgba(21,45,56,.7)]"><span className={`absolute right-4 top-4 border px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${styles[color]}`}>REG</span><div><p className="text-[10px] font-bold tracking-[0.16em] text-[#6f7d83]">{label}</p><p className="font-display mt-2 text-3xl font-extrabold tracking-tight text-[#17343e]">{value}</p></div><div className="mt-4 flex items-center gap-2 border-t border-[#ebe4d8] pt-3"><Icon className={`h-3.5 w-3.5 ${styles[color].split(" ")[1]}`} /><p className="text-xs text-[#6f7d83]">{detail}</p></div></div>; }

function StudyArea({ state, modules, contestName, contentByModuleId, onOpen }: { state: StudyState; modules: StudyModule[]; contestName: string; contentByModuleId: Map<string, StudyProgressItem>; onOpen: (module: StudyModule) => void }) {
  const byDiscipline = modules.reduce<Record<string, StudyModule[]>>((groups, module) => {
    const disciplineId = getDisciplineIdForModule(module);
    const discipline = disciplineId ? getDisciplineById(disciplineId)?.name ?? module.discipline : module.discipline;
    (groups[discipline] ??= []).push(module);
    return groups;
  }, {});
  return <div className="space-y-7">
    <section className="flex flex-col justify-between gap-4 border-b border-[#d7cfc1] pb-6 sm:flex-row sm:items-end">
      <div><p className="eyebrow">BIBLIOTECA DE CONTEÚDO · {contestName.toUpperCase()}</p><h2 className="font-display mt-2 text-3xl font-extrabold">Estude o conteúdo sem atalhos.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#62727a]">Cada aula combina explicação autoral, conceitos-chave, exemplo resolvido, atenção de prova e prática ativa. O mapa do edital aparece como referência; a prioridade aqui é entender e recuperar o conteúdo.</p></div>
      <div className="rounded-xl border border-[#d5cdbd] bg-[#fffdf8] px-4 py-3 text-sm"><span className="font-bold text-[#0e5a70]">{state.completedModules.filter((moduleId) => modules.some((module) => module.id === moduleId)).length}</span> de {modules.length} aulas concluídas</div>
    </section>
    {Object.entries(byDiscipline).map(([discipline, modules]) => {
      const contentCount = modules.reduce((total, module) => total + (module.chapter?.secoes.length ?? module.concepts.length), 0);
      return <section key={discipline}>
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1"><span className="font-display text-sm font-bold text-[#0e5a70]">{discipline}</span><span className="h-px min-w-8 flex-1 bg-[#d7cfc1]" /><span className="text-[10px] font-bold tracking-wider text-[#8a7561]">BLOCO {modules[0].block} · {modules.length} AULAS · {contentCount} NÚCLEOS DE CONTEÚDO</span></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{modules.map((module) => {
          const done = state.completedModules.includes(module.id);
          const notice = contentByModuleId.get(module.id)?.notice;
          return <button key={module.id} onClick={() => onOpen(module)} className="group text-left shell-card relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-[0_20px_35px_-28px_rgba(14,90,112,.8)]">
            <div className="mb-4 flex items-start justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-[#e8f0ee] px-2 py-1 text-[10px] font-bold tracking-wider text-[#0e5a70]">{module.code}</span>{notice && <span className={`rounded-full border px-2 py-1 text-[9px] font-bold tracking-wider ${notice.kind === "new" ? "border-[#8bc9b7] bg-[#ecfaf4] text-[#176a5a]" : "border-[#efc47d] bg-[#fff5e5] text-[#8d611a]"}`}>{notice.label}</span>}</div>{done ? <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-[#16806b]"><Check className="h-3.5 w-3.5" />REGISTRADO</span> : <span className="shrink-0 text-[10px] font-bold text-[#ad8a58]">+20 XP</span>}</div>
            <h3 className="font-display text-base font-bold">{module.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-5 text-[#67767d]">{module.summary}</p>
            <div className="mt-4 flex items-center justify-between"><span className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-[#76848a]"><Clock3 className="h-3.5 w-3.5" />{module.estimatedMinutes} MIN</span><span className="text-[10px] font-bold text-[#0e5a70]">{module.chapter?.secoes.length ?? module.concepts.length} NÚCLEOS DE CONTEÚDO</span></div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-[#0e5a70]">Ler aula completa <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" /></div>
          </button>;
        })}</div>
      </section>;
    })}
  </div>;
}
function ModulePanel({ module, body, completed, onComplete, onClose }: { module: StudyModule; body: string | null; completed: boolean; onComplete: () => void; onClose: () => void }) {
  const [challengeAnswer, setChallengeAnswer] = useState<number | null>(null);
  const [revealRecall, setRevealRecall] = useState(false);
  const chapter = module.chapter;
  if (body?.trim()) return <div className="fixed inset-0 z-50 grid place-items-center bg-[#152d38]/55 p-3 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[1.35rem] bg-[#fffdf8] shadow-2xl"><div className="sticky top-0 flex items-start justify-between border-b border-[#e6ded1] bg-[#fffdf8]/95 p-5 backdrop-blur"><div><p className="eyebrow">AULA EDITADA PELO NÚCLEO</p><h2 className="font-display mt-1 text-xl font-bold">{module.title}</h2></div><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-[#ded6c9]"><X className="h-4 w-4" /></button></div><div className="space-y-6 p-5 sm:p-7"><RichContentBody body={body}/><StudyNotePanel moduleId={module.id}/><div className="flex justify-end border-t border-[#e6ded1] pt-5"><button onClick={() => { onComplete(); onClose(); }} disabled={completed} className="action-button disabled:cursor-default disabled:bg-[#6e969c]">{completed ? "Aula concluída" : "Concluir aula · +20 XP"}</button></div></div></div></div>;
  if (chapter) return <><ApostilaModulePanel module={module} chapter={chapter} completed={completed} onComplete={onComplete} onClose={onClose} /><StudyNotePanel moduleId={module.id} /></>;
  const isCorrect = challengeAnswer === module.lesson.challenge.correct;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#152d38]/55 p-3 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[1.35rem] bg-[#fffdf8] shadow-2xl"><div className="sticky top-0 flex items-start justify-between border-b border-[#e6ded1] bg-[#fffdf8]/95 p-5 backdrop-blur"><div><p className="eyebrow">AULA INTERATIVA · {module.code} · BLOCO {module.block} · {module.estimatedMinutes} MIN</p><h2 className="font-display mt-1 text-xl font-bold">{module.title}</h2></div><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-[#ded6c9]"><X className="h-4 w-4" /></button></div><div className="space-y-6 p-5 sm:p-7"><section className="rounded-2xl border border-[#b8d6d0] bg-[#edf7f4] p-5"><p className="eyebrow text-[#19705d]">O QUE VOCÊ VAI APRENDER</p><p className="mt-2 text-[15px] leading-7 text-[#285d55]">{module.summary}</p></section><section><div className="mb-3 flex items-center justify-between"><p className="eyebrow">EXPLICAÇÃO GUIADA</p><span className="text-[10px] font-bold tracking-wider text-[#76848a]">LEIA · CONECTE · APLIQUE</span></div><div className="space-y-3">{module.lesson.teach.map((paragraph, index) => <article key={paragraph} className="relative overflow-hidden rounded-2xl border border-[#e7dfd2] bg-[#faf7f0] p-5"><span className="absolute left-0 top-0 h-full w-1 bg-[#0e5a70]" /><div className="flex gap-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#dceee9] font-display text-sm font-bold text-[#0e5a70]">{index + 1}</span><p className="text-[15px] leading-7 text-[#405861]">{paragraph}</p></div></article>)}</div></section><section className="grid gap-3 md:grid-cols-[1fr_.8fr]"><div className="rounded-2xl border border-[#f0d5ab] bg-[#fff4e5] p-5"><p className="eyebrow text-[#9a6427]">ATENÇÃO DE PROVA</p><ul className="mt-3 space-y-2 text-sm leading-6 text-[#6d542f]">{module.attention.map((item) => <li key={item} className="flex gap-2"><span>•</span><span>{item}</span></li>)}</ul></div><div className="rounded-2xl bg-[#183542] p-5 text-[#eef5f3]"><p className="text-[10px] font-bold tracking-[0.18em] text-[#93d6c6]">GANCHO DE MEMÓRIA</p><p className="font-display mt-3 text-lg font-bold leading-7">{module.mnemonic}</p><p className="mt-3 text-xs leading-5 text-[#c8d9d8]">Diga o gatilho em voz alta e explique-o sem olhar antes de seguir.</p></div></section><section className="rounded-2xl border border-[#c8ddd7] bg-[#f7fcfa] p-5"><div className="flex items-center gap-2"><Brain className="h-5 w-5 text-[#0e5a70]" /><div><p className="eyebrow">DESAFIO DE 30 SEGUNDOS</p><h3 className="font-display mt-1 text-lg font-bold text-[#173d4a]">Teste agora o que acabou de aprender.</h3></div></div><p className="mt-4 text-[15px] leading-7 text-[#2c515c]">{module.lesson.challenge.prompt}</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{module.lesson.challenge.options.map((option, index) => <button key={option} onClick={() => setChallengeAnswer(index)} className={`rounded-xl border-2 p-4 text-left text-sm font-bold transition ${challengeAnswer === index ? isCorrect === (index === module.lesson.challenge.correct) ? "border-[#16806b] bg-[#e4f3ed] text-[#17644e]" : "border-[#c5663e] bg-[#f8e8de] text-[#913f22]" : "border-[#d8d0c3] bg-white text-[#36505a] hover:border-[#0e5a70]"}`}><span className="text-[10px] tracking-wider text-[#718087]">ALTERNATIVA {index + 1}</span><span className="mt-1 block">{option}</span></button>)}</div>{challengeAnswer !== null && <div className={`mt-4 rounded-xl p-4 text-sm leading-6 ${isCorrect ? "bg-[#e4f3ed] text-[#17644e]" : "bg-[#f8e8de] text-[#913f22]"}`}><strong>{isCorrect ? "Boa! " : "Quase lá. "}</strong>{module.lesson.challenge.feedback}</div>}</section><section className="rounded-2xl border border-[#d8cec0] bg-[#faf7f0] p-5"><p className="eyebrow">REVISÃO ATIVA · SEM CONSULTAR</p><p className="font-display mt-2 text-lg font-bold text-[#25434e]">{module.lesson.recall.prompt}</p>{revealRecall ? <div className="mt-4 rounded-xl bg-[#e8f0ee] p-4 text-sm leading-6 text-[#285d55]"><strong>Resposta:</strong> {module.lesson.recall.answer}</div> : <button onClick={() => setRevealRecall(true)} className="ghost-button mt-4"><Sparkles className="h-4 w-4" />Ver resposta e conferir</button>}</section><section><p className="eyebrow mb-3">MAPA DO EDITAL NESTA AULA</p><div className="grid gap-2 sm:grid-cols-2">{module.checklist.map((item) => <div key={item} className="flex gap-2 rounded-xl border border-[#e7dfd2] bg-[#fffdf8] px-3 py-3 text-sm leading-5 text-[#415a62]"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16806b]" /><span>{item}</span></div>)}</div></section><section className="rounded-2xl bg-[#183542] p-5 text-[#eef5f3]"><p className="text-[10px] font-bold tracking-[0.18em] text-[#93d6c6]">EXEMPLO COMPLEMENTAR</p><p className="mt-2 text-sm leading-6">{module.example}</p></section><StudyNotePanel moduleId={module.id} /><p className="text-xs text-[#79848a]">Fonte: {module.source}</p><div className="flex flex-col-reverse gap-3 border-t border-[#e6ded1] pt-5 sm:flex-row sm:justify-end"><button onClick={onClose} className="ghost-button">Voltar ao mapa</button><button onClick={() => { onComplete(); onClose(); }} disabled={completed} className="action-button disabled:cursor-default disabled:bg-[#6e969c]">{completed ? <><Check className="h-4 w-4" />Aula concluída</> : <><Award className="h-4 w-4" />Concluir aula · +20 XP</>}</button></div></div></div></div>;
}

function StudyNotePanel({ moduleId }: { moduleId: string }) {
  const noteQuery = trpc.study.note.useQuery({ moduleId }, { refetchOnWindowFocus: false });
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (noteQuery.data) setContent(noteQuery.data.content); }, [noteQuery.data]);
  const save = trpc.study.saveNote.useMutation({ onSuccess: () => { setSaved(true); void noteQuery.refetch(); } });
  return <section className="rounded-2xl border border-[#bdcec9] bg-[#edf7f4] p-5"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><MessageSquareText className="mt-0.5 h-5 w-5 text-[#0e5a70]"/><div><p className="eyebrow text-[#176a5a]">ANOTAÇÃO PRIVADA</p><h3 className="font-display mt-1 text-lg font-bold text-[#173d4a]">Seu resumo desta aula</h3><p className="mt-1 text-xs leading-5 text-[#55736f]">Visível somente para a sua conta e vinculada a este módulo.</p></div></div><span className="border border-[#a5cfc5] bg-white px-2 py-1 text-[9px] font-bold tracking-wide text-[#176a5a]">PRIVADA</span></div><Textarea value={content} onChange={event => { setContent(event.target.value); setSaved(false); }} maxLength={12000} placeholder="Registre conceitos, erros recorrentes, atalhos de memória e pontos para revisar." className="mt-4 min-h-32 resize-y border-[#b9cec8] bg-white text-sm leading-6"/><div className="mt-3 flex items-center justify-between gap-3"><p className="text-[10px] text-[#6c8381]">{content.length}/12000 caracteres{saved ? " · Salvo" : ""}</p><button disabled={save.isPending} onClick={() => save.mutate({ moduleId, content })} className="action-button px-4 py-2 text-xs disabled:opacity-60">{save.isPending ? "Salvando..." : "Salvar anotação"}</button></div>{save.error && <p className="mt-2 text-xs font-semibold text-[#99462e]">{save.error.message}</p>}</section>;
}

function QuickCheck({ question, answer, correct, reviewSaved, reviewPending, onAnswer, onDismiss, onSaveForReview }: { question: StudyQuestion; answer: boolean | null; correct: boolean | null; reviewSaved: boolean; reviewPending: boolean; onAnswer: (answer: boolean) => void; onDismiss: () => void; onSaveForReview: () => void }) { return <div className="fixed bottom-4 right-4 z-20 w-[calc(100%-2rem)] max-w-md rounded-[1.2rem] border border-[#d5cdbd] bg-[#fffdf8] p-4 shadow-[0_20px_45px_-25px_rgba(21,45,56,.55)] sm:bottom-7 sm:right-7"><div className="mb-3 flex items-center justify-between gap-3"><span className="eyebrow">CHECAGEM DIÁRIA · {question.discipline}</span><div className="flex items-center gap-2"><Brain className="h-4 w-4 text-[#0e5a70]" /><button type="button" aria-label="Fechar checagem diária por hoje" title="Fechar por hoje" onClick={onDismiss} className="grid h-7 w-7 place-items-center rounded-lg text-[#557078] hover:bg-[#e8f0ee] hover:text-[#0e5a70]"><X className="h-4 w-4" /></button></div></div><p className="text-sm font-medium leading-6 text-[#2c4652]">{question.statement}</p>{answer === null ? <div className="mt-4 flex gap-2"><button className="ghost-button flex-1" onClick={() => onAnswer(true)}>CERTO</button><button className="ghost-button flex-1" onClick={() => onAnswer(false)}>ERRADO</button></div> : <div className={`mt-4 rounded-xl p-3 ${correct ? "bg-[#e2f2eb] text-[#17644e]" : "bg-[#f7e6dc] text-[#9b4b25]"}`}><div className="flex items-center gap-2 text-xs font-bold">{correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}{correct ? "Registro correto · +8 XP" : "Revise a evidência · +2 XP"}</div><p className="mt-1 text-xs leading-5">{question.explanation}</p><div className="mt-3 flex flex-wrap gap-3"><button disabled={reviewSaved || reviewPending} onClick={onSaveForReview} className="text-xs font-bold underline disabled:cursor-default disabled:no-underline disabled:opacity-70">{reviewSaved ? "Guardada na minha revisão" : reviewPending ? "Guardando..." : "Adicionar à minha revisão"}</button><button onClick={onDismiss} className="inline-flex items-center gap-1 text-xs font-bold underline">Fechar por hoje <X className="h-3.5 w-3.5" /></button></div></div>}</div>; }

function Simulations({ onStart, state, notice, strictReviewMode, centralCount }: { onStart: (size: number) => void; state: StudyState; notice: string | null; strictReviewMode: boolean; centralCount: number }) { return <div className="space-y-7"><section className="rounded-[1.35rem] bg-[#183542] p-7 text-white sm:p-9"><p className="text-[10px] font-bold tracking-[0.22em] text-[#9edbcf]">SALA DE PROVA</p><h2 className="font-display mt-2 text-3xl font-extrabold">Simulado por proporção oficial.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-[#c8d9d8]">A matriz do Agente PF tem 120 itens: <strong>60 no Bloco I</strong>, <strong>36 no Bloco II</strong> e <strong>24 no Bloco III</strong>. Cada simulado mantém exatamente a proporção de 50% / 30% / 20%.</p>{strictReviewMode && <p className="mt-4 border border-[#81b9b2] bg-[#164c59] p-3 text-xs leading-5 text-[#d9f1ed]">Revisão obrigatória ativa: esta sala usa exclusivamente as {centralCount} questão(ões) centrais aprovadas ou publicadas.</p>}{notice && <p role="status" className="mt-4 border border-[#efc76f] bg-[#fff6dc] p-3 text-xs leading-5 text-[#624813]">{notice}</p>}<div className="mt-6 flex flex-wrap gap-3">{[10, 20, 60].map((size) => <button key={size} onClick={() => onStart(size)} className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-left transition hover:bg-[#8ad2c3] hover:text-[#17343e]"><p className="font-display text-lg font-bold">{size} itens</p><p className="mt-1 text-[10px] font-bold tracking-wider text-inherit opacity-75">INICIAR AGORA</p></button>)}</div></section><section className="grid gap-4 md:grid-cols-3">{blocks.map((block) => <div className="shell-card p-5" key={block.id}><p className="eyebrow">{block.label}</p><p className="font-display mt-2 text-2xl font-extrabold">{block.ratio * 100}%</p><p className="mt-1 text-sm text-[#65757d]">{block.items} itens no edital · {block.description}</p></div>)}</section><section className="shell-card p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="eyebrow">BANCO OPERACIONAL</p><h3 className="font-display mt-1 text-xl font-bold">{strictReviewMode ? "Biblioteca central revisada" : "Questões Cebraspe de treino"}</h3><p className="mt-2 text-sm text-[#64757e]">{strictReviewMode ? `${centralCount} questão(ões) elegível(eis) no banco central.` : `${centralCount} itens autorais em formato CERTO/ERRADO, cada um com explicação e dica de revisão.`}</p></div><div className="rounded-xl bg-[#e5f0ee] px-3 py-2 text-right"><p className="font-display text-lg font-bold text-[#0e5a70]">{state.simulations.length}</p><p className="text-[9px] font-bold tracking-wider text-[#56808a]">SIMULADOS</p></div></div></section></div>; }

function SimulationScreen({ simulation, onAnswer, onExit }: { simulation: NonNullable<ActiveSimulation>; onAnswer: (answer: boolean) => void; onExit: () => void }) {
  const question = simulation.questions[simulation.index];
  const progress = ((simulation.index + 1) / simulation.questions.length) * 100;
  const selectedAnswer = Object.prototype.hasOwnProperty.call(simulation.answers, question.id) ? simulation.answers[question.id] : undefined;
  const feedback = simulationAnswerFeedback(selectedAnswer, question.answer, simulation.index === simulation.questions.length - 1);
  const personalReviewsQuery = trpc.study.review.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const addReviewMutation = trpc.study.review.add.useMutation();
  const reviewSaved = (personalReviewsQuery.data ?? []).some((item) => item.questionKey === question.id);
  const saveForReview = () => addReviewMutation.mutate({ questionKey: question.id, snapshot: { statement: question.statement, answer: question.answer, explanation: question.explanation, discipline: question.discipline, subject: question.subject, source: question.source } }, { onSuccess: () => void personalReviewsQuery.refetch() });

  return <div className="mx-auto max-w-4xl">
    <div className="mb-7 flex items-center justify-between"><div><p className="eyebrow">SIMULADO EM ANDAMENTO</p><p className="font-display mt-1 text-lg font-bold">Item {simulation.index + 1} de {simulation.questions.length}</p></div><button className="ghost-button" onClick={onExit}><X className="h-4 w-4" />Abandonar</button></div>
    <div className="mb-8 h-2 overflow-hidden rounded-full bg-[#ddd5c7]"><div className="h-full bg-[#0e5a70] transition-all duration-300" style={{ width: `${progress}%` }} /></div>
    <article className="shell-card mt-5 p-6 sm:p-10">
      <div className="mb-8 flex flex-wrap gap-2"><span className="rounded-lg bg-[#e4efed] px-2 py-1 text-[10px] font-bold tracking-wider text-[#0e5a70]">BLOCO {question.block}</span><span className="rounded-lg bg-[#f4ecdd] px-2 py-1 text-[10px] font-bold tracking-wider text-[#91713d]">{question.discipline}</span><span className="rounded-lg border border-[#e4ddd0] px-2 py-1 text-[10px] font-bold tracking-wider text-[#718087]">{question.difficulty}</span></div>
      <p className="font-display text-xl font-bold leading-9 text-[#1c3945] sm:text-2xl">{question.statement}</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#c8dcd6] bg-[#edf7f4] p-3"><p className="text-sm text-[#496a70]">Julgue o item e, se desejar, guarde-o para revisar depois.</p><button disabled={reviewSaved || addReviewMutation.isPending} onClick={saveForReview} className="rounded-lg border border-[#8ab9b0] bg-white px-3 py-2 text-xs font-bold text-[#0e5a70] disabled:opacity-65">{reviewSaved ? "Na minha revisão" : addReviewMutation.isPending ? "Guardando..." : "Adicionar à minha revisão"}</button></div>
      {!feedback.hasAnswered ? <div className="mt-9 grid gap-3 sm:grid-cols-2"><button onClick={() => onAnswer(true)} className="rounded-2xl border-2 border-[#b9d4d0] bg-[#f2f8f6] px-6 py-5 text-left transition hover:border-[#0e5a70] hover:bg-[#e0f0ec]"><span className="font-display text-lg font-extrabold text-[#0e5a70]">CERTO</span><span className="mt-1 block text-xs text-[#54717a]">O item está correto.</span></button><button onClick={() => onAnswer(false)} className="rounded-2xl border-2 border-[#dccfc0] bg-[#fdf8f0] px-6 py-5 text-left transition hover:border-[#aa683b] hover:bg-[#f5eadf]"><span className="font-display text-lg font-extrabold text-[#9d5b31]">ERRADO</span><span className="mt-1 block text-xs text-[#7a6554]">O item contém incorreção.</span></button></div> : <div className={`mt-7 rounded-2xl border p-5 ${feedback.isCorrect ? "border-[#a4d2c4] bg-[#edf7f4]" : "border-[#e4c6b8] bg-[#fcf1eb]"}`}><p className={`text-sm font-extrabold ${feedback.isCorrect ? "text-[#17644e]" : "text-[#9b4b25]"}`}>{feedback.resultLabel} · gabarito: {question.answer ? "CERTO" : "ERRADO"}</p><p className="mt-2 text-sm leading-6 text-[#385760]">{question.explanation}</p><button onClick={() => onAnswer(selectedAnswer!)} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0e5a70] px-4 py-2.5 text-sm font-bold text-white">{feedback.nextLabel}<ChevronRight className="h-4 w-4" /></button></div>}
    </article>
  </div>;
}

function SimulationResult({ result, onAgain, onClose }: { result: SimulationRecord; onAgain: () => void; onClose: () => void }) { const score = percentage(result.correct, result.total); const weak = Object.entries(result.byDiscipline).sort((a, b) => percentage(a[1].correct, a[1].total) - percentage(b[1].correct, b[1].total))[0]; return <div className="mx-auto max-w-5xl space-y-6"><section className="rounded-[1.35rem] bg-[#183542] p-7 text-white sm:p-9"><p className="text-[10px] font-bold tracking-[0.22em] text-[#9edbcf]">DEBRIEFING CONCLUÍDO</p><div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-display text-4xl font-extrabold">{score}% de aproveitamento</h2><p className="mt-2 text-sm text-[#d1dfdc]">{result.correct} acertos · {result.errors} erros · {result.total} itens · {formatTime(result.elapsedSeconds)}</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-[10px] font-bold tracking-wider text-[#9edbcf]">REGISTRO</p><p className="font-display mt-1 text-lg font-bold">+{result.correct * 8 + 15} XP</p></div></div></section><section className="grid gap-4 md:grid-cols-3">{blocks.map((block) => { const metric = result.byBlock[block.id]; return <div className="shell-card p-5" key={block.id}><p className="eyebrow">{block.label}</p><p className="font-display mt-2 text-2xl font-extrabold">{percentage(metric.correct, metric.total)}%</p><p className="mt-1 text-sm text-[#64757e]">{metric.correct}/{metric.total} acertos</p></div>; })}</section><section className="shell-card p-6"><p className="eyebrow">PRÓXIMA AÇÃO</p><h3 className="font-display mt-2 text-xl font-bold">{weak ? `Revise ${weak[0]}` : "Mantenha o ritmo"}</h3><p className="mt-2 text-sm text-[#64757e]">{weak ? `Seu aproveitamento neste eixo foi de ${percentage(weak[1].correct, weak[1].total)}%. Retorne aos módulos e às questões erradas antes da próxima tentativa.` : "O resultado ficará registrado no seu histórico."}</p><div className="mt-6 flex flex-wrap gap-3"><button onClick={onAgain} className="action-button"><RotateCcw className="h-4 w-4" />Nova tentativa</button><button onClick={onClose} className="ghost-button">Ver histórico</button></div></section></div>; }

function ReviewArea({ state, modules, questions, personalReviews, personalReviewsLoading, onStartQuestion, onCompletePersonalReview, onRemovePersonalReview, reviewPending }: { state: StudyState; modules: StudyModule[]; questions: StudyQuestion[]; personalReviews: PersonalReviewItem[]; personalReviewsLoading: boolean; onStartQuestion: (question: StudyQuestion) => void; onCompletePersonalReview: (id: number) => void; onRemovePersonalReview: (id: number) => void; reviewPending: boolean }) { const latestRecords = new Map<string, AnswerRecord>(); state.answers.forEach((answer) => latestRecords.set(answer.questionId, answer)); const incorrect = Array.from(latestRecords.values()).filter((answer) => !answer.correct).map((answer) => questions.find((question) => question.id === answer.questionId)).filter(Boolean) as StudyQuestion[]; const untouchedModules = modules.filter((module) => !state.completedModules.includes(module.id)); const performance = getDisciplinePerformance(state, questions); const weak = Object.entries(performance).filter(([, item]) => item.total > 0).sort((a, b) => percentage(a[1].correct, a[1].total) - percentage(b[1].correct, b[1].total)); return <div className="space-y-7"><section><p className="eyebrow">REVISÃO INTELIGENTE</p><h2 className="font-display mt-2 text-3xl font-extrabold">Retome o que você escolheu consolidar.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#62727a]">Na checagem rápida, responda e clique em <strong>Adicionar à minha revisão</strong>. A questão fica salva somente na sua conta e volta nesta fila; isso é diferente da revisão editorial usada pelo ROOT.</p></section><section className="shell-card p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">MINHA FILA DE REVISÃO</p><h3 className="font-display mt-1 text-xl font-bold">Questões salvas por você</h3><p className="mt-2 text-xs leading-5 text-[#62727a]">Abra para refazer, depois marque como concluída. A conclusão preserva o registro privado sem deixá-lo pendente.</p></div><span className="rounded-xl bg-[#e4efed] px-3 py-2 text-sm font-bold text-[#0e5a70]">{personalReviews.length} pendente{personalReviews.length === 1 ? "" : "s"}</span></div>{personalReviewsLoading ? <p className="mt-5 text-sm text-[#62727a]">Carregando sua fila privada...</p> : personalReviews.length ? <div className="mt-5 divide-y divide-[#e7dfd2]">{personalReviews.map((item) => <article key={item.id} className="py-4"><p className="text-[10px] font-bold tracking-wider text-[#a06432]">{item.snapshot.discipline} · {item.snapshot.subject}</p><p className="mt-1 text-sm leading-5 text-[#536872]">{item.snapshot.statement}</p><div className="mt-3 flex flex-wrap gap-3"><button onClick={() => onStartQuestion({ id: item.questionKey, block: "I", discipline: item.snapshot.discipline, subject: item.snapshot.subject, difficulty: "Médio", statement: item.snapshot.statement, answer: item.snapshot.answer, explanation: item.snapshot.explanation, tip: item.snapshot.subject, source: item.snapshot.source ?? "Minha revisão" })} className="text-xs font-bold text-[#0e5a70] hover:underline">Refazer agora</button><button disabled={reviewPending} onClick={() => onCompletePersonalReview(item.id)} className="text-xs font-bold text-[#17644e] hover:underline disabled:opacity-50">Concluir revisão</button><button disabled={reviewPending} onClick={() => onRemovePersonalReview(item.id)} className="text-xs font-bold text-[#8e4f31] hover:underline disabled:opacity-50">Remover</button></div></article>)}</div> : <EmptyState icon={RotateCcw} title="Sua fila está vazia" text="Depois de responder uma checagem rápida, escolha “Adicionar à minha revisão”. A questão ficará salva aqui para você." />}</section><div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><section className="shell-card p-6"><div className="flex items-center justify-between"><div><p className="eyebrow">ERROS RECENTES</p><h3 className="font-display mt-1 text-xl font-bold">Questões que exigem retorno</h3></div><RotateCcw className="h-5 w-5 text-[#0e5a70]" /></div>{incorrect.length ? <div className="mt-5 divide-y divide-[#e7dfd2]">{incorrect.slice(0, 6).map((question) => <div key={question.id} className="flex items-center justify-between gap-4 py-4"><div><p className="text-[10px] font-bold tracking-wider text-[#a06432]">{question.discipline} · {question.subject}</p><p className="mt-1 line-clamp-2 text-sm leading-5 text-[#536872]">{question.statement}</p></div><button onClick={() => onStartQuestion(question)} className="shrink-0 rounded-lg border border-[#d4cbc0] p-2 text-[#0e5a70]"><ChevronRight className="h-4 w-4" /></button></div>)}</div> : <EmptyState icon={ShieldCheck} title="Nenhum erro registrado" text="Responda uma checagem ou simulado; seus erros aparecerão aqui para revisão dirigida." />}</section><section className="shell-card p-6"><p className="eyebrow">MAPA DE FRAGILIDADES</p><h3 className="font-display mt-1 text-xl font-bold">Desempenho por disciplina</h3>{weak.length ? <div className="mt-5 space-y-4">{weak.map(([discipline, metric]) => <div key={discipline}><div className="flex justify-between gap-3 text-sm"><span className="font-medium">{discipline}</span><span className="font-bold text-[#0e5a70]">{percentage(metric.correct, metric.total)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ece5d8]"><div className="h-full rounded-full bg-[#0e5a70]" style={{ width: `${percentage(metric.correct, metric.total)}%` }} /></div></div>)}</div> : <EmptyState icon={Target} title="Diagnóstico pendente" text="São necessárias respostas registradas para calcular suas prioridades." />}</section></div><section className="shell-card p-6"><p className="eyebrow">CONTEÚDOS NÃO REGISTRADOS</p><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{untouchedModules.map((module) => <div key={module.id} className="rounded-xl border border-[#e6ded1] bg-[#fffdf8] p-4"><p className="text-[10px] font-bold tracking-wider text-[#0e5a70]">{module.code}</p><p className="font-display mt-1 text-sm font-bold">{module.title}</p><p className="mt-1 text-xs text-[#718087]">{module.discipline}</p></div>)}{!untouchedModules.length && <p className="text-sm text-[#63747b]">Todos os módulos foram marcados como estudados.</p>}</div></section></div>; }

function HistoryArea({ state }: { state: StudyState }) { return <div className="space-y-7"><section className="flex flex-col justify-between gap-4 border-b border-[#d7cfc1] pb-6 sm:flex-row sm:items-end"><div><p className="eyebrow">REGISTRO PERMANENTE</p><h2 className="font-display mt-2 text-3xl font-extrabold">Histórico de simulados</h2><p className="mt-2 text-sm text-[#62727a]">Seus resultados ficam salvos com segurança na sua conta privada.</p></div><div className="rounded-xl bg-[#e4efed] px-4 py-3 text-sm font-bold text-[#0e5a70]">{state.simulations.length} simulado{state.simulations.length === 1 ? "" : "s"} registrado{state.simulations.length === 1 ? "" : "s"}</div></section>{state.simulations.length ? <section className="shell-card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead className="border-b border-[#e3dccf] bg-[#faf7f0] text-[10px] tracking-[0.15em] text-[#6c7b81]"><tr><th className="px-5 py-4">DATA</th><th className="px-5 py-4">ITENS</th><th className="px-5 py-4">ACERTOS</th><th className="px-5 py-4">APROVEITAMENTO</th><th className="px-5 py-4">TEMPO</th><th className="px-5 py-4">STATUS</th></tr></thead><tbody>{[...state.simulations].reverse().map((sim) => { const score = percentage(sim.correct, sim.total); return <tr key={sim.id} className="border-b border-[#eee8dd] last:border-0"><td className="px-5 py-4 text-sm">{new Date(sim.date).toLocaleDateString("pt-BR")}</td><td className="px-5 py-4 text-sm">{sim.total}</td><td className="px-5 py-4 text-sm font-bold">{sim.correct} / {sim.total}</td><td className="px-5 py-4"><span className="rounded-full bg-[#e4efed] px-2.5 py-1 text-xs font-bold text-[#0e5a70]">{score}%</span></td><td className="px-5 py-4 text-sm">{formatTime(sim.elapsedSeconds)}</td><td className="px-5 py-4"><span className="flex w-fit items-center gap-1 text-xs font-bold text-[#16705e]"><Check className="h-3.5 w-3.5" />Concluído</span></td></tr>; })}</tbody></table></div></section> : <section className="shell-card"><EmptyState icon={History} title="Seu histórico começa no primeiro simulado" text="O resultado, o tempo e o desempenho por bloco serão preservados na sua conta." /></section>}</div>; }

function EmptyState({ icon: Icon, title, text }: { icon: typeof History; title: string; text: string }) { return <div className="flex min-h-[170px] flex-col items-center justify-center p-6 text-center"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e8f0ee] text-[#0e5a70]"><Icon className="h-5 w-5" /></div><p className="font-display mt-3 text-sm font-bold">{title}</p><p className="mt-1 max-w-sm text-xs leading-5 text-[#748188]">{text}</p></div>; }
