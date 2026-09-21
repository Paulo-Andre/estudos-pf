import { describe, expect, it } from "vitest";
import { canUseQuestionInSimulation, requiresExclusiveCentralBank, selectEligibleUniqueQuestions, uniqueSimulationQuestions } from "./question-bank-policy";

describe("política do banco central de questões", () => {
  it("mantém uma questão única quando ela aparece por dois vínculos de conteúdo", () => {
    const entries = [
      { id: 7, status: "published" as const, requiresReview: true, contentId: 10 },
      { id: 7, status: "published" as const, requiresReview: true, contentId: 12 },
      { id: 8, status: "published" as const, requiresReview: true, contentId: 12 },
    ];
    expect(uniqueSimulationQuestions(entries).map(entry => entry.id)).toEqual([7, 8]);
  });

  it("exige aprovação ou publicação quando a revisão foi configurada", () => {
    expect(canUseQuestionInSimulation({ id: 1, status: "review", requiresReview: true })).toBe(false);
    expect(canUseQuestionInSimulation({ id: 2, status: "approved", requiresReview: true })).toBe(true);
    expect(canUseQuestionInSimulation({ id: 3, status: "published", requiresReview: true })).toBe(true);
  });

  it("permite o fluxo simples, mas nunca disponibiliza item inativo", () => {
    expect(canUseQuestionInSimulation({ id: 4, status: "draft", requiresReview: false })).toBe(true);
    expect(canUseQuestionInSimulation({ id: 5, status: "inactive", requiresReview: false })).toBe(false);
  });

  it("seleciona somente registros elegíveis e sem duplicidades", () => {
    const selected = selectEligibleUniqueQuestions([
      { id: 10, status: "published" as const, requiresReview: true },
      { id: 10, status: "published" as const, requiresReview: true },
      { id: 11, status: "review" as const, requiresReview: true },
      { id: 12, status: "draft" as const, requiresReview: false },
    ], 10);
    expect(selected.map(question => question.id)).toEqual([10, 12]);
  });

  it("bloqueia a complementação estática enquanto houver item ativo em revisão obrigatória", () => {
    expect(requiresExclusiveCentralBank([{ id: 1, status: "draft", requiresReview: true }])).toBe(true);
    expect(requiresExclusiveCentralBank([{ id: 2, status: "inactive", requiresReview: true }])).toBe(false);
    expect(requiresExclusiveCentralBank([{ id: 3, status: "published", requiresReview: false }])).toBe(false);
  });
});
