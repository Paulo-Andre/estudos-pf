import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  contents,
  courseDisciplines,
  courseEnrollments,
  courses,
  disciplineContents,
  disciplines,
  studyContentProgress,
} from "../drizzle/schema";
import { createLocalUser, deleteManagedUser, getDb, getStudyCourseProgress, openStudyContent } from "./db";

describe("avisos de conteúdo na biblioteca do aluno", () => {
  it("exibe o aviso em conteúdo vinculado a uma matrícula anterior e o remove após a abertura", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;

    const token = `qa-notice-${Date.now().toString(36)}`;
    const courseId = `${token}-course`;
    const actor = await createLocalUser({
      name: "ROOT aviso QA", username: `${token}-root`, email: `${token}-root@example.invalid`, cpf: null,
      passwordHash: "hash-de-teste-nao-utilizado", role: "admin",
    });
    const learner = await createLocalUser({
      name: "Aluno aviso QA", username: `${token}-student`, email: `${token}-student@example.invalid`, cpf: null,
      passwordHash: "hash-de-teste-nao-utilizado",
    });
    let disciplineId: number | null = null;
    let contentId: number | null = null;

    try {
      const enrollmentStartAt = new Date(Date.now() - 10 * 60 * 1000);
      const noticeActivatedAt = new Date(Date.now() - 60 * 1000);
      await db.insert(courses).values({
        id: courseId, title: "Curso temporário de aviso", track: "QA", courseType: "concurso",
        description: "Curso criado apenas para validar avisos.", createdByUserId: actor.id,
      });
      const disciplineResult = await db.insert(disciplines).values({
        name: "Disciplina temporária de aviso", shortName: `${token}-disc`.slice(0, 48), status: "published",
        createdByUserId: actor.id, updatedByUserId: actor.id,
      });
      disciplineId = Number(disciplineResult[0].insertId);
      const contentResult = await db.insert(contents).values({
        title: "Conteúdo temporário com aviso", body: "Conteúdo de teste.", status: "published",
        noticeKind: "updated", noticeActivatedAt, createdByUserId: actor.id, updatedByUserId: actor.id,
      });
      contentId = Number(contentResult[0].insertId);
      await db.insert(courseDisciplines).values({ courseId, disciplineId, linkedByUserId: actor.id });
      await db.insert(disciplineContents).values({ disciplineId, contentId, linkedByUserId: actor.id });
      await db.insert(courseEnrollments).values({
        userId: learner.id, courseId, startAt: enrollmentStartAt,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), status: "active", createdByUserId: actor.id,
      });

      const beforeOpening = await getStudyCourseProgress(learner.id, courseId);
      expect(beforeOpening.contents).toHaveLength(1);
      expect(beforeOpening.contents[0]?.notice).toMatchObject({ kind: "updated", label: "CONTEÚDO ATUALIZADO" });

      const afterOpening = await openStudyContent(learner.id, { courseId, contentId });
      expect(afterOpening.contents[0]?.notice).toBeNull();
    } finally {
      if (contentId) await db.delete(studyContentProgress).where(eq(studyContentProgress.contentId, contentId));
      await db.delete(courseEnrollments).where(and(eq(courseEnrollments.userId, learner.id), eq(courseEnrollments.courseId, courseId)));
      if (disciplineId && contentId) await db.delete(disciplineContents).where(and(eq(disciplineContents.disciplineId, disciplineId), eq(disciplineContents.contentId, contentId)));
      await db.delete(courseDisciplines).where(eq(courseDisciplines.courseId, courseId));
      if (contentId) await db.delete(contents).where(eq(contents.id, contentId));
      if (disciplineId) await db.delete(disciplines).where(eq(disciplines.id, disciplineId));
      await db.delete(courses).where(eq(courses.id, courseId));
      await deleteManagedUser(learner.id).catch(() => undefined);
      await deleteManagedUser(actor.id).catch(() => undefined);
    }
  }, 20_000);
});
