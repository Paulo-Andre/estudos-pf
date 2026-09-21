# Política de Segurança

## Relato de vulnerabilidades

Não publique vulnerabilidades exploráveis em issues públicas. Use um canal privado do mantenedor do repositório e inclua impacto, versão/commit afetado e passos mínimos de reprodução.

## Segredos

Nunca faça commit de chaves de banco, Mercado Pago, Resend, S3/R2, `DJANGO_SECRET_KEY` ou `PII_MASTER_KEY`. Em caso de exposição, revogue/rotacione a credencial no provedor e revise os logs antes de qualquer novo deploy.

A `PII_MASTER_KEY` protege os dados cifrados da aplicação e deve ser mantida em um gerenciador de segredos. Não a rotacione sem um procedimento de recriptografia dos dados existentes.

## Controles automáticos

Pull requests executam testes da plataforma, migração legada, proteção do conteúdo comercial, auditoria de dependências, CodeQL e construção da imagem de produção. Dependabot acompanha dependências Node, Python, GitHub Actions e Docker.

## Produção

Use TLS, usuário MySQL de privilégio mínimo, snapshots criptografados, storage persistente, MFA nas contas administrativas e as configurações descritas em `docs/PRODUCTION_RUNBOOK.md`.
