from django.urls import path
from .views import AdminApproveOrderView,AdminCancelOrderView,AdminCommerceMetricsView,AdminCouponDetailView,AdminCouponsView,AdminOrdersView,AdminPlanDetailView,AdminPlansView,CheckoutView,MercadoPagoWebhookView,MyAccessesView,MyOrdersView,PublicPlansView

urlpatterns=[
    path("plans/",PublicPlansView.as_view()),
    path("orders/",MyOrdersView.as_view()),
    path("accesses/",MyAccessesView.as_view()),
    path("checkout/",CheckoutView.as_view()),
    path("mercado-pago/webhook/",MercadoPagoWebhookView.as_view()),
    path("admin/metrics/",AdminCommerceMetricsView.as_view()),
    path("admin/plans/",AdminPlansView.as_view()),
    path("admin/plans/<str:plan_id>/",AdminPlanDetailView.as_view()),
    path("admin/coupons/",AdminCouponsView.as_view()),
    path("admin/coupons/<str:coupon_id>/",AdminCouponDetailView.as_view()),
    path("admin/orders/",AdminOrdersView.as_view()),
    path("admin/orders/<str:order_id>/approve/",AdminApproveOrderView.as_view()),
    path("admin/orders/<str:order_id>/cancel/",AdminCancelOrderView.as_view()),
]
