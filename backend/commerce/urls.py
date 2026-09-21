from django.urls import path
from .views import AdminPlansView,CheckoutView,MercadoPagoWebhookView,MyOrdersView,PublicPlansView
urlpatterns=[
    path("plans/",PublicPlansView.as_view()),
    path("orders/",MyOrdersView.as_view()),
    path("checkout/",CheckoutView.as_view()),
    path("mercado-pago/webhook/",MercadoPagoWebhookView.as_view()),
    path("admin/plans/",AdminPlansView.as_view()),
]
