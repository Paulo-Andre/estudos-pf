import { and, eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  commerceCoupons,
  commerceOrderItems,
  commerceOrders,
  commercePlanCourses,
  commercePlans,
  commerceTransactions,
  courseEnrollments,
  courses,
} from "../drizzle/schema";
import { approveCommerceOrder, createCommerceCoupon, createCommerceOrder, createCommercePlan, deleteCommerceCoupon, listUserCommerceAccesses, updateCommercePlan } from "./commerce";
import { createLocalUser, deleteManagedUser, getDb } from "./db";
import { createMercadoPagoCheckout } from "./mercadoPago";

describe("ciclo comercial de planos e matrículas", () => {
  it("aplica cupom integral, cria pedido pendente, aprova pagamento e renova o acesso", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;

    const course = (await db.select().from(courses).where(eq(courses.isActive, true)).limit(1))[0];
    expect(course).toBeTruthy();
    if (!course) return;

    const token = `qa-commerce-${Date.now().toString(36)}`;
    const actor = await createLocalUser({ name: "ROOT comercial QA", username: `${token}-root`, email: `${token}-root@example.invalid`, cpf: null, passwordHash: "hash-de-teste-nao-utilizado", role: "admin" });
    const learner = await createLocalUser({ name: "Aluno comercial QA", username: `${token}-student`, email: `${token}-student@example.invalid`, cpf: null, passwordHash: "hash-de-teste-nao-utilizado" });
    let planId: string | null = null;
    let couponId: string | null = null;
    let orderIds: string[] = [];

    try {
      const plan = await createCommercePlan(actor.id, {
        code: `${token}-plan`, title: "Plano temporário de QA", description: "Cobertura de integração comercial.", planType: "course_access",
        coverImageUrls: ["https://cdn.example.invalid/plano-a.webp", "https://cdn.example.invalid/plano-a.webp", "https://cdn.example.invalid/plano-b.webp", "https://cdn.example.invalid/plano-c.webp", "https://cdn.example.invalid/plano-excedente.webp"],
        accessDurationDays: 30, priceCents: 19_900, isActive: true, isHighlighted: false, courseIds: [course.id],
      });
      planId = plan.id;
      expect(plan.coverImageUrls).toEqual(["https://cdn.example.invalid/plano-a.webp", "https://cdn.example.invalid/plano-b.webp", "https://cdn.example.invalid/plano-c.webp"]);
      const updatedPlan = await updateCommercePlan(actor.id, plan.id, {
        code: `${token}-plan`, title: "Plano temporário de QA", description: "Cobertura de integração comercial.", planType: "course_access",
        coverImageUrls: [`/manus-storage/${token}-capa-enviada.webp`, "https://cdn.example.invalid/plano-atualizado.webp"], accessDurationDays: 30, priceCents: 19_900, isActive: true, isHighlighted: false, courseIds: [course.id],
      });
      expect(updatedPlan.coverImageUrls).toEqual([`/manus-storage/${token}-capa-enviada.webp`, "https://cdn.example.invalid/plano-atualizado.webp"]);
      const coupon = await createCommerceCoupon(actor.id, {
        code: `${token}-free`, description: "Cupom integral de QA", discountType: "percentage", discountValue: 100, maxRedemptions: 1, isActive: true,
      });
      couponId = coupon?.id ?? null;

      const freeOrder = await createCommerceOrder(learner.id, plan.id, `${token}-free`);
      orderIds.push(freeOrder.id);
      expect(freeOrder.status).toBe("paid");
      expect(freeOrder.totalCents).toBe(0);
      expect(freeOrder.transactions[0]?.status).toBe("approved");

      const firstEnrollment = (await db.select().from(courseEnrollments).where(and(eq(courseEnrollments.userId, learner.id), eq(courseEnrollments.courseId, course.id))).limit(1))[0];
      expect(firstEnrollment?.status).toBe("active");
      expect(firstEnrollment?.sourceOrderId).toBe(freeOrder.id);
      expect(firstEnrollment?.expiresAt.getTime()).toBeGreaterThan(Date.now());
      const firstExpiration = firstEnrollment?.expiresAt.getTime() ?? 0;

      const accesses = await listUserCommerceAccesses(learner.id);
      expect(accesses).toHaveLength(1);
      expect(accesses[0]).toMatchObject({
        courseId: course.id,
        courseTitle: course.title,
        courseType: course.courseType,
        computedStatus: "active",
        sourceOrderId: freeOrder.id,
      });

      const paidOrder = await createCommerceOrder(learner.id, plan.id);
      orderIds.push(paidOrder.id);
      expect(paidOrder.status).toBe("pending_payment");
      expect(paidOrder.totalCents).toBe(19_900);

      const checkout = await createMercadoPagoCheckout(learner.id, paidOrder.id, {
        origin: "https://estudospf-peiyfhjy.manus.space",
        notificationUrl: "https://estudospf-peiyfhjy.manus.space/api/payments/mercado-pago/webhook",
      });
      expect(checkout.orderId).toBe(paidOrder.id);
      expect(checkout.preferenceId).toBeTruthy();
      expect(checkout.checkoutUrl).toMatch(/^https:\/\//);

      const approvedOrder = await approveCommerceOrder(actor.id, paidOrder.id, "manual", "QA-TRANSFER-001");
      expect(approvedOrder.status).toBe("paid");
      expect(approvedOrder.providerReference).toBe("QA-TRANSFER-001");

      const renewedEnrollment = (await db.select().from(courseEnrollments).where(and(eq(courseEnrollments.userId, learner.id), eq(courseEnrollments.courseId, course.id))).limit(1))[0];
      expect(renewedEnrollment?.expiresAt.getTime()).toBeGreaterThan(firstExpiration);
      expect(renewedEnrollment?.sourceOrderId).toBe(paidOrder.id);

      const savedCoupon = (await db.select().from(commerceCoupons).where(eq(commerceCoupons.id, couponId!)).limit(1))[0];
      expect(savedCoupon?.redeemedCount).toBe(1);

      await deleteCommerceCoupon(actor.id, couponId!);
      couponId = null;
      expect(await db.select().from(commerceCoupons).where(eq(commerceCoupons.id, savedCoupon!.id))).toHaveLength(0);
      expect((await db.select().from(commerceOrders).where(eq(commerceOrders.id, freeOrder.id)).limit(1))[0]?.couponCode).toBe(`${token}-FREE`.toUpperCase());
      expect(await db.select().from(commerceTransactions).where(eq(commerceTransactions.orderId, freeOrder.id))).toHaveLength(1);
    } finally {
      if (orderIds.length) {
        await db.delete(commerceTransactions).where(inArray(commerceTransactions.orderId, orderIds));
        await db.delete(commerceOrderItems).where(inArray(commerceOrderItems.orderId, orderIds));
        await db.delete(commerceOrders).where(inArray(commerceOrders.id, orderIds));
      }
      await db.delete(courseEnrollments).where(eq(courseEnrollments.userId, learner.id));
      if (couponId) await db.delete(commerceCoupons).where(eq(commerceCoupons.id, couponId));
      if (planId) {
        await db.delete(commercePlanCourses).where(eq(commercePlanCourses.planId, planId));
        await db.delete(commercePlans).where(eq(commercePlans.id, planId));
      }
      await deleteManagedUser(learner.id).catch(() => undefined);
      await deleteManagedUser(actor.id).catch(() => undefined);
    }
  }, 20_000);
});
