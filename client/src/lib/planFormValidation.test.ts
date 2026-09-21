import { describe, expect, it } from "vitest";
import { planCourseSelectionMessage, resolveCommerceFormError, validatePlanCourseSelection } from "./planFormValidation";

describe("validação de cursos do plano", () => {
  it("exige pelo menos um curso antes do envio", () => {
    expect(validatePlanCourseSelection([])).toBe(planCourseSelectionMessage);
    expect(validatePlanCourseSelection(["curso-1"])).toBeNull();
  });

  it("converte a rejeição técnica de courseIds em orientação para o ROOT", () => {
    expect(resolveCommerceFormError({ message: '[{"origin":"array","code":"too_small","path":["courseIds"]}]' })).toBe(planCourseSelectionMessage);
    expect(resolveCommerceFormError({ message: "Associe ao menos um curso." })).toBe(planCourseSelectionMessage);
  });
});
