# Matriz de paridade Node/tRPC → Django/REST

Objetivo: remover Node/tRPC/Drizzle somente quando todas as funções do `nucleo-concursos` estiverem cobertas por Django/REST e pelo frontend responsivo.

## Núcleo já coberto

- contas: cadastro, login, logout, recuperação de senha, exclusão e administração;
- cursos: catálogo, matrícula, ativação e administração;
- estudos: estado, respostas, módulos, notas, check diário, progresso por conteúdo, retomada, roadmap, revisão e simulados;
- conhecimento: disciplinas, conteúdos, questões, vínculos, revisão editorial e changelog;
- competição: configurações, cursos, ranking, pontuação, histórico, meta mensal, rodadas e respostas;
- comércio: planos, cupons, pedidos, acessos, checkout, Mercado Pago, aprovação/cancelamento e métricas;
- plataforma: configurações públicas/admin, uploads e alertas;
- auditoria e backup;
- PWA e layout responsivo mantidos no frontend.

## Regra para concluir a migração

1. todo endpoint equivalente deve ter teste de permissão e comportamento;
2. CI Django e CI Node/frontend devem estar verdes;
3. frontend deve deixar de depender de `/api/trpc`;
4. conteúdo protegido deve sair do bundle público;
5. storage deve ser independente do Manus;
6. importação legada deve ser testada em banco descartável;
7. só então Node/Express/tRPC/Drizzle podem ser removidos.

## Melhorias adicionadas durante a migração

- PWA instalável;
- rate limit persistente;
- FKs/constraints reais no banco;
- pagamento atômico e idempotente;
- uploads com validação de imagem;
- progresso/retomada por conteúdo;
- roadmap de estudo;
- pipeline completo de validação em MySQL descartável.
