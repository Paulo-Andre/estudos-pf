import { describe, expect, it } from "vitest";
import { getCompetitionIdentity } from "./competitionIdentity";

describe("identidade competitiva do aluno", () => {
  it("prioriza a medalha de ouro para a primeira posição", () => {
    expect(getCompetitionIdentity({ position: 1, totalPoints: 10, totalAnswered: 1, totalCorrect: 1 }).tier).toBe("ouro");
  });

  it("classifica top 3, pontuação consolidada e início de forma independente dos simulados", () => {
    expect(getCompetitionIdentity({ position: 2, totalPoints: 5, totalAnswered: 1, totalCorrect: 1 }).tier).toBe("prata");
    expect(getCompetitionIdentity({ position: 9, totalPoints: 100, totalAnswered: 20, totalCorrect: 12 }).tier).toBe("bronze");
    expect(getCompetitionIdentity({ position: null, totalPoints: 0, totalAnswered: 0, totalCorrect: 0 }).tier).toBe("em_formacao");
  });
});
