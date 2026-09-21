import { describe, expect, it } from "vitest";
import { rootAccessMessage } from "./rootAccessMessage";

describe("rootAccessMessage", () => {
  it("traduz a permissão técnica legada em orientação de nova entrada ROOT", () => {
    expect(rootAccessMessage({ message: "You do not have required permission (10002)" })).toContain("sessão ROOT");
  });

  it("traduz sessão não autenticada sem ocultar erros funcionais", () => {
    expect(rootAccessMessage({ message: "Sua sessão ROOT não está ativa.", data: { code: "UNAUTHORIZED" } })).toContain("usuário paulo");
    expect(rootAccessMessage({ message: "A capa deve ter no máximo 4 MB." })).toBe("A capa deve ter no máximo 4 MB.");
  });
});
