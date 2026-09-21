import { describe, expect, it } from "vitest";
import { isAllowedCourseCoverUrl } from "./courseCoverUrl";

describe("URLs de capa da plataforma", () => {
  it("aceita uma capa interna produzida pelo armazenamento da plataforma para cursos e planos", () => {
    expect(isAllowedCourseCoverUrl("/manus-storage/capa-curso_123.webp")).toBe(true);
    expect(isAllowedCourseCoverUrl("/manus-storage/capa-plano_456.webp")).toBe(true);
  });

  it("aceita uma URL externa HTTPS e recusa formatos inseguros", () => {
    expect(isAllowedCourseCoverUrl("https://cdn.exemplo.com/capa.jpg")).toBe(true);
    expect(isAllowedCourseCoverUrl("http://exemplo.com/capa.jpg")).toBe(false);
    expect(isAllowedCourseCoverUrl("/qualquer-outro-caminho.jpg")).toBe(false);
  });
});
