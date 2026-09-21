import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  commerceCoupons,
  commerceOrderItems,
  commerceOrders,
  commercePlanCourses,
  commercePlans,
  commerceTransactions,
  courseEnrollments,
  courses,
  users,
} from "../drizzle/schema";
import { getDb, writeAdminAudit } from "./db";
import { sendPurchaseConfirmation } from "./email";
import { getEnrollmentLifecycleStatus } from "./enrollmentStatus";

export type CommercePlanInput = {
  code: string;
  title: string;
  description?: string | null;
  coverImageUrls?: string[];
  planType: "course_access" | "subscription";
  accessDurationDays: number;
  priceCents: number;
  isActive: boolean;
  isHighlighted: boolean;
  courseIds: string[];
};

export type CommerceCouponInput = {
  code: string;
  description?: string | null;
  discountType: "percentage" | "fixed_amount";
  discountValue: number;
  maxRedemptions?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive: boolean;
};

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function parseCourseIds(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function normalizePlanCoverImageUrls(raw: string[] | undefined) {
  return Array.from(new Set((raw ?? []).map(value => value.trim()).filter(Boolean))).slice(0, 3);
}

function parsePlanCoverImageUrls(raw: string | null | undefined) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? normalizePlanCoverImageUrls(parsed.filter((value): value is string => typeof value === "string"))
      : [];
  } catch {
    return [];
  }
}

function isCouponAvailable(coupon: typeof commerceCoupons.$inferSelect, now = new Date()) {
  return coupon.isActive
    && (!coupon.startsAt || coupon.startsAt <= now)
    && (!coupon.endsAt || coupon.endsAt >= now)
    && (coupon.maxRedemptions === null || coupon.redeemedCount < coupon.maxRedemptions);
}

function calculateDiscount(subtotalCents: number, coupon: typeof commerceCoupons.$inferSelect | null) {
  if (!coupon) return 0;
  const proposed = coupon.discountType === "percentage"
    ? Math.floor((subtotalCents * coupon.discountValue) / 100)
    : coupon.discountValue;
  return Math.max(0, Math.min(subtotalCents, proposed));
}

async function courseIdsForPlan(planId: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const links = await db.select({ courseId: commercePlanCourses.courseId }).from(commercePlanCourses).where(eq(commercePlanCourses.planId, planId));
  return links.map(link => link.courseId);
}

async function serializePlan(plan: typeof commercePlans.$inferSelect) {
  const courseIds = await courseIdsForPlan(plan.id);
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const storedCourses = courseIds.length
    ? await db.select({ id: courses.id, title: courses.title, track: courses.track, courseType: courses.courseType, courseArea: courses.courseArea, stateCode: courses.stateCode, description: courses.description, coverImageUrl: courses.coverImageUrl }).from(courses).where(inArray(courses.id, courseIds))
    : [];
  const coursesById = new Map(storedCourses.map(course => [course.id, course]));
  return { ...plan, coverImageUrls: parsePlanCoverImageUrls(plan.coverImageUrlsJson), courseIds, courses: courseIds.map(courseId => coursesById.get(courseId)).filter((course): course is NonNullable<typeof course> => Boolean(course)) };
}

async function ensurePlanCourses(courseIds: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const uniqueCourseIds = courseIds.filter((courseId, index) => courseIds.indexOf(courseId) === index);
  if (!uniqueCourseIds.length) throw new Error("Associe ao menos um curso ao plano.");
  const rows = await db.select({ id: courses.id, isActive: courses.isActive }).from(courses).where(inArray(courses.id, uniqueCourseIds));
  if (rows.length !== uniqueCourseIds.length || rows.some(course => !course.isActive)) throw new Error("Todos os cursos vinculados devem existir e estar ativos.");
  return uniqueCourseIds;
}

export async function listPublicCommercePlans() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const plans = await db.select().from(commercePlans).where(eq(commercePlans.isActive, true)).orderBy(desc(commercePlans.isHighlighted), commercePlans.priceCents, commercePlans.title);
  return Promise.all(plans.map(serializePlan));
}

