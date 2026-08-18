import type { DetailedStudyModule } from "./pfCompleteStudyData";
import type { InteractiveLesson } from "./pfLearningLessons";
import type { ApostilaChapter } from "./pfApostilaData";
import type { Block } from "./pfStudyData";

const estatutoFonte = {
  rotulo: "Lei nº 10.826/2003 — texto oficial no Planalto",
  url: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.826.htm",
  nota: "Use a redação oficial para conferir alterações legislativas, regulamentação e detalhes que podem mudar a resposta de prova.",
};

const policiaFederalArmasFonte = {
  rotulo: "Legislação de armas — Polícia Federal",
  url: "https://www.gov.br/pf/pt-br/assuntos/armas/normativos/legislacao",
  nota: "Página institucional para consultar normas e orientações atuais relacionadas ao controle de armas.",
};

const leiDrogasFonte = {
  rotulo: "Lei nº 11.343/2006 — texto oficial no Planalto",
  url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11343.htm",
  nota: "A lei deve ser lida junto das atualizações posteriores e dos atos complementares indicados no próprio texto legal.",
};

function aula(
  teach: [string, string, string],
  prompt: string,
  options: [string, string],
  correct: number,
  feedback: string,
  recall: string,
  answer: string,
): InteractiveLesson {
  return {
    teach,
    challenge: { prompt, options, correct, feedback },
    recall: { prompt: recall, answer },
  };
}

function modulo(
  id: string,
  code: string,
  title: string,
  summary: string,
  concepts: string[],
  attention: string[],
  example: string,
  minutes: number,
  fastTrack: string[],
  mnemonic: string,
  checklist: string[],
  lesson: InteractiveLesson,
): DetailedStudyModule {
  return {
    id,
    discipline: "Legislação Especial",
    block: "II" as Block,
    code,
    title,
    summary,
    concepts,
    attention,
    example,
    source: "Apostilas autorizadas do canal + legislação oficial atualizada.",
    estimatedMinutes: minutes,
    fastTrack,
    mnemonic,
    checklist,
    lesson,
  };
}

