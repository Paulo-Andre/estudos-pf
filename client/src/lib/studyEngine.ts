/* Estudos PF — lógica de progresso: recompensa domínio demonstrado e preserva histórico local. */
import { Block, StudyQuestion, blocks } from "@/data/pfStudyData";

export type AnswerRecord = { questionId: string; correct: boolean; answeredAt: string };
export type SimulationRecord = {
  id: string;
  date: string;
  total: number;
  correct: number;
  errors: number;
  elapsedSeconds: number;
  byDiscipline: Record<string, { correct: number; total: number }>;
  byBlock: Record<Block, { correct: number; total: number }>;
};

export type StudyState = {
  completedModules: string[];
  answers: AnswerRecord[];
  simulations: SimulationRecord[];
  xp: number;
  lastStudyDate?: string;
  studyDates: string[];
  usedQuestionIds: string[];
};

export const emptyState: StudyState = { completedModules: [], answers: [], simulations: [], xp: 0, studyDates: [], usedQuestionIds: [] };
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

export function selectSimulationQuestions(bank: StudyQuestion[], total: number, usedIds: string[]) {
  const selected: StudyQuestion[] = [];
  blocks.forEach((block, index) => {
    const target = index === blocks.length - 1 ? total - selected.length : Math.round(total * block.ratio);
    const pool = bank.filter((question) => question.block === block.id);
    const fresh = pool.filter((question) => !usedIds.includes(question.id)).sort(() => Math.random() - 0.5);
    const known = pool.filter((question) => usedIds.includes(question.id)).sort(() => Math.random() - 0.5);
    const arranged = [...fresh, ...known];
    for (let i = 0; i < target; i += 1) selected.push(arranged[i % arranged.length]);
  });
  return selected.sort(() => Math.random() - 0.5);
}
