export type QuestionFormValidationInput = {
  statement: string;
  questionType: "certo_errado" | "multipla_escolha";
  options: string[];
  answer: boolean | string;
};

export function questionFormValidationError(input: QuestionFormValidationInput): string | null {
  if (input.statement.trim().length < 12) {
    return "Informe um enunciado com ao menos 12 caracteres.";
  }

  if (input.questionType !== "multipla_escolha") {
    return null;
  }

  if (!input.options.length) {
    return "Inclua ao menos uma alternativa antes de salvar.";
  }

  if (typeof input.answer !== "string" || !input.options.includes(input.answer)) {
    return "Selecione a resposta correta antes de salvar.";
  }

  return null;
}

export function questionCreationSuccessMessage(questionId: number) {
  return `Questão #${questionId} criada com identificador persistente.`;
}

export function newQuestionFormKey(revision: number) {
  return `new-question-${revision}`;
}