export async function listManagedCommercePlans() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const plans = await db.select().from(commercePlans).orderBy(desc(commercePlans.createdAt));
  return Promise.all(plans.map(serializePlan));
}

export async function createCommercePlan(actorUserId: number, input: CommercePlanInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const courseIds = await ensurePlanCourses(input.courseIds);
  const id = crypto.randomUUID();
  const code = normalizeCode(input.code);
  await db.insert(commercePlans).values({
    id,
    code,
    title: input.title,
    description: input.description || null,
    coverImageUrlsJson: JSON.stringify(normalizePlanCoverImageUrls(input.coverImageUrls)),
    planType: input.planType,
    accessDurationDays: input.accessDurationDays,
    priceCents: input.priceCents,
    isActive: input.isActive,
    isHighlighted: input.isHighlighted,
    createdByUserId: actorUserId,
  });
  await db.insert(commercePlanCourses).values(courseIds.map(courseId => ({ planId: id, courseId })));
  await writeAdminAudit(actorUserId, null, "CRIACAO_DE_PLANO_COMERCIAL", `Plano ${code} criado com ${courseIds.length} curso(s).`);
  const plan = (await db.select().from(commercePlans).where(eq(commercePlans.id, id)).limit(1))[0];
  if (!plan) throw new Error("Plano não foi salvo.");
  return serializePlan(plan);
}

export async function updateCommercePlan(actorUserId: number, planId: string, input: CommercePlanInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const current = (await db.select().from(commercePlans).where(eq(commercePlans.id, planId)).limit(1))[0];
  if (!current) throw new Error("Plano não encontrado.");
  const courseIds = await ensurePlanCourses(input.courseIds);
  await db.update(commercePlans).set({
    code: normalizeCode(input.code), title: input.title, description: input.description || null,
    coverImageUrlsJson: JSON.stringify(normalizePlanCoverImageUrls(input.coverImageUrls)),
    planType: input.planType, accessDurationDays: input.accessDurationDays, priceCents: input.priceCents,
    isActive: input.isActive, isHighlighted: input.isHighlighted,
  }).where(eq(commercePlans.id, planId));
  await db.delete(commercePlanCourses).where(eq(commercePlanCourses.planId, planId));
  await db.insert(commercePlanCourses).values(courseIds.map(courseId => ({ planId, courseId })));
  await writeAdminAudit(actorUserId, null, "ATUALIZACAO_DE_PLANO_COMERCIAL", `Plano ${current.code} atualizado.`);
  const plan = (await db.select().from(commercePlans).where(eq(commercePlans.id, planId)).limit(1))[0];
  if (!plan) throw new Error("Plano não foi atualizado.");
  return serializePlan(plan);
}

export async function listManagedCommerceCoupons() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.select().from(commerceCoupons).orderBy(desc(commerceCoupons.createdAt));
}

export async function createCommerceCoupon(actorUserId: number, input: CommerceCouponInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const id = crypto.randomUUID();
  const code = normalizeCode(input.code);
  await db.insert(commerceCoupons).values({
    id, code, description: input.description || null, discountType: input.discountType, discountValue: input.discountValue,
    maxRedemptions: input.maxRedemptions ?? null, startsAt: input.startsAt ?? null, endsAt: input.endsAt ?? null,
    isActive: input.isActive, createdByUserId: actorUserId,
  });
  await writeAdminAudit(actorUserId, null, "CRIACAO_DE_CUPOM", `Cupom ${code} criado.`);
  return (await db.select().from(commerceCoupons).where(eq(commerceCoupons.id, id)).limit(1))[0];
}

