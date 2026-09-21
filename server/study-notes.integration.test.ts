import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { deleteNoteByScope, getUserByUsername } from "./db";
import type { TrpcContext } from "./_core/context";

const testModuleId = "__nota-integracao-root";

describe("rotas reais de anotações privadas", () => {
  it("cria, edita e recupera uma nota da conta ROOT no banco", async () => {
    const root = await getUserByUsername("paulo");
    expect(root).toMatchObject({ username: "paulo", role: "admin" });
    if (!root) return;

    const context: TrpcContext = {
      user: root,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(context);

    try {
      await caller.study.saveNote({ moduleId: testModuleId, content: "Primeira revisão integrada." });
      expect(await caller.study.note({ moduleId: testModuleId })).toMatchObject({ content: "Primeira revisão integrada." });

      await caller.study.saveNote({ moduleId: testModuleId, content: "Nota atualizada e recuperada." });
      expect(await caller.study.note({ moduleId: testModuleId })).toMatchObject({ content: "Nota atualizada e recuperada." });
    } finally {
      await deleteNoteByScope(root.id, testModuleId);
    }
  });
});
