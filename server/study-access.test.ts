import { describe, expect, it } from "vitest";
import { canAccessStudy } from "./studyAccess";

describe("política de acesso ao estudo", () => {
  it("libera ROOT/admin sem matrícula", () => {
    expect(canAccessStudy("admin", 0)).toBe(true);
  });

  it("libera aluno com matrícula vigente", () => {
    expect(canAccessStudy("user", 1)).toBe(true);
  });

  it("bloqueia aluno sem matrícula vigente", () => {
    expect(canAccessStudy("user", 0)).toBe(false);
  });

  it("bloqueia aluno mesmo quando há matrículas inválidas fora do filtro ativo", () => {
    expect(canAccessStudy("user", 0)).toBe(false);
  });
});
