import { describe, expect, it } from "vitest";
import { selectDailyQuickCheckQuestion, type DailyQuickCheckCandidate } from "./dailyQuickCheck";

const candidates: DailyQuickCheckCandidate[] = [
  { id: 1, questionType: "certo_errado", difficulty: "advanced", statement: "Questão longa e avançada.".repeat(30) },
  { id: 2, questionType: "certo_errado", difficulty: "basic", statement: "Pergunta curta 2." },
  { id: 3, questionType: "certo_errado", difficulty: "basic", statement: "Pergunta curta 3." },
  { id: 4, questionType: "multipla_escolha", difficulty: "basic", statement: "Alternativa múltipla." },
];

describe("seleção da checagem diária", () => {
  it("prioriza itens C/E básicos e curtos de modo estável no mesmo curso e dia", () => {
    const input = { questions: candidates, userId: 73, courseId: "pf-agente", day: "2026-08-19", recentQuestionIds: [] };
    const first = selectDailyQuickCheckQuestion(input);
    const second = selectDailyQuickCheckQuestion(input);
    expect(first?.id).toBe(second?.id);
    expect([2, 3]).toContain(first?.id);
  });

  it("evita questões respondidas recentemente quando o curso oferece outra opção", () => {
    const initial = selectDailyQuickCheckQuestion({ questions: candidates, userId: 73, courseId: "pf-agente", day: "2026-08-19", recentQuestionIds: [] });
    const replacement = selectDailyQuickCheckQuestion({ questions: candidates, userId: 73, courseId: "pf-agente", day: "2026-08-19", recentQuestionIds: [String(initial?.id)] });
    expect(replacement?.id).not.toBe(initial?.id);
    expect([2, 3]).toContain(replacement?.id);
  });

  it("permite excluir a questão diária anterior quando o aluno a dispensou", () => {
    const selected = selectDailyQuickCheckQuestion({ questions: candidates, userId: 19, courseId: "pf-agente", day: "2026-08-20", recentQuestionIds: ["2"] });
    expect(selected?.id).toBe(3);
  });

  it("retorna nulo se não houver item C/E elegível", () => {
    expect(selectDailyQuickCheckQuestion({ questions: [candidates[3]], userId: 1, courseId: "pf-agente", day: "2026-08-19", recentQuestionIds: [] })).toBeNull();
  });
});
