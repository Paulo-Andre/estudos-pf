import hashlib
import hmac
import json
import os
import time
import urllib.error
import urllib.request
from decimal import Decimal,ROUND_HALF_UP
from django.utils import timezone
from .models import CommerceOrder,CommerceTransaction
from .services import approve_order

API_BASE="https://api.mercadopago.com"

def _access_token():
    token=os.getenv("MERCADO_PAGO_ACCESS_TOKEN","").strip()
    if not token:
        raise RuntimeError("MERCADO_PAGO_ACCESS_TOKEN não configurado.")
    return token

def _request(path,method="GET",body=None,idempotency_key=None):
    headers={"Authorization":"Bearer "+_access_token(),"Content-Type":"application/json"}
    if idempotency_key:
        headers["X-Idempotency-Key"]=idempotency_key
    data=json.dumps(body).encode() if body is not None else None
    req=urllib.request.Request(API_BASE+path,data=data,headers=headers,method=method)
    try:
        with urllib.request.urlopen(req,timeout=15) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        detail=exc.read().decode(errors="replace")[:500]
        raise RuntimeError("Mercado Pago recusou a requisição (%s): %s"%(exc.code,detail)) from exc

def create_checkout(order,origin,notification_url):
    body={
        "items":[{"id":order.plan_id,"title":"Núcleo Concursos — pedido "+order.id,"quantity":1,"unit_price":order.total_cents/100,"currency_id":"BRL"}],
        "external_reference":order.id,
        "notification_url":notification_url,
        "back_urls":{
            "success":origin+"/?payment=success&order="+order.id,
            "pending":origin+"/?payment=pending&order="+order.id,
            "failure":origin+"/?payment=failure&order="+order.id,
        },
        "auto_return":"approved",
        "statement_descriptor":"NUCLEO CONCURSOS",
        "metadata":{"order_id":order.id,"user_id":order.user_id},
    }
    result=_request("/checkout/preferences","POST",body,"checkout-"+order.id)
    preference_id=str(result.get("id") or "")
    checkout_url=result.get("init_point") or result.get("sandbox_init_point")
    if not preference_id or not checkout_url:
        raise RuntimeError("Mercado Pago não retornou a preferência completa.")
    CommerceOrder.objects.filter(pk=order.id).update(provider="mercado_pago",provider_reference=preference_id)
    CommerceTransaction.objects.filter(order=order).update(provider="mercado_pago",provider_reference=preference_id)
    return {"orderId":order.id,"preferenceId":preference_id,"checkoutUrl":checkout_url}

def validate_webhook_signature(x_signature,x_request_id,data_id,secret=None,tolerance_seconds=300,now=None):
    secret=(secret or os.getenv("MERCADO_PAGO_WEBHOOK_SECRET","")).strip()
    if not secret:
        raise ValueError("Segredo do webhook não configurado.")
    if not x_signature or not x_request_id or not data_id:
        raise ValueError("Cabeçalhos de assinatura incompletos.")
    parts={}
    for part in x_signature.split(","):
        if "=" in part:
            key,value=part.split("=",1)
            parts[key.strip()]=value.strip()
    ts=parts.get("ts")
    supplied=parts.get("v1")
    if not ts or not supplied:
        raise ValueError("Assinatura inválida.")
    try:
        ts_value=int(ts)
    except ValueError as exc:
        raise ValueError("Timestamp inválido.") from exc
    now_value=int(now if now is not None else time.time())
    if ts_value>10**12:
        ts_value//=1000
    if abs(now_value-ts_value)>tolerance_seconds:
        raise ValueError("Assinatura expirada.")
    normalized_id=str(data_id).lower()
    manifest="id:%s;request-id:%s;ts:%s;"%(normalized_id,x_request_id,ts)
    expected=hmac.new(secret.encode(),manifest.encode(),hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected,supplied):
        raise ValueError("Assinatura inválida.")
    return True

def process_payment_notification(payment_id):
    payment=_request("/v1/payments/"+str(payment_id))
    external=str(payment.get("external_reference") or "")
    if not external:
        raise ValueError("Pagamento sem pedido interno.")
    order=CommerceOrder.objects.get(pk=external)
    amount=Decimal(str(payment.get("transaction_amount") or "0"))
    cents=int((amount*100).quantize(Decimal("1"),rounding=ROUND_HALF_UP))
    if cents!=order.total_cents or payment.get("currency_id")!="BRL":
        raise ValueError("Valor ou moeda do pagamento não confere com o pedido.")
    status_value=str(payment.get("status") or "")
    if status_value=="approved":
        return {"action":"approved","order":approve_order(order.user_id,order.id,"mercado_pago",str(payment.get("id") or payment_id))}
    if status_value in {"rejected","cancelled","refunded","charged_back"} and order.status==CommerceOrder.Status.PENDING:
        mapped="refunded" if status_value in {"refunded","charged_back"} else ("cancelled" if status_value=="cancelled" else "rejected")
        CommerceTransaction.objects.filter(order=order).update(provider="mercado_pago",provider_reference=str(payment_id),status=mapped,processed_at=timezone.now())
        return {"action":"recorded","status":status_value}
    return {"action":"pending","status":status_value or "unknown"}
