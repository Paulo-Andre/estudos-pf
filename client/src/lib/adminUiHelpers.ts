export function filterLinkOptions<T>(items: T[], search: string, getText: (item: T) => string) {
  const normalizedSearch = search.trim().toLocaleLowerCase();
  if (!normalizedSearch) return items;
  return items.filter(item => getText(item).toLocaleLowerCase().includes(normalizedSearch));
}

export function countQuestionsByContent<T extends { contentIds: number[] }>(questions: T[]) {
  const counts = new Map<number, number>();
  for (const question of questions) {
    for (const contentId of question.contentIds) {
      counts.set(contentId, (counts.get(contentId) ?? 0) + 1);
    }
  }
  return counts;
}

export function libraryLoadState(isLoading: boolean, itemCount: number) {
  if (isLoading) return "loading" as const;
  if (itemCount === 0) return "empty" as const;
  return "ready" as const;
}

export function reviewEmptyStateMessage(hasActiveFilters: boolean) {
  return hasActiveFilters
    ? "Nenhum item corresponde aos filtros atuais. Ajuste a busca ou selecione ‘Todas as decisões’."
    : "Não há pendências agora. Para iniciar uma revisão, edite uma questão ou conteúdo e escolha ‘EM REVISÃO’, ou clique em ‘Adicionar à revisão’ no cartão.";
}

export const reviewFlowSteps = [
  "Adicionar à revisão",
  "Localizar na fila",
  "Abrir e corrigir, se necessário",
  "Aprovar, solicitar correção ou rejeitar",
] as const;
