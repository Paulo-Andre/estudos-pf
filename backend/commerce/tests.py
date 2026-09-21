import hashlib,hmac,time
from django.contrib.auth import get_user_model
from django.test import TestCase
from courses.models import Course,CourseEnrollment
from .mercado_pago import validate_webhook_signature
from .models import CommerceCoupon,CommercePlan,CommercePlanCourse
from .services import approve_order,create_order

class CommerceTests(TestCase):
    def setUp(self):
        User=get_user_model()
        self.user=User.objects.create_user("aluno","a@example.com","Aluno-F0rte!2026")
        self.course=Course.objects.create(id="pf",title="PF",created_by=self.user)
        self.plan=CommercePlan.objects.create(id="plano",code="PLANO",title="Plano",plan_type="course_access",access_duration_days=30,price_cents=10000,is_active=True,created_by=self.user)
        CommercePlanCourse.objects.create(plan=self.plan,course=self.course)

    def test_approval_is_idempotent_and_does_not_extend_twice(self):
        order=create_order(self.user,self.plan.id)
        first=approve_order(self.user.id,order.id,"mercado_pago","pay-1")
        enrollment=CourseEnrollment.objects.get(user=self.user,course=self.course)
        first_expiry=enrollment.expires_at
        second=approve_order(self.user.id,order.id,"mercado_pago","pay-1")
        enrollment.refresh_from_db()
        self.assertEqual(first_expiry,enrollment.expires_at)
        self.assertEqual(first.status,"paid")
        self.assertEqual(second.status,"paid")

    def test_coupon_redemption_increments_once(self):
        coupon=CommerceCoupon.objects.create(id="cup",code="OFF10",discount_type="percentage",discount_value=10,max_redemptions=5,created_by=self.user)
        order=create_order(self.user,self.plan.id,"OFF10")
        approve_order(self.user.id,order.id,"mercado_pago","pay-2")
        approve_order(self.user.id,order.id,"mercado_pago","pay-2")
        coupon.refresh_from_db()
        self.assertEqual(coupon.redeemed_count,1)

    def test_webhook_signature_and_tolerance(self):
        secret="segredo"
        data_id="ABC123"
        request_id="req-1"
        ts=str(int(time.time()))
        manifest="id:"+data_id.lower()+";request-id:"+request_id+";ts:"+ts+";"
        digest=hmac.new(secret.encode(),manifest.encode(),hashlib.sha256).hexdigest()
        self.assertTrue(validate_webhook_signature("ts="+ts+",v1="+digest,request_id,data_id,secret=secret,now=int(ts)))
        with self.assertRaises(ValueError):
            validate_webhook_signature("ts="+ts+",v1="+digest,request_id,data_id,secret=secret,now=int(ts)+301)
