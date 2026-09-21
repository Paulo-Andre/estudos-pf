import { and, eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  adminAuditLogs,
  contentChangelog,
  contents,
  courseDisciplines,
  disciplineContents,
  disciplines,
  questionChangelog,
  questionContentLinks,
  questions,
  reviewQueue,
  simulationQuestions,
  simulationRecords,
  studyAnswers,
  studyProfiles,
} from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import { getDb, getUserByUsername } from "./db";
import { appRouter } from "./routers";

describe("integração real do banco central de questões", () => {
  it("cria, vincula, revisa, aprova e disponibiliza uma questão única no simulado sem alterar seu snapshot", async () => {
    const root = await getUserByUsername("paulo");
    expect(root).toMatchObject({ username: "paulo", role: "admin" });
    if (!root) return;
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;

    const token = `e2e-${Date.now().toString(36)}`;
    const shortName = `E2E${token.replace(/[^a-z0-9]/gi, "").slice(-18)}`.toUpperCase();
    const simulationId = `sm-${token}`;
    let disciplineId: number | null = null;
    const contentIds: number[] = [];
    let questionId: number | null = null;
    let reviewId: number | null = null;
    let correctionQuestionId: number | null = null;
    let correctionReviewId: number | null = null;
    const auditDetails: string[] = [];
    const profileBefore = (await db.select().from(studyProfiles).where(eq(studyProfiles.userId, root.id)).limit(1))[0] ?? null;
    const context: TrpcContext = {
      user: root,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(context);

    try {
      const firstContent = await caller.admin.contents.create({
        title: `__${token} Fundamentos administrativos`, body: "Conteúdo temporário de validação integrada.", requiresReview: false, status: "published", disciplineIds: [],
      });
      const secondContent = await caller.admin.contents.create({
        title: `__${token} Atos administrativos`, body: "Segundo conteúdo temporário de validação integrada.", requiresReview: false, status: "published", disciplineIds: [],
      });
      contentIds.push(firstContent!.id, secondContent!.id);
      auditDetails.push(`Conteúdo ${firstContent!.id} criado.`, `Conteúdo ${secondContent!.id} criado.`);

      const discipline = await caller.admin.disciplines.create({
        name: `Disciplina integrada ${token}`, shortName, description: "Disciplina temporária de teste.", requiresReview: false, status: "published", courseIds: [], contentIds,
      });
      disciplineId = discipline!.id;
      auditDetails.push(`Disciplina ${shortName} criada.`);

      const originalStatement = `__${token}: Um ato administrativo vinculado depende dos requisitos legais aplicáveis.`;
      const question = await caller.admin.questions.create({
        statement: originalStatement, questionType: "certo_errado", options: [], answer: true, explanation: "Justificativa temporária do teste integrado.",
        difficulty: "intermediate", source: `teste-${token}`, banca: "E2E", year: 2026, requiresReview: true, status: "draft", contentIds,
      });
      questionId = question!.id;
      auditDetails.push(`Questão ${questionId} criada.`);

      const byFirstContent = await caller.admin.questions.list({ contentId: firstContent!.id });
      const bySecondContent = await caller.admin.questions.list({ contentId: secondContent!.id });
      expect(byFirstContent.filter(item => item.id === questionId)).toHaveLength(1);
      expect(bySecondContent.filter(item => item.id === questionId)).toHaveLength(1);

      await caller.admin.questions.sendToReview({ id: questionId });
      auditDetails.push(`Questão ${questionId} enviada para revisão.`);
      const pending = await caller.admin.review.list({ itemType: "question", status: "pending", search: token });
      const review = pending.find(item => item.itemId === questionId);
      expect(review).toBeTruthy();
      reviewId = review!.id;

      await caller.admin.review.decide({ id: reviewId, decision: "approved" });
      auditDetails.push(`Revisão ${reviewId} concluída como approved.`);
      expect((await caller.admin.review.list({ itemType: "question", status: "approved", search: token })).some(item => item.id === reviewId)).toBe(true);

      const correctionQuestion = await caller.admin.questions.create({
        statement: `__${token}: Questão temporária que exige correção editorial fundamentada.`, questionType: "certo_errado", options: [], answer: true,
        explanation: "Justificativa temporária para validar a solicitação de correção.", difficulty: "basic", source: `correction-${token}`, banca: "E2E", year: 2026,
        requiresReview: true, status: "draft", contentIds,
      });
      correctionQuestionId = correctionQuestion!.id;
      auditDetails.push(`Questão ${correctionQuestionId} criada para correção.`);
      await caller.admin.questions.sendToReview({ id: correctionQuestionId });
      const correctionPending = await caller.admin.review.list({ itemType: "question", status: "pending", search: token });
      const correctionReview = correctionPending.find(item => item.itemId === correctionQuestionId);
      expect(correctionReview).toBeTruthy();
      correctionReviewId = correctionReview!.id;
      await caller.admin.review.decide({ id: correctionReviewId, decision: "correction_requested", notes: "Revisar a clareza do enunciado antes de publicar." });
      const correctionRequested = await caller.admin.review.list({ itemType: "question", status: "correction_requested", search: token });
      expect(correctionRequested.some(item => item.id === correctionReviewId && item.notes?.includes("clareza do enunciado"))).toBe(true);

      const studyQuestions = await caller.study.questions.list();
      const published = studyQuestions.questions.filter(item => item.id === questionId);
      expect(studyQuestions.requiresReviewMode).toBe(true);
      expect(published).toHaveLength(1);
      expect(published[0].contentIds.sort()).toEqual(contentIds.slice().sort());

      const immutableSnapshot = { id: questionId, statement: originalStatement, answer: true, contentIds };
      await caller.study.submitSimulation({
        id: simulationId, total: 1, correct: 1, errors: 0, elapsedSeconds: 12, byDiscipline: {}, byBlock: {},
        answers: [{ questionId: String(questionId), correct: true }], questionIds: [String(questionId)],
        persistentAnswers: [{ questionId, correct: true, snapshot: immutableSnapshot }],
      });
      const persistedSnapshot = (await db.select().from(simulationQuestions).where(and(eq(simulationQuestions.simulationId, simulationId), eq(simulationQuestions.questionId, questionId))).limit(1))[0];
      expect(JSON.parse(persistedSnapshot.snapshotJson)).toEqual(immutableSnapshot);

      const updatedStatement = `__${token}: O ato administrativo vinculado requer os requisitos legais aplicáveis.`;
      await caller.admin.questions.update({ id: questionId, data: {
        statement: updatedStatement, questionType: "certo_errado", options: [], answer: true, explanation: "Justificativa temporária atualizada.",
        difficulty: "intermediate", source: `teste-${token}`, banca: "E2E", year: 2026, requiresReview: true, status: "approved", contentIds,
      } });
      auditDetails.push(`Questão ${questionId} atualizada sem substituição do identificador.`);
      expect(JSON.parse((await db.select().from(simulationQuestions).where(eq(simulationQuestions.simulationId, simulationId)).limit(1))[0].snapshotJson)).toEqual(immutableSnapshot);
      expect((await caller.admin.questions.changelog({ id: questionId })).some(change => change.changedField === "statement" && change.oldValue?.includes(originalStatement))).toBe(true);
    } finally {
      await db.delete(simulationQuestions).where(eq(simulationQuestions.simulationId, simulationId));
      await db.delete(simulationRecords).where(eq(simulationRecords.id, simulationId));
      if (questionId) {
        await db.delete(studyAnswers).where(and(eq(studyAnswers.userId, root.id), eq(studyAnswers.questionId, String(questionId))));
      }
      const temporaryQuestionIds = [questionId, correctionQuestionId].filter((id): id is number => id !== null);
      if (temporaryQuestionIds.length) {
        await db.delete(reviewQueue).where(and(eq(reviewQueue.itemType, "question"), inArray(reviewQueue.itemId, temporaryQuestionIds)));
        await db.delete(questionChangelog).where(inArray(questionChangelog.questionId, temporaryQuestionIds));
        await db.delete(questionContentLinks).where(inArray(questionContentLinks.questionId, temporaryQuestionIds));
        await db.delete(questions).where(inArray(questions.id, temporaryQuestionIds));
      }
      if (contentIds.length) {
        await db.delete(contentChangelog).where(inArray(contentChangelog.contentId, contentIds));
        await db.delete(disciplineContents).where(inArray(disciplineContents.contentId, contentIds));
        await db.delete(contents).where(inArray(contents.id, contentIds));
      }
      if (disciplineId) {
        await db.delete(courseDisciplines).where(eq(courseDisciplines.disciplineId, disciplineId));
        await db.delete(disciplineContents).where(eq(disciplineContents.disciplineId, disciplineId));
        await db.delete(disciplines).where(eq(disciplines.id, disciplineId));
      }
      if (auditDetails.length) await db.delete(adminAuditLogs).where(and(eq(adminAuditLogs.actorUserId, root.id), inArray(adminAuditLogs.detail, auditDetails)));
      if (profileBefore) {
        await db.update(studyProfiles).set({
          xp: profileBefore.xp, lastStudyDate: profileBefore.lastStudyDate, studyDatesJson: profileBefore.studyDatesJson, usedQuestionIdsJson: profileBefore.usedQuestionIdsJson,
        }).where(eq(studyProfiles.userId, root.id));
      } else {
        await db.delete(studyProfiles).where(eq(studyProfiles.userId, root.id));
      }
    }
  }, 30000);
});
