export const planCourseSelectionMessage = "Selecione pelo menos um curso em “Cursos liberados” antes de criar o plano.";

export function validatePlanCourseSelection(courseIds: string[]) {
  return courseIds.length > 0 ? null : planCourseSelectionMessage;
}

export function resolveCommerceFormError(error: unknown) {
  const message = (error as { message?: string })?.message ?? "Não foi possível concluir a operação comercial.";
  if (message.includes("courseIds") || message.includes("Associe ao menos um curso.")) return planCourseSelectionMessage;
  return message;
}
