import { describe, expect, it } from "vitest";
import { normalizeQuestionOptions, questionOptionLabel } from "../client/src/lib/questionOptions";

describe("normalização de alternativas", () => {
  it("preserva alternativas inteiras com sequência literal e remove repetições", () => {
    expect(normalizeQuestionOptions("A\\n certo\nA\\n certo\nB\\n errado\n\nB\\n errado\r\nC\\n talvez")).toEqual([
      "A certo",
      "B errado",
      "C talvez",
    ]);
  });

  it("mostra somente a letra da alternativa no seletor, mas preserva o texto como valor", () => {
    const options = normalizeQuestionOptions("A\\n certo\nB\\n errado\nC\\n talvez");
    expect(options).toEqual(["A certo", "B errado", "C talvez"]);
    expect(options.map(questionOptionLabel)).toEqual(["A", "B", "C"]);
  });
});
