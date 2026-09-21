import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { getUserByUsername, listStudyReviewItems, removeStudyReviewItem } from "./db";
import type { TrpcContext } from "./_core/context";

const testQuestionKey = "__qa_revisao_pessoal_root";

describe("rotas reais da revisão pessoal", () => {
  it("salva, conclui e remove uma questão da fila privada do ROOT", async () => {
    const root = await getUserByUsername("paulo");
    expect(root).toMatchObject({ username: "paulo", role: "admin" });
    if (!root) return;

    const context: TrpcContext = {
      user: root,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(context);

    try {
      const pending = await caller.study.review.add({
        questionKey: testQuestionKey,
        snapshot: {
          statement: "Questão temporária para validar a fila privada de revisão.",
          answer: true,
          explanation: "A fila deve continuar vinculada somente à conta que a salvou.",
          discipline: "QA",
          subject: "Revisão pessoal",
          source: "Teste de integração",
        },
      });
      const saved = pending.find(item => item.questionKey === testQuestionKey);
      expect(saved).toMatchObject({ questionKey: testQuestionKey, status: "pending", snapshot: { discipline: "QA" } });
      if (!saved) return;

      await caller.study.review.complete({ id: saved.id });
      expect(await caller.study.review.list()).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: saved.id })]));
      expect(await listStudyReviewItems(root.id, "mastered")).toEqual(expect.arrayContaining([expect.objectContaining({ id: saved.id, status: "mastered" })]));

      await caller.study.review.remove({ id: saved.id });
      expect(await listStudyReviewItems(root.id, "mastered")).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: saved.id })]));
    } finally {
      const pending = await listStudyReviewItems(root.id, "pending");
      const mastered = await listStudyReviewItems(root.id, "mastered");
      const residue = [...pending, ...mastered].find(item => item.questionKey === testQuestionKey);
      if (residue) await removeStudyReviewItem(root.id, residue.id);
    }
  });
});
