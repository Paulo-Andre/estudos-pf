import { describe, expect, it } from "vitest";
import { questionBank } from "../client/src/data/pfStudyData";
import { legacyDisciplineId, legacyQuestionDifficulty } from "./db";

describe("importação da base de questões já publicada", () => {
  it("preserva identificadores únicos para permitir uma importação idempotente", () => {
    expect(questionBank.length).toBeGreaterThan(0);
    expect(new Set(questionBank.map(question => question.id)).size).toBe(questionBank.length);
  });

  it("normaliza dificuldade e disciplina antes de criar a questão central", () => {
    expect(legacyQuestionDifficulty("Fácil")).toBe("basic");
    expect(legacyQuestionDifficulty("Médio")).toBe("intermediate");
    expect(legacyQuestionDifficulty("Difícil")).toBe("advanced");
    expect(legacyDisciplineId("Língua Portuguesa")).toBe("lingua-portuguesa");
    expect(legacyDisciplineId("Direito Penal")).toBe("direito-penal");
    expect(legacyDisciplineId("Informática")).toBe("informatica");
  });
});
