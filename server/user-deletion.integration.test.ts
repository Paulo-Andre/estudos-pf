import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { courseEnrollments, courses, studyReviewItems, users } from "../drizzle/schema";
import { createLocalUser, deleteManagedUser, getDb } from "./db";

describe("exclusão administrativa de aluno", () => {
  it("remove matrícula e revisão privada da conta excluída, preservando a biblioteca", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;

    const course = (await db.select().from(courses).limit(1))[0];
    expect(course).toBeTruthy();
    if (!course) return;

    const token = `qa-delete-${Date.now().toString(36)}`;
    const user = await createLocalUser({
      name: "Conta temporária de QA",
      username: token,
      email: `${token}@example.invalid`,
      cpf: null,
      passwordHash: "hash-de-teste-nao-utilizado",
    });

    try {
      const startAt = new Date(Date.now() - 60_000);
      const expiresAt = new Date(Date.now() + 60_000);
      await db.insert(courseEnrollments).values({
        userId: user.id,
        courseId: course.id,
        startAt,
        expiresAt,
        status: "active",
        createdByUserId: user.id,
      });
      await db.insert(studyReviewItems).values({
        userId: user.id,
        questionKey: `qa-question-${token}`,
        snapshotJson: JSON.stringify({ statement: "Questão temporária de QA", answer: true, explanation: "Registro para limpeza." }),
      });

      await deleteManagedUser(user.id);

      expect(await db.select().from(users).where(eq(users.id, user.id))).toHaveLength(0);
      expect(await db.select().from(courseEnrollments).where(eq(courseEnrollments.userId, user.id))).toHaveLength(0);
      expect(await db.select().from(studyReviewItems).where(eq(studyReviewItems.userId, user.id))).toHaveLength(0);
    } finally {
      await deleteManagedUser(user.id).catch(() => undefined);
    }
  });
});
