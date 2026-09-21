# Runbook de produção — Django

## Princípios

- não alterar o banco sem backup;
- não apagar tabelas Node durante o primeiro cutover;
- não armazenar segredos no Git;
- não usar storage local em produção;
- não conceder matrícula com informação vinda apenas do frontend;
- não fazer o primeiro teste de importação no banco de produção.

## 1. Pré-requisitos

A implantação Django precisa de:

- MySQL persistente;
- bucket S3-compatible (Cloudflare R2, S3, Backblaze ou equivalente);
- domínio HTTPS;
- credenciais Mercado Pago;
- credenciais Resend.

## 2. Variáveis mínimas

```text
DEBUG=0
DJANGO_SECRET_KEY=<secret>
DATABASE_URL=<mysql>
PUBLIC_APP_URL=https://seu-dominio
DJANGO_ALLOWED_HOSTS=seu-dominio,.onrender.com
DJANGO_TRUST_PROXY_HEADERS=1
DJANGO_SECURE_COOKIES=1
DJANGO_SECURE_SSL_REDIRECT=1
REQUIRE_PERSISTENT_STORAGE=1

S3_BUCKET=...
S3_ENDPOINT_URL=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_REGION=auto
S3_PUBLIC_BASE_URL=...

MERCADO_PAGO_ACCESS_TOKEN=...
MERCADO_PAGO_WEBHOOK_SECRET=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
```

## 3. Backup

Antes do cutover:

1. snapshot/dump do MySQL;
2. cópia das imagens atuais;
3. registrar contagens das tabelas principais;
4. guardar o commit que está em produção.

Não apagar o banco anterior.

## 4. Homologação

Em uma cópia do banco:

```bash
python manage.py migrate --noinput
python manage.py import_legacy_core --dry-run
python manage.py import_legacy_core
python manage.py import_protected_study_seed protected-study-seed.json --admin-username <admin> --dry-run
python manage.py import_protected_study_seed protected-study-seed.json --admin-username <admin>
python manage.py check
python manage.py test
```

Validar manualmente os fluxos:

- login e recuperação de senha;
- compra;
- webhook Mercado Pago;
- matrícula;
- abrir aula;
- responder questão;
- simulado;
- revisão;
- ranking;
- administração;
- upload;
- celular e desktop.

## 5. Webhook

A URL do Mercado Pago deve apontar para:

```text
https://SEU_DOMINIO/api/v1/commerce/mercado-pago/webhook/
```

A matrícula só é liberada depois de:

1. validar assinatura HMAC;
2. consultar o pagamento no Mercado Pago;
3. comparar `external_reference`;
4. comparar valor e BRL;
5. aprovar o pedido em transação atômica.

## 6. Cutover

1. colocar escrita do sistema legado em manutenção;
2. backup final;
3. aplicar migrations Django;
4. importar delta final;
5. importar conteúdo protegido;
6. iniciar container Django;
7. confirmar `/api/v1/health/`;
8. validar login/admin/checkout;
9. apontar tráfego para o novo serviço;
10. manter o serviço Node disponível para rollback por uma janela curta.

## 7. Rollback

Se houver problema crítico:

1. retirar o novo serviço do tráfego;
2. restaurar apontamento para o serviço Node anterior;
3. não tentar “desfazer” migrations manualmente;
4. restaurar snapshot somente se houver corrupção confirmada;
5. registrar o incidente antes de tentar novo cutover.

## 8. Pós-cutover

Depois de um período de estabilidade:

- remover Node/Express/tRPC/Drizzle do runtime;
- remover variáveis Forge/Manus;
- remover código morto e arquivos de conteúdo legado do branch principal;
- manter backup e testes de restauração;
- aumentar HSTS gradualmente depois de confirmar domínio/subdomínios.
