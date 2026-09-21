import { describe, expect, it } from "vitest";
import { originalPoliceCurriculum } from "./original-police-curriculum-data.mjs";

describe("expansão curricular policial autoral", () => {
  it("mantém quatro disciplinas, doze conteúdos e trinta e seis questões vinculáveis", () => {
    expect(originalPoliceCurriculum.disciplines).toHaveLength(4);
    expect(originalPoliceCurriculum.contents).toHaveLength(12);
    expect(originalPoliceCurriculum.questions).toHaveLength(36);

    const contentCodes = new Set(originalPoliceCurriculum.contents.map((content) => content.code));
    expect(contentCodes.size).toBe(originalPoliceCurriculum.contents.length);
    expect(originalPoliceCurriculum.questions.every(([code]) => contentCodes.has(code))).toBe(true);
  });

  it("mantém autoria própria, recursos externos apenas como referência e vínculo de curso para cada disciplina", () => {
    expect(originalPoliceCurriculum.contents.every((content) => content.body.includes("Roteiro de revisão"))).toBe(true);
    expect(originalPoliceCurriculum.contents.every((content) => content.materialUrl === "https://www.pciconcursos.com.br/aulas/" || content.materialUrl === "https://www.pciconcursos.com.br/simulados/")).toBe(true);
    expect(originalPoliceCurriculum.disciplines.every((discipline) => discipline.courseIds.length > 0)).toBe(true);
  });
});
