# Metodologia de aprendizagem — Ciclo de Domínio

A experiência do aluno segue um ciclo adaptativo:

1. **Aprender** — compreensão guiada, exemplos e checkpoint de recuperação ativa.
2. **Praticar** — responder sem consultar, registrando também a confiança na resposta.
3. **Revisar** — erros e itens marcados entram em repetição espaçada.
4. **Simular** — prática de prova mede domínio, tempo, estabilidade e fraquezas.
5. **Recalibrar** — o dashboard escolhe a próxima melhor ação com base nos dados recentes.

## Princípios usados

- recuperação ativa antes de releitura;
- repetição espaçada com `Errei / Difícil / Bom / Fácil`;
- interleaving: alternância de disciplinas em vez de blocos longos da mesma matéria;
- metacognição: confiança baixa/média/alta comparada com desempenho real;
- prática deliberada nos pontos fracos;
- simulados como diagnóstico, não apenas nota;
- intensidade ajustada pela proximidade da prova;
- sessão recomendada de 50 minutos.

## Sessão recomendada

O backend monta uma sessão de 50 minutos de acordo com a fase:

### Base
- 5 min: revisão/aquecimento;
- 25 min: aprendizagem;
- 15 min: questões;
- 5 min: fechamento de memória.

### Acelerado
- 10 min: revisão espaçada;
- 20 min: conteúdo prioritário;
- 15 min: questões;
- 5 min: fechamento.

### Reta final
- 15 min: revisão espaçada;
- 20 min: questões focais;
- 10 min: mini diagnóstico;
- 5 min: fechamento.

## Dashboard

O painel deve responder à pergunta **“o que é melhor eu fazer agora?”**, priorizando:

1. revisões vencidas;
2. fraqueza detectada;
3. próxima aula;
4. simulado diagnóstico;
5. planejamento semanal.

A prontidão é um indicador de apoio ao estudo, não uma previsão de aprovação.

## Conteúdo

Uma aula não deve ser tratada como concluída apenas por leitura. Sempre que possível:

- tentar explicar sem consultar;
- responder um checkpoint;
- corrigir lacunas;
- registrar anotação curta;
- depois concluir.

## Revisão

Itens errados entram automaticamente na fila. A resposta do aluno define o próximo intervalo:

- **Errei:** volta rapidamente;
- **Difícil:** intervalo curto;
- **Bom:** intervalo crescente;
- **Fácil:** intervalo maior.

## Simulados

Há três usos distintos:

- diagnóstico curto;
- treino de domínio;
- prova completa.

Quando há uma fraqueza clara, o sistema oferece treino focal de 10 questões nessa disciplina. Depois, o aluno deve voltar a questões misturadas para preservar a capacidade de alternar contexto.

## Roteiro semanal

O sistema sugere até três disciplinas em sequência de interleaving, começando por uma fraqueza quando houver evidência suficiente. A sugestão não substitui o controle do aluno: o roteiro continua editável.

## Metacognição

Antes de responder, o aluno informa sua confiança. O sistema compara percepção e acerto para detectar:

- excesso de confiança;
- subestimação;
- calibração adequada.

Isso ajuda a combater a falsa sensação de domínio produzida por releitura passiva.

## Regras de produto

- recomendações devem ser explicáveis;
- o aluno mantém controle sobre suas escolhas;
- não criar punição por quebrar sequência;
- não incentivar estudo excessivo;
- priorizar consistência e qualidade da recuperação;
- mobile deve manter todas as ações pedagógicas essenciais acessíveis.
