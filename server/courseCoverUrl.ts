/** URLs permitidas para capas: HTTPS externo ou caminho interno gerado pelo armazenamento da plataforma. */
export function isAllowedCourseCoverUrl(value: string) {
  if (!value) return true;
  if (value.startsWith("/manus-storage/")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
