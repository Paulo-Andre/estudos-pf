export const rootAdminAreas = {
  students: {
    shortLabel: "ALUNOS",
    title: "Gestão de alunos",
    description: "Contas, matrículas, cursos e auditoria.",
  },
  library: {
    shortLabel: "QUESTÕES",
    title: "Questões e conteúdo",
    description: "Biblioteca central para localizar, editar e revisar questões.",
  },
} as const;

// Este contêiner é usado tanto em celular quanto em desktop: não pode receber
// classes de ocultação responsiva, pois o ROOT precisa alcançar ambas as áreas.
export const rootAdminActionContainerClassName = "flex items-center gap-1";

export const existingQuestionEditingSteps = [
  "Localize: pesquise palavras do enunciado e filtre pelo status.",
  "Edite: clique em Editar questão no cartão encontrado.",
  "Salve: use Salvar edição e registrar histórico.",
] as const;
