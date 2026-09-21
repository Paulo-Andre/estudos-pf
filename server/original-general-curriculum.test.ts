import { describe, expect, it } from "vitest";
import { originalGeneralCurriculum } from "./original-general-curriculum-data.mjs";

describe("biblioteca geral autoral", () => {
  it("mantém quatro disciplinas, doze conteúdos e trinta e seis questões originais", () => {
    expect(originalGeneralCurriculum.disciplines).toHaveLength(4);
    expect(originalGeneralCurriculum.contents).toHaveLength(12);
    expect(originalGeneralCurriculum.questions).toHaveLength(36);

    const contentCodes = new Set(originalGeneralCurriculum.contents.map((content) => content.code));
    expect(contentCodes.size).toBe(12);
    expect(originalGeneralCurriculum.questions.every(([code]) => contentCodes.has(code))).toBe(true);
  });

  it("mantém conteúdos autorais com referências externas e sem vínculos automáticos a cursos", () => {
    expect(originalGeneralCurriculum.contents.every((content) => content.body.includes("Roteiro de revisão"))).toBe(true);
    expect(originalGeneralCurriculum.contents.every((content) => content.materialUrl.startsWith("https://www.pciconcursos.com.br/"))).toBe(true);
    expect(originalGeneralCurriculum.disciplines.every((discipline) => !("courseIds" in discipline))).toBe(true);
    expect(originalGeneralCurriculum.questions.every(([, , , , difficulty]) => ["basic", "intermediate", "advanced"].includes(difficulty))).toBe(true);
  });
});