export async function updateCommerceCoupon(actorUserId: number, couponId: string, input: CommerceCouponInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const current = (await db.select().from(commerceCoupons).where(eq(commerceCoupons.id, couponId)).limit(1))[0];
  if (!current) throw new Error("Cupom não encontrado.");
  await db.update(commerceCoupons).set({
    code: normalizeCode(input.code), description: input.description || null, discountType: input.discountType, discountValue: input.discountValue,
    maxRedemptions: input.maxRedemptions ?? null, startsAt: input.startsAt ?? null, endsAt: input.endsAt ?? null, isActive: input.isActive,
  }).where(eq(commerceCoupons.id, couponId));
  await writeAdminAudit(actorUserId, null, "ATUALIZACAO_DE_CUPOM", `Cupom ${current.code} atualizado.`);
  return (await db.select().from(commerceCoupons).where(eq(commerceCoupons.id, couponId)).limit(1))[0];
}

/** Exclui somente o cupom do catálogo; pedidos e transações preservam seus valores e códigos consolidados. */
export async function deleteCommerceCoupon(actorUserId: number, couponId: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const current = (await db.select().from(commerceCoupons).where(eq(commerceCoupons.id, couponId)).limit(1))[0];
  if (!current) throw new Error("Cupom não encontrado.");
  await db.delete(commerceCoupons).where(eq(commerceCoupons.id, couponId));
  await writeAdminAudit(actorUserId, null, "EXCLUSAO_DE_CUPOM", `Cupom ${current.code} excluído; pedidos anteriores foram preservados.`);
  return { id: current.id, code: current.code };
}

async function serializeOrder(order: typeof commerceOrders.$inferSelect) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const item = (await db.select().from(commerceOrderItems).where(eq(commerceOrderItems.orderId, order.id)).limit(1))[0] ?? null;
  const transactions = await db.select().from(commerceTransactions).where(eq(commerceTransactions.orderId, order.id)).orderBy(desc(commerceTransactions.createdAt));
  return { ...order, item: item ? { ...item, courseIds: parseCourseIds(item.courseIdsSnapshotJson) } : null, transactions };
}

export async function createCommerceOrder(userId: number, planId: string, couponCode?: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const plan = (await db.select().from(commercePlans).where(and(eq(commercePlans.id, planId), eq(commercePlans.isActive, true))).limit(1))[0];
  if (!plan) throw new Error("Este plano não está disponível para compra.");
  const courseIds = await courseIdsForPlan(plan.id);
  if (!courseIds.length) throw new Error("Este plano não possui cursos liberados.");
  const normalizedCoupon = couponCode ? normalizeCode(couponCode) : null;
  const coupon = normalizedCoupon ? (await db.select().from(commerceCoupons).where(eq(commerceCoupons.code, normalizedCoupon)).limit(1))[0] ?? null : null;
  if (normalizedCoupon && (!coupon || !isCouponAvailable(coupon))) throw new Error("Este cupom não está disponível.");
  const subtotalCents = plan.priceCents;
  const discountCents = calculateDiscount(subtotalCents, coupon);
  const totalCents = subtotalCents - discountCents;
  const now = new Date();
  const orderId = crypto.randomUUID();
  const provider = totalCents === 0 ? "coupon" : "manual";
  await db.insert(commerceOrders).values({
    id: orderId, userId, planId: plan.id, couponCode: normalizedCoupon, subtotalCents, discountCents, totalCents, provider,
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  });
  await db.insert(commerceOrderItems).values({
    orderId, planId: plan.id, titleSnapshot: plan.title, planTypeSnapshot: plan.planType,
    accessDurationDaysSnapshot: plan.accessDurationDays, courseIdsSnapshotJson: JSON.stringify(courseIds), unitPriceCents: subtotalCents,
  });
  await db.insert(commerceTransactions).values({
    id: crypto.randomUUID(), orderId, provider, status: totalCents === 0 ? "approved" : "pending", amountCents: totalCents,
    processedAt: totalCents === 0 ? now : null,
  });
  if (totalCents === 0) await approveCommerceOrder(userId, orderId, "coupon", "Cupom integral");
  const order = (await db.select().from(commerceOrders).where(eq(commerceOrders.id, orderId)).limit(1))[0];
  if (!order) throw new Error("Pedido não foi salvo.");
  return serializeOrder(order);
}

