import json
import os
from rest_framework import permissions,status
from rest_framework.response import Response
from rest_framework.views import APIView
from .mercado_pago import create_checkout,process_payment_notification,validate_webhook_signature
from django.db import transaction
from django.db.models import Count,Sum
from django.utils import timezone
from .models import CommerceCoupon,CommerceOrder,CommercePlan,CommercePlanCourse,CommerceTransaction
from .services import approve_order
from .services import create_order

def plan_json(plan):
    return {"id":plan.id,"code":plan.code,"title":plan.title,"description":plan.description,"coverImageUrls":plan.cover_image_urls,
        "planType":plan.plan_type,"accessDurationDays":plan.access_duration_days,"priceCents":plan.price_cents,"currency":plan.currency,
        "isActive":plan.is_active,"isHighlighted":plan.is_highlighted,"courseIds":list(plan.courses.values_list("id",flat=True))}

class PublicPlansView(APIView):
    permission_classes=[permissions.AllowAny]
    authentication_classes=[]
    def get(self,request):
        qs=CommercePlan.objects.filter(is_active=True).prefetch_related("courses").order_by("-is_highlighted","price_cents")
        return Response([plan_json(p) for p in qs])

class MyOrdersView(APIView):
    def get(self,request):
        qs=CommerceOrder.objects.filter(user=request.user).order_by("-created_at")[:100]
        return Response([{"id":o.id,"planId":o.plan_id,"status":o.status,"subtotalCents":o.subtotal_cents,"discountCents":o.discount_cents,
            "totalCents":o.total_cents,"currency":o.currency,"provider":o.provider,"paidAt":o.paid_at,"createdAt":o.created_at} for o in qs])

class CheckoutView(APIView):
    def post(self,request):
        try:
            order=create_order(request.user,str(request.data.get("planId")),str(request.data.get("couponCode") or ""))
        except (CommercePlan.DoesNotExist,CommerceCoupon.DoesNotExist,ValueError) as exc:
            return Response({"detail":str(exc)},status=400)
        if order.status=="paid":
            return Response({"orderId":order.id,"paid":True})
        origin=os.getenv("PUBLIC_APP_URL","").rstrip("/")
        if not origin:
            origin=request.build_absolute_uri("/").rstrip("/")
        notification=origin+"/api/v1/commerce/mercado-pago/webhook/"
        try:
            result=create_checkout(order,origin,notification)
        except RuntimeError as exc:
            return Response({"detail":str(exc),"orderId":order.id},status=502)
        return Response(result,status=201)

class MercadoPagoWebhookView(APIView):
    permission_classes=[permissions.AllowAny]
    authentication_classes=[]
    def post(self,request):
        data_id=request.query_params.get("data.id") or request.query_params.get("data_id") or request.query_params.get("id")
        if not data_id and isinstance(request.data,dict):
            nested=request.data.get("data")
            data_id=(nested or {}).get("id") if isinstance(nested,dict) else request.data.get("id")
        topic=request.query_params.get("type") or request.query_params.get("topic") or (request.data.get("type") if isinstance(request.data,dict) else None)
        if topic and topic!="payment":
            return Response({"action":"ignored"})
        try:
            validate_webhook_signature(request.headers.get("x-signature"),request.headers.get("x-request-id"),str(data_id or ""))
        except ValueError as exc:
            return Response({"detail":str(exc)},status=401)
        if str(data_id)=="123456":
            return Response({"action":"simulation"})
        try:
            result=process_payment_notification(str(data_id))
        except Exception as exc:
            return Response({"detail":str(exc)},status=400)
        payload={k:(v.id if hasattr(v,"id") else v) for k,v in result.items()}
        return Response(payload)

class AdminPlansView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):
        return Response([plan_json(p) for p in CommercePlan.objects.prefetch_related("courses").all().order_by("title")])
    def post(self,request):
        data=request.data
        plan=CommercePlan.objects.create(
            id=str(data.get("id") or data.get("code") or "").strip()[:64],code=str(data.get("code") or "").strip().upper()[:48],
            title=str(data.get("title") or "").strip()[:180],description=str(data.get("description") or ""),
            cover_image_urls=list(data.get("coverImageUrls") or []),plan_type=data.get("planType") or "course_access",
            access_duration_days=int(data.get("accessDurationDays") or 30),price_cents=int(data.get("priceCents") or 0),
            currency="BRL",is_active=bool(data.get("isActive",False)),is_highlighted=bool(data.get("isHighlighted",False)),created_by=request.user)
        for cid in data.get("courseIds") or []:
            CommercePlanCourse.objects.create(plan=plan,course_id=cid)
        return Response(plan_json(plan),status=201)


def coupon_json(c):
    return {"id":c.id,"code":c.code,"description":c.description,"discountType":c.discount_type,"discountValue":c.discount_value,
        "maxRedemptions":c.max_redemptions,"redeemedCount":c.redeemed_count,"startsAt":c.starts_at,"endsAt":c.ends_at,"isActive":c.is_active}

def order_json(o):
    return {"id":o.id,"userId":o.user_id,"planId":o.plan_id,"couponCode":o.coupon_code,"status":o.status,"subtotalCents":o.subtotal_cents,
        "discountCents":o.discount_cents,"totalCents":o.total_cents,"currency":o.currency,"provider":o.provider,
        "providerReference":o.provider_reference,"paidAt":o.paid_at,"accessGrantedAt":o.access_granted_at,"createdAt":o.created_at}

