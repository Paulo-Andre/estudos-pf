# Núcleo Concursos / Estudos PF

Plataforma responsiva de estudos para concursos, com React no frontend e migração do backend para Django REST Framework.

## Estado da arquitetura

A branch `codex/django-migration-foundation` mantém o backend Node legado apenas como referência de paridade e fonte temporária da migração. O destino de produção é:

```text
Navegador / PWA
      |
      | HTTPS (mesmo domínio)
      v
React + Vite
      |
      | /api/v1/*
      v
Django + DRF
      |
      +-- MySQL
      +-- Storage S3/R2
      +-- Mercado Pago
      +-- Resend
```

O frontend funciona em celular e computador e pode ser instalado como PWA.

## Funcionalidades

- cadastro, login, logout, perfil, CPF, alteração e recuperação de senha;
- administração de usuários, bloqueio, auditoria e backup;
- catálogo de cursos e matrículas com período de acesso;
- conteúdo protegido por matrícula;
- disciplinas, conteúdos, questões e revisão editorial;
- progresso, notas, roadmap, revisão, checagem diária e simulados;
- ranking/competição, metas mensais e rodadas;
- planos, cupons, pedidos, checkout e métricas;
- Mercado Pago com validação HMAC e confirmação server-side;
- alertas da plataforma;
- uploads validados;
- storage compatível com S3/R2;
- PWA e aviso de conectividade;
- conteúdo comercial fora do bundle público do navegador.

## Desenvolvimento Django

Requer Python 3.12+ e MySQL.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

No Windows PowerShell, ative o ambiente com:

```powershell
.venv\Scripts\Activate.ps1
```

Use `backend/.env.example` como referência para as variáveis.

## Frontend

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run check
pnpm exec vite build
```

Durante a migração, `client/src/lib/trpc.ts` funciona como adaptador de compatibilidade: a interface conserva a forma antiga das chamadas enquanto o runtime aponta para `/api/v1/`.

## Conteúdo protegido

Apostilas e questões comerciais não são usadas pelo bundle de produção. O CI falha se sentinelas de conteúdo protegido aparecerem em `dist/public`.

O seed legado é exportado apenas durante a migração:

```bash
pnpm exec tsx scripts/export-protected-study-seed.ts tmp/protected-study-seed.json
```

E importado no Django:

```bash
cd backend
python manage.py import_protected_study_seed ../tmp/protected-study-seed.json --admin-username <admin> --dry-run
python manage.py import_protected_study_seed ../tmp/protected-study-seed.json --admin-username <admin>
```

O importador é idempotente.

## Importação do banco legado

Sempre use uma cópia/backup antes da produção:

```bash
cd backend
python manage.py import_legacy_core --dry-run
python manage.py import_legacy_core
```

As sessões Node não são reaproveitadas. O hash scrypt legado pode ser validado no primeiro login e atualizado para o formato do Django.

## Storage

Em desenvolvimento o Django pode usar disco local.

Em produção, configure storage S3-compatible:

- `S3_BUCKET`
- `S3_ENDPOINT_URL`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_REGION`
- `S3_PUBLIC_BASE_URL` quando houver domínio público/CDN

Com `REQUIRE_PERSISTENT_STORAGE=1`, a aplicação se recusa a iniciar em produção se o storage persistente estiver incompleto.

## Produção em container

O `Dockerfile` usa dois estágios:

1. Node compila e verifica o React;
2. a imagem final contém apenas Python/Django e o frontend compilado.

Os arquivos TypeScript de conteúdo protegido não são copiados para a imagem final.

Exemplo de blueprint para a versão Django: `deploy/render-django.yaml`.

## CI

O workflow `.github/workflows/full-platform-validation.yml` valida:

- TypeScript;
- testes legados;
- build React;
- ausência de conteúdo protegido no bundle;
- Django system check;
- migrations sem drift;
- migrations aplicadas em MySQL descartável;
- testes Django;
- exportação/importação do conteúdo protegido;
- reimportação idempotente.

## Regra de cutover

O backend Node só deve ser removido depois que:

1. CI estiver verde;
2. importação legada estiver validada;
3. conteúdo protegido estiver no Django;
4. storage persistente estiver configurado;
5. Mercado Pago e Resend estiverem configurados;
6. container Django estiver validado;
7. backup e rollback estiverem prontos.

Veja `docs/PRODUCTION_RUNBOOK.md`.
