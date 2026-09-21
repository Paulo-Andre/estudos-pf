export type KnowledgeStatus = "draft" | "review" | "approved" | "published" | "inactive";

export type SimulationQuestionCandidate = {
  id: number;
  status: KnowledgeStatus;
  requiresReview: boolean;
};

/** Em modo simples, todo item não inativo pode ser estudado. Com revisão exigida, somente aprovado/publicado entra no simulado. */
export function canUseQuestionInSimulation(question: SimulationQuestionCandidate) {
  if (question.status === "inactive") return false;
  return !question.requiresReview || question.status === "approved" || question.status === "published";
}

/** Uma biblioteca com item ativo sob revisão obrigatória não pode completar simulados com a fonte estática. */
export function requiresExclusiveCentralBank(questions: SimulationQuestionCandidate[]) {
  return questions.some(question => question.requiresReview && question.status !== "inactive");
}

/** Garante uma única ocorrência por id canônico, mesmo quando a consulta retorna vários vínculos com conteúdos distintos. */
export function uniqueSimulationQuestions<T extends { id: number }>(questions: T[]) {
  const seen = new Set<number>();
  return questions.filter(question => {
    if (seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });
}

export function selectEligibleUniqueQuestions<T extends SimulationQuestionCandidate>(questions: T[], total: number) {
  return uniqueSimulationQuestions(questions).filter(canUseQuestionInSimulation).slice(0, Math.max(0, total));
}
