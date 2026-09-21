import { createHmac } from "node:crypto";
import { WebhookSignatureValidator } from "mercadopago";
import { describe, expect, it } from "vitest";

describe("assinatura de produção do webhook do Mercado Pago", () => {
  it("valida uma assinatura HMAC construída com o segredo configurado sem expor o valor", () => {
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();
    expect(secret).toBeTruthy();

    const dataId = "1";
    const requestId = "nucleo-concursos-webhook-validation";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
    const digest = createHmac("sha256", secret!).update(manifest).digest("hex");

    expect(() => WebhookSignatureValidator.validate({
      xSignature: `ts=${timestamp},v1=${digest}`,
      xRequestId: requestId,
      dataId,
      secret: secret!,
      toleranceSeconds: 30,
    })).not.toThrow();
  });
});
