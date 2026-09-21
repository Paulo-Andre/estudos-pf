/** Normaliza alternativas digitadas ou coladas, preservando a primeira ocorrência e removendo duplicatas. */
export function normalizeQuestionOptions(rawValue: string) {
  return Array.from(new Set(
    rawValue
      .split(/\r?\n/)
      .map(option => option.replace(/\\+n/gi, " ").replace(/\s+/g, " ").trim())
      .filter(Boolean),
  ));
}

/** Exibe apenas a letra no seletor, mantendo o texto integral como valor persistido. */
export function questionOptionLabel(option: string, index: number) {
  const prefix = option.match(/^\s*(?:alternativa\s+)?([a-e])(?:[).,:;-]|\s|$)/i)?.[1]?.toUpperCase();
  return prefix ?? String.fromCharCode(65 + index);
}
