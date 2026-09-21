import { describe, expect, it } from "vitest";
import { countQuestionsByContent, libraryLoadState, reviewEmptyStateMessage, reviewFlowSteps } from "./adminUiHelpers";

describe("orientações da revisão administrativa", () => {
  it("indica como adicionar uma questão à fila quando não há pendências", () => {
    expect(reviewEmptyStateMessage(false)).toContain("Adicionar à revisão");
  });

  it("expõe o fluxo completo e ordenado de revisão", () => {
    expect(reviewFlowSteps).toEqual([
      "Adicionar à revisão",
      "Localizar na fila",
      "Abrir e corrigir, se necessário",
      "Aprovar, solicitar correção ou rejeitar",
    ]);
  });

  it("conta todas as questões vinculadas por conteúdo sem limitar a biblioteca a uma amostra visual", () => {
    const questions = Array.from({ length: 60 }, (_, index) => ({
      contentIds: index < 30 ? [101] : index < 50 ? [102] : [103],
    }));
    const counts = countQuestionsByContent(questions);

    expect(counts.get(101)).toBe(30);
    expect(counts.get(102)).toBe(20);
    expect(counts.get(103)).toBe(10);
    expect([...counts.values()].reduce((total, count) => total + count, 0)).toBe(60);
  });

  it("diferencia carregamento assíncrono de uma biblioteca realmente vazia", () => {
    expect(libraryLoadState(true, 0)).toBe("loading");
    expect(libraryLoadState(false, 0)).toBe("empty");
    expect(libraryLoadState(false, 60)).toBe("ready");
  });
});
