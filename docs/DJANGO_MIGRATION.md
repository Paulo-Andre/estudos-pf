# Migração Node → Django

## Situação atual

A migração é incremental e mantém `server/` durante a validação.

Já implementado:

- Django + Django REST Framework;
- MySQL;
- autenticação por sessão e migração do hash scrypt legado;
- recuperação de senha e Resend;
- rate limit persistente;
- cursos e matrículas com relações/constraints;
- conteúdo protegido por matrícula;
- importação idempotente das apostilas/questões;
- conteúdo protegido removido do bundle público;
- banco de questões/revisão editorial;
- progresso, roadmap, revisão, notas e simulados;
- competição/ranking;
- comércio, cupons, pedidos e Mercado Pago;
- pagamento atômico/idempotente;
- auditoria e backup;
- alertas/configurações;
- storage S3/R2;
- PWA responsivo;
- pipeline CI em MySQL descartável;
- container Django/React de mesmo domínio.

## Critérios restantes para remover Node

1. container de produção validado no CI;
2. homologação da importação com cópia do banco real;
3. migração das imagens legadas;
4. homologação externa Mercado Pago/Resend;
5. cutover com backup/rollback;
6. remover dependências Node server-side somente depois da estabilização.

O processo operacional está em `docs/PRODUCTION_RUNBOOK.md`.
