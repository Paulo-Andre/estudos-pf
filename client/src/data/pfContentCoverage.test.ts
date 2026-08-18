import { describe, expect, it } from "vitest";
import { completeStudyModules } from "./pfCompleteStudyData";
import { apostilaByModule } from "./pfApostilaData";
import { specialApostilaByModule, specialLegislationModules } from "./pfSpecialLegislationModules";
import { contestCatalog, disciplineCatalog, getDisciplineIdForModule, getDisciplinesForContest } from "./pfCurriculumCatalog";

describe("cobertura da trilha autoral PF", () => {
  it("mantém IDs únicos no conjunto principal de módulos", () => {
    const ids = completeStudyModules.map((module) => module.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("entrega capítulos completos para as 26 unidades de Português", () => {
    const portuguese = completeStudyModules.filter((module) => module.discipline === "Língua Portuguesa");
    expect(portuguese).toHaveLength(26);
    expect(portuguese.every((module) => Boolean(apostilaByModule[module.id]))).toBe(true);
  });

  it("mantém apostila e módulo correspondentes para Legislação Especial", () => {
    expect(specialLegislationModules).toHaveLength(4);
    expect(specialLegislationModules.every((module) => Boolean(specialApostilaByModule[module.id]))).toBe(true);
  });

  it("mapeia todos os módulos autorais para disciplinas canônicas", () => {
    const allAuthorialModules = [...completeStudyModules, ...specialLegislationModules];
    expect(allAuthorialModules.every((module) => getDisciplineIdForModule(module) !== null)).toBe(true);
    expect(new Set(allAuthorialModules.map((module) => getDisciplineIdForModule(module))).size).toBe(disciplineCatalog.length);
  });

  it("reutiliza disciplinas em matrizes de concursos diferentes", () => {
    const pf = getDisciplinesForContest("pf-agente").map((discipline) => discipline.id);
    const prf = getDisciplinesForContest("prf").map((discipline) => discipline.id);
    const pm = getDisciplinesForContest("pm").map((discipline) => discipline.id);
    expect(contestCatalog).toHaveLength(3);
    expect(pf).toContain("lingua-portuguesa");
    expect(prf).toContain("lingua-portuguesa");
    expect(pm).toContain("lingua-portuguesa");
    expect(prf.some((discipline) => pf.includes(discipline))).toBe(true);
    expect(pm.some((discipline) => pf.includes(discipline))).toBe(true);
  });
});
