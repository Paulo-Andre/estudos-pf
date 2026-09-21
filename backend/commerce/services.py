import secrets
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from courses.models import CourseEnrollment
from .models import CommerceCoupon,CommerceOrder,CommerceOrderItem,CommercePlan,CommerceTransaction

def _id(prefix):
    return (prefix+"_"+secrets.token_urlsafe(24).replace("-","").replace("_",""))[:64]

def coupon_discount(plan,coupon,now=None):
    now=now or timezone.now()
    if coupon is None:
        return 0
    if not coupon.is_active:
        raise ValueError("Cupom inativo.")
    if coupon.starts_at and coupon.starts_at>now:
        raise ValueError("Cupom ainda não está válido.")
    if coupon.ends_at and coupon.ends_at<=now:
        raise ValueError("Cupom expirado.")
    if coupon.max_redemptions is not None and coupon.redeemed_count>=coupon.max_redemptions:
        raise ValueError("Cupom esgotado.")
    if coupon.discount_type==CommerceCoupon.DiscountType.PERCENTAGE:
        if coupon.discount_value>100:
            raise ValueError("Percentual de desconto inválido.")
        return min(plan.price_cents,(plan.price_cents*coupon.discount_value)//100)
    return min(plan.price_cents,coupon.discount_value)

@transaction.atomic
def create_order(user,plan_id,coupon_code=""):
    plan=CommercePlan.objects.select_for_update().prefetch_related("courses").get(pk=plan_id,is_active=True)
    coupon=None
    normalized=(coupon_code or "").strip().upper()
    if normalized:
        coupon=CommerceCoupon.objects.select_for_update().get(code__iexact=normalized)
    discount=coupon_discount(plan,coupon)
    total=plan.price_cents-discount
    oid=_id("ord")
    order=CommerceOrder.objects.create(
        id=oid,user=user,plan=plan,coupon_code=normalized,subtotal_cents=plan.price_cents,
        discount_cents=discount,total_cents=total,currency=plan.currency,provider="manual")
    CommerceOrderItem.objects.create(
        order=order,plan_id_snapshot=plan.id,title_snapshot=plan.title,plan_type_snapshot=plan.plan_type,
        access_duration_days_snapshot=plan.access_duration_days,
        course_ids_snapshot=list(plan.courses.values_list("id",flat=True)),unit_price_cents=plan.price_cents)
    CommerceTransaction.objects.create(
        id=_id("txn"),order=order,provider="manual",status="pending",amount_cents=total,currency=plan.currency)
    if total==0:
        approve_order(user.id,order.id,"coupon","free")
        order.refresh_from_db()
    return order

@transaction.atomic
def approve_order(user_id,order_id,provider,provider_reference):
    order=CommerceOrder.objects.select_for_update().select_related("user").get(pk=order_id,user_id=user_id)
    if order.status==CommerceOrder.Status.PAID:
        return order
    if order.status!=CommerceOrder.Status.PENDING:
        raise ValueError("Pedido não pode ser aprovado neste estado.")
    item=CommerceOrderItem.objects.select_for_update().get(order=order)
    now=timezone.now()
    for course_id in item.course_ids_snapshot:
        enrollment=CourseEnrollment.objects.select_for_update().filter(user_id=user_id,course_id=course_id).first()
        base=now
        if enrollment and enrollment.status=="active" and enrollment.expires_at>now:
            base=enrollment.expires_at
        expires=base+timedelta(days=item.access_duration_days_snapshot)
        if enrollment:
            enrollment.start_at=min(enrollment.start_at,now)
            enrollment.expires_at=expires
            enrollment.status="active"
            enrollment.revoked_at=None
            enrollment.source_order_id=order.id
            enrollment.source_plan_id=item.plan_id_snapshot
            enrollment.save()
        else:
            CourseEnrollment.objects.create(
                user_id=user_id,course_id=course_id,start_at=now,expires_at=expires,status="active",
                created_by_id=user_id,source_order_id=order.id,source_plan_id=item.plan_id_snapshot)
    if order.coupon_code:
        coupon=CommerceCoupon.objects.select_for_update().filter(code__iexact=order.coupon_code).first()
        if coupon:
            if coupon.max_redemptions is not None and coupon.redeemed_count>=coupon.max_redemptions:
                raise ValueError("Cupom esgotado durante a confirmação.")
            coupon.redeemed_count+=1
            coupon.save(update_fields=["redeemed_count","updated_at"])
    order.status=CommerceOrder.Status.PAID
    order.provider=provider
    order.provider_reference=provider_reference
    order.paid_at=now
    order.access_granted_at=now
    order.save()
    txn=CommerceTransaction.objects.select_for_update().filter(order=order).order_by("-created_at").first()
    if txn:
        txn.provider=provider
        txn.provider_reference=provider_reference
        txn.status=CommerceTransaction.Status.APPROVED
        txn.processed_at=now
        txn.save()
    return order