export const specialLegislationModules: DetailedStudyModule[] = [
  modulo(
    "leg-01",
    "LE-01",
    "Estatuto: SINARM, registro e aquisição",
    "Comece pela arquitetura do controle de armas: quem cadastra, quando o registro é obrigatório e quais requisitos aparecem na aquisição de arma de uso permitido.",
    ["SINARM", "Polícia Federal", "Registro", "Uso permitido", "Idoneidade", "Capacidade técnica"],
    ["Não confunda SINARM com SIGMA: o órgão e o âmbito de registro dependem da classificação da arma.", "Aquisição, registro e porte são etapas diferentes; uma autorização não deve ser tratada como passe livre para portar.", "A redação legal e a regulamentação vigente devem prevalecer sobre resumos antigos."],
    "Uma pessoa que cumpre os requisitos de idoneidade, ocupação lícita, residência certa, capacidade técnica e aptidão psicológica ainda precisa obter a autorização e o registro conforme o procedimento aplicável.",
    28,
    ["Desenhe o fluxo: cadastro → aquisição → registro → eventual porte.", "Separe Polícia Federal/SINARM de Comando do Exército/SIGMA.", "Converta cada requisito legal em uma pergunta de conferência."],
    "SINARM = cadastro e controle; registro não é porte.",
    ["Finalidade e alcance do SINARM", "Registro obrigatório e órgão competente", "Requisitos para aquisição de uso permitido", "Diferença entre aquisição, registro e porte", "Consulta à redação oficial atualizada"],
    aula(
      [
        "O Estatuto organiza o controle de armas por meio de cadastros, registros e autorizações. O SINARM está no âmbito da Polícia Federal e reúne informações como características, propriedade, transferências, ocorrências e autorizações de porte, conforme o alcance legal. Para estudar, pense primeiro em qual informação está sendo controlada e por qual órgão.",
        "A prova costuma aproximar palavras que não são sinônimas. Adquirir é obter a arma; registrar é formalizar sua situação no órgão competente; portar é conduzi-la fora da residência ou local de trabalho nas condições legais. O uso permitido também não deve ser misturado automaticamente ao regime das armas de uso restrito, que possui tratamento próprio.",
        "Monte um caso fictício e passe pelo fluxo sem pular etapas. Pergunte: a arma é de uso permitido? o interessado demonstrou os requisitos? houve autorização? o registro foi realizado? existe autorização específica de porte? Se a questão saltar diretamente da compra para o porte, procure a lacuna.",
      ],
      "O simples registro de uma arma de fogo de uso permitido autoriza automaticamente o seu porte em via pública?",
      ["Sim", "Não"],
      1,
      "Não. Registro e porte são institutos distintos. O porte depende de autorização própria e das condições legais aplicáveis.",
      "Qual é a diferença operacional entre registro e porte?",
      "Registro formaliza a arma no cadastro competente; porte autoriza o transporte/porte nas condições legais.",
    ),
  ),
  modulo(
    "leg-02",
    "LE-02",
    "Estatuto: porte, crimes e consequências",
    "Organize os tipos penais mais cobrados do Estatuto por conduta, objeto e circunstância, sem decorar penas isoladamente.",
    ["Posse irregular", "Porte ilegal", "Disparo", "Uso restrito", "Comércio ilegal", "Tráfico internacional"],
    ["Posse e porte descrevem situações diferentes de disponibilidade e circulação da arma.", "A classificação do armamento e as circunstâncias do fato podem alterar o enquadramento.", "Confira a redação vigente dos artigos e não trate o material da apostila como substituto da lei."],
    "Manter arma de fogo de uso permitido dentro da residência sem o registro exigido aponta para a análise da posse irregular; conduzi-la fora das situações autorizadas exige examinar o porte.",
    32,
    ["Identifique o verbo-núcleo da conduta.", "Pergunte onde a arma estava e qual era a classificação.", "Depois confira majorantes, causas especiais e consequências processuais."],
    "POSSE = dentro do âmbito autorizado; PORTE = circulação fora dele.",
    ["Posse irregular de uso permitido", "Porte ilegal de uso permitido", "Disparo de arma de fogo", "Posse ou porte de uso restrito", "Comércio ilegal e tráfico internacional", "Apreensão e destinação"],
    aula(
      [
        "Nos crimes do Estatuto, a primeira leitura deve identificar a conduta descrita no verbo: possuir, manter sob guarda, portar, transportar, disparar, vender ou importar. O objeto — arma, acessório ou munição — e sua classificação também integram o raciocínio. A resposta correta nasce da combinação desses elementos, não de uma palavra solta.",
        "A distinção mais didática é entre posse e porte. A posse irregular costuma ser estudada a partir da arma mantida no interior da residência ou dependência, enquanto o porte envolve levar, transportar ou manter a arma em contexto externo sem a autorização exigida. O local, a autorização e a classificação são pistas indispensáveis.",
        "Resolva cada caso em três linhas: conduta, local e classificação. Só depois consulte a consequência prevista. Isso evita decorar números de pena sem saber qual tipo penal foi preenchido e reduz a confusão entre a infração de disparo e os crimes de posse ou porte.",
      ],
      "Para diferenciar posse irregular de porte ilegal, basta olhar somente para o calibre da arma?",
      ["Sim", "Não"],
      1,
      "Não. O calibre pode ser relevante, mas o local, a conduta, a autorização e a classificação legal também precisam ser analisados.",
      "Quais três perguntas iniciam a análise de um crime do Estatuto?",
      "Qual foi a conduta, onde ocorreu a disponibilidade da arma e qual é a classificação do objeto.",
    ),
  ),
  modulo(
    "leg-03",
    "LE-03",
    "Lei de Drogas: SISNAD e política pública",
    "Aprenda a primeira camada da Lei nº 11.343/2006: finalidade, princípios, objetivos e distribuição de responsabilidades no SISNAD.",
    ["SISNAD", "Prevenção", "Atenção", "Reinserção social", "Repressão", "Intersetorialidade"],
    ["A lei combina prevenção e cuidado com repressão; não reduza o SISNAD apenas ao tráfico.", "Drogas são definidas pela lei e por listas atualizadas do Poder Executivo, o que exige atenção à norma complementar.", "Responsabilidade compartilhada não elimina as competências específicas de União, estados, Distrito Federal e municípios."],
    "Uma política pública que articula prevenção, atenção, reinserção social e repressão está dentro da lógica integrada do SISNAD; uma leitura que o reduz apenas à punição é incompleta.",
    25,
    ["Separe finalidade, princípios e objetivos.", "Associe prevenção a atenção e reinserção social.", "Revise a competência da União e a articulação com SUS e SUAS."],
    "P-A-R-R: Prevenção, Atenção, Reinserção e Repressão.",
    ["Finalidade do SISNAD", "Conceito legal de drogas e norma complementar", "Princípios do sistema", "Objetivos e articulação federativa", "Integração com SUS e SUAS"],
    aula(
      [
        "O SISNAD é um sistema de políticas públicas, não apenas um catálogo de crimes. A lei articula prevenção do uso indevido, atenção e reinserção social de usuários e dependentes com a repressão da produção não autorizada e do tráfico ilícito. Essa dupla finalidade aparece repetidamente nas questões.",
        "A definição legal de droga depende da especificação em lei ou de listas atualizadas pelo Poder Executivo. Por isso, a disciplina combina texto legal e norma complementar. Em vez de decorar uma lista isolada, reconheça a estrutura: a lei define o regime e o ato complementar atualiza a relação de substâncias.",
        "Ao estudar o SISNAD, faça um mapa com quatro verbos: prevenir, atender, reinserir e reprimir. Em seguida, ligue o sistema à atuação coordenada entre entes federativos e à articulação com saúde e assistência social. Esse mapa ajuda a separar princípios, objetivos e competências.",
      ],
      "O SISNAD se limita à repressão do tráfico ilícito de drogas?",
      ["Sim", "Não"],
      1,
      "Não. A lei também trata de prevenção, atenção e reinserção social, além da repressão.",
      "Quais são os quatro eixos para lembrar a finalidade do SISNAD?",
      "Prevenção, atenção, reinserção social e repressão.",
    ),
  ),
  modulo(
    "leg-04",
    "LE-04",
    "Lei de Drogas: usuário, tráfico e procedimento",
    "Diferencie as condutas dos arts. 28, 33, 35 e correlatos e acompanhe o caminho básico da persecução penal previsto na lei.",
    ["Art. 28", "Art. 33", "Associação", "Financiamento", "Flagrante", "Procedimento"],
    ["O art. 28 não deve ser confundido com tráfico: finalidade, circunstâncias e conjunto probatório importam.", "Tráfico e associação são tipos diferentes; associação exige os elementos próprios do art. 35.", "A quantidade apreendida é apenas um dado do caso, não uma resposta automática sem análise do contexto e da lei."],
    "A análise de uma apreensão exige verificar a conduta, a finalidade, as circunstâncias indicadas no art. 28 e os elementos que podem apontar para o art. 33 ou para outro tipo penal.",
    35,
    ["Leia primeiro o verbo e a finalidade da conduta.", "Compare usuário, tráfico, associação e financiamento em quadros separados.", "Depois revise flagrante, laudo, denúncia e audiência no procedimento."],
    "28 = consumo; 33 = múltiplas condutas de tráfico; 35 = vínculo associativo.",
    ["Condutas e medidas do art. 28", "Elementos do tráfico do art. 33", "Associação e financiamento", "Causas de aumento e colaboração", "Flagrante, laudo e destruição", "Fases do procedimento especial"],
    aula(
      [
        "A Lei de Drogas exige uma leitura contextual. O art. 28 descreve condutas relacionadas ao consumo pessoal e prevê consequências próprias; o art. 33 reúne diversos verbos de tráfico; o art. 35 trata da associação para a prática reiterada ou não de crimes específicos. O enquadramento não deve ser escolhido apenas pelo nome da substância ou por uma impressão rápida.",
        "Para comparar usuário e tráfico, use quatro perguntas: qual foi a conduta? qual era a finalidade? quais circunstâncias cercaram o fato? quais elementos de prova foram produzidos? A quantidade pode compor o contexto, mas não substitui a análise integral. Associação também não é sinônimo de concurso eventual: exige o vínculo descrito no tipo.",
        "Depois de dominar os tipos, percorra o procedimento como uma linha do tempo: apreensão e laudo, flagrante quando houver, investigação, denúncia, resposta, audiência e sentença, conforme o caso. A sequência ajuda a memorizar sem transformar artigos processuais em uma lista desconectada.",
      ],
      "A quantidade da droga, sozinha, define automaticamente o crime de tráfico?",
      ["Sim", "Não"],
      1,
      "Não. A quantidade é um elemento de contexto. A finalidade e as demais circunstâncias e provas devem ser analisadas conforme a lei.",
      "Qual roteiro de quatro perguntas ajuda a diferenciar os tipos da Lei de Drogas?",
      "Conduta, finalidade, circunstâncias e elementos de prova.",
    ),
  ),
];

