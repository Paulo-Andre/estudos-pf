import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const schemaSource = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");

describe("anotações privadas por módulo", () => {
  it("mantém uma única nota por usuário e módulo", () => {
    expect(schemaSource).toContain("studyNotes_user_module_unique");
    expect(schemaSource).toContain("table.userId, table.moduleId");
  });

  it("consulta e atualiza uma nota no escopo do usuário autenticado", () => {
    expect(dbSource).toContain("and(eq(studyNotes.userId, userId), eq(studyNotes.moduleId, moduleId))");
    expect(dbSource).toContain("async function saveNote(userId: number, moduleId: string, content: string)");
  });

  it("protege leitura e gravação pela matrícula vigente", () => {
    expect(routerSource).toContain("note: enrollmentRequiredProcedure");
    expect(routerSource).toContain("saveNote: enrollmentRequiredProcedure");
  });
});
