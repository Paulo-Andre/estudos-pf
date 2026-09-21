# Plano executado — migração incremental para Django

Esta branch adiciona o novo backend em backend/ sem remover server/.

Implementado: Django/DRF, MySQL, autenticação, compatibilidade com senha legada, rate limit persistente, cursos/matrículas, conteúdo protegido, estudo básico, auditoria e importador legado.

Próximas fases:
1. testar em MySQL de homologação;
2. importar client/src/data para tabelas Django;
3. criar modelos de questões e importadores;
4. criar client/src/api e trocar tRPC gradualmente;
5. migrar imagens de /manus-storage;
6. validar paridade total;
7. remover Node/tRPC/Drizzle somente no final.
