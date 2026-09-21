import { describe, expect, it } from "vitest";
import { buildCompetitionRanking, defaultCompetitionMonthlyGoal, defaultCompetitionSettings, evaluateCompetitionAnswer, getCompetitionMonthWindow, prioritizeUnseenCompetitionQuestions, selectBalancedCompetitionQuestions } from "./db";

describe("regras isoladas da competição", () => {
  it("mantém os valores iniciais seguros para uma rodada competitiva", () => {
    expect(defaultCompetitionSettings).toEqual({ pointsPerCorrect: 10, pointsPerWrong: 0, questionsPerRound: 10, isActive: true });
    expect(defaultCompetitionMonthlyGoal).toEqual({ targetPoints: 100, targetCompletedRounds: 5, rewardTitle: "Destaque mensal", rewardDescription: "Reconhecimento definido pela administração para quem concluir a meta do mês.", isActive: true });
  });

  it("valida respostas sem expor nem reaproveitar dados dos simulados", () => {
    expect(evaluateCompetitionAnswer("true", true)).toBe(true);
    expect(evaluateCompetitionAnswer("false", true)).toBe(false);
    expect(evaluateCompetitionAnswer('"Alternativa B"', "Alternativa B")).toBe(true);
    expect(evaluateCompetitionAnswer('"Alternativa B"', "Alternativa A")).toBe(false);
    expect(() => evaluateCompetitionAnswer("true", "true")).toThrow("Formato de resposta incompatível");
    expect(() => evaluateCompetitionAnswer("{", true)).toThrow("resposta oficial");
  });

  it("soma somente as respostas competitivas e ordena por pontos, acertos e nome", () => {
    const ranking = buildCompetitionRanking([
      { userId: 2, pointsEarned: 10, correct: true },
      { userId: 1, pointsEarned: 20, correct: true },
      { userId: 2, pointsEarned: 10, correct: true },
      { userId: 3, pointsEarned: 20, correct: true },
      { userId: 3, pointsEarned: 0, correct: false },
    ], [
      { id: 1, name: "Carla", username: "carla" },
      { id: 2, name: "Bruno", username: "bruno" },
      { id: 3, name: "Ana", username: "ana" },
    ]);

    expect(ranking).toEqual([
      { position: 1, userId: 2, name: "Bruno", username: "bruno", totalPoints: 20, totalAnswered: 2, totalCorrect: 2 },
      { position: 2, userId: 3, name: "Ana", username: "ana", totalPoints: 20, totalAnswered: 2, totalCorrect: 1 },
      { position: 3, userId: 1, name: "Carla", username: "carla", totalPoints: 20, totalAnswered: 1, totalCorrect: 1 },
    ]);
  });

  it("prioriza questões que o aluno ainda não respondeu e só repete quando necessário", () => {
    const selected = prioritizeUnseenCompetitionQuestions([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }], new Set([1, 2]), 3);
    expect(selected).toHaveLength(3);
    expect(selected.slice(0, 2).map(question => question.id).sort()).toEqual([3, 4]);
    expect([1, 2]).toContain(selected[2]?.id);
  });

  it("equilibra Certo e Errado nas rodadas sem substituir o gabarito das questões", () => {
    const selected = selectBalancedCompetitionQuestions([
      { id: 1, answerJson: "true" }, { id: 2, answerJson: "true" }, { id: 3, answerJson: "true" },
      { id: 4, answerJson: "false" }, { id: 5, answerJson: "false" }, { id: 6, answerJson: "false" },
    ], new Set(), 6);
    expect(selected).toHaveLength(6);
    expect(selected.filter(question => question.answerJson === "true")).toHaveLength(3);
    expect(selected.filter(question => question.answerJson === "false")).toHaveLength(3);
  });

  it("calcula o período da meta pelo calendário de Brasília sem tarefa agendada", () => {
    const window = getCompetitionMonthWindow(new Date("2026-08-01T01:30:00.000Z"));
    expect(window.period).toBe("2026-07");
    expect(window.startsAt.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(window.endsAt.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });
});