export async function listUserCommerceOrders(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const orders = await db.select().from(commerceOrders).where(eq(commerceOrders.userId, userId)).orderBy(desc(commerceOrders.createdAt));
  return Promise.all(orders.map(serializeOrder));
}

/** Matrículas da conta com dados do curso para a página Meus acessos. */
export async function listUserCommerceAccesses(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const enrollments = await db
    .select({
      id: courseEnrollments.id,
      courseId: courseEnrollments.courseId,
      startAt: courseEnrollments.startAt,
      expiresAt: courseEnrollments.expiresAt,
      status: courseEnrollments.status,
      sourceOrderId: courseEnrollments.sourceOrderId,
      sourcePlanId: courseEnrollments.sourcePlanId,
      revokedAt: courseEnrollments.revokedAt,
      createdAt: courseEnrollments.createdAt,
      courseTitle: courses.title,
      courseTrack: courses.track,
      courseType: courses.courseType,
      courseCoverImageUrl: courses.coverImageUrl,
    })
    .from(courseEnrollments)
    .leftJoin(courses, eq(courseEnrollments.courseId, courses.id))
    .where(eq(courseEnrollments.userId, userId))
    .orderBy(desc(courseEnrollments.createdAt));
  return enrollments.map(enrollment => ({
    ...enrollment,
    computedStatus: getEnrollmentLifecycleStatus(enrollment),
  }));
}

export async function listManagedCommerceOrders(status?: typeof commerceOrders.$inferSelect["status"]) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const orders = status
    ? await db.select().from(commerceOrders).where(eq(commerceOrders.status, status)).orderBy(desc(commerceOrders.createdAt))
    : await db.select().from(commerceOrders).orderBy(desc(commerceOrders.createdAt));
  return Promise.all(orders.map(async order => {
    const buyer = (await db.select({ id: users.id, name: users.name, username: users.username, email: users.email }).from(users).where(eq(users.id, order.userId)).limit(1))[0] ?? null;
    return { ...(await serializeOrder(order)), buyer };
  }));
}

export async function getCommerceMetrics() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const [orders, transactions, activeEnrollments] = await Promise.all([
    db.select({ status: commerceOrders.status, totalCents: commerceOrders.totalCents }).from(commerceOrders),
    db.select({ status: commerceTransactions.status }).from(commerceTransactions),
    db.select({ id: courseEnrollments.id }).from(courseEnrollments).where(eq(courseEnrollments.status, "active")),
  ]);
  const paidOrders = orders.filter(order => order.status === "paid");
  return {
    totalOrders: orders.length,
    paidOrders: paidOrders.length,
    approvedPayments: transactions.filter(transaction => transaction.status === "approved").length,
    revenueCents: paidOrders.reduce((total, order) => total + order.totalCents, 0),
    conversionRate: orders.length ? Math.round((paidOrders.length / orders.length) * 10_000) / 100 : 0,
    activeEnrollments: activeEnrollments.length,
  };
}

