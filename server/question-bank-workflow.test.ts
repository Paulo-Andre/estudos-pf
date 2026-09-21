import { describe, expect, it } from "vitest";
import { requiresExclusiveCentralBank, selectEligibleUniqueQuestions } from "./question-bank-policy";
import { persistReviewDecision, type ReviewDecisionRepository, type ReviewQueueEntry } from "./review-decision";

type WorkflowQuestion = {
  id: number;
  statement: string;
  status: "draft" | "review" | "approved" | "published" | "inactive";
  requiresReview: boolean;
  contentIds: number[];
};

function reviewRepository(): ReviewDecisionRepository<ReviewQueueEntry> {
  const rows: ReviewQueueEntry[] = [{ id: 88, status: "pending", reviewedByUserId: null, notes: null }];
  return {
    find: async id => rows.find(row => row.id === id) ?? null,
    update: async (id, changes) => {
      const row = rows.find(item => item.id === id);
      if (!row) throw new Error("Item de revisão não encontrado.");
      Object.assign(row, changes);
    },
  };
}

describe("fluxo ponta a ponta do banco central de questões", () => {
  it("mantém uma questão única, a aprova em revisão e conserva seu snapshot após edição", async () => {
    const question: WorkflowQuestion = {
      id: 501,
      statement: "O ato administrativo vinculado dispensa motivação.",
      status: "draft",
      requiresReview: true,
      contentIds: [31, 32],
    };
    const audit = [{ field: "created", oldValue: null, newValue: question.statement }];
    const reviews = reviewRepository();

    expect(question.contentIds).toHaveLength(2);
    expect(requiresExclusiveCentralBank([question])).toBe(true);
    expect(selectEligibleUniqueQuestions([question, { ...question }], 10)).toEqual([]);

    const review = await persistReviewDecision(reviews, 88, 7, "approved", null);
    expect(review.status).toBe("approved");
    question.status = "approved";

    const selected = selectEligibleUniqueQuestions([question, { ...question }], 10);
    expect(selected).toHaveLength(1);
    expect(selected[0].id).toBe(question.id);

    const snapshot = JSON.stringify({ id: question.id, statement: question.statement, answer: false, contentIds: question.contentIds });
    const previousStatement = question.statement;
    question.statement = "O ato administrativo vinculado exige motivação quando a lei a determinar.";
    audit.push({ field: "statement", oldValue: previousStatement, newValue: question.statement });

    expect(JSON.parse(snapshot)).toMatchObject({ id: 501, statement: previousStatement, answer: false, contentIds: [31, 32] });
    expect(audit).toHaveLength(2);
    expect(audit[1].oldValue).toBe(previousStatement);
  });
});
