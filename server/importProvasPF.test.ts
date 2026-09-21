import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { getUserByUsername } from "./db";
import { loadPF2018Questions } from "./importProvasPF";
import { appRouter } from "./routers";

describe("importador da prova de Agente PF 2018", () => {
  const questions = loadPF2018Questions();

  it("estrutura os 120 itens conciliados com o gabarito oficial C/E", () => {
    expect(questions).toHaveLength(120);
    expect(questions.map(question => question.itemNumber)).toEqual(Array.from({ length: 120 }, (_, index) => index + 1));
    expect(questions[0].answer).toBe(true);
    expect(questions[2].answer).toBe(false);
    expect(questions[119].answer).toBe(false);
    expect(new Set(questions.map(question => question.source))).toHaveLength(120);
    expect(questions.every(question => question.source.length <= 240)).toBe(true);
  });

  it("preserva os contextos e as recuperações visuais necessárias para o julgamento", () => {
    expect(questions[0].statement).toContain("Nudetective");
    expect(questions[49].statement).toContain("(W − 20) / √4");
    expect(questions[57].statement).toContain("1/30");
    expect(questions[80].statement).toContain("produto (atributos código, descrição e preço)");
    expect(questions[119].statement).not.toContain("PROVA DISCURSIVA");
  });

  it("atribui ao menos um conteúdo central específico a cada item", () => {
    expect(questions.every(question => question.contentCodes.length > 0)).toBe(true);
    expect(questions[37].contentCodes).toEqual(["LE-02"]);
    expect(questions[44].contentCodes).toEqual(["EST-07"]);
    expect(questions[62].contentCodes).toEqual(["INF-02", "INF-05"]);
    expect(questions[117].contentCodes).toEqual(["CT-04"]);
  });

  it("entrega os itens importados e seus vínculos à listagem administrativa ROOT", async () => {
    const root = await getUserByUsername("paulo");
    expect(root).toMatchObject({ username: "paulo", role: "admin" });
    if (!root) return;
    const context: TrpcContext = {
      user: root,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const listedQuestions = await appRouter.createCaller(context).admin.questions.list({});
    const importedQuestions = listedQuestions.filter(question => question.source?.startsWith("PROVA_PF_2018:item_"));

    expect(importedQuestions).toHaveLength(120);
    expect(importedQuestions.every(question => question.contentIds.length > 0)).toBe(true);
    expect(importedQuestions.find(question => question.source?.startsWith("PROVA_PF_2018:item_58"))?.statement).toContain("1/30");
  });
});
