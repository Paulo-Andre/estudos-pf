import { describe, expect, it } from "vitest";
import { normalizeQuestionOptions } from "../client/src/lib/questionOptions";
import { newQuestionFormKey, questionCreationSuccessMessage, questionFormValidationError } from "../client/src/lib/questionFormValidation";

describe("validação visível do formulário de questão", () => {
  const options = normalizeQuestionOptions("A) Correta\nB) Incorreta\nC) Distrator\nD) Outra opção");

  it("informa que a resposta correta deve ser escolhida em questão de múltipla escolha", () => {
    expect(questionFormValidationError({
      statement: "Enunciado válido para confirmar o comportamento do formulário.",
      questionType: "multipla_escolha",
      options,
      answer: "",
    })).toBe("Selecione a resposta correta antes de salvar.");
  });

  it("aceita a resposta completa preservada pela alternativa e não a letra isolada", () => {
    expect(questionFormValidationError({
      statement: "Enunciado válido para confirmar o comportamento do formulário.",
      questionType: "multipla_escolha",
      options,
      answer: options[0],
    })).toBeNull();

    expect(questionFormValidationError({
      statement: "Enunciado válido para confirmar o comportamento do formulário.",
      questionType: "multipla_escolha",
      options,
      answer: "A",
    })).toBe("Selecione a resposta correta antes de salvar.");
  });

  it("mantém a orientação para enunciados insuficientes", () => {
    expect(questionFormValidationError({
      statement: "Curto",
      questionType: "certo_errado",
      options: [],
      answer: true,
    })).toBe("Informe um enunciado com ao menos 12 caracteres.");
  });

  it("informa o identificador persistente na confirmação de criação", () => {
    expect(questionCreationSuccessMessage(42)).toBe("Questão #42 criada com identificador persistente.");
  });

  it("gera uma nova chave de formulário após uma criação para descartar o estado anterior", () => {
    expect(newQuestionFormKey(0)).toBe("new-question-0");
    expect(newQuestionFormKey(1)).not.toBe(newQuestionFormKey(0));
  });
});
