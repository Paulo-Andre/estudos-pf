import { describe, expect, it } from "vitest";
import { selectBalancedBooleanQuestions, selectSimulationQuestions } from "./studyEngine";

describe("seleção balanceada de simulados", () => {
  const binaryQuestions = Array.from({ length: 12 }, (_, index) => ({ id: `q-${index + 1}`, answer: index % 2 === 0, block: "I" as const }));

  it("equilibra Certo e Errado quando os dois gabaritos estão disponíveis", () => {
    const selected = selectBalancedBooleanQuestions(binaryQuestions, 10, []);
    expect(selected).toHaveLength(10);
    expect(selected.filter(question => question.answer).length).toBe(5);
    expect(selected.filter(question => !question.answer).length).toBe(5);
  });

  it("mantém a divisão por blocos e reduz a concentração de um único gabarito", () => {
    const bank = [
      ...binaryQuestions.map(question => ({ ...question, block: "I" as const })),
      ...binaryQuestions.map(question => ({ ...question, id: `b2-${question.id}`, block: "II" as const })),
      ...binaryQuestions.map(question => ({ ...question, id: `b3-${question.id}`, block: "III" as const })),
    ] as any[];
    const selected = selectSimulationQuestions(bank, 10, []);
    expect(selected).toHaveLength(10);
    expect(Math.abs(selected.filter(question => question.answer).length - selected.filter(question => !question.answer).length)).toBeLessThanOrEqual(2);
  });
});