class MyAccessesView(APIView):
    def get(self,request):
        rows=request.user.course_enrollments.select_related("course").order_by("-updated_at")
        now=timezone.now()
        return Response([{"courseId":e.course_id,"courseTitle":e.course.title,"courseType":e.course.course_type,
            "computedStatus":"revoked" if e.status=="revoked" else ("scheduled" if e.start_at>now else ("expired" if e.expires_at<=now else "active")),
            "startAt":e.start_at,"expiresAt":e.expires_at,"sourceOrderId":e.source_order_id,"sourcePlanId":e.source_plan_id} for e in rows])

class AdminCommerceMetricsView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):
        qs=CommerceOrder.objects.all()
        paid=qs.filter(status="paid")
        return Response({
            "orders":qs.count(),"paidOrders":paid.count(),"pendingOrders":qs.filter(status="pending_payment").count(),
            "grossRevenueCents":paid.aggregate(v=Sum("total_cents"))["v"] or 0,
            "activePlans":CommercePlan.objects.filter(is_active=True).count(),
            "activeCoupons":CommerceCoupon.objects.filter(is_active=True).count(),
        })

class AdminPlanDetailView(APIView):
    permission_classes=[permissions.IsAdminUser]
    @transaction.atomic
    def put(self,request,plan_id):
        plan=CommercePlan.objects.select_for_update().filter(pk=plan_id).first()
        if not plan:return Response({"detail":"Plano não encontrado."},status=404)
        data=request.data
        plan.code=str(data.get("code",plan.code)).strip().upper()[:48]
        plan.title=str(data.get("title",plan.title)).strip()[:180]
        plan.description=str(data.get("description",plan.description))
        if "coverImageUrls" in data:plan.cover_image_urls=list(data.get("coverImageUrls") or [])[:3]
        plan.plan_type=data.get("planType",plan.plan_type)
        plan.access_duration_days=int(data.get("accessDurationDays",plan.access_duration_days))
        plan.price_cents=int(data.get("priceCents",plan.price_cents))
        plan.is_active=bool(data.get("isActive",plan.is_active))
        plan.is_highlighted=bool(data.get("isHighlighted",plan.is_highlighted))
        plan.save()
        if "courseIds" in data:
            CommercePlanCourse.objects.filter(plan=plan).delete()
            for cid in data.get("courseIds") or []:CommercePlanCourse.objects.create(plan=plan,course_id=cid)
        return Response(plan_json(plan))

class AdminCouponsView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):
        return Response([coupon_json(c) for c in CommerceCoupon.objects.all().order_by("code")])
    def post(self,request):
        import uuid
        data=request.data
        code=str(data.get("code") or "").strip().upper()
        if not code:return Response({"detail":"Código obrigatório."},status=400)
        c=CommerceCoupon.objects.create(
            id=str(uuid.uuid4()),code=code,description=str(data.get("description") or "")[:240],
            discount_type=data.get("discountType") or "percentage",discount_value=int(data.get("discountValue") or 0),
            max_redemptions=data.get("maxRedemptions"),starts_at=data.get("startsAt") or None,ends_at=data.get("endsAt") or None,
            is_active=bool(data.get("isActive",True)),created_by=request.user)
        return Response(coupon_json(c),status=201)

class AdminCouponDetailView(APIView):
    permission_classes=[permissions.IsAdminUser]
    @transaction.atomic
    def put(self,request,coupon_id):
        c=CommerceCoupon.objects.select_for_update().filter(pk=coupon_id).first()
        if not c:return Response({"detail":"Cupom não encontrado."},status=404)
        data=request.data
        if "code" in data:c.code=str(data["code"]).strip().upper()
        if "description" in data:c.description=str(data["description"])[:240]
        if "discountType" in data:c.discount_type=data["discountType"]
        if "discountValue" in data:c.discount_value=int(data["discountValue"])
        if c.discount_type=="percentage" and c.discount_value>100:return Response({"detail":"Desconto percentual máximo é 100%."},status=400)
        if "maxRedemptions" in data:c.max_redemptions=data["maxRedemptions"]
        if "startsAt" in data:c.starts_at=data["startsAt"] or None
        if "endsAt" in data:c.ends_at=data["endsAt"] or None
        if "isActive" in data:c.is_active=bool(data["isActive"])
        c.save()
        return Response(coupon_json(c))
    def delete(self,request,coupon_id):
        c=CommerceCoupon.objects.filter(pk=coupon_id).first()
        if not c:return Response({"detail":"Cupom não encontrado."},status=404)
        c.delete();return Response({"success":True})

class AdminOrdersView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):
        qs=CommerceOrder.objects.select_related("user","plan").order_by("-created_at")
        if request.query_params.get("status"):qs=qs.filter(status=request.query_params["status"])
        return Response([order_json(o) for o in qs[:300]])

class AdminApproveOrderView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def post(self,request,order_id):
        order=CommerceOrder.objects.filter(pk=order_id).first()
        if not order:return Response({"detail":"Pedido não encontrado."},status=404)
        try:order=approve_order(order.user_id,order.id,"manual",str(request.data.get("providerReference") or "ADMIN"))
        except ValueError as exc:return Response({"detail":str(exc)},status=400)
        return Response(order_json(order))

class AdminCancelOrderView(APIView):
    permission_classes=[permissions.IsAdminUser]
    @transaction.atomic
    def post(self,request,order_id):
        order=CommerceOrder.objects.select_for_update().filter(pk=order_id).first()
        if not order:return Response({"detail":"Pedido não encontrado."},status=404)
        if order.status!="pending_payment":return Response({"detail":"Somente pedidos pendentes podem ser cancelados."},status=400)
        order.status="cancelled";order.cancelled_at=timezone.now();order.save()
        CommerceTransaction.objects.filter(order=order,status="pending").update(status="cancelled",processed_at=timezone.now())
        return Response(order_json(order))
