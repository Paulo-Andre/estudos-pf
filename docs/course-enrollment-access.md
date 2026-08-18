# Matrículas por aluno e curso

A plataforma separa **conteúdo**, **disciplinas** e **concursos**. A matrícula é o vínculo comercial entre uma conta de aluno e uma matriz de concurso. Quando Paulo confirma a compra, ele libera o concurso correspondente no painel ROOT; todas as disciplinas declaradas na matriz tornam-se disponíveis sem duplicar o conteúdo.

## Dados obrigatórios

Cada matrícula registra:

- aluno (`userId`);
- curso/concurso (`courseId`), usando os IDs do catálogo compartilhado;
- início (`startAt`);
- vencimento (`expiresAt`);
- status administrativo (`active` ou `revoked`);
- usuário ROOT responsável pela concessão;
- data de revogação, quando aplicável;
- datas de criação e atualização.

A data de vencimento deve ser posterior ao início. O índice único por aluno e curso torna a operação de renovação idempotente: liberar novamente o mesmo curso atualiza o período existente em vez de criar uma duplicata.

## Estados exibidos

O banco mantém o status administrativo, enquanto a aplicação calcula o estado temporal:

| Estado | Regra |
|---|---|
| `scheduled` | O início ainda não chegou. |
| `active` | O período começou, não venceu e não foi revogado. |
| `expired` | A data de vencimento já passou. |
| `revoked` | O ROOT revogou o acesso, independentemente das datas. |

## Operação no ROOT

No painel ROOT, Paulo seleciona um aluno e pode escolher o curso, informar data e hora de início, informar data e hora de vencimento, liberar ou renovar a matrícula e revogar o acesso. Cada operação é registrada na auditoria administrativa.

## Proteção no aluno

O aluno consulta apenas as matrículas vigentes. Sem uma matrícula ativa no período correto, a Home apresenta uma tela de matrícula necessária e não carrega a trilha de estudos. Com uma ou mais matrículas ativas, o seletor de concurso mostra somente os concursos liberados para aquela conta, e a matriz selecionada determina as disciplinas visíveis.

A conta ROOT permanece com acesso administrativo para operação e conferência das matrizes. A futura integração de checkout deve chamar a mesma rotina de concessão, sempre fornecendo o aluno, o curso e o período contratado.
