export type DailyQuickCheckCandidate = {
  id: number;
  statement: string;
  difficulty: "basic" | "intermediate" | "advanced";
  questionType: "certo_errado" | "multipla_escolha";
};

function stableHash(value: string) {
  return Array.from(value).reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0) >>> 0;
}

/** Prioriza itens C/E curtos e básicos; amplia o conjunto somente quando o curso não os tiver. */
export function selectDailyQuickCheckQuestion<T extends DailyQuickCheckCandidate>(input: {
  questions: T[];
  userId: number;
  courseId: string;
  day: string;
  recentQuestionIds: string[];
}) {
  const short = input.questions.filter(question => question.questionType === "certo_errado" && question.statement.trim().length <= 420);
  const basic = short.filter(question => question.difficulty === "basic");
  const preferred = basic.length ? basic : short.length ? short : input.questions.filter(question => question.questionType === "certo_errado");
  if (!preferred.length) return null;

  const withoutRecent = preferred.filter(question => !input.recentQuestionIds.includes(String(question.id)));
  const eligible = withoutRecent.length ? withoutRecent : preferred;
  const ordered = [...eligible].sort((left, right) => left.id - right.id);
  return ordered[stableHash(`${input.userId}:${input.courseId}:${input.day}`) % ordered.length] ?? null;
}
