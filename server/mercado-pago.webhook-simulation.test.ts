import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { processMercadoPagoWebhook } from "./mercadoPago";

describe("simulação oficial do webhook do Mercado Pago", () => {
  it("aceita o evento assinado de validação sem consultar pagamento ou liberar matrícula", async () => {
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();
    expect(secret).toBeTruthy();

    const dataId = "123456";
    const requestId = "mercado-pago-production-simulation";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
    const digest = createHmac("sha256", secret!).update(manifest).digest("hex");

    await expect(processMercadoPagoWebhook({
      xSignature: `ts=${timestamp},v1=${digest}`,
      xRequestId: requestId,
      dataId,
      topic: "payment",
      isOfficialSimulation: true,
    })).resolves.toEqual({ action: "simulation" });
  });
});