export const specialApostilaByModule: Record<string, ApostilaChapter> = {
  "leg-01": {
    abertura: "Este módulo constrói a base do Estatuto do Desarmamento: antes de decorar crimes, entenda a arquitetura administrativa do controle de armas e a diferença entre cadastrar, registrar, adquirir e portar.",
    secoes: [
      {
        titulo: "1. O mapa do controle",
        paragrafos: [
          "O SINARM está instituído no âmbito da Polícia Federal e reúne dados sobre armas, propriedade, transferências, ocorrências e autorizações previstas na legislação. Para resolver questões, associe o sistema ao tipo de informação que ele controla e não o confunda com o SIGMA, ligado ao tratamento das armas sob competência do Comando do Exército.",
          "O registro é obrigatório no órgão competente, mas ele não substitui a autorização de porte. A aquisição, o registro e o porte são momentos jurídicos distintos e devem ser analisados em sequência.",
        ],
        esquema: ["SINARM: cadastro e controle no âmbito da PF", "Registro: formalização obrigatória da arma", "Porte: autorização própria para condução nas hipóteses legais"],
        exemplo: { enunciado: "Uma pessoa registra regularmente a arma e passa a transportá-la em via pública sem autorização de porte.", resolucao: "O registro não resolve a questão do porte. São institutos diferentes, portanto a análise deve se concentrar na autorização específica e nas condições legais da condução." },
      },
      {
        titulo: "2. Requisitos de aquisição",
        paragrafos: [
          "Na aquisição de arma de uso permitido, a lei prevê requisitos como declaração de efetiva necessidade, idoneidade, comprovação de ocupação lícita e residência certa, capacidade técnica e aptidão psicológica, observadas as regras regulamentares e a redação vigente.",
          "O melhor método de memorização é transformar cada requisito em uma pergunta: a pessoa é idônea? possui ocupação lícita e residência certa? demonstra capacidade e aptidão? recebeu autorização para aquela arma? Esse roteiro evita misturar requisitos de aquisição com condições de porte.",
        ],
        esquema: ["Necessidade efetiva", "Idoneidade e certidões", "Ocupação lícita e residência certa", "Capacidade técnica e aptidão psicológica"],
      },
    ],
    praticaAtiva: "Explique em voz alta por que o fluxo ‘aquisição → registro → porte’ não pode ser reduzido a uma única autorização.",
    fonteOficial: estatutoFonte,
  },
  "leg-02": {
    abertura: "Aqui o objetivo é classificar a conduta antes de olhar para a consequência. A banca altera verbo, local, autorização e classificação do armamento para testar se você reconhece o tipo penal correto.",
    secoes: [
      {
        titulo: "1. Posse, porte e disparo",
        paragrafos: [
          "A posse irregular é estudada a partir da arma mantida sob guarda em contexto residencial ou equivalente sem a situação regular exigida. O porte ilegal envolve transportar, conduzir ou manter a arma fora desse âmbito sem autorização. O disparo possui descrição própria e não deve ser absorvido automaticamente por posse ou porte.",
          "Ao ler a questão, marque o verbo da conduta, o local, o objeto e a existência de autorização. Esse quadrilátero é mais seguro do que tentar lembrar a resposta por semelhança visual entre os nomes dos crimes.",
        ],
        esquema: ["Verbo: possuir, portar, disparar, vender ou importar", "Local: residência, trabalho ou espaço externo", "Objeto: arma, acessório ou munição", "Contexto: classificação e autorização"],
        exemplo: { enunciado: "A questão afirma que o agente levou a arma para fora de casa, mas omite a autorização de porte.", resolucao: "A omissão é relevante. O aluno deve identificar a conduta de circulação e conferir as exigências do tipo correspondente, sem concluir apenas pelo fato de a arma estar registrada." },
      },
      {
        titulo: "2. Crimes de maior gravidade e apreensão",
        paragrafos: [
          "O Estatuto também trata de posse ou porte de uso restrito, comércio ilegal e tráfico internacional, além de regras sobre apreensão, perícia e destinação. A classificação da arma e a circunstância descrita no enunciado alteram o caminho da análise.",
          "Como as normas podem ser alteradas, use os artigos oficiais como fonte de conferência. A apostila serve para organizar o raciocínio e os padrões de cobrança, não para congelar uma pena ou consequência que tenha sido modificada posteriormente.",
        ],
        esquema: ["Uso restrito não é sinônimo de uso permitido", "Comércio e tráfico internacional têm condutas próprias", "Apreensão deve ser ligada à perícia e à destinação legal"],
      },
    ],
    praticaAtiva: "Crie dois casos: um de posse e outro de porte. Explique qual detalhe factual muda o enquadramento.",
    fonteOficial: policiaFederalArmasFonte,
  },
  "leg-03": {
    abertura: "A Lei de Drogas começa com uma política pública integrada. O candidato que entende os quatro eixos do SISNAD consegue organizar princípios, objetivos e competências sem decorar uma lista isolada.",
    secoes: [
      {
        titulo: "1. O que o SISNAD articula",
        paragrafos: [
          "O SISNAD articula prevenção do uso indevido, atenção e reinserção social de usuários e dependentes com a repressão da produção não autorizada e do tráfico ilícito. A lei, portanto, trabalha com cuidado, prevenção e repressão em equilíbrio.",
          "O sistema dialoga com políticas públicas e com a atuação de União, estados, Distrito Federal e municípios. Em prova, leia com cuidado se a alternativa descreve uma finalidade geral, um princípio ou uma competência específica.",
        ],
        esquema: ["Prevenção: reduzir vulnerabilidades e riscos", "Atenção: acolher e tratar", "Reinserção: recuperar participação social", "Repressão: enfrentar produção e tráfico ilícitos"],
      },
      {
        titulo: "2. Drogas e norma complementar",
        paragrafos: [
          "Para fins da lei, são consideradas drogas as substâncias ou produtos capazes de causar dependência especificados em lei ou relacionados em listas atualizadas pelo Poder Executivo da União. Essa estrutura faz com que o estudo dependa do texto legal e da norma complementar atualizada.",
          "Não memorize uma fotografia antiga como se fosse permanente. Quando a questão cobrar a definição, identifique a remissão à lista oficial e consulte a redação vigente indicada nas fontes do módulo.",
        ],
        esquema: ["Lei: define o regime jurídico", "Ato complementar: atualiza listas", "Questão: leia a remissão e o contexto"],
      },
    ],
    praticaAtiva: "Explique a diferença entre finalidade, princípio e competência usando um exemplo do SISNAD para cada categoria.",
    fonteOficial: leiDrogasFonte,
  },
  "leg-04": {
    abertura: "Este módulo organiza os tipos penais e o procedimento em uma sequência de perguntas. A intenção é evitar a resposta automática baseada somente na quantidade da substância ou no rótulo ‘usuário’ ou ‘traficante’.",
    secoes: [
      {
        titulo: "1. Usuário, tráfico e associação",
        paragrafos: [
          "O art. 28 reúne condutas relacionadas ao consumo pessoal e possui disciplina própria. O art. 33 descreve múltiplos verbos ligados ao tráfico, enquanto o art. 35 exige associação para a prática dos crimes indicados no próprio tipo. São estruturas diferentes.",
          "Para comparar os enquadramentos, use quatro perguntas: o que foi feito? com qual finalidade? em quais circunstâncias? quais provas existem? A quantidade é uma informação de contexto, não uma fórmula que resolva sozinha a tipificação.",
        ],
        esquema: ["Art. 28: conduta e finalidade de consumo pessoal", "Art. 33: vários verbos de tráfico", "Art. 35: vínculo associativo próprio", "Contexto e prova: sempre analisar o conjunto"],
        exemplo: { enunciado: "A questão informa apenas a quantidade apreendida e pede a conclusão sobre tráfico.", resolucao: "A informação é insuficiente para uma resposta automática. O aluno deve procurar finalidade, conduta, circunstâncias, vínculo com outras pessoas e elementos de prova descritos no caso." },
      },
      {
        titulo: "2. Linha do tempo do procedimento",
        paragrafos: [
          "Depois de estudar os tipos, organize o procedimento como uma linha do tempo: apreensão, laudo, flagrante quando houver, investigação, denúncia, resposta do acusado, audiência e sentença, conforme a situação. Essa ordem ajuda a localizar o artigo cobrado.",
          "A colaboração, as causas de aumento e as regras de destruição ou destinação da droga devem ser estudadas em blocos próprios. Não misture regra material, regra de prova e regra processual na mesma anotação.",
        ],
        esquema: ["Fato e apreensão", "Laudo e formalização", "Investigação e denúncia", "Resposta, audiência e sentença"],
      },
    ],
    praticaAtiva: "Desenhe a linha do tempo de um caso hipotético e indique em que momento cada documento ou ato aparece.",
    fonteOficial: leiDrogasFonte,
  },
};
