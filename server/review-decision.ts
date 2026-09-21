export type ReviewDecision = "approved" | "rejected" | "correction_requested";

export type ReviewQueueEntry = {
  id: number;
  status: "pending" | ReviewDecision;
  reviewedByUserId: number | null;
  notes: string | null;
};

export type ReviewDecisionRepository<T extends ReviewQueueEntry> = {
  find: (reviewId: number) => Promise<T | null>;
  update: (reviewId: number, changes: Pick<ReviewQueueEntry, "status" | "reviewedByUserId" | "notes">) => Promise<void>;
};

/** Persiste a decisão e sua observação na mesma entrada auditável da fila. */
export async function persistReviewDecision<T extends ReviewQueueEntry>(repository: ReviewDecisionRepository<T>, reviewId: number, actorUserId: number, decision: ReviewDecision, notes: string | null) {
  const review = await repository.find(reviewId);
  if (!review) throw new Error("Item de revisão não encontrado.");
  if (review.status !== "pending") throw new Error("Esta revisão já recebeu uma decisão.");
  const changes = { status: decision, reviewedByUserId: actorUserId, notes } as const;
  await repository.update(reviewId, changes);
  return { ...review, ...changes };
}