export async function approveCommerceOrder(actorUserId: number, orderId: string, provider = "manual", providerReference?: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const order = (await db.select().from(commerceOrders).where(eq(commerceOrders.id, orderId)).limit(1))[0];
  if (!order) throw new Error("Pedido não encontrado.");
  if (order.status === "paid") return serializeOrder(order);
  if (order.status !== "pending_payment") throw new Error("Somente pedidos aguardando pagamento podem ser aprovados.");
  const item = (await db.select().from(commerceOrderItems).where(eq(commerceOrderItems.orderId, orderId)).limit(1))[0];
  if (!item) throw new Error("Item do pedido não encontrado.");
  const courseIds = parseCourseIds(item.courseIdsSnapshotJson);
  if (!courseIds.length) throw new Error("O pedido não possui cursos para liberar.");
  const now = new Date();
  const durationMs = item.accessDurationDaysSnapshot * 24 * 60 * 60 * 1000;
  for (const courseId of courseIds) {
    const enrollment = (await db.select().from(courseEnrollments).where(and(eq(courseEnrollments.userId, order.userId), eq(courseEnrollments.courseId, courseId))).limit(1))[0];
    if (enrollment && enrollment.status === "active" && enrollment.expiresAt > now) {
      await db.update(courseEnrollments).set({ expiresAt: new Date(enrollment.expiresAt.getTime() + durationMs), status: "active", revokedAt: null, sourceOrderId: order.id, sourcePlanId: item.planId }).where(eq(courseEnrollments.id, enrollment.id));
    } else if (enrollment) {
      await db.update(courseEnrollments).set({ startAt: now, expiresAt: new Date(now.getTime() + durationMs), status: "active", revokedAt: null, sourceOrderId: order.id, sourcePlanId: item.planId }).where(eq(courseEnrollments.id, enrollment.id));
    } else {
      await db.insert(courseEnrollments).values({ userId: order.userId, courseId, startAt: now, expiresAt: new Date(now.getTime() + durationMs), status: "active", createdByUserId: actorUserId, sourceOrderId: order.id, sourcePlanId: item.planId });
    }
  }
  await db.update(commerceOrders).set({ status: "paid", provider, providerReference: providerReference || null, paidAt: now, accessGrantedAt: now }).where(eq(commerceOrders.id, orderId));
  await db.update(commerceTransactions).set({ status: "approved", provider, providerReference: providerReference || null, processedAt: now }).where(eq(commerceTransactions.orderId, orderId));
  if (order.couponCode) await db.update(commerceCoupons).set({ redeemedCount: sql`${commerceCoupons.redeemedCount} + 1` }).where(eq(commerceCoupons.code, order.couponCode));
  await writeAdminAudit(actorUserId, order.userId, "APROVACAO_DE_PEDIDO_COMERCIAL", `Pedido ${order.id} aprovado; ${courseIds.length} matrícula(s) concedida(s).`);
  const saved = (await db.select().from(commerceOrders).where(eq(commerceOrders.id, orderId)).limit(1))[0];
  if (!saved) throw new Error("Pedido não foi atualizado.");
  const buyer = (await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, order.userId)).limit(1))[0];
  if (buyer?.email) {
    void sendPurchaseConfirmation({
      to: buyer.email,
      name: buyer.name,
      planTitle: item.titleSnapshot,
      accessExpiresAt: new Date(now.getTime() + durationMs),
    }).catch(error => console.error("[commerce] Falha ao enviar confirmação de compra", { orderId, error: error instanceof Error ? error.message : "erro desconhecido" }));
  }
  return serializeOrder(saved);
}

export async function cancelCommerceOrder(actorUserId: number, orderId: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const order = (await db.select().from(commerceOrders).where(eq(commerceOrders.id, orderId)).limit(1))[0];
  if (!order) throw new Error("Pedido não encontrado.");
  if (order.status !== "pending_payment") throw new Error("Somente pedidos aguardando pagamento podem ser cancelados.");
  const now = new Date();
  await db.update(commerceOrders).set({ status: "cancelled", cancelledAt: now }).where(eq(commerceOrders.id, orderId));
  await db.update(commerceTransactions).set({ status: "cancelled", processedAt: now }).where(eq(commerceTransactions.orderId, orderId));
  await writeAdminAudit(actorUserId, order.userId, "CANCELAMENTO_DE_PEDIDO_COMERCIAL", `Pedido ${order.id} cancelado.`);
  const saved = (await db.select().from(commerceOrders).where(eq(commerceOrders.id, orderId)).limit(1))[0];
  if (!saved) throw new Error("Pedido não foi atualizado.");
  return serializeOrder(saved);
}
