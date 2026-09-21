import { describe, expect, it } from "vitest";
import { resolvePlatformAlertLabel, resolvePlatformAlertTitle } from "./platformAlertPresentation";

describe("apresentação dos alertas da plataforma", () => {
  it("prioriza o título personalizado enviado pelo ROOT", () => {
    expect(resolvePlatformAlertTitle("  Novo simulado liberado  ", "improvement")).toBe("Novo simulado liberado");
  });

  it("mantém um título seguro para alertas antigos sem título", () => {
    expect(resolvePlatformAlertTitle(null, "urgent")).toBe("Urgência");
  });

  it("prioriza o rótulo de categoria personalizado e preserva o fallback por nível", () => {
    expect(resolvePlatformAlertLabel("  Novidade  ", "improvement")).toBe("Novidade");
    expect(resolvePlatformAlertLabel("   ", "warning")).toBe("Aviso");
  });
});
