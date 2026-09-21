import { describe, expect, it } from "vitest";
import { isStorefrontPreviewMode, isTrustedStorefrontPreviewMessage, storefrontPreviewMessageType } from "./storefrontPreview";

describe("prévia isolada da vitrine", () => {
  it("ativa somente a prévia pública solicitada pela URL", () => {
    expect(isStorefrontPreviewMode("?preview=storefront")).toBe(true);
    expect(isStorefrontPreviewMode("?preview=other")).toBe(false);
    expect(isStorefrontPreviewMode("")).toBe(false);
  });

  it("aceita atualizações de rascunho somente da mesma origem", () => {
    expect(isTrustedStorefrontPreviewMessage("https://nucleo.test", "https://nucleo.test", storefrontPreviewMessageType)).toBe(true);
    expect(isTrustedStorefrontPreviewMessage("https://externo.test", "https://nucleo.test", storefrontPreviewMessageType)).toBe(false);
    expect(isTrustedStorefrontPreviewMessage("https://nucleo.test", "https://nucleo.test", "outra-mensagem")).toBe(false);
  });
});
