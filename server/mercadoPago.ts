import { eq } from "drizzle-orm";
import { MercadoPagoConfig, Payment, Preference, WebhookSignatureValidator } from "mercadopago";
import { commerceOrders, commerceTransactions } from "../drizzle/schema";
import { getDb, writeAdminAudit } from "./db";
import { approveCommerceOrder } from "./commerce";

const PROVIDER = "mercado_pago";

function accessToken() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("A integração de pagamentos ainda não está configurada.");
  return token;
}

function clientConfig() {
  return new MercadoPagoConfig({ accessToken: accessToken(), options: { timeout: 10000 } });
}

function checkoutExpiry() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

export type CheckoutOrigin = {
  origin: string;
  notificationUrl: string;
};

export async function createMercadoPagoCheckout(userId: number, orderId: string, urls: CheckoutOrigin) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const order = (await db.select().from(commerceOrders).where(eq(commerceOrders.id, orderId)).limit(1))[0];
  if (!order || order.userId !== userId) throw new Error("Pedido não encontrado.");
  if (order.status !== "pending_payment") throw new Error("Este pedido não está disponível para pagamento.");
  if (order.totalCents <= 0) throw new Error("Este pedido não exige pagamento.");
  if (order.expiresAt && order.expiresAt <= new Date()) throw new Error("Este pedido expirou. Selecione o plano novamente.");

  const item = (await db.select().from(commerceTransactions).where(eq(commerceTransactions.orderId, orderId)).limit(1))[0];
  if (!item) throw new Error("Transação do pedido não encontrada.");
  const preference = new Preference(clientConfig());
  const result = await preference.create({
    body: {
      items: [{ id: order.planId, title: `Núcleo Concursos — pedido ${order.id}`, quantity: 1, unit_price: order.totalCents / 100, currency_id: "BRL" }],
      external_reference: order.id,
      notification_url: urls.notificationUrl,
      back_urls: { success: `${urls.origin}/?payment=success&order=${encodeURIComponent(order.id)}`, pending: `${urls.origin}/?payment=pending&order=${encodeURIComponent(order.id)}`, failure: `${urls.origin}/?payment=failure&order=${encodeURIComponent(order.id)}` },
      auto_return: "approved",
      expires: true,
      expiration_date_to: checkoutExpiry(),
      statement_descriptor: "NUCLEO CONCURSOS",
      metadata: { order_id: order.id, user_id: userId },
    },
    requestOptions: { idempotencyKey: `checkout-${order.id}` },
  });
  if (!result.id || (!result.init_point && !result.sandbox_init_point)) throw new Error("O Mercado Pago não retornou uma URL de checkout.");

  await db.update(commerceOrders).set({ provider: PROVIDER, providerReference: String(result.id) }).where(eq(commerceOrders.id, order.id));
  await db.update(commerceTransactions).set({ provider: PROVIDER, providerReference: String(result.id) }).where(eq(commerceTransactions.orderId, order.id));
  const isProductionToken = !accessToken().startsWith("TEST-");
  return { orderId: order.id, preferenceId: String(result.id), checkoutUrl: isProductionToken ? result.init_point! : (result.sandbox_init_point ?? result.init_point)! };
}

export type MercadoPagoWebhookInput = {
  xSignature: string | string[] | undefined;
  xRequestId: string | string[] | undefined;
  dataId: string | string[] | undefined;
  topic?: unknown;
  isOfficialSimulation?: boolean;
};

type MercadoPagoWebhookBody = {
  data?: { id?: unknown };
  id?: unknown;
};

function firstString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const first = value.find((entry): entry is string => typeof entry === "string");
    return first;
  }
  return undefined;
}

/**
 * O evento "Pagamentos (legacy)" pode enviar o identificador em `id`,
 * enquanto os Webhooks atuais usam `data.id`. Ambos participam da assinatura
 * HMAC e precisam chegar ao validador com o mesmo valor recebido.
 */
export function resolveMercadoPagoNotificationDataId(input: {
  queryDataId: unknown;
  queryId: unknown;
  body: unknown;
}): string | undefined {
  const body = input.body && typeof input.body === "object" ? input.body as MercadoPagoWebhookBody : undefined;
  return firstString(input.queryDataId)
    ?? firstString(input.queryId)
    ?? firstString(body?.data?.id)
    ?? firstString(body?.id);
}

export async function processMercadoPagoWebhook(input: MercadoPagoWebhookInput) {
  if (input.topic && input.topic !== "payment") return { action: "ignored" as const };
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("A assinatura do webhook do Mercado Pago ainda não está configurada.");
  WebhookSignatureValidator.validate({ xSignature: input.xSignature, xRequestId: input.xRequestId, dataId: input.dataId, secret, toleranceSeconds: 300 });
  const paymentId = Array.isArray(input.dataId) ? input.dataId[0] : input.dataId;
  if (!paymentId) throw new Error("A notificação não informou o pagamento.");
  // O painel do Mercado Pago testa a URL com o evento assinado, não vivo, de
  // id 123456. Ele comprova a entrega, mas não representa um pagamento ou
  // pedido da plataforma e nunca pode criar matrícula.
  if (input.isOfficialSimulation && paymentId === "123456") return { action: "simulation" as const };

  const payment = await new Payment(clientConfig()).get({ id: Number(paymentId) });
  const externalReference = typeof payment.external_reference === "string" ? payment.external_reference : null;
  if (!externalReference) throw new Error("O pagamento não está vinculado a um pedido interno.");
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const order = (await db.select().from(commerceOrders).where(eq(commerceOrders.id, externalReference)).limit(1))[0];
  if (!order) throw new Error("Pedido interno não encontrado.");
  if (Math.round(Number(payment.transaction_amount) * 100) !== order.totalCents || payment.currency_id !== "BRL") throw new Error("O valor ou a moeda do pagamento não confere com o pedido.");

  const paymentStatus = String(payment.status || "");
  if (paymentStatus === "approved") {
    const approved = await approveCommerceOrder(order.userId, order.id, PROVIDER, String(payment.id));
    return { action: "approved" as const, order: approved };
  }
  if (["rejected", "cancelled", "refunded", "charged_back"].includes(paymentStatus) && order.status === "pending_payment") {
    await db.update(commerceTransactions).set({ provider: PROVIDER, providerReference: String(payment.id), status: paymentStatus === "refunded" ? "refunded" : paymentStatus === "cancelled" ? "cancelled" : "rejected", processedAt: new Date() }).where(eq(commerceTransactions.orderId, order.id));
    await writeAdminAudit(order.userId, order.userId, "ATUALIZACAO_DE_PAGAMENTO_MERCADO_PAGO", `Pagamento ${payment.id} informado como ${paymentStatus} para o pedido ${order.id}.`);
    return { action: "recorded" as const, status: paymentStatus };
  }
  return { action: "pending" as const, status: paymentStatus || "unknown" };
}
