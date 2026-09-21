import { and, eq, like } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { adminAuditLogs, courseDisciplines, disciplines } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import { getDb, getUserByUsername } from "./db";
import { appRouter } from "./routers";

describe("exclusão segura de cursos", () => {
  it("remove o curso e seus vínculos, mas preserva a disciplina reutilizável", async () => {
    const root = await getUserByUsername("paulo");
    expect(root).toMatchObject({ username: "paulo", role: "admin" });
    if (!root) return;
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;

    const token = `curso-${Date.now().toString(36)}`;
    const courseId = `${token}-teste`;
    const context: TrpcContext = {
      user: root,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(context);
    let disciplineId: number | null = null;

    try {
      await caller.admin.createCourse({ id: courseId, title: `Curso temporário ${token}`, track: "TST", description: "Validação temporária de exclusão segura." });
      const discipline = await caller.admin.disciplines.create({
        name: `Disciplina reutilizável ${token}`,
        shortName: `T${token.replace(/[^a-z0-9]/gi, "").slice(-12)}`.toUpperCase(),
        description: "Disciplina temporária vinculada ao curso de teste.",
        requiresReview: false,
        status: "published",
        courseIds: [courseId],
        contentIds: [],
      });
      disciplineId = discipline!.id;
      expect((await caller.admin.disciplines.list()).find(item => item.id === disciplineId)?.courseIds).toContain(courseId);

      await caller.admin.deleteCourse({ courseId, confirmation: courseId });

      expect((await caller.admin.courses()).some(course => course.id === courseId)).toBe(false);
      const preservedDiscipline = (await caller.admin.disciplines.list()).find(item => item.id === disciplineId);
      expect(preservedDiscipline).toBeTruthy();
      expect(preservedDiscipline?.courseIds).not.toContain(courseId);
      expect((await db.select().from(courseDisciplines).where(eq(courseDisciplines.courseId, courseId))).length).toBe(0);
    } finally {
      if (disciplineId) await db.delete(disciplines).where(eq(disciplines.id, disciplineId));
      await db.delete(adminAuditLogs).where(and(eq(adminAuditLogs.actorUserId, root.id), like(adminAuditLogs.detail, `%${token}%`)));
    }
  }, 30000);
});
