import { describe, expect, it } from "vitest";
import { isPlatformAlertVisibleForUser } from "./platformAlerts";

describe("visibilidade de alertas da plataforma", () => {
  const activeCourses = new Set(["pf-agente", "prf-policial"]);

  it("mostra um alerta geral para aluno autenticado", () => {
    expect(isPlatformAlertVisibleForUser({ id: 1, audience: "all", courseId: null }, activeCourses, new Set())).toBe(true);
  });

  it("mostra alerta segmentado somente a quem possui matrícula vigente no curso", () => {
    expect(isPlatformAlertVisibleForUser({ id: 2, audience: "course", courseId: "pf-agente" }, activeCourses, new Set())).toBe(true);
    expect(isPlatformAlertVisibleForUser({ id: 2, audience: "course", courseId: "pm-sp" }, activeCourses, new Set())).toBe(false);
  });

  it("oculta somente para o aluno que fechou o alerta", () => {
    expect(isPlatformAlertVisibleForUser({ id: 3, audience: "all", courseId: null }, activeCourses, new Set([3]))).toBe(false);
    expect(isPlatformAlertVisibleForUser({ id: 3, audience: "all", courseId: null }, activeCourses, new Set())).toBe(true);
  });
});
