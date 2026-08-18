import { describe, expect, it } from "vitest";
import { completeStudyModules } from "./pfCompleteStudyData";
import { apostilaByModule } from "./pfApostilaData";
import { specialApostilaByModule, specialLegislationModules } from "./pfSpecialLegislationModules";

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
});
