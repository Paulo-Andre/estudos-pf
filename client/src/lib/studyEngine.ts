/* Estudos PF — lógica de progresso: recompensa domínio demonstrado e preserva histórico local. */
import { blocks, type Block, type StudyQuestion } from "@/types/study";

export type AnswerRecord = { questionId: string; courseId?: string | null; correct: boolean; answeredAt: string; confidence?: number | null };
export type SimulationRecord = {
  id: string;
  date: string;
  total: number;
  correct: number;
  errors: number;
  courseId?: string | null;
  mode?: "practice" | "domain" | "real_exam";
  elapsedSeconds: number;
  byDiscipline: Record<string, { correct: number; total: number }>;
  byBlock: Record<Block, { correct: number; total: number }>;
  telemetry?: {
    questions?: { questionId: string; elapsedMs: number; changes: number; confidence: number | null; correct: boolean; discipline: string; subject: string; position?: number }[];
    summary?: {
      averageSeconds?: number;
      answerChanges?: number;
      highConfidenceErrors?: number;
      firstHalfAccuracy?: number;
      secondHalfAccuracy?: number;
      performanceDrop?: number;
      slowestQuestion?: { questionId: string; seconds: number; subject: string };
    };
  } | null;
  reflection?: {
    confidence: number;
    primaryCause: "knowledge" | "attention" | "time" | "interpretation" | "strategy";
    nextAction: "review" | "practice" | "content" | "time_strategy" | "simulate";
    note: string;
    updatedAt?: string;
  } | null;
};

export type StudyState = {
  completedModules: string[];
  answers: AnswerRecord[];
  simulations: SimulationRecord[];
  xp: number;
  lastStudyDate?: string;
  studyDates: string[];
  usedQuestionIds: string[];
  /** Acertos de simulados desde o último ciclo semanal de Brasília. */
  weeklySimulationCorrect: number;
};

export const emptyState: StudyState = { completedModules: [], answers: [], simulations: [], xp: 0, studyDates: [], usedQuestionIds: [], weeklySimulationCorrect: 0 };
export const storageKey = "estudos-pf-operational-state-v1";

export function loadState(): StudyState {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? { ...emptyState, ...JSON.parse(raw) } : emptyState;
  } catch {
    return emptyState;
  }
}

export function saveState(state: StudyState) {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

export function levelFromXp(xp: number) {
  const levels = ["Iniciante", "Aprendiz", "Agente em formação", "Operacional", "Especialista", "Mestre"];
  const index = Math.min(levels.length - 1, Math.floor(xp / 220));
  const currentStart = index * 220;
  return { label: levels[index], index: index + 1, current: xp - currentStart, next: 220, progress: Math.min(100, ((xp - currentStart) / 220) * 100) };
}

export function currentStreak(studyDates: string[]) {
  const days = new Set(studyDates);
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!days.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function shuffleQuestions<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target]!, copy[index]!];
  }
  return copy;
}

/**
 * Seleciona questões de Certo/Errado alternando os dois gabaritos sempre que
 * houver oferta. Itens inéditos continuam prioritários dentro de cada lado.
 */
export function selectBalancedBooleanQuestions<T extends { id: string; answer: boolean }>(bank: T[], total: number, usedIds: string[]) {
  const unique = Array.from(new Map(bank.map(question => [question.id, question])).values());
  const buckets = new Map<boolean, { fresh: T[]; known: T[] }>([
    [true, { fresh: [], known: [] }],
    [false, { fresh: [], known: [] }],
  ]);

  unique.forEach(question => {
    const bucket = buckets.get(question.answer)!;
    if (usedIds.includes(question.id)) bucket.known.push(question);
    else bucket.fresh.push(question);
  });

  const orderedAnswers = Math.random() < 0.5 ? [true, false] : [false, true];
  orderedAnswers.forEach(answer => {
    const bucket = buckets.get(answer)!;
    bucket.fresh = shuffleQuestions(bucket.fresh);
    bucket.known = shuffleQuestions(bucket.known);
  });

  const selected: T[] = [];
  while (selected.length < total) {
    let found = false;
    orderedAnswers.forEach(answer => {
      if (selected.length >= total) return;
      const bucket = buckets.get(answer)!;
      const next = bucket.fresh.pop() ?? bucket.known.pop();
      if (!next) return;
      selected.push(next);
      found = true;
    });
    if (!found) break;
  }
  return selected;
}

export function selectSimulationQuestions<T extends StudyQuestion>(bank: T[], total: number, usedIds: string[]) {
  const selected: T[] = [];
  blocks.forEach((block, index) => {
    const target = index === blocks.length - 1 ? total - selected.length : Math.round(total * block.ratio);
    const pool = bank.filter((question) => question.block === block.id);
    selected.push(...selectBalancedBooleanQuestions(pool, target, usedIds));
  });
  return Array.from(new Map(selected.map(question => [question.id, question])).values());
}

/** Seleção sem proporção de blocos para fontes reutilizáveis que ainda não possuem classificação de edital. */
export function selectUniqueQuestions<T extends { id: string }>(bank: T[], total: number, usedIds: string[]) {
  const unique = Array.from(new Map(bank.map(question => [question.id, question])).values());
  const fresh = unique.filter(question => !usedIds.includes(question.id)).sort(() => Math.random() - 0.5);
  const known = unique.filter(question => usedIds.includes(question.id)).sort(() => Math.random() - 0.5);
  return [...fresh, ...known].slice(0, Math.max(0, total));
}
