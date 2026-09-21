import json,os,urllib.error,urllib.request

def _escape(value):
    return str(value).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace('"',"&quot;")

def deliver_email(to,subject,text,html):
    api_key=os.getenv("RESEND_API_KEY","").strip()
    if not api_key:
        return {"sent":False,"reason":"not_configured"}
    sender=os.getenv("RESEND_FROM_EMAIL","").strip() or "Núcleo Concursos <onboarding@resend.dev>"
    body=json.dumps({"from":sender,"to":[to],"subject":subject,"text":text,"html":html}).encode()
    req=urllib.request.Request("https://api.resend.com/emails",data=body,method="POST",headers={"Authorization":"Bearer "+api_key,"Content-Type":"application/json"})
    try:
        with urllib.request.urlopen(req,timeout=15) as response:
            payload=json.loads(response.read().decode())
            return {"sent":True,"id":payload.get("id")}
    except urllib.error.HTTPError as exc:
        detail=exc.read().decode(errors="replace")[:300]
        raise RuntimeError("Resend recusou o envio (%s): %s"%(exc.code,detail)) from exc

def send_password_reset(to,name,reset_url):
    safe_name=_escape(name or "candidato(a)")
    safe_url=_escape(reset_url)
    return deliver_email(
        to,"Redefina sua senha — Núcleo Concursos",
        "Olá, %s. Para redefinir sua senha, abra este link em até uma hora: %s. Se você não pediu essa alteração, ignore esta mensagem."%(name or "candidato(a)",reset_url),
        '<main style="font-family:Arial,sans-serif;color:#173d4a;max-width:600px;margin:auto"><h1>Redefinição de senha</h1><p>Olá, <strong>%s</strong>.</p><p>Recebemos uma solicitação para redefinir a senha da sua conta.</p><p><a href="%s" style="display:inline-block;background:#0e5a70;color:#fff;padding:12px 18px;text-decoration:none;border-radius:8px">Criar nova senha</a></p><p>Este link expira em <strong>1 hora</strong>.</p></main>'%(safe_name,safe_url)
    )
