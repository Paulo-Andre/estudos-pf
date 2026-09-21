import { describe, expect, it } from "vitest";
import { resolveStudentContentNotice } from "./content-notices";

describe("avisos individuais de conteúdo", () => {
  const activatedAt = new Date("2026-08-21T12:00:00.000Z");

  it("mostra o aviso ao aluno matriculado antes da publicação que ainda não abriu a aula", () => {
    expect(resolveStudentContentNotice({
      kind: "new",
      activatedAt,
      enrollmentStartedAt: new Date("2026-08-20T10:00:00.000Z"),
      lastOpenedAt: null,
    })).toMatchObject({ kind: "new", label: "CONTEÚDO NOVO" });
  });

  it("não mostra o aviso a quem comprou o curso após a publicação ou já abriu o conteúdo", () => {
    expect(resolveStudentContentNotice({
      kind: "updated",
      activatedAt,
      enrollmentStartedAt: new Date("2026-08-22T10:00:00.000Z"),
      lastOpenedAt: null,
    })).toBeNull();
    expect(resolveStudentContentNotice({
      kind: "updated",
      activatedAt,
      enrollmentStartedAt: new Date("2026-08-20T10:00:00.000Z"),
      lastOpenedAt: new Date("2026-08-21T12:01:00.000Z"),
    })).toBeNull();
    expect(resolveStudentContentNotice({
      kind: "new",
      activatedAt,
      enrollmentStartedAt: new Date("2026-08-20T10:00:00.000Z"),
      lastOpenedAt: activatedAt,
    })).toBeNull();
  });

  it("não destaca conteúdos para a conta ROOT", () => {
    expect(resolveStudentContentNotice({
      kind: "updated",
      activatedAt,
      enrollmentStartedAt: new Date("2026-08-20T10:00:00.000Z"),
      lastOpenedAt: null,
      isAdmin: true,
    })).toBeNull();
  });
});
