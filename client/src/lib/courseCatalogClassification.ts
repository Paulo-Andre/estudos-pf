export const courseAreaSuggestions = [
  "Policial/Militar",
  "Administrativo",
  "Saúde",
  "Jurídico",
  "Fiscal",
  "Educação",
  "Tecnologia",
  "Segurança",
  "Outros",
] as const;

export const stateScopeSuggestions = [
  "Nacional",
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
  "Regional",
  "Municipal",
] as const;

function preserveCurrentOption(suggestions: readonly string[], currentValue: string) {
  const current = currentValue.trim();
  return Array.from(new Set(current ? [current, ...suggestions] : suggestions));
}

export function getCourseClassificationOptions(input: { courseArea: string; stateCode: string }) {
  return {
    areas: preserveCurrentOption(courseAreaSuggestions, input.courseArea),
    states: preserveCurrentOption(stateScopeSuggestions, input.stateCode),
  };
}
