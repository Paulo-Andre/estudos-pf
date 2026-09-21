import { describe, expect, it } from "vitest";
import { existingQuestionEditingSteps, rootAdminActionContainerClassName, rootAdminAreas } from "./rootAdminNavigation";

describe("navegação administrativa ROOT", () => {
  it("separa gestão de alunos da biblioteca de questões", () => {
    expect(rootAdminAreas.students.shortLabel).toBe("ALUNOS");
    expect(rootAdminAreas.library.shortLabel).toBe("QUESTÕES");
    expect(rootAdminAreas.students.title).not.toBe(rootAdminAreas.library.title);
  });

  it("explica a localização, a edição e o salvamento de questão existente", () => {
    expect(existingQuestionEditingSteps).toHaveLength(3);
    expect(existingQuestionEditingSteps.join(" ")).toContain("Editar questão");
    expect(existingQuestionEditingSteps.join(" ")).toContain("registrar histórico");
  });

  it("não oculta os acessos ROOT no contêiner usado em celular", () => {
    expect(rootAdminActionContainerClassName).toContain("flex");
    expect(rootAdminActionContainerClassName).not.toContain("hidden");
  });
});
