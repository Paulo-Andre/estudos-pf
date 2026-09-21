import { and, eq, like } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { adminAuditLogs, contentChangelog, contents, disciplineContents, disciplines } from "../drizzle/schema";
import { filterLinkOptions } from "../client/src/lib/adminUiHelpers";
import type { TrpcContext } from "./_core/context";
import { getDb, getUserByUsername } from "./db";
import { appRouter } from "./routers";

describe("busca de vínculos reutilizáveis", () => {
  it("lista e encontra disciplinas e conteúdos existentes pelo contrato administrativo", async () => {
    const root = await getUserByUsername("paulo");
    const db = await getDb();
    expect(root).toMatchObject({ username: "paulo", role: "admin" });
    expect(db).toBeTruthy();
    if (!root || !db) return;

    const token = `link-${Date.now().toString(36)}`;
    let contentId: number | null = null;
    let disciplineId: number | null = null;
    const context: TrpcContext = { user: root, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
    const caller = appRouter.createCaller(context);

    try {
      const content = await caller.admin.contents.create({
        title: `Conteúdo reutilizável ${token}`, body: "Registro temporário para validar a busca administrativa.", requiresReview: false, status: "draft", disciplineIds: [],
      });
      contentId = content!.id;
      const discipline = await caller.admin.disciplines.create({
        name: `Disciplina reutilizável ${token}`, shortName: `L${token.replace(/[^a-z0-9]/gi, "").slice(-12)}`.toUpperCase(), description: "Disciplina temporária de teste.", requiresReview: false, status: "draft", courseIds: [], contentIds: [contentId],
      });
      disciplineId = discipline!.id;

      const [availableDisciplines, availableContents] = await Promise.all([caller.admin.disciplines.list(), caller.admin.contents.list()]);
      expect(filterLinkOptions(availableDisciplines, token, item => `${item.name} ${item.shortName}`).some(item => item.id === disciplineId)).toBe(true);
      expect(filterLinkOptions(availableContents, token, item => item.title).some(item => item.id === contentId)).toBe(true);
    } finally {
      if (disciplineId) {
        await db.delete(disciplineContents).where(eq(disciplineContents.disciplineId, disciplineId));
        await db.delete(disciplines).where(eq(disciplines.id, disciplineId));
      }
      if (contentId) {
        await db.delete(contentChangelog).where(eq(contentChangelog.contentId, contentId));
        await db.delete(contents).where(eq(contents.id, contentId));
      }
      await db.delete(adminAuditLogs).where(and(eq(adminAuditLogs.actorUserId, root.id), like(adminAuditLogs.detail, `%${token}%`)));
    }
  }, 30000);
});
