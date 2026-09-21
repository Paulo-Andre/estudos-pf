from django.conf import settings
from django.db import migrations,models
import django.db.models.deletion

class Migration(migrations.Migration):
    initial=True
    dependencies=[migrations.swappable_dependency(settings.AUTH_USER_MODEL),("courses","0002_expand_course_catalog")]
    operations=[
        migrations.CreateModel(name="CommerceCoupon",fields=[
            ("id",models.CharField(max_length=64,primary_key=True,serialize=False)),("code",models.CharField(max_length=48,unique=True)),
            ("description",models.CharField(blank=True,default="",max_length=240)),("discount_type",models.CharField(choices=[("percentage","Percentual"),("fixed_amount","Valor fixo")],max_length=24)),
            ("discount_value",models.PositiveIntegerField()),("max_redemptions",models.PositiveIntegerField(blank=True,null=True)),("redeemed_count",models.PositiveIntegerField(default=0)),
            ("starts_at",models.DateTimeField(blank=True,null=True)),("ends_at",models.DateTimeField(blank=True,null=True)),("is_active",models.BooleanField(default=True)),
            ("created_at",models.DateTimeField(auto_now_add=True)),("updated_at",models.DateTimeField(auto_now=True)),
            ("created_by",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="commerce_coupons_created",to=settings.AUTH_USER_MODEL)),
        ],options={"constraints":[models.CheckConstraint(condition=models.Q(discount_value__gte=0),name="coupon_discount_nonnegative")]}),
        migrations.CreateModel(name="CommercePlan",fields=[
            ("id",models.CharField(max_length=64,primary_key=True,serialize=False)),("code",models.CharField(max_length=48,unique=True)),("title",models.CharField(max_length=180)),
            ("description",models.TextField(blank=True,default="")),("cover_image_urls",models.JSONField(default=list)),
            ("plan_type",models.CharField(choices=[("course_access","Acesso a curso"),("subscription","Assinatura")],max_length=24)),
            ("access_duration_days",models.PositiveIntegerField()),("price_cents",models.PositiveIntegerField()),("currency",models.CharField(default="BRL",max_length=3)),
            ("is_active",models.BooleanField(default=False)),("is_highlighted",models.BooleanField(default=False)),("created_at",models.DateTimeField(auto_now_add=True)),("updated_at",models.DateTimeField(auto_now=True)),
            ("created_by",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="commerce_plans_created",to=settings.AUTH_USER_MODEL)),
        ],options={"indexes":[models.Index(fields=["is_active"],name="plan_active_idx"),models.Index(fields=["plan_type"],name="plan_type_idx")]}),
        migrations.CreateModel(name="CommercePlanCourse",fields=[
            ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),("created_at",models.DateTimeField(auto_now_add=True)),
            ("course",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,to="courses.course")),
            ("plan",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,to="commerce.commerceplan")),
        ],options={"constraints":[models.UniqueConstraint(fields=("plan","course"),name="plan_course_uniq")]}),
        migrations.AddField(model_name="commerceplan",name="courses",field=models.ManyToManyField(related_name="commerce_plans",through="commerce.CommercePlanCourse",to="courses.course")),
        migrations.CreateModel(name="CommerceOrder",fields=[
            ("id",models.CharField(max_length=64,primary_key=True,serialize=False)),("coupon_code",models.CharField(blank=True,default="",max_length=48)),
            ("status",models.CharField(choices=[("pending_payment","Pagamento pendente"),("paid","Pago"),("cancelled","Cancelado"),("expired","Expirado"),("refunded","Reembolsado")],default="pending_payment",max_length=24)),
            ("subtotal_cents",models.PositiveIntegerField()),("discount_cents",models.PositiveIntegerField(default=0)),("total_cents",models.PositiveIntegerField()),
            ("currency",models.CharField(default="BRL",max_length=3)),("provider",models.CharField(default="manual",max_length=40)),("provider_reference",models.CharField(blank=True,default="",max_length=160)),
            ("paid_at",models.DateTimeField(blank=True,null=True)),("access_granted_at",models.DateTimeField(blank=True,null=True)),("cancelled_at",models.DateTimeField(blank=True,null=True)),
            ("expires_at",models.DateTimeField(blank=True,null=True)),("created_at",models.DateTimeField(auto_now_add=True)),("updated_at",models.DateTimeField(auto_now=True)),
            ("plan",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="orders",to="commerce.commerceplan")),
            ("user",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="commerce_orders",to=settings.AUTH_USER_MODEL)),
        ],options={"indexes":[models.Index(fields=["user","created_at"],name="order_user_created_idx"),models.Index(fields=["status"],name="order_status_idx"),models.Index(fields=["provider","provider_reference"],name="order_provider_ref_idx")]}),
        migrations.CreateModel(name="CommerceOrderItem",fields=[
            ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),("plan_id_snapshot",models.CharField(max_length=64)),
            ("title_snapshot",models.CharField(max_length=180)),("plan_type_snapshot",models.CharField(max_length=24)),("access_duration_days_snapshot",models.PositiveIntegerField()),
            ("course_ids_snapshot",models.JSONField(default=list)),("unit_price_cents",models.PositiveIntegerField()),("created_at",models.DateTimeField(auto_now_add=True)),
            ("order",models.OneToOneField(on_delete=django.db.models.deletion.CASCADE,related_name="item",to="commerce.commerceorder")),
        ]),
        migrations.CreateModel(name="CommerceTransaction",fields=[
            ("id",models.CharField(max_length=64,primary_key=True,serialize=False)),("provider",models.CharField(max_length=40)),("provider_reference",models.CharField(blank=True,default="",max_length=160)),
            ("status",models.CharField(choices=[("pending","Pendente"),("approved","Aprovada"),("rejected","Rejeitada"),("cancelled","Cancelada"),("refunded","Reembolsada")],default="pending",max_length=16)),
            ("amount_cents",models.PositiveIntegerField()),("currency",models.CharField(default="BRL",max_length=3)),("processed_at",models.DateTimeField(blank=True,null=True)),("created_at",models.DateTimeField(auto_now_add=True)),
            ("order",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="transactions",to="commerce.commerceorder")),
        ],options={"indexes":[models.Index(fields=["order"],name="transaction_order_idx"),models.Index(fields=["provider","provider_reference"],name="transaction_provider_idx")]}),
    ]
