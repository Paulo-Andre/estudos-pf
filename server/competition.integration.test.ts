import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { competitionAnswers, competitionRounds, questions } from "../drizzle/schema";
import { getDb, getUserByUsername } from "./db";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

describe("fluxo persistente da competição", () => {
  it("registra uma resposta em rodada própria e a expõe somente no ranking competitivo", async () => {
    const root = await getUserByUsername("paulo");
    const db = await getDb();
    expect(root).toMatchObject({ username: "paulo", role: "admin" });
    expect(db).toBeTruthy();
    if (!root || !db) return;

    const context: TrpcContext = {
      user: root,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(context);
    let roundId: string | null = null;

    try {
      const round = await caller.competition.startRound({});
      roundId = round.id;
      expect(round.questions.length).toBeGreaterThan(0);
      const firstQuestion = round.questions[0]!;
      const persistedQuestion = await db.select({ answerJson: questions.answerJson }).from(questions).where(eq(questions.id, firstQuestion.id)).limit(1);
      const submittedAnswer = JSON.parse(persistedQuestion[0]!.answerJson) as boolean | string;

      const feedback = await caller.competition.submitAnswer({ roundId, questionId: firstQuestion.id, submittedAnswer });
      expect(feedback).toMatchObject({ correct: true });

      const storedAnswers = await db.select().from(competitionAnswers).where(eq(competitionAnswers.roundId, roundId));
      expect(storedAnswers).toHaveLength(1);
      expect(storedAnswers[0]).toMatchObject({ userId: root.id, questionId: firstQuestion.id, correct: true });

      const ranking = await caller.competition.ranking({});
      expect(ranking).toEqual(expect.arrayContaining([expect.objectContaining({ userId: root.id, totalAnswered: expect.any(Number) })]));
    } finally {
      if (roundId) {
        await db.delete(competitionAnswers).where(eq(competitionAnswers.roundId, roundId));
        await db.delete(competitionRounds).where(eq(competitionRounds.id, roundId));
      }
    }
  });
});
