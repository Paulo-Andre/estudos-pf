import { and, eq, like } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { adminAuditLogs, questionChangelog, questionContentLinks, questions } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import { getDb, getUserByUsername } from "./db";
import { appRouter } from "./routers";

describe("exclusão administrativa de questões", () => {
  it("remove uma questão ainda sem uso em simulado, seus vínculos e registra a auditoria", async () => {
    const root = await getUserByUsername("paulo");
    const db = await getDb();
    expect(root).toMatchObject({ username: "paulo", role: "admin" });
    expect(db).toBeTruthy();
    if (!root || !db) return;

    const token = `delete-question-${Date.now().toString(36)}`;
    let questionId: number | null = null;
    const context: TrpcContext = { user: root, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
    const caller = appRouter.createCaller(context);

    try {
      const availableContent = (await caller.admin.contents.list())[0];
      expect(availableContent).toBeTruthy();
      if (!availableContent) return;
      const created = await caller.admin.questions.create({
        statement: `Questão temporária ${token} para validar exclusão auditável pelo ROOT.`, questionType: "multipla_escolha",
        options: ["A) Correta", "B) Incorreta", "C) Distrator", "D) Outra opção"], answer: "A) Correta",
        explanation: "Registro temporário de teste.", difficulty: "basic", source: token, banca: "Teste", year: 2026,
        requiresReview: false, status: "draft", contentIds: [availableContent.id],
      });
      questionId = created!.id;
      expect((await db.select().from(questionContentLinks).where(eq(questionContentLinks.questionId, questionId))).length).toBe(1);

      await expect(caller.admin.questions.remove({ id: questionId })).resolves.toMatchObject({ id: questionId });
      expect(await db.select().from(questions).where(eq(questions.id, questionId))).toHaveLength(0);
      expect(await db.select().from(questionContentLinks).where(eq(questionContentLinks.questionId, questionId))).toHaveLength(0);
      expect(await db.select().from(questionChangelog).where(eq(questionChangelog.questionId, questionId))).toHaveLength(0);
      expect((await db.select().from(adminAuditLogs).where(and(eq(adminAuditLogs.actorUserId, root.id), like(adminAuditLogs.detail, `Questão ${questionId} excluída%`)))).length).toBeGreaterThan(0);
      questionId = null;
    } finally {
      if (questionId) {
        await db.delete(questionChangelog).where(eq(questionChangelog.questionId, questionId));
        await db.delete(questionContentLinks).where(eq(questionContentLinks.questionId, questionId));
        await db.delete(questions).where(eq(questions.id, questionId));
      }
      await db.delete(adminAuditLogs).where(and(eq(adminAuditLogs.actorUserId, root.id), like(adminAuditLogs.detail, `%${token}%`)));
    }
  }, 30000);
});
