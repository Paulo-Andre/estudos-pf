import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { adminAuditLogs, simulationQuestions, simulationRecords, studyReviewItems } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import { createLocalUser, deleteManagedUser, getDb, getUserByUsername } from "./db";
import { appRouter } from "./routers";

const courseId = "pf-agente";

function callerContext(user: NonNullable<Awaited<ReturnType<typeof getUserByUsername>>>): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("E2E autenticado de aluno e ROOT", () => {
  it("valida estudo, checagem diária, revisão, simulado, matrícula e biblioteca central", async () => {
    const root = await getUserByUsername("paulo");
    const db = await getDb();
    expect(root).toMatchObject({ username: "paulo", role: "admin" });
    expect(db).toBeTruthy();
    if (!root || !db) return;

    const rootCaller = appRouter.createCaller(callerContext(root));
    const token = `qa-e2e-${Date.now().toString(36)}`;
    const simulationId = `simulation-${token}`;
    const learnerUsername = token.slice(0, 48);
    const learner = await createLocalUser({
      name: "Aluno temporário de E2E",
      username: learnerUsername,
      email: `${token}@example.invalid`,
      cpf: null,
      passwordHash: "hash-temporario-nao-utilizado",
    });
    const learnerCaller = appRouter.createCaller(callerContext(learner));
    let reviewId: number | null = null;

    try {
      await rootCaller.admin.grantEnrollment({
        userId: learner.id,
        courseId,
        startAt: new Date(Date.now() - 60_000),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      expect(learner).toMatchObject({ username: learnerUsername, role: "user", isBlocked: false });
      const access = await learnerCaller.study.access();
      expect(access.some(enrollment => enrollment.courseId === courseId)).toBe(true);

      const initialState = await learnerCaller.study.state();
      expect(initialState).toHaveProperty("xp");
      expect(Array.isArray(initialState.completedModules)).toBe(true);

      const daily = await learnerCaller.study.dailyCheck({ courseId });
      expect(daily.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (daily.question) {
        await learnerCaller.study.dismissDailyCheck({ courseId });
        const dismissed = await learnerCaller.study.dailyCheck({ courseId });
        expect(dismissed).toMatchObject({ date: daily.date, dismissed: true });
        expect(dismissed.question?.id).toBe(daily.question.id);
      }

      const studyQuestionBank = await learnerCaller.study.questions.list();
      const question = studyQuestionBank.questions.find(candidate => typeof candidate.answer === "boolean");
      expect(question).toBeTruthy();
      if (!question) return;

      const review = await learnerCaller.study.review.add({
        questionKey: token,
        snapshot: {
          statement: question.statement,
          answer: question.answer,
          explanation: question.explanation ?? "Justificativa disponível na questão.",
          discipline: "Disciplina de QA",
          subject: "Revisão autenticada de questão",
          source: question.source ?? "Base central",
        },
      });
      const pendingItem = review.find(item => item.questionKey === token);
      expect(pendingItem).toBeTruthy();
      reviewId = pendingItem?.id ?? null;
      if (!reviewId) return;

      const remainingReviews = await learnerCaller.study.review.complete({ id: reviewId });
      expect(remainingReviews.some(item => item.id === reviewId)).toBe(false);

      const simulation = await learnerCaller.study.submitSimulation({
        id: simulationId,
        total: 1,
        correct: 1,
        errors: 0,
        elapsedSeconds: 1,
        byDiscipline: {},
        byBlock: {},
        answers: [{ questionId: String(question.id), correct: true }],
        questionIds: [String(question.id)],
        persistentAnswers: [{
          questionId: question.id,
          correct: true,
          snapshot: { id: question.id, statement: question.statement, answer: question.answer },
        }],
      });
      expect(simulation.simulations.some(item => item.id === simulationId)).toBe(true);

      const users = await rootCaller.admin.users({ search: learnerUsername });
      expect(users.some(user => user.id === learner.id && user.username === learnerUsername)).toBe(true);

      const enrollments = await rootCaller.admin.enrollments({ userId: learner.id });
      const enrollment = enrollments.find(item => item.courseId === courseId && item.status === "active");
      expect(enrollment).toBeTruthy();
      if (!enrollment) return;

      const renewed = await rootCaller.admin.grantEnrollment({
        userId: learner.id,
        courseId,
        startAt: new Date(Date.now() - 60_000),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      expect(renewed).toMatchObject({ userId: learner.id, courseId, status: "active" });

      const managedQuestions = await rootCaller.admin.questions.list({});
      const managedCourses = await rootCaller.admin.courses();
      expect(managedQuestions.length).toBeGreaterThan(0);
      expect(managedCourses.some(course => course.id === courseId)).toBe(true);
    } finally {
      await db.delete(simulationQuestions).where(eq(simulationQuestions.simulationId, simulationId));
      await db.delete(simulationRecords).where(and(eq(simulationRecords.id, simulationId), eq(simulationRecords.userId, learner.id)));
      if (reviewId) await db.delete(studyReviewItems).where(and(eq(studyReviewItems.id, reviewId), eq(studyReviewItems.userId, learner.id)));
      await deleteManagedUser(learner.id).catch(() => undefined);
      await db.delete(adminAuditLogs).where(eq(adminAuditLogs.affectedUserId, learner.id));
    }
  }, 30000);
});
