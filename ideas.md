# Direção de Design — Estudos PF

## Três abordagens consideradas

### 1. Arquivo Operacional
**Muito breve:** Uma interface editorial inspirada em dossiês e cadernos de campo, com hierarquia documental e uma atmosfera institucional contemporânea. Faz o estudo parecer uma missão clara, metódica e mensurável.
**Probabilidade:** 0,07

### 2. Academia de Missões
**Muito breve:** Um produto com linguagem de treinamento progressivo, em que competências, metas e desafios formam uma jornada visual de preparação. A estética é energética, porém adulta e sem excesso de efeitos de jogo.
**Probabilidade:** 0,04

### 3. Sala de Evidências
**Muito breve:** Um ambiente noturno e analítico com painéis de investigação, conexões e dados de desempenho. Privilegia concentração, contraste e leitura rápida de progresso.
**Probabilidade:** 0,09

---

## Abordagem escolhida: Arquivo Operacional

### Movimento de design
**Editorial institucional contemporâneo**, combinando a clareza tátil de um arquivo de investigação com a eficácia dos painéis de comando de alta performance.

### Princípios centrais

1. **Objetivo antes do ornamento:** cada bloco informa uma decisão de estudo, uma meta ou um próximo passo.
2. **Autoridade serena:** contraste nítido, tipografia precisa e poucos elementos decorativos para reforçar rigor e confiança.
3. **Progresso tangível:** níveis, XP e conquistas aparecem como registros de treinamento, não como enfeites infantis.
4. **Ritmo editorial:** áreas de destaque assimétricas, carimbos, linhas de arquivo e etiquetas organizam o percurso visual.

### Filosofia de cores
O fundo será **papel mineral quente**, para diminuir fadiga visual e remeter a material de estudo físico. Grafite profundo será a cor de leitura e estrutura; azul petróleo expressará clareza técnica e confiança; verde de sinal será usado com contenção apenas para avanço e acerto. O objetivo é evitar o azul corporativo genérico e o visual de jogo neon.

### Paradigma de layout
Uma **faixa lateral persistente** conduz as áreas principais, enquanto o conteúdo ocupa uma composição de “dossiê aberto”: cabeçalho amplo e assimétrico, coluna de foco à esquerda, indicadores compactos à direita e cartões de tamanhos variáveis. Em telas pequenas, a navegação vira uma barra inferior contextual.

### Elementos de assinatura

1. Uma **barra vertical de progresso** com marcos de treinamento e código de módulo.
2. Etiquetas em caixa alta, como **“OPERAÇÃO DE HOJE”**, com espaçamento de letras e filetes finos.
3. Um **selo circular de evolução** que mostra XP e nível como registro de campo.

### Filosofia de interação
Os controles devem dar retorno imediato e sóbrio: a conclusão de módulo confirma avanço, respostas apresentam a justificativa primeiro e recompensas valorizam consistência e domínio. A experiência deve incentivar o retorno sem transformar a preparação em uma distração.

### Animação
Entradas discretas em cascata (opacidade e deslocamento vertical de até 8 px), duração entre 160 e 240 ms, usando curva de saída rápida. Barras de progresso preenchem somente quando o dado muda; selos ganham um pulso breve após uma conquista; interações frequentes usam transições mínimas. A interface respeita `prefers-reduced-motion`.

### Sistema tipográfico
**DM Sans** para leitura, interfaces e dados; **Sora** para títulos, números de desempenho e etiquetas de missão. Títulos em peso 700–800, corpo em 400–500, microetiquetas em 700 com caixa alta e espaçamento expandido. Não usar Inter.

### Essência da marca
**Uma central de preparação baseada no edital para quem quer transformar estudo para Agente da PF em desempenho consistente e mensurável.**

Personalidade: **metódica, encorajadora, precisa**.

### Voz da marca
As mensagens devem ser diretas, técnicas e motivadoras sem clichês. Títulos descrevem uma ação concreta; CTAs convidam a avançar uma etapa real; microcopy explica o impacto de cada escolha.

Exemplos: “Seu próximo ponto de avanço está em Estatística.”

“Conclua a missão e registre progresso verificável.”

### Wordmark e logo
O símbolo é um **monograma abstrato em forma de escudo aberto**, construído com uma linha ascendente e um ponto central — representação de foco, proteção e evidência. Sem texto no ícone. O wordmark combina “ESTUDOS” em DM Sans e “PF” em Sora pesado.

### Cor de assinatura
**Azul Evidência — #0E5A70.**

## Style Decisions

- Em telas grandes, a faixa lateral operacional permanece visível e carrega marca, áreas principais, missão e progresso; o painel principal não substitui essa orientação.
- Cartões devem ler como registros de dossiê: filetes, etiquetas, códigos e hierarquia documental têm precedência sobre sombras macias e formas excessivamente arredondadas.
- O monograma de escudo aberto e o wordmark **ESTUDOS PF** devem aparecer no primeiro nível visual de toda tela principal.
