import json
import os
from rest_framework import permissions,status
from rest_framework.response import Response
from rest_framework.views import APIView
from .mercado_pago import create_checkout,process_payment_notification,validate_webhook_signature
from .models import CommerceCoupon,CommerceOrder,CommercePlan,CommercePlanCourse
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
