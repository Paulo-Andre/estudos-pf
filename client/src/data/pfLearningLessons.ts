/* Estudos PF — Conteúdo ensinável: explicação, exemplo guiado, prática e recuperação ativa. */
export type InteractiveLesson = {
  teach: [string, string, string];
  challenge: { prompt: string; options: [string, string]; correct: number; feedback: string };
  recall: { prompt: string; answer: string };
};

function lesson(teach: [string, string, string], prompt: string, options: [string, string], correct: number, feedback: string, recall: string, answer: string): InteractiveLesson {
  return { teach, challenge: { prompt, options: [options[0], options[1]], correct, feedback }, recall: { prompt: recall, answer } };
}

export const interactiveLessons: Record<string, InteractiveLesson> = {
  "lp-01": lesson([
    "Compreender é localizar aquilo que está claramente dito. Interpretar é concluir algo que o texto permite inferir. Nas duas tarefas, a sua resposta precisa nascer do texto, e não de uma opinião pessoal ou de um conhecimento externo.",
    "Tipos textuais são moldes de organização: narração conta acontecimentos; descrição caracteriza; exposição explica; argumentação defende uma ideia; injunção orienta uma ação. Gêneros são textos sociais concretos, como notícia, relatório, edital, e-mail e artigo de opinião.",
    "Use a leitura em três camadas: primeiro descubra o assunto; depois encontre a tese ou finalidade; por último acompanhe conectores e pronomes. Essa sequência transforma um texto longo em um mapa de decisões.",
  ], "Um relatório policial é um gênero textual; nele podem aparecer trechos expositivos e argumentativos. Essa afirmação está:", ["Certa", "Errada"], 0, "Correto. Gênero é a forma social concreta do texto; os tipos textuais podem coexistir dentro dele.", "Qual é a diferença essencial entre tipo textual e gênero textual?", "Tipo é a estrutura predominante; gênero é a forma de uso social do texto."),
  "lp-02": lesson([
    "Ortografia é a escrita conforme a convenção oficial; coesão é a costura linguística que liga frases e parágrafos. Um texto pode estar ortograficamente correto e, ainda assim, perder coesão se os referentes e conectores forem usados de modo inadequado.",
    "Pronomes retomam termos anteriores. Em ‘a equipe recebeu os autos e os analisou’, ‘os’ retoma ‘autos’. Conectores também carregam lógica: porque introduz causa, embora concessão, portanto conclusão e caso condição.",
    "Tempos e modos verbais colocam a ação no tempo e revelam atitude. O indicativo tende a apresentar fato; o subjuntivo, hipótese, desejo ou possibilidade. Antes de aceitar uma reescrita, confira se a relação lógica foi preservada.",
  ], "Na frase ‘Embora o sistema estivesse indisponível, a equipe concluiu o registro’, o conectivo expressa causa?", ["Sim", "Não"], 1, "Não. ‘Embora’ introduz concessão: existe um obstáculo, mas a ação principal ocorreu apesar dele.", "Que relação lógica costuma ser introduzida por ‘embora’?", "Concessão."),
  "lp-03": lesson([
    "Morfossintaxe fica mais simples quando você encontra o verbo antes de qualquer outra coisa. Depois pergunte quem pratica ou sofre a ação: esse é o caminho para localizar sujeito, complementos e possíveis problemas de concordância.",
    "Pontuação organiza o sentido. Vírgulas podem isolar adjuntos deslocados, vocativos, aposto e orações explicativas, mas não devem separar sujeito e verbo. Regência mostra a preposição exigida; a crase aparece quando a preposição ‘a’ encontra artigo ou pronome feminino iniciado por ‘a’.",
    "Concordância acompanha o núcleo adequado. Em ‘Faz dois anos’, o verbo fazer indica tempo decorrido e fica no singular. Na colocação pronominal, palavras atrativas como ‘não’ e pronomes relativos normalmente puxam o pronome para antes do verbo.",
  ], "Em ‘Fazem dois anos que estudo’, a flexão plural de ‘fazem’ está correta?", ["Sim", "Não"], 1, "Não. Quando ‘fazer’ indica tempo decorrido, é impessoal: ‘Faz dois anos’. ", "Antes de decidir uma vírgula, qual estrutura você deve localizar?", "O verbo, o sujeito e os complementos da oração."),
  "lp-04": lesson([
    "Em reescrita, há duas provas: a nova frase deve continuar gramatical e deve manter o sentido original. Uma troca pode parecer pequena e, mesmo assim, mudar o agente, a intensidade, a condição, a causa ou o tempo da ação.",
    "Observe os conectores com cuidado. ‘Portanto’ conclui; ‘contudo’ opõe; ‘desde que’ condiciona. Também acompanhe pronomes e referências: se uma palavra deixa de apontar para o mesmo termo, a equivalência desaparece.",
    "A passagem de voz ativa para passiva costuma preservar a mensagem quando agente, paciente e tempo são mantidos. ‘A equipe analisou os dados’ equivale a ‘Os dados foram analisados pela equipe’.",
  ], "A troca de ‘embora’ por ‘porque’ preserva necessariamente a relação entre as ideias?", ["Sim", "Não"], 1, "Não. ‘Embora’ é concessivo; ‘porque’ é causal. A mudança altera a lógica do enunciado.", "Quais são as duas verificações de uma reescrita?", "Correção gramatical e preservação do sentido."),
  "lp-05": lesson([
    "Redação oficial não significa escrever de modo rebuscado. Ela busca clareza, concisão, precisão, impessoalidade, coesão e padronização, porque o documento representa a Administração e deve ser entendido sem ambiguidade.",
    "Antes de escrever, responda: qual é o assunto, quem receberá o texto e qual providência se espera? Isso define o expediente e evita parágrafos decorativos. Prefira verbos claros e informações em ordem lógica.",
    "Um bom texto oficial usa tratamento adequado, assunto objetivo e desenvolvimento direto. Ele exclui opiniões íntimas, exageros e fórmulas vazias; cada frase deve cumprir uma função administrativa.",
  ], "Em redação oficial, usar linguagem excessivamente rebuscada é sinal obrigatório de formalidade?", ["Sim", "Não"], 1, "Não. Formalidade oficial exige clareza e precisão, não dificuldade desnecessária.", "Quais três qualidades resumem a escrita oficial?", "Impessoalidade, clareza e precisão."),

  "da-01": lesson([
    "A Administração direta reúne os órgãos das pessoas políticas — União, estados, DF e municípios. Um ministério é órgão: ele integra a pessoa jurídica União e não tem personalidade jurídica própria.",
    "A Administração indireta é formada por entidades com personalidade própria, como autarquias, fundações públicas, empresas públicas e sociedades de economia mista. Ela é uma técnica de descentralização administrativa.",
    "Descentralizar é transferir execução para outra pessoa jurídica; desconcentrar é distribuir competências dentro da mesma pessoa, criando órgãos. Guarde esta pergunta-chave: surgiu outra pessoa jurídica? Se sim, o fenômeno é descentralização.",
  ], "A criação de departamentos dentro de um ministério é exemplo de descentralização?", ["Sim", "Não"], 1, "Não. Departamentos são órgãos internos; há desconcentração, sem nova pessoa jurídica.", "Qual pergunta ajuda a diferenciar descentralização e desconcentração?", "Foi criada ou envolvida outra pessoa jurídica?"),
  "da-02": lesson([
    "Todo ato administrativo válido é analisado por seus elementos: competência, finalidade, forma, motivo e objeto. Competência indica quem pode agir; finalidade é o interesse público previsto em lei; motivo são os fatos e fundamentos; objeto é o efeito jurídico produzido.",
    "Os atributos são diferentes dos elementos. Presunção de legitimidade, imperatividade, autoexecutoriedade e tipicidade explicam como certos atos operam; eles não substituem competência, finalidade, forma, motivo e objeto.",
    "Agentes públicos abrangem quem exerce função estatal. Cargo público é criado por lei e ocupado sob regime estatutário; emprego público é contratual; função pública é conjunto de atribuições, podendo existir sem cargo efetivo próprio.",
  ], "Presunção de legitimidade é elemento de validade do ato administrativo?", ["Sim", "Não"], 1, "Não. É atributo. Os elementos são competência, finalidade, forma, motivo e objeto.", "Quais são os cinco elementos clássicos do ato administrativo?", "Competência, finalidade, forma, motivo e objeto."),
  "da-03": lesson([
    "Poder hierárquico organiza a Administração internamente; disciplinar apura e pune infrações de vínculos especiais; regulamentar detalha a execução da lei; poder de polícia limita ou condiciona direitos em favor do interesse coletivo.",
    "Todo poder tem finalidade e limites. Uso além da competência ou para objetivo diverso pode configurar abuso, por excesso de poder ou desvio de finalidade. A atividade administrativa deve sempre ser controlável e proporcional.",
    "Na licitação, a regra é competição. Dispensa ocorre quando a competição é possível, mas a lei autoriza contratar diretamente; inexigibilidade ocorre quando a competição é inviável, como em certas situações de exclusividade.",
  ], "Quando existe fornecedor exclusivo, a contratação direta tende a ser caso de inexigibilidade?", ["Sim", "Não"], 0, "Certo. A exclusividade pode tornar a competição inviável, característica da inexigibilidade.", "Qual é a diferença essencial entre dispensa e inexigibilidade?", "Na dispensa a competição é possível; na inexigibilidade ela é inviável."),
  "da-04": lesson([
    "Controle administrativo é exercido pela própria Administração; o legislativo controla nos limites constitucionais; o judicial verifica a legalidade de atos e omissões. Nenhum desses controles autoriza substituir livremente a decisão administrativa válida por preferência pessoal.",
    "Na responsabilidade civil do Estado, a análise prática começa por conduta, dano e nexo causal. Em atos comissivos, a responsabilidade objetiva é a regra; excludentes, como culpa exclusiva da vítima, podem afastar ou reduzir o dever de indenizar.",
    "O regime jurídico-administrativo é sustentado por princípios. Legalidade, impessoalidade, moralidade, publicidade e eficiência são expressos; supremacia e indisponibilidade do interesse público ajudam a explicar a atuação estatal, sempre dentro da Constituição.",
  ], "No controle judicial, o juiz pode substituir automaticamente todo mérito administrativo por sua preferência?", ["Sim", "Não"], 1, "Não. O controle judicial recai, em regra, sobre legalidade e constitucionalidade, sem invadir mérito legítimo.", "Quais três elementos formam a base da responsabilidade civil estatal?", "Conduta, dano e nexo causal."),

  "dc-01": lesson([
    "Direitos fundamentais protegem posições essenciais da pessoa; garantias são instrumentos destinados a protegê-las. O direito de locomoção, por exemplo, é protegido pelo habeas corpus quando há violência ou ameaça ilegal à liberdade de ir e vir.",
    "Os direitos do artigo 5º devem ser lidos como sistema: vida, liberdade, igualdade, segurança e propriedade dialogam entre si. Eles não são absolutos; eventuais restrições dependem de fundamento constitucional, legalidade e proporcionalidade.",
    "Nos itens de prova, primeiro descubra qual direito está em jogo. Depois procure a garantia adequada e, por fim, verifique se há reserva de lei, decisão judicial ou limite constitucional relevante.",
  ], "Habeas corpus protege diretamente a liberdade de locomoção?", ["Sim", "Não"], 0, "Certo. Ele combate ilegalidade ou abuso de poder que atinja o direito de ir, vir ou permanecer.", "Qual é a diferença entre direito e garantia fundamental?", "Direito é o bem protegido; garantia é o instrumento de proteção."),
  "dc-02": lesson([
    "Direitos sociais exigem atuação estatal para promover condições materiais de dignidade. Nacionalidade é o vínculo jurídico-político entre pessoa e Estado; cidadania é noção ligada à participação política e ao exercício dos direitos políticos.",
    "Direitos políticos envolvem alistamento, voto, elegibilidade e hipóteses de perda ou suspensão. Sempre separe capacidade eleitoral ativa — votar — de capacidade eleitoral passiva — ser votado.",
    "Partidos políticos são instrumentos constitucionais de participação democrática. Para estudar, faça quadros com requisitos, vedações e consequências, preferindo o texto da Constituição quando o item trouxer exceção.",
  ], "Nacionalidade e cidadania são expressões totalmente idênticas?", ["Sim", "Não"], 1, "Não. Elas se relacionam, mas cidadania refere-se especialmente à participação e aos direitos políticos.", "Que capacidade eleitoral corresponde ao direito de ser votado?", "Capacidade eleitoral passiva."),
  "dc-03": lesson([
    "A forma de governo responde à relação entre governantes e governados; o sistema de governo descreve a relação entre Executivo e Legislativo. No Brasil, a Constituição estabelece república e presidencialismo.",
    "Segurança pública é dever do Estado, direito e responsabilidade de todos. A Constituição lista órgãos e atribuições, incluindo a Polícia Federal como órgão permanente, organizado e mantido pela União, com funções constitucionalmente previstas.",
    "Ordem social é ampla: abrange seguridade, ambiente, família, criança, adolescente, idoso e povos indígenas. Ao revisar, associe cada tema ao objetivo de bem-estar e justiça social previsto constitucionalmente.",
  ], "A ordem social constitucional limita-se à seguridade social?", ["Sim", "Não"], 1, "Não. Ela também alcança ambiente, família e grupos com proteção constitucional específica.", "Como a Constituição define a segurança pública em uma frase?", "Dever do Estado, direito e responsabilidade de todos."),

  "dpp-01": lesson([
    "Princípios penais limitam o poder de punir. Legalidade exige lei anterior que defina crime e pena; anterioridade impede surpresa punitiva; irretroatividade protege contra lei posterior mais severa, admitindo retroatividade benéfica.",
    "Para resolver lei penal no tempo, marque a data da conduta e compare as leis. Como regra, o Código Penal adota a teoria da atividade: considera-se praticado o crime quando ocorreu ação ou omissão, ainda que o resultado surja depois.",
    "Na lei penal no espaço, a regra é territorialidade. Contudo, a própria lei prevê situações de extraterritorialidade. Em prova, não basta decorar a regra: identifique a conexão do fato com território, nacionalidade e interesse protegido.",
  ], "Para o tempo do crime, o Código Penal adota em regra a teoria do resultado?", ["Sim", "Não"], 1, "Não. Adota a teoria da atividade: considera-se o momento da ação ou omissão.", "Que teoria define, em regra, o tempo do crime no Código Penal?", "A teoria da atividade."),
  "dpp-02": lesson([
    "Fato típico é a conduta que se encaixa na descrição legal. A análise costuma reunir conduta, resultado quando exigido, nexo causal e tipicidade. Só depois se pergunta se há causa que exclua a ilicitude.",
    "Legítima defesa, estado de necessidade, estrito cumprimento do dever legal e exercício regular de direito são causas clássicas de exclusão da ilicitude. Elas não autorizam excessos: o excesso doloso ou culposo pode ser punível.",
    "Tentativa ocorre quando há início de execução e o crime não se consuma por circunstâncias alheias à vontade do agente. A banca costuma comparar tentativa com atos preparatórios, desistência voluntária e arrependimento eficaz.",
  ], "A tentativa exige que a não consumação decorra de circunstância alheia à vontade do agente?", ["Sim", "Não"], 0, "Certo. Se o próprio agente interrompe voluntariamente a execução, a situação pode receber disciplina diferente.", "Depois de identificar o fato típico, qual pergunta deve vir?", "Se existe causa que exclua a ilicitude."),
  "dpp-03": lesson([
    "Crimes contra a pessoa protegem, entre outros bens, vida e integridade; crimes patrimoniais protegem patrimônio; crimes contra a fé pública preservam confiança em documentos, sinais e autenticidade; crimes contra a Administração protegem probidade e funcionamento estatal.",
    "Em cada tipo penal, localize verbo núcleo, sujeito ativo, sujeito passivo, objeto material, elemento subjetivo e momento de consumação. Essa leitura evita confundir tipos com nomes parecidos.",
    "Em crimes patrimoniais, compare a forma de obtenção: subtrair, apropriar-se, constranger com violência ou induzir em erro são mecanismos distintos e levam a enquadramentos distintos.",
  ], "Falsificação de documento público é crime contra a fé pública?", ["Sim", "Não"], 0, "Certo. A tutela central é a confiança social na autenticidade documental.", "Quais quatro grupos de crimes devem ser revisados neste módulo?", "Contra a pessoa, patrimônio, fé pública e Administração Pública."),
  "dpp-04": lesson([
    "O inquérito policial é procedimento administrativo de investigação voltado à colheita de elementos informativos sobre materialidade e autoria. Ele é, em regra, escrito, sigiloso na medida necessária e inquisitivo, mas não dispensa o respeito às garantias legais do investigado.",
    "O fluxo mais útil é: notícia do fato, instauração, diligências, eventual indiciamento, relatório e encaminhamento. Notitia criminis é o conhecimento da infração; delatio criminis é a comunicação do fato por alguém à autoridade.",
    "Indiciamento é ato fundamentado da autoridade policial que aponta, mediante elementos informativos, a autoria ou participação. Ele não equivale a condenação e não retira o papel do Ministério Público na ação penal.",
  ], "O inquérito policial é indispensável em toda ação penal?", ["Sim", "Não"], 1, "Não. Ele é, em regra, dispensável se houver elementos suficientes por outras fontes legítimas.", "Qual sequência resume o inquérito?", "Notícia do fato, instauração, investigação, garantias e conclusão."),
  "dpp-05": lesson([
    "Prova é o meio de reconstruir fatos relevantes ao processo. A primeira preocupação é origem lícita: prova obtida com violação de norma constitucional ou legal pode ser inadmissível, e a cadeia de obtenção deve ser examinada com cuidado.",
    "Preservar o local de crime impede contaminação e perda de vestígios. Documentos, reconhecimento, acareação, indícios e busca e apreensão possuem requisitos próprios; a prova ganha força quando é produzida e documentada conforme a lei.",
    "Reconhecimento de pessoa ou coisa não é intuição livre. O procedimento legal existe para reduzir erros de memória e sugestão. Em questões, procure se a autoridade respeitou as etapas exigidas.",
  ], "Preservar o local de crime ajuda a proteger a integridade dos vestígios?", ["Sim", "Não"], 0, "Certo. A preservação reduz risco de alteração, contaminação ou desaparecimento de evidências.", "Qual é a primeira pergunta ao analisar uma prova?", "Se sua obtenção e documentação foram lícitas e regulares."),
  "dpp-06": lesson([
    "Prisão em flagrante é uma forma de restrição de liberdade vinculada a situações previstas em lei. O ponto inicial é enquadrar o fato: está ocorrendo, acabou de ocorrer, houve perseguição ou foi encontrado logo depois com elementos que indiquem autoria?",
    "Mesmo diante do flagrante, há garantias: comunicação, identificação de quem realizou o ato, documentação e controle de legalidade. Flagrante não é autorização para violar integridade, defesa ou demais direitos fundamentais.",
    "Nas questões, separe a situação material de flagrância dos atos posteriores de formalização. Uma prisão pode começar por situação típica, mas ainda exigir rigor nas providências legais subsequentes.",
  ], "A existência de flagrante elimina o dever de respeitar garantias legais?", ["Sim", "Não"], 1, "Não. A restrição deve obedecer às formalidades e garantias previstas no ordenamento.", "Quais duas análises devem ser feitas na prisão em flagrante?", "A situação legal de flagrância e a formalização respeitosa das garantias."),

  "dh-01": lesson([
    "Direitos humanos partem da dignidade da pessoa e limitam o exercício do poder. A Constituição brasileira incorpora direitos e garantias e se relaciona com compromissos internacionais assumidos pelo Estado.",
    "O sistema internacional não substitui automaticamente a proteção interna. Ele cria parâmetros e mecanismos complementares de proteção, exigindo que o Estado respeite, proteja e promova direitos.",
    "Na prática pública, a pergunta é simples: a atuação preserva a dignidade, trata pessoas sem discriminação, usa meios legais e permite controle? Direitos humanos orientam decisões concretas, não são uma matéria abstrata isolada.",
  ], "O sistema internacional de direitos humanos torna irrelevante a Constituição brasileira?", ["Sim", "Não"], 1, "Não. Os sistemas se complementam na proteção da pessoa.", "Quais três deveres resumem a atuação estatal em direitos humanos?", "Respeitar, proteger e promover."),
  "dh-02": lesson([
    "Tratados de direitos humanos protegem grupos e situações específicas. A Convenção do Genocídio reprime atos praticados com intenção de destruir grupo protegido; convenções antidiscriminatórias combatem distinções incompatíveis com igualdade e dignidade.",
    "Refugiado não é sinônimo de qualquer migrante. O regime internacional de refúgio protege pessoa que, por fundado temor de perseguição em hipóteses previstas, não pode ou não quer retornar ao seu país.",
    "Ao estudar tratados, memorize uma tríade: quem é protegido, contra qual risco e que dever cabe ao Estado. Isso torna a comparação entre diplomas muito mais simples e evita decorar siglas sem sentido.",
  ], "Todo migrante é automaticamente considerado refugiado pelo direito internacional?", ["Sim", "Não"], 1, "Não. Refúgio possui requisitos e regime protetivo específicos.", "Que três perguntas ajudam a estudar um tratado de direitos humanos?", "Quem protege, contra qual risco e qual dever impõe ao Estado."),
  "dh-03": lesson([
    "A proibição da tortura é categórica: não se justifica por ordem superior, emergência ou objetivo de investigação. O dever estatal inclui prevenir, investigar e responsabilizar condutas de tortura, além de reparar violações quando cabível.",
    "Desaparecimento forçado envolve privação de liberdade seguida de recusa em reconhecer a detenção ou de ocultação do destino ou paradeiro, retirando a pessoa da proteção da lei. Por isso, prevenção e registro são essenciais.",
    "As Regras de Mandela estabelecem parâmetros mínimos de tratamento de pessoas presas. Custódia não cancela dignidade: saúde, integridade, respeito e condições humanas integram a responsabilidade estatal.",
  ], "A ordem de superior hierárquico torna lícita a prática de tortura?", ["Sim", "Não"], 1, "Não. Tortura é absolutamente vedada e ordem superior não a justifica.", "Qual valor continua protegido na custódia estatal?", "A dignidade da pessoa humana, com integridade e tratamento humano."),
  "dh-04": lesson([
    "Uso da força é tema de decisão gradual, não de impulso. Legalidade pergunta se existe base jurídica; necessidade pergunta se havia meio menos lesivo eficaz; proporcionalidade compara intensidade da resposta, risco e objetivo legítimo.",
    "Armas de fogo exigem cuidado máximo. Instrumentos de menor potencial ofensivo também demandam treinamento, situação compatível, controle e prestação de contas: ‘menos letal’ não significa inofensivo ou livre de regras.",
    "Uma boa análise descreve a situação, o objetivo, as alternativas disponíveis, a força empregada e o resultado. Esse raciocínio permite identificar abuso e também reconhecer atuação legítima dentro dos parâmetros normativos.",
  ], "Instrumento de menor potencial ofensivo pode ser usado sem necessidade ou proporcionalidade?", ["Sim", "Não"], 1, "Não. Todo emprego de força deve obedecer aos parâmetros de legalidade, necessidade e proporcionalidade.", "Qual tríade deve guiar a análise de uso da força?", "Legalidade, necessidade e proporcionalidade."),

  "le-01": lesson([
    "Legislação especial deve ser estudada por blocos de finalidade. O Estatuto da Segurança Privada disciplina atividades e instituições do setor; a lei de produtos químicos trata de controle e fiscalização para prevenir desvio; a Lei de Migração estabelece princípios, direitos e regras de entrada, permanência e saída.",
    "Em vez de tentar memorizar a lei inteira de uma vez, faça uma ficha para cada diploma: objeto, destinatário, autoridade competente, dever principal, infração e consequência. Depois retorne à lei seca para confirmar exceções.",
    "Atenção para categorias: migrante, visitante e refugiado não são rótulos intercambiáveis. Cada regime tem finalidade e pressupostos próprios, e a prova gosta de trocar um pelo outro.",
  ], "A Lei de Migração e o regime de refúgio são exatamente o mesmo conjunto normativo?", ["Sim", "Não"], 1, "Não. Eles se relacionam, mas possuem objetos e regras específicas.", "Qual ficha de seis campos ajuda a estudar legislação especial?", "Objeto, destinatário, autoridade, dever, infração e consequência."),
  "le-02": lesson([
    "Na Lei de Drogas, o ponto de partida é diferenciar condutas relacionadas ao consumo de condutas de tráfico. O exame não se reduz à quantidade de substância: a lei prevê critérios e consequências próprias, que devem ser lidos com atenção literal.",
    "A Lei de Tortura descreve modalidades, causas de aumento e consequências graves; o ECA trabalha com proteção integral de crianças e adolescentes. Não aplique automaticamente a lógica penal de adultos a situações regidas pelo Estatuto.",
    "Para acelerar a revisão, separe em três camadas: tipo ou conduta, consequência jurídica e procedimento. Quando um item misturar duas leis, descubra primeiro de qual diploma vem a regra antes de julgar.",
  ], "A legislação aplicável a adolescente deve ser automaticamente igual ao sistema penal de adultos?", ["Sim", "Não"], 1, "Não. O ECA possui princípios e medidas próprias, ligados à proteção integral.", "Quais três camadas devem ser anotadas em cada lei?", "Conduta, consequência jurídica e procedimento."),
  "le-03": lesson([
    "No Estatuto do Desarmamento, registro, posse, porte e comércio são situações diferentes. Posse se relaciona à manutenção da arma no local permitido; porte envolve condução fora desse âmbito e depende de disciplina específica.",
    "Crimes ambientais tutelam bens como fauna, flora, poluição e ordenamento urbano, podendo gerar responsabilização penal e administrativa. Em questões, localize a conduta, o objeto atingido e a eventual exigência de licença ou autorização.",
    "A Lei nº 10.446/2002 prevê atuação da Polícia Federal em infrações com repercussão interestadual ou internacional nas hipóteses legais. Ela não transforma qualquer crime em crime de competência federal.",
  ], "Posse e porte de arma são conceitos idênticos?", ["Sim", "Não"], 1, "Não. Eles descrevem situações jurídicas distintas e têm tratamento legal próprio.", "O que a Lei nº 10.446/2002 exige além da existência de crime?", "Repercussão interestadual ou internacional nas hipóteses legais."),
  "le-04": lesson([
    "A identificação civil moderna integra documentos, número de registro e bases de dados. A legislação do edital deve ser vista em linha do tempo: identificação civil, CPF como número suficiente nas hipóteses legais, carteira de identidade e Carteira de Identidade Nacional.",
    "A função de um número único é reduzir duplicidades e facilitar interoperabilidade, mas isso exige segurança, qualidade de dados e respeito às normas aplicáveis. Identificação civil não se confunde com identificação criminal.",
    "A Convenção sobre Crime Cibernético é estudada por sua lógica de cooperação e de enfrentamento a delitos praticados por meios digitais. Guarde objetivos, mecanismos de colaboração e preservação de evidências eletrônicas.",
  ], "Identificação civil e identificação criminal são o mesmo instituto?", ["Sim", "Não"], 1, "Não. São regimes diferentes, com finalidades e requisitos próprios.", "Qual é a vantagem funcional de um número único de identificação?", "Reduzir duplicidades e favorecer interoperabilidade segura."),

  "est-01": lesson([
    "Estatística descritiva transforma dados brutos em retrato compreensível. Média resume o centro usando todos os valores; mediana aponta o valor central ordenado; moda mostra o valor mais frequente. Nenhuma é ‘a melhor’ sempre: depende da distribuição.",
    "Dispersão informa o quanto os dados se afastam do centro. Amplitude usa máximo menos mínimo; variância trabalha com desvios ao quadrado; desvio padrão volta à unidade original. Assimetria descreve desequilíbrio; curtose trata da concentração e caudas da distribuição.",
    "Antes de calcular, leia título, fonte, unidade e escala de uma tabela ou gráfico. Em prova, muitos erros surgem de interpretação apressada de percentuais, eixos truncados ou comparação entre bases diferentes.",
  ], "Em uma distribuição com valor extremamente alto, a média pode se afastar bastante da mediana?", ["Sim", "Não"], 0, "Certo. Valores extremos influenciam a média mais do que a mediana.", "Qual medida costuma ser mais resistente a valores extremos?", "A mediana."),
  "est-02": lesson([
    "Probabilidade começa pelo espaço amostral: o conjunto de resultados possíveis. Eventos são subconjuntos dele. A probabilidade condicional P(A|B) responde qual é a chance de A quando B já ocorreu; por isso, o universo de referência foi reduzido.",
    "Eventos independentes não se influenciam e permitem multiplicar probabilidades. Eventos mutuamente exclusivos não ocorrem juntos: sua interseção é zero. Não confunda os conceitos, pois independentes podem ocorrer simultaneamente.",
    "Bayes atualiza uma probabilidade à luz de nova informação. O Teorema da Probabilidade Total monta a chance de um evento a partir de caminhos que particionam o universo. Desenhar árvore de probabilidades ajuda muito.",
  ], "Eventos independentes podem ocorrer juntos?", ["Sim", "Não"], 0, "Certo. Independência significa ausência de influência, não impossibilidade de coincidência.", "Qual é a diferença entre independência e exclusão mútua?", "Independentes podem ocorrer juntos; mutuamente exclusivos têm interseção zero."),
  "est-03": lesson([
    "Variável aleatória transforma resultado de experimento em número. Se os valores são contáveis, como número de prisões em um dia, ela é discreta; se pode assumir valores de um intervalo, como tempo de atendimento, é contínua.",
    "Para discreta, usa-se função de probabilidade; para contínua, densidade. Em variável contínua, a probabilidade de um único valor isolado é zero: probabilidades são calculadas em intervalos.",
    "Esperança é a média teórica ponderada pelos valores possíveis. Distribuições especiais, condicionais e transformações devem ser lidas por suporte, parâmetro e pergunta: o que o enunciado quer — probabilidade, média, variância ou nova variável?",
  ], "O tempo exato de atendimento, medido continuamente, é exemplo de variável discreta?", ["Sim", "Não"], 1, "Não. Tempo medido em intervalo contínuo é variável contínua.", "Que função é associada tipicamente a variável contínua?", "Função densidade de probabilidade."),
  "est-04": lesson([
    "Bernoulli tem dois resultados, como sucesso e fracasso. Binomial conta sucessos em número fixo de ensaios independentes com mesma probabilidade. Uniforme dá mesma densidade no intervalo; normal tem forma de sino definida por média e desvio padrão.",
    "Médias aritmética, ponderada, geométrica e harmônica atendem a contextos diferentes. Antes de usar fórmula, pergunte se existem pesos, taxas de crescimento ou razões. A escolha da média também é uma decisão de interpretação.",
    "Correlação de Pearson mede associação linear entre duas variáveis, variando de -1 a 1. Ela não prova causalidade. A regra empírica da normal relaciona faixas em torno da média a um, dois e três desvios padrão.",
  ], "Correlação alta entre duas variáveis prova que uma causa a outra?", ["Sim", "Não"], 1, "Não. Correlação mede associação linear; causalidade exige análise adicional.", "O que a distribuição binomial conta?", "Número de sucessos em ensaios independentes com mesma probabilidade de sucesso."),
  "est-05": lesson([
    "População é o conjunto de interesse; amostra é parte observada. Amostragem aleatória simples dá chance igual a unidades elegíveis; estratificada divide em grupos relevantes; sistemática seleciona por intervalo; conglomerados seleciona grupos inteiros.",
    "O Teorema Central do Limite explica, em certas condições, o comportamento aproximado da média amostral quando o tamanho da amostra cresce. A Lei dos Grandes Números descreve a estabilização de frequências ou médias com muitas observações.",
    "Não escolha método pelo nome mais sofisticado. Escolha pela estrutura da população, custo, acesso e necessidade de representar subgrupos. Depois pergunte se o tamanho amostral permite precisão compatível com o objetivo.",
  ], "Na amostragem estratificada, a população é dividida em grupos antes da seleção?", ["Sim", "Não"], 0, "Certo. A ideia é garantir representação dos estratos relevantes.", "Qual é a diferença entre estratificada e conglomerados?", "Estratificada seleciona elementos em estratos; conglomerados seleciona grupos inteiros."),
  "est-06": lesson([
    "Inferência estatística usa amostra para falar sobre população. Estimativa pontual entrega um número; intervalo de confiança apresenta faixa compatível com procedimento frequencista; intervalo de credibilidade usa linguagem associada à abordagem bayesiana.",
    "Teste de hipótese compara H0 e H1. O nível de significância alfa controla a tolerância a erro tipo I no procedimento; potência é a capacidade de detectar alternativa verdadeira. Não diga que alfa é ‘a chance de H0 ser verdadeira’.",
    "O teste t costuma aparecer em inferências envolvendo médias quando a variância populacional não é conhecida em condições apropriadas; qui-quadrado aparece, entre outros usos, em aderência e independência categórica.",
  ], "O nível de significância é a probabilidade de a hipótese nula ser verdadeira?", ["Sim", "Não"], 1, "Não. Alfa é parâmetro do procedimento de decisão, ligado ao erro tipo I.", "Quais são as duas hipóteses centrais de um teste?", "H0, hipótese nula, e H1, hipótese alternativa."),
  "est-07": lesson([
    "Regressão linear modela como uma variável resposta se relaciona, em média, a uma ou mais variáveis explicativas. O coeficiente deve ser interpretado com unidades, sinal e contexto, não como afirmação automática de causalidade.",
    "Mínimos quadrados escolhe parâmetros que reduzem a soma dos quadrados dos resíduos, que são diferenças entre valor observado e previsto. Máxima verossimilhança escolhe parâmetros que tornam os dados observados mais plausíveis dentro do modelo.",
    "ANOVA compara variabilidade entre e dentro de grupos. A análise de resíduos verifica se o modelo deixa padrões inadequados: resíduos com estrutura, variância instável ou valores extremos podem exigir cautela.",
  ], "Resíduo em regressão é a diferença entre valor observado e valor previsto?", ["Sim", "Não"], 0, "Certo. Resíduos são fundamentais para diagnosticar adequação do modelo.", "O que mínimos quadrados busca minimizar?", "A soma dos quadrados dos resíduos."),

  "rl-01": lesson([
    "Raciocínio lógico começa distinguindo informação de conclusão. Premissas são os dados oferecidos; conclusão é o que se pretende extrair. A pergunta decisiva é: a conclusão decorre necessariamente das premissas ou só parece plausível?",
    "Analogia compara relações; inferência produz consequência a partir de dados; dedução busca conclusão necessária quando a forma do argumento é válida. O conteúdo realista da frase não garante validade lógica.",
    "Use uma técnica simples: reescreva as premissas em linhas separadas, sublinhe palavras como todo, algum, nenhum, se e somente se, e só então teste a alternativa. Isso reduz o efeito de armadilhas verbais.",
  ], "Uma conclusão pode ser intuitivamente atraente e ainda não decorrer das premissas?", ["Sim", "Não"], 0, "Certo. Lógica avalia a consequência necessária, não apenas a plausibilidade.", "O que deve ser separado antes de avaliar um argumento?", "Premissas e conclusão."),
  "rl-02": lesson([
    "Proposição é frase declarativa que pode ser verdadeira ou falsa. Conectivos unem proposições: ‘e’ exige ambas verdadeiras; ‘ou’ inclusivo aceita pelo menos uma; ‘se... então’ só é falso quando antecedente é verdadeiro e consequente é falso.",
    "Equivalências permitem substituir uma estrutura sem mudar seu valor lógico. A condicional p→q equivale à contrapositiva ¬q→¬p. Para negar uma condicional, procure o único caso que a torna falsa: p e não q.",
    "Leis de De Morgan são atalhos: negar ‘p e q’ vira ‘não p ou não q’; negar ‘p ou q’ vira ‘não p e não q’. Faça as negações de dentro para fora.",
  ], "A negação de ‘se p, então q’ é ‘se não p, então não q’?", ["Sim", "Não"], 1, "Não. A negação correta é ‘p e não q’, o caso que falsifica a condicional.", "Como se nega ‘p ou q’?", "Não p e não q."),
  "rl-03": lesson([
    "Lógica de primeira ordem usa predicados e quantificadores. ‘Todo’ exige inclusão completa; ‘algum’ afirma existência de ao menos um elemento. Não transforme existência em universalidade: ‘alguns servidores estudam’ não informa nada sobre todos os servidores.",
    "Em conjuntos, união reúne elementos; interseção contém o que é comum; complemento mostra o que está fora de um conjunto dentro do universo definido. Diagramas de Venn ajudam a visualizar inclusão e exclusão.",
    "Ao receber um problema, defina o universo primeiro. Depois desenhe conjuntos e traduza cada frase sem inventar interseções. Muitas conclusões erradas surgem por pressupor que dois grupos que se cruzam em um desenho necessariamente se cruzam no enunciado.",
  ], "De ‘alguns investigadores estudam estatística’ é válido concluir que todos estudam estatística?", ["Sim", "Não"], 1, "Não. ‘Alguns’ apenas afirma existência de pelo menos um caso.", "O que a interseção entre conjuntos representa?", "Os elementos que pertencem aos dois conjuntos."),
  "rl-04": lesson([
    "Contagem não é decorar fórmula: é organizar escolhas. Se decisões ocorrem em etapas, use princípio multiplicativo; se são casos que não se sobrepõem, some. Antes, anote restrições como repetição permitida, ordem relevante e exclusões.",
    "Probabilidade é razão entre casos favoráveis e possíveis quando todos são equiprováveis. Em situações complexas, árvore, tabela ou enumeração parcial ajudam a impedir contagem duplicada.",
    "Problemas aritméticos, geométricos e matriciais exigem representação. Desenhe figura, escreva unidades e construa tabela quando houver relações múltiplas. A representação faz metade do trabalho lógico.",
  ], "Se há 3 escolhas para a primeira etapa e 4 escolhas independentes para a segunda, existem 7 resultados possíveis?", ["Sim", "Não"], 1, "Não. Como são etapas sucessivas independentes, multiplica-se: 3 × 4 = 12.", "Quando se usa princípio multiplicativo?", "Quando escolhas ocorrem em etapas sucessivas."),

  "inf-01": lesson([
    "Internet é a rede pública mundial de redes; intranet é uma rede restrita de uma organização, que pode usar as mesmas tecnologias da Internet com controles de acesso. Uma página interna em navegador continua sendo intranet se seu acesso é limitado.",
    "Navegadores exibem conteúdo web; correio eletrônico envia mensagens; mecanismos de busca indexam páginas; fóruns e redes sociais permitem interação. A ferramenta não determina segurança: comportamento, configuração e controle de acesso fazem diferença.",
    "Acesso remoto permite usar recurso a distância; transferência move arquivos; colaboração online compartilha comunicação e documentos. Em cada caso, pergunte qual é o canal, qual dado circula e quais controles de acesso são necessários.",
  ], "Uma intranet pode ser acessada por navegador web?", ["Sim", "Não"], 0, "Certo. Ela pode usar tecnologias web, mas permanece restrita à organização.", "Qual é a diferença básica entre Internet e intranet?", "Internet é pública e global; intranet é interna e com acesso controlado."),
  "inf-02": lesson([
    "Sistema operacional gerencia hardware, processos, arquivos, memória e dispositivos. Windows e Linux são sistemas operacionais; Word, LibreOffice Writer e planilhas são aplicativos executados sobre o sistema.",
    "Em editor de texto, foque em estilos, revisão, formatação e estrutura. Em planilhas, aprenda célula, referência, fórmula e função. Referência relativa muda quando a fórmula é copiada; referência absoluta usa cifrão para permanecer fixa.",
    "Apresentações organizam comunicação visual. A prova costuma cobrar recursos e funções, não estética: transição não é animação; salvar e exportar não são a mesma ação; formatos e permissões podem variar entre ferramentas.",
  ], "Uma referência absoluta em planilha normalmente usa o símbolo $ para fixar linha ou coluna?", ["Sim", "Não"], 0, "Certo. O cifrão impede que a parte marcada seja alterada ao copiar a fórmula.", "Qual a diferença entre sistema operacional e aplicativo?", "O sistema gerencia recursos; o aplicativo realiza tarefa para o usuário."),
  "inf-03": lesson([
    "Redes permitem comunicar dispositivos por meios físicos ou sem fio. Camada física cuida de sinais, cabos, conectores e transmissão; camada de enlace organiza entrega local, quadros e controle de acesso ao meio.",
    "Enlace ponto a ponto conecta dois nós diretamente; em acesso múltiplo, vários dispositivos compartilham meio. Códigos de transmissão representam informação como sinais; modo simplex transmite em uma direção, half-duplex alterna direções e full-duplex permite ambas simultaneamente.",
    "Ao estudar, não tente separar tecnologia em caixas isoladas. Imagine o caminho da mensagem: dado vira sinal, percorre meio, é organizado em quadro e entregue ao vizinho. Cada camada resolve um problema diferente.",
  ], "A camada física é responsável principalmente por sinais e meios de transmissão?", ["Sim", "Não"], 0, "Certo. A camada de enlace atua na comunicação local sobre essa base física.", "O que muda entre half-duplex e full-duplex?", "Half-duplex alterna sentidos; full-duplex permite os dois sentidos simultaneamente."),
  "inf-04": lesson([
    "LAN cobre área local, MAN área metropolitana e WAN longa distância. Topologia descreve a organização das conexões; interconexão usa dispositivos e protocolos para unir redes. Modelos OSI e TCP/IP dividem a comunicação em responsabilidades.",
    "IPv4 e IPv6 endereçam hosts. DNS traduz nomes em endereços IP; DHCP fornece parâmetros como IP, máscara e gateway; TCP prioriza entrega confiável e ordenada; UDP reduz sobrecarga sem realizar essas garantias; SNMP auxilia gerenciamento.",
    "Wi‑Fi segue padrões IEEE 802.11 e deve ser protegido por mecanismos como WPA/WPA2. VPN cria túnel protegido em rede pública; SSL/TLS protege canais de comunicação, como conexões web seguras.",
  ], "DNS distribui automaticamente endereço IP ao computador?", ["Sim", "Não"], 1, "Não. DNS resolve nomes; DHCP é protocolo associado à distribuição de parâmetros de rede.", "Qual protocolo prioriza confiabilidade e ordenação da entrega?", "TCP."),
  "inf-05": lesson([
    "Segurança da informação protege confidencialidade, integridade e disponibilidade. Uma ameaça explora vulnerabilidade; um controle reduz probabilidade ou impacto. Vírus, worms, trojans, ransomware, spyware, rootkits e botnets têm comportamentos distintos, embora todos representem riscos.",
    "Antivírus, firewall e anti-spyware são controles técnicos; senhas fortes, MFA e políticas complementam a defesa. Autenticação confirma identidade; autorização define permissões. Uma pessoa pode estar autenticada e ainda não ter autorização para determinado arquivo.",
    "Hash gera resumo não reversível para verificar integridade; assinatura digital associa integridade, autoria e não repúdio em contexto apropriado; criptografia busca confidencialidade. VPN e SSL/TLS protegem comunicação em trânsito.",
  ], "Hash SHA-256 permite recuperar o conteúdo original do arquivo?", ["Sim", "Não"], 1, "Não. Hash é função unidirecional usada, entre outras finalidades, para verificar integridade.", "Qual é a diferença entre autenticação e autorização?", "Autenticação prova identidade; autorização define o acesso permitido."),
  "inf-06": lesson([
    "A Teoria Geral de Sistemas ajuda a enxergar entradas, processamento, saídas, feedback e ambiente. Em um sistema de informação, frontend apresenta interação ao usuário; backend concentra regras, processamento e integração com dados.",
    "O ciclo de desenvolvimento parte de requisitos e especificação, segue por construção e testes, passa por homologação antes de entrar em produção e continua com suporte. Homologação é validação controlada; produção é uso efetivo.",
    "Em nuvem, IaaS entrega infraestrutura, PaaS entrega plataforma para desenvolvimento e SaaS entrega software pronto. Nuvem pública compartilha infraestrutura de provedor; privada é dedicada a uma organização ou contexto controlado.",
  ], "Homologação é o mesmo que ambiente de produção?", ["Sim", "Não"], 1, "Não. Homologação valida antes da entrada em produção.", "O que cada camada de nuvem resume?", "IaaS: infraestrutura; PaaS: plataforma; SaaS: software pronto."),
  "inf-07": lesson([
    "Dado é registro bruto; informação é dado contextualizado; conhecimento envolve interpretação aplicável. Metadado é dado sobre dado: por exemplo, autor, data de criação, formato ou descrição de um arquivo.",
    "Modelo entidade-relacionamento representa entidades, atributos e vínculos. Chave primária identifica registro de modo único; chave estrangeira referencia outro registro, permitindo relacionamentos. SQL é linguagem usada para consultar e manipular bancos relacionais.",
    "DataWarehouse consolida dados estruturados para análise; DataMart é recorte orientado a área; DataLake armazena dados em formatos diversos; DataMesh enfatiza gestão distribuída por domínios. Não são sinônimos, embora possam coexistir em arquitetura analítica.",
  ], "Chave estrangeira serve para relacionar registros de tabelas diferentes?", ["Sim", "Não"], 0, "Certo. Ela referencia uma chave de outra tabela, preservando o vínculo lógico.", "O que é metadado?", "Dado que descreve outro dado, como autor, formato ou data de criação."),
  "inf-08": lesson([
    "Mineração de dados encontra padrões; Business Intelligence organiza informação para decisão; big data lida com grande volume, velocidade, variedade e outros desafios. Machine learning cria modelos que aprendem padrões a partir de dados; IA é campo mais amplo.",
    "Python e R são linguagens muito usadas em análise e ciência de dados. Ferramentas generativas podem apoiar síntese ou código, mas exigem validação: elas podem errar, omitir contexto ou reproduzir viés. O uso responsável inclui checar fonte, sigilo e resultado.",
    "APIs permitem integração entre sistemas por interfaces definidas. ETL extrai, transforma e carrega dados; ELT extrai, carrega e transforma no destino. A ordem muda arquitetura, custo e responsabilidade pelo processamento.",
  ], "ETL transforma dados antes de carregá-los no destino?", ["Sim", "Não"], 0, "Certo. No ELT, a carga ocorre antes da transformação.", "Qual cuidado é essencial ao usar IA generativa em contexto profissional?", "Validar resultado, fonte, contexto e sigilo dos dados."),
  "inf-09": lesson([
    "XML e JSON são formatos de intercâmbio de dados. XML usa marcação explícita e estrutura hierárquica; JSON representa objetos e listas de maneira leve, comum em APIs. Ambos podem transportar dados e metadados.",
    "Biometria compara características para verificar ou identificar pessoas. Testes de acurácia observam erros de correspondência. Falso positivo é aceitar correspondência que não deveria existir; falso negativo é deixar de encontrar correspondência que deveria ser reconhecida.",
    "NIST produz referências e testes técnicos. Para não inverter siglas, pense: FPIR mede identificação de falso positivo; FNIR mede falha de identificação genuína. Mais importante que decorar a sigla é entender o erro real envolvido.",
  ], "Falso negativo ocorre quando um sistema deixa de reconhecer uma correspondência genuína?", ["Sim", "Não"], 0, "Certo. Já falso positivo aceita ou indica correspondência incorreta.", "Qual é a diferença intuitiva entre FPIR e FNIR?", "FPIR aceita/indica indevido; FNIR deixa de identificar o devido."),

  "ct-01": lesson([
    "Contabilidade registra e comunica efeitos patrimoniais de eventos. Patrimônio é conjunto de bens, direitos e obrigações; ativo reúne bens e direitos controlados, passivo reúne obrigações, e patrimônio líquido representa a situação residual.",
    "A equação fundamental é Ativo = Passivo + Patrimônio Líquido. Ela funciona como balanço: todo recurso controlado tem origem em obrigação perante terceiros ou em recursos próprios.",
    "Atos administrativos não alteram o patrimônio, como simples assinatura de proposta; fatos administrativos alteram. Fato permutativo muda composição sem alterar PL; modificativo altera PL; misto combina os dois efeitos.",
  ], "Compra de mercadoria à vista pode ser fato permutativo?", ["Sim", "Não"], 0, "Certo. Troca-se um ativo por outro, sem alteração necessária do patrimônio líquido.", "Qual é a equação fundamental do patrimônio?", "Ativo = Passivo + Patrimônio Líquido."),
  "ct-02": lesson([
    "Conta é instrumento de registro. Débito e crédito não significam, por si, perda e ganho: o efeito depende da natureza da conta. Ativos costumam aumentar por débito; passivos e patrimônio líquido, por crédito, dentro da lógica da escrituração por partidas dobradas.",
    "Plano de contas organiza as contas que a entidade utiliza, indicando função e funcionamento. Lançamento registra fato contábil com elementos essenciais; livros mantêm a escrituração ordenada e verificável.",
    "Regime de competência reconhece receitas e despesas no período em que são geradas, independentemente do pagamento; regime de caixa considera entrada e saída financeira. Em prova, marque a data do fato econômico e a do dinheiro.",
  ], "No regime de competência, uma despesa é reconhecida apenas quando paga?", ["Sim", "Não"], 1, "Não. Ela é reconhecida quando incorrida, ainda que o pagamento ocorra em outro período.", "Débito significa sempre prejuízo?", "Não. O efeito depende da natureza da conta."),
  "ct-03": lesson([
    "Operações rotineiras produzem registros específicos. Juros, descontos, tributos, aluguéis, câmbio, folha, compras e vendas exigem identificar fato econômico, contas afetadas e período de reconhecimento.",
    "Provisão reconhece obrigação ou perda estimada quando atendidos requisitos; depreciação distribui sistematicamente o valor depreciável de ativo ao longo da vida útil. Ambas afetam resultado, mas não significam necessariamente saída imediata de caixa.",
    "Balancete de verificação reúne saldos de contas e ajuda a checar igualdade formal entre débitos e créditos. Ele não prova que todos os lançamentos estão corretos: erros compensados ou de classificação podem permanecer.",
  ], "O balancete garante que não existe nenhum erro contábil?", ["Sim", "Não"], 1, "Não. Ele verifica equilíbrio formal, mas não detecta todo tipo de erro.", "O que a depreciação representa?", "A apropriação sistemática do valor depreciável ao longo da vida útil do ativo."),
  "ct-04": lesson([
    "Balanço Patrimonial é fotografia da posição financeira em uma data: ativos, passivos e patrimônio líquido. Demonstração do Resultado do Exercício é filme do desempenho do período: receitas, custos, despesas e resultado.",
    "A Lei nº 6.404/1976 organiza regras societárias e demonstrações; pronunciamentos do CPC detalham práticas contábeis; a NBC TSP Estrutura Conceitual orienta a contabilidade aplicada ao setor público dentro do escopo próprio.",
    "Quando uma questão trouxer conta ou evento, pergunte primeiro: ele aparece no estoque patrimonial em certa data ou influencia resultado ao longo do período? Essa pergunta separa BP e DRE com rapidez.",
  ], "A DRE apresenta apenas a posição patrimonial em uma data específica?", ["Sim", "Não"], 1, "Não. A DRE evidencia desempenho do período; o Balanço mostra posição patrimonial em uma data.", "Qual demonstração é a ‘foto’ do patrimônio?", "O Balanço Patrimonial."),
};
