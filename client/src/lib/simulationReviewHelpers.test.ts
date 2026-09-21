import { describe, expect, it } from "vitest";
import { simulationAnswerFeedback } from "./simulationReviewHelpers";

describe("simulationAnswerFeedback", () => {
  it("mantém a questão sem feedback enquanto não há resposta", () => {
    expect(simulationAnswerFeedback(undefined, true, false)).toMatchObject({ hasAnswered: false, isCorrect: false, nextLabel: "Próxima questão" });
  });

  it("mostra feedback e finalização apenas após a resposta da última questão", () => {
    expect(simulationAnswerFeedback(false, false, true)).toMatchObject({ hasAnswered: true, isCorrect: true, resultLabel: "Resposta correta", nextLabel: "Finalizar simulado" });
  });
});
