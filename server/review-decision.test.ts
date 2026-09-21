import { describe, expect, it } from "vitest";
import { persistReviewDecision, type ReviewDecisionRepository, type ReviewQueueEntry } from "./review-decision";

function memoryReviewRepository(): ReviewDecisionRepository<ReviewQueueEntry> & { rows: ReviewQueueEntry[] } {
  const rows: ReviewQueueEntry[] = [
    { id: 1, status: "pending", reviewedByUserId: null, notes: null },
    { id: 2, status: "pending", reviewedByUserId: null, notes: null },
  ];
  return {
    rows,
    find: async reviewId => rows.find(row => row.id === reviewId) ?? null,
    update: async (reviewId, changes) => {
      const review = rows.find(row => row.id === reviewId);
      if (!review) throw new Error("Item de revisão não encontrado.");
      Object.assign(review, changes);
    },
  };
}

describe("persistReviewDecision", () => {
  it("grava e permite recuperar a observação de correção solicitada", async () => {
    const repository = memoryReviewRepository();
    await persistReviewDecision(repository, 1, 9, "correction_requested", "Explique melhor o fundamento jurídico.");

    expect(await repository.find(1)).toMatchObject({ status: "correction_requested", reviewedByUserId: 9, notes: "Explique melhor o fundamento jurídico." });
  });

  it("grava e permite recuperar a observação de rejeição", async () => {
    const repository = memoryReviewRepository();
    await persistReviewDecision(repository, 2, 11, "rejected", "A banca e o ano informados precisam ser confirmados.");

    expect(await repository.find(2)).toMatchObject({ status: "rejected", reviewedByUserId: 11, notes: "A banca e o ano informados precisam ser confirmados." });
  });
});
