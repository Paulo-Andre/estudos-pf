from django.contrib import admin
from .models import CommerceCoupon,CommerceOrder,CommerceOrderItem,CommercePlan,CommercePlanCourse,CommerceTransaction
for model in [CommercePlan,CommercePlanCourse,CommerceCoupon,CommerceOrder,CommerceOrderItem,CommerceTransaction]:
    admin.site.register(model)
