from django.conf import settings
from django.db import models
from django.db.models import Q

class CommercePlan(models.Model):
    class PlanType(models.TextChoices):
        COURSE_ACCESS="course_access","Acesso a curso"
        SUBSCRIPTION="subscription","Assinatura"
    id=models.CharField(max_length=64,primary_key=True)
    code=models.CharField(max_length=48,unique=True)
    title=models.CharField(max_length=180)
    description=models.TextField(blank=True,default="")
    cover_image_urls=models.JSONField(default=list)
    plan_type=models.CharField(max_length=24,choices=PlanType.choices)
    access_duration_days=models.PositiveIntegerField()
    price_cents=models.PositiveIntegerField()
    currency=models.CharField(max_length=3,default="BRL")
    is_active=models.BooleanField(default=False)
    is_highlighted=models.BooleanField(default=False)
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name="commerce_plans_created")
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)
    courses=models.ManyToManyField("courses.Course",through="CommercePlanCourse",related_name="commerce_plans")
    class Meta:
        indexes=[models.Index(fields=["is_active"],name="plan_active_idx"),models.Index(fields=["plan_type"],name="plan_type_idx")]

class CommercePlanCourse(models.Model):
    plan=models.ForeignKey(CommercePlan,on_delete=models.CASCADE)
    course=models.ForeignKey("courses.Course",on_delete=models.PROTECT)
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["plan","course"],name="plan_course_uniq")]

class CommerceCoupon(models.Model):
    class DiscountType(models.TextChoices):
        PERCENTAGE="percentage","Percentual"
        FIXED_AMOUNT="fixed_amount","Valor fixo"
    id=models.CharField(max_length=64,primary_key=True)
    code=models.CharField(max_length=48,unique=True)
    description=models.CharField(max_length=240,blank=True,default="")
    discount_type=models.CharField(max_length=24,choices=DiscountType.choices)
    discount_value=models.PositiveIntegerField()
    max_redemptions=models.PositiveIntegerField(null=True,blank=True)
    redeemed_count=models.PositiveIntegerField(default=0)
    starts_at=models.DateTimeField(null=True,blank=True)
    ends_at=models.DateTimeField(null=True,blank=True)
    is_active=models.BooleanField(default=True)
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name="commerce_coupons_created")
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)
    class Meta:
        constraints=[models.CheckConstraint(condition=Q(discount_value__gte=0),name="coupon_discount_nonnegative")]

class CommerceOrder(models.Model):
    class Status(models.TextChoices):
        PENDING="pending_payment","Pagamento pendente"
        PAID="paid","Pago"
        CANCELLED="cancelled","Cancelado"
        EXPIRED="expired","Expirado"
        REFUNDED="refunded","Reembolsado"
    id=models.CharField(max_length=64,primary_key=True)
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name="commerce_orders")
    plan=models.ForeignKey(CommercePlan,on_delete=models.PROTECT,related_name="orders")
    coupon_code=models.CharField(max_length=48,blank=True,default="")
    status=models.CharField(max_length=24,choices=Status.choices,default=Status.PENDING)
    subtotal_cents=models.PositiveIntegerField()
    discount_cents=models.PositiveIntegerField(default=0)
    total_cents=models.PositiveIntegerField()
    currency=models.CharField(max_length=3,default="BRL")
    provider=models.CharField(max_length=40,default="manual")
    provider_reference=models.CharField(max_length=160,blank=True,default="")
    paid_at=models.DateTimeField(null=True,blank=True)
    access_granted_at=models.DateTimeField(null=True,blank=True)
    cancelled_at=models.DateTimeField(null=True,blank=True)
    expires_at=models.DateTimeField(null=True,blank=True)
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)
    class Meta:
        indexes=[models.Index(fields=["user","created_at"],name="order_user_created_idx"),models.Index(fields=["status"],name="order_status_idx"),models.Index(fields=["provider","provider_reference"],name="order_provider_ref_idx")]

class CommerceOrderItem(models.Model):
    order=models.OneToOneField(CommerceOrder,on_delete=models.CASCADE,related_name="item")
    plan_id_snapshot=models.CharField(max_length=64)
    title_snapshot=models.CharField(max_length=180)
    plan_type_snapshot=models.CharField(max_length=24)
    access_duration_days_snapshot=models.PositiveIntegerField()
    course_ids_snapshot=models.JSONField(default=list)
    unit_price_cents=models.PositiveIntegerField()
    created_at=models.DateTimeField(auto_now_add=True)

class CommerceTransaction(models.Model):
    class Status(models.TextChoices):
        PENDING="pending","Pendente"
        APPROVED="approved","Aprovada"
        REJECTED="rejected","Rejeitada"
        CANCELLED="cancelled","Cancelada"
        REFUNDED="refunded","Reembolsada"
    id=models.CharField(max_length=64,primary_key=True)
    order=models.ForeignKey(CommerceOrder,on_delete=models.CASCADE,related_name="transactions")
    provider=models.CharField(max_length=40)
    provider_reference=models.CharField(max_length=160,blank=True,default="")
    status=models.CharField(max_length=16,choices=Status.choices,default=Status.PENDING)
    amount_cents=models.PositiveIntegerField()
    currency=models.CharField(max_length=3,default="BRL")
    processed_at=models.DateTimeField(null=True,blank=True)
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        indexes=[models.Index(fields=["order"],name="transaction_order_idx"),models.Index(fields=["provider","provider_reference"],name="transaction_provider_idx")]
