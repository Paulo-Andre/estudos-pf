export type SimulationAnswerFeedback = {
  hasAnswered: boolean;
  isCorrect: boolean;
  resultLabel: string;
  nextLabel: string;
};

export function simulationAnswerFeedback(answer: boolean | undefined, correctAnswer: boolean, isLastQuestion: boolean): SimulationAnswerFeedback {
  const hasAnswered = typeof answer === "boolean";
  const isCorrect = hasAnswered && answer === correctAnswer;
  return {
    hasAnswered,
    isCorrect,
    resultLabel: isCorrect ? "Resposta correta" : "Resposta incorreta",
    nextLabel: isLastQuestion ? "Finalizar simulado" : "Próxima questão",
  };
}
