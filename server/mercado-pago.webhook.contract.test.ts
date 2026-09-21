import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Payment } from "mercadopago";
import { processMercadoPagoWebhook, resolveMercadoPagoNotificationDataId } from "./mercadoPago";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("contrato de segurança do webhook Mercado Pago", () => {
  it("preserva o id de pagamento no formato legado para a validação da assinatura", () => {
    expect(resolveMercadoPagoNotificationDataId({
      queryDataId: undefined,
      queryId: "174710137194",
      body: undefined,
    })).toBe("174710137194");
  });

  it("rejeita notificação sem assinatura válida antes de consultar ou liberar pedido", async () => {
    await expect(processMercadoPagoWebhook({
      xSignature: "ts=1,v1=assinatura-invalida",
      xRequestId: "pedido-de-teste",
      dataId: "123456",
      topic: "payment",
    })).rejects.toThrow();
  });

  it("aceita uma assinatura HMAC criada com o segredo seguro configurado antes de consultar o pagamento", async () => {
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();
    expect(secret).toBeTruthy();

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const requestId = "validacao-segura-webhook";
    const dataId = "999999999";
    const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
    const signature = createHmac("sha256", secret!).update(manifest).digest("hex");
    const sentinel = new Error("payment-api-reached-after-signature-validation");
    const getSpy = vi.spyOn(Payment.prototype, "get").mockRejectedValue(sentinel);

    await expect(processMercadoPagoWebhook({
      xSignature: `ts=${timestamp},v1=${signature}`,
      xRequestId: requestId,
      dataId,
      topic: "payment",
    })).rejects.toBe(sentinel);
    expect(getSpy).toHaveBeenCalledWith({ id: Number(dataId) });
  });
});
