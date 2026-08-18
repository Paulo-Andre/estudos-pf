# Catálogo de concursos e disciplinas

## Regra de negócio

O **concurso** é o produto ou trilha comercial. A **disciplina** é o catálogo de conteúdo reutilizável. Um módulo pertence a uma disciplina, nunca exclusivamente a um concurso. A matriz do concurso apenas relaciona as disciplinas necessárias para aquele cargo, edital e turma.

Assim, quando uma pessoa adquire a trilha de **Agente da Polícia Federal**, ela recebe acesso às disciplinas previstas na matriz PF. Se, no futuro, adquirir uma trilha PRF ou uma trilha de Polícia Militar, o sistema poderá reaproveitar Português, Direito Constitucional, Informática, Direitos Humanos e outras disciplinas comuns sem duplicar os módulos nem o texto autoral.

## Catálogo inicial

| ID | Disciplina | Estado | Observação |
|---|---|---|---|
| `lingua-portuguesa` | Língua Portuguesa | Ativa | Conteúdo autoral ampliado em 26 módulos. |
| `direito-administrativo` | Direito Administrativo | Ativa | Módulos-base da trilha PF. |
| `direito-constitucional` | Direito Constitucional | Ativa | Módulos-base da trilha PF. |
| `direito-penal` | Direito Penal | Ativa | Módulos DPP-01 a DPP-03 são classificados canonicamente nesta disciplina. |
| `direito-processual-penal` | Direito Processual Penal | Ativa | Módulos DPP-04 a DPP-06 são classificados canonicamente nesta disciplina. |
| `direitos-humanos` | Direitos Humanos | Ativa | Módulos-base da trilha PF. |
| `legislacao-especial` | Legislação Especial | Ativa | Quatro módulos autorais publicados, com possibilidade de expansão. |
| `informatica` | Informática | Ativa | Módulos INF-01 a INF-09 já estão separados no catálogo; novas fontes podem aprofundá-los. |
| `estatistica` | Estatística | Ativa | Módulos EST-01 a EST-07 pertencem a este ativo compartilhável. |
| `raciocinio-logico` | Raciocínio Lógico | Ativa | Módulos RL-01 a RL-04 pertencem a este ativo compartilhável. |
| `contabilidade-geral` | Contabilidade Geral | Ativa | Conteúdo-base presente e reutilizável. |

## Matrizes iniciais

A matriz PF foi cadastrada como ativa com todas as disciplinas do catálogo inicial, pois ela é o primeiro concurso implementado no produto. PRF e Polícia Militar foram cadastrados como matrizes planejadas, usando disciplinas comuns apenas como ponto de partida. Antes da venda ou liberação dessas trilhas, cada matriz deverá ser conferida contra o edital específico, o estado, o cargo e a banca.

## Regras de implementação

O progresso deve continuar pertencendo ao usuário, mas o módulo precisa carregar uma disciplina canônica. O acesso deverá ser calculado como `usuário -> concurso adquirido -> disciplinas da matriz -> módulos da disciplina`. O histórico de respostas e simulados poderá permanecer global quando a questão for compartilhada, enquanto conclusão e revisão devem preservar o `contestId` ou o contexto da trilha quando o mesmo módulo fizer parte de matrizes diferentes.

A primeira implementação não deve criar cópias como `portugues-pf`, `portugues-prf` e `portugues-pm`. O correto é manter uma única disciplina `lingua-portuguesa` e relacioná-la a várias matrizes. Diferenças específicas de edital devem ser representadas por módulos complementares ou por uma camada de ênfase da matriz, não pela duplicação de todo o conteúdo.

## Implementação atual

`pfCurriculumCatalog.ts` é a fonte declarativa do catálogo. A Home já apresenta o seletor de concurso, persiste a escolha localmente e filtra Painel, Conteúdo e Revisão pelos módulos das disciplinas da matriz selecionada. O mapeamento por código evita que o rótulo legado `Direito Penal e Processual Penal` misture os dois ativos.

A liberação comercial definitiva deverá ser conectada ao mecanismo de compras/entitlements quando o produto de pagamento for escolhido. Até lá, PF permanece como matriz ativa e PRF/PM como matrizes planejadas para revisão contra seus editais antes de venda.
