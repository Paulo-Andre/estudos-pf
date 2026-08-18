/* Estudos PF — base editorial: Arquivo Operacional, com organização por evidências e missões objetivas. */
export type Block = "I" | "II" | "III";

export type StudyModule = {
  id: string;
  discipline: string;
  block: Block;
  title: string;
  code: string;
  summary: string;
  concepts: string[];
  attention: string[];
  example: string;
  source: string;
};

export type StudyQuestion = {
  id: string;
  block: Block;
  discipline: string;
  subject: string;
  difficulty: "Fácil" | "Médio" | "Difícil";
  statement: string;
  answer: boolean;
  explanation: string;
  tip: string;
  source: string;
};

export const blocks = [
  { id: "I" as Block, label: "Bloco I", ratio: 0.5, items: 60, description: "Conhecimentos básicos" },
  { id: "II" as Block, label: "Bloco II", ratio: 0.3, items: 36, description: "Conhecimentos básicos" },
  { id: "III" as Block, label: "Bloco III", ratio: 0.2, items: 24, description: "Conhecimentos específicos" },
];

export const studyModules: StudyModule[] = [
  {
    id: "portugues-texto",
    discipline: "Língua Portuguesa",
    block: "I",
    title: "Leitura, coesão e reescrita",
    code: "LP-01",
    summary: "Domine o sentido global, os conectores e as alterações que preservam a correção e a ideia do texto.",
    concepts: ["Compreensão e interpretação", "Tipos e gêneros textuais", "Coesão e referenciação", "Reescrita e sentido"],
    attention: ["Uma reescrita pode manter a gramática e alterar o sentido.", "Conectivos exprimem relações lógicas específicas; não os troque por sinônimos aparentes."],
    example: "Em ‘Embora chovesse, a equipe saiu’, embora estabelece concessão. Trocar por ‘porque’ mudaria a relação de ideias.",
    source: "Edital PF 2025, Anexo II — Língua Portuguesa.",
  },
  {
    id: "portugues-morfossintaxe",
    discipline: "Língua Portuguesa",
    block: "I",
    title: "Morfossintaxe e redação oficial",
    code: "LP-02",
    summary: "Aplique concordância, regência, crase, pontuação e os princípios de clareza da correspondência oficial.",
    concepts: ["Classes de palavras", "Coordenação e subordinação", "Concordância e regência", "Crase e colocação pronominal"],
    attention: ["A vírgula não pode separar sujeito e verbo.", "Na redação oficial, impessoalidade e clareza prevalecem sobre ornamentos."],
    example: "Em ‘Faz dois anos que estudo’, o verbo fazer indicando tempo é impessoal e fica no singular.",
    source: "Edital PF 2025, Anexo II; Manual de Redação da Presidência da República.",
  },
  {
    id: "admin-organizacao",
    discipline: "Direito Administrativo",
    block: "I",
    title: "Organização, atos e agentes públicos",
    code: "DA-01",
    summary: "Entenda a estrutura da Administração e como os atos administrativos produzem efeitos jurídicos.",
    concepts: ["Administração direta e indireta", "Centralização e descentralização", "Ato administrativo", "Agentes públicos"],
    attention: ["Descentralização transfere a execução para outra pessoa jurídica; desconcentração reparte atribuições dentro da mesma pessoa.", "Atributos do ato não são requisitos do ato."],
    example: "Uma autarquia integra a administração indireta e possui personalidade jurídica própria de direito público.",
    source: "Edital PF 2025, Anexo II — Direito Administrativo.",
  },
  {
    id: "admin-poderes",
    discipline: "Direito Administrativo",
    block: "I",
    title: "Poderes, licitações e responsabilidade",
    code: "DA-02",
    summary: "Diferencie poderes administrativos, contratação pública e responsabilidade civil estatal.",
    concepts: ["Poder hierárquico e disciplinar", "Poder de polícia", "Lei nº 14.133/2021", "Responsabilidade objetiva do Estado"],
    attention: ["Poder de polícia não se confunde com polícia judiciária.", "A responsabilidade do Estado por atos comissivos, em regra, segue a teoria do risco administrativo."],
    example: "A dispensa e a inexigibilidade são formas de contratação direta, mas possuem pressupostos distintos.",
    source: "Edital PF 2025, Anexo II; Lei nº 14.133/2021.",
  },
  {
    id: "constitucional-direitos",
    discipline: "Direito Constitucional",
    block: "I",
    title: "Direitos, garantias e cidadania",
    code: "DC-01",
    summary: "Revise direitos individuais, sociais, nacionalidade e direitos políticos a partir do texto constitucional.",
    concepts: ["Art. 5º da Constituição", "Direitos sociais", "Nacionalidade", "Direitos políticos"],
    attention: ["Direitos fundamentais não são absolutos.", "Garantias são instrumentos de proteção dos direitos."],
    example: "O habeas corpus protege a liberdade de locomoção diante de ilegalidade ou abuso de poder.",
    source: "Edital PF 2025, Anexo II; Constituição Federal de 1988.",
  },
  {
    id: "constitucional-seguranca",
    discipline: "Direito Constitucional",
    block: "I",
    title: "Segurança pública e ordem social",
    code: "DC-02",
    summary: "Conecte o art. 144 à proteção das instituições democráticas e aos temas da ordem social.",
    concepts: ["Segurança pública", "Poder Executivo", "Seguridade social", "Meio ambiente e família"],
    attention: ["O art. 144 define a segurança pública como dever do Estado, direito e responsabilidade de todos.", "Conheça a organização constitucional das polícias."],
    example: "A Polícia Federal é órgão permanente, organizado e mantido pela União.",
    source: "Edital PF 2025, Anexo II; Constituição Federal de 1988.",
  },
  {
    id: "penal-teoria",
    discipline: "Direito Penal e Processual Penal",
    block: "I",
    title: "Lei penal e teoria do crime",
    code: "DP-01",
    summary: "Estude aplicação da lei penal, fato típico, ilicitude, tentativa e os crimes indicados no edital.",
    concepts: ["Tempo e lugar do crime", "Tipicidade", "Ilicitude", "Crime consumado e tentado"],
    attention: ["A tentativa é punível, salvo disposição em contrário.", "Causas de exclusão da ilicitude não eliminam automaticamente a análise do excesso punível."],
    example: "O Código Penal adota, como regra, a teoria da atividade para o tempo do crime.",
    source: "Edital PF 2025, Anexo II — Direito Penal.",
  },
  {
    id: "processo-inquerito",
    discipline: "Direito Penal e Processual Penal",
    block: "I",
    title: "Inquérito, provas e prisão em flagrante",
    code: "DPP-01",
    summary: "Organize o fluxo investigativo: notícia-crime, instauração, indiciamento, prova e restrição de liberdade.",
    concepts: ["Inquérito policial", "Indiciamento", "Meios de prova", "Busca e apreensão"],
    attention: ["O inquérito é inquisitivo e, em regra, dispensável para a ação penal.", "Provas ilícitas são inadmissíveis, observadas as regras de derivação."],
    example: "A preservação do local do crime protege vestígios e contribui para a cadeia de custódia.",
    source: "Edital PF 2025, Anexo II — Direito Processual Penal.",
  },
  {
    id: "dh-sistemas",
    discipline: "Direitos Humanos",
    block: "I",
    title: "Sistemas de proteção e uso da força",
    code: "DH-01",
    summary: "Relacione Constituição, tratados e princípios internacionais ao exercício responsável da atividade policial.",
    concepts: ["Sistema internacional", "Convenções contra discriminação e tortura", "Regras de Mandela", "Uso diferenciado da força"],
    attention: ["Direitos humanos vinculam a atuação estatal e a proteção de todas as pessoas.", "O uso de instrumentos de menor potencial ofensivo exige observância da legalidade e da necessidade."],
    example: "As Regras de Mandela estabelecem parâmetros mínimos para o tratamento de pessoas presas.",
    source: "Edital PF 2025, Anexo II; Lei nº 13.060/2014.",
  },
  {
    id: "especial-operacional",
    discipline: "Legislação Especial",
    block: "I",
    title: "Legislação penal especial",
    code: "LE-01",
    summary: "Estruture a leitura literal das leis especiais cobradas e identifique seus pontos penais e processuais.",
    concepts: ["Drogas", "Tortura", "ECA", "Desarmamento", "Crimes ambientais"],
    attention: ["Priorize os tipos penais, causas de aumento, procedimentos e competências previstos em lei.", "Atualize sempre o texto legal antes de fazer revisões."],
    example: "A Lei de Drogas trata de condutas, procedimentos e medidas distintas para usuário e traficante.",
    source: "Edital PF 2025, Anexo II — Legislação Especial.",
  },
  {
    id: "especial-identificacao",
    discipline: "Legislação Especial",
    block: "I",
    title: "Migração, identificação e cibercrime",
    code: "LE-02",
    summary: "Consolide as normas de migração, identificação civil e os instrumentos normativos ligados ao crime cibernético.",
    concepts: ["Lei de Migração", "CPF como número de identificação", "Carteira de Identidade", "Convenção sobre Crime Cibernético"],
    attention: ["Não confunda identificação civil com identificação criminal.", "Em legislação recente, revise literalmente os conceitos e o âmbito de aplicação."],
    example: "A Lei nº 14.534/2023 determina a adoção do CPF como número suficiente para identificação do cidadão.",
    source: "Edital PF 2025, Anexo II — Legislação Especial.",
  },
  {
    id: "informatica-redes",
    discipline: "Informática",
    block: "II",
    title: "Redes, protocolos e segurança",
    code: "INF-01",
    summary: "Mapeie redes, protocolos, camadas, ameaças e mecanismos de proteção digital.",
    concepts: ["TCP/IP e OSI", "IPv4 e IPv6", "DNS, DHCP e TLS", "Malwares e autenticação"],
    attention: ["DNS resolve nomes; DHCP distribui configurações de rede.", "Hash não é criptografia reversível e assinatura digital não é sinônimo de certificado."],
    example: "TLS protege a comunicação em trânsito, enquanto VPN cria um túnel seguro sobre rede pública.",
    source: "Edital PF 2025, Anexo II — Informática.",
  },
  {
    id: "informatica-dados",
    discipline: "Informática",
    block: "II",
    title: "Dados, sistemas e inteligência artificial",
    code: "INF-02",
    summary: "Entenda dados estruturados, modelagem, SQL, BI, IA, nuvem e integração entre sistemas.",
    concepts: ["Banco relacional", "SQL e modelagem ER", "ETL/ELT", "DataLake e DataWarehouse"],
    attention: ["DataLake armazena dados em formatos variados; DataWarehouse é voltado à análise estruturada.", "API define uma interface de comunicação entre aplicações."],
    example: "ETL extrai, transforma e carrega dados; em ELT a transformação pode ocorrer após a carga no destino.",
    source: "Edital PF 2025, Anexo II — Informática.",
  },
  {
    id: "estatistica-descritiva",
    discipline: "Estatística e Raciocínio Lógico",
    block: "III",
    title: "Descritiva, probabilidade e lógica",
    code: "EST-01",
    summary: "Descreva dados, calcule probabilidades e resolva estruturas proposicionais, conjuntos e contagem.",
    concepts: ["Média e dispersão", "Probabilidade condicional", "Regra de Bayes", "Proposições e equivalências"],
    attention: ["Independência e exclusão mútua são conceitos diferentes.", "Para negar uma proposição composta, aplique corretamente as Leis de De Morgan."],
    example: "Se A e B são independentes, P(A ∩ B) = P(A) × P(B).",
    source: "Edital PF 2025, Anexo II — Estatística e Raciocínio Lógico.",
  },
  {
    id: "estatistica-inferencia",
    discipline: "Estatística e Raciocínio Lógico",
    block: "III",
    title: "Inferência, regressão e amostragem",
    code: "EST-02",
    summary: "Aprenda a estimar, testar hipóteses, interpretar regressão linear e selecionar amostras.",
    concepts: ["Intervalo de confiança", "Teste de hipóteses", "Regressão linear", "Amostragem"],
    attention: ["Nível de significância não é a probabilidade de a hipótese nula ser verdadeira.", "Correlação não implica causalidade."],
    example: "Em amostragem estratificada, a população é dividida em estratos antes da seleção da amostra.",
    source: "Edital PF 2025, Anexo II — Estatística.",
  },
];

const original = "Elaboração autoral alinhada ao Edital PF 2025 (Cebraspe).";

export const questionBank: StudyQuestion[] = [
  { id: "q01", block: "I", discipline: "Língua Portuguesa", subject: "Coesão", difficulty: "Médio", statement: "A substituição de um conectivo concessivo por outro causal preserva necessariamente a relação lógica original entre duas orações.", answer: false, explanation: "Concessão e causa exprimem relações semânticas diferentes; a troca pode alterar o sentido do enunciado.", tip: "Antes de marcar, nomeie a relação: causa, consequência, oposição, condição ou concessão.", source: original },
  { id: "q02", block: "I", discipline: "Língua Portuguesa", subject: "Concordância", difficulty: "Fácil", statement: "Na oração ‘Faz três anos que a investigação começou’, a forma singular do verbo fazer está correta.", answer: true, explanation: "Quando indica tempo decorrido, o verbo fazer é impessoal e permanece no singular.", tip: "Tempo decorrido com fazer: singular.", source: original },
  { id: "q03", block: "I", discipline: "Língua Portuguesa", subject: "Pontuação", difficulty: "Médio", statement: "A vírgula pode separar o sujeito de seu verbo quando o sujeito for extenso.", answer: false, explanation: "A extensão do sujeito não autoriza a separação por vírgula entre sujeito e verbo.", tip: "Procure primeiro a espinha dorsal: sujeito + verbo + complemento.", source: original },
  { id: "q04", block: "I", discipline: "Língua Portuguesa", subject: "Crase", difficulty: "Médio", statement: "Em ‘a equipe dirigiu-se à unidade responsável’, o emprego do acento grave é justificado pela fusão da preposição a com o artigo a.", answer: true, explanation: "O verbo dirigir-se exige a preposição a e ‘unidade’ admite artigo feminino.", tip: "Teste a troca por termo masculino: ‘ao setor responsável’.", source: original },
  { id: "q05", block: "I", discipline: "Língua Portuguesa", subject: "Redação oficial", difficulty: "Fácil", statement: "Clareza, concisão e impessoalidade são atributos esperados na redação oficial.", answer: true, explanation: "A comunicação oficial visa compreensão objetiva e tratamento impessoal do interesse público.", tip: "Na redação oficial, informe o essencial com precisão.", source: original },
  { id: "q06", block: "I", discipline: "Direito Administrativo", subject: "Organização administrativa", difficulty: "Médio", statement: "Autarquias integram a administração indireta e possuem personalidade jurídica própria.", answer: true, explanation: "Autarquias são pessoas jurídicas de direito público criadas por lei para desempenhar atividades típicas de Estado.", tip: "Direta: entes políticos e órgãos; indireta: entidades com personalidade própria.", source: original },
  { id: "q07", block: "I", discipline: "Direito Administrativo", subject: "Organização administrativa", difficulty: "Médio", statement: "A desconcentração administrativa transfere a titularidade de um serviço a uma pessoa jurídica distinta.", answer: false, explanation: "A desconcentração reparte competências dentro da mesma pessoa jurídica; a descentralização envolve outra pessoa.", tip: "Desconcentração = dentro. Descentralização = outra pessoa.", source: original },
  { id: "q08", block: "I", discipline: "Direito Administrativo", subject: "Poderes administrativos", difficulty: "Médio", statement: "O poder disciplinar permite à Administração aplicar sanções a servidores e a particulares sujeitos a vínculo específico com ela.", answer: true, explanation: "O poder disciplinar alcança quem mantém relação especial de sujeição com a Administração.", tip: "Poder disciplinar exige vínculo; poder de polícia incide sobre particulares em geral.", source: original },
  { id: "q09", block: "I", discipline: "Direito Administrativo", subject: "Licitações", difficulty: "Médio", statement: "Dispensa e inexigibilidade são modalidades de licitação previstas na Lei nº 14.133/2021.", answer: false, explanation: "São hipóteses de contratação direta, não modalidades de licitação.", tip: "Modalidade e contratação direta são categorias diferentes.", source: original },
  { id: "q10", block: "I", discipline: "Direito Administrativo", subject: "Responsabilidade civil", difficulty: "Médio", statement: "Em regra, a responsabilidade civil do Estado por ato comissivo de seu agente é objetiva, baseada no risco administrativo.", answer: true, explanation: "A Constituição prevê responsabilidade objetiva das pessoas jurídicas de direito público e das privadas prestadoras de serviço público.", tip: "Memorize: ato comissivo estatal, regra objetiva; avalie excludentes no caso concreto.", source: original },
  { id: "q11", block: "I", discipline: "Direito Constitucional", subject: "Direitos fundamentais", difficulty: "Fácil", statement: "Os direitos e garantias fundamentais previstos na Constituição possuem caráter absoluto.", answer: false, explanation: "Direitos fundamentais podem sofrer limitações compatíveis com a Constituição e com a proteção de outros direitos.", tip: "Desconfie de termos absolutos como ‘sempre’, ‘nunca’ e ‘absoluto’.", source: original },
  { id: "q12", block: "I", discipline: "Direito Constitucional", subject: "Garantias constitucionais", difficulty: "Médio", statement: "O habeas corpus é cabível para proteger a liberdade de locomoção diante de ilegalidade ou abuso de poder.", answer: true, explanation: "Essa é a finalidade constitucional do habeas corpus.", tip: "HC protege locomoção; HD protege informações pessoais.", source: original },
  { id: "q13", block: "I", discipline: "Direito Constitucional", subject: "Segurança pública", difficulty: "Fácil", statement: "Segundo a Constituição, a segurança pública é dever do Estado, direito e responsabilidade de todos.", answer: true, explanation: "A redação corresponde ao caput do art. 144 da Constituição Federal.", tip: "Leia o art. 144 literalmente.", source: original },
  { id: "q14", block: "I", discipline: "Direito Constitucional", subject: "Segurança pública", difficulty: "Médio", statement: "A Polícia Federal é órgão estadual integrante do Poder Judiciário.", answer: false, explanation: "A Polícia Federal é órgão permanente organizado e mantido pela União, integrante da segurança pública.", tip: "PF: União; não confunda órgãos policiais com Poder Judiciário.", source: original },
  { id: "q15", block: "I", discipline: "Direito Constitucional", subject: "Direitos políticos", difficulty: "Médio", statement: "A Constituição inclui os direitos políticos entre os temas expressamente cobrados no edital de Direito Constitucional.", answer: true, explanation: "O edital menciona cidadania e direitos políticos no conteúdo de direitos e garantias fundamentais.", tip: "Faça leitura cruzada: edital + texto constitucional.", source: original },
  { id: "q16", block: "I", discipline: "Direito Penal e Processual Penal", subject: "Aplicação da lei penal", difficulty: "Médio", statement: "O Código Penal brasileiro adota, como regra, a teoria da atividade para definir o tempo do crime.", answer: true, explanation: "Considera-se praticado o crime no momento da ação ou omissão, ainda que outro seja o momento do resultado.", tip: "Tempo = atividade; lugar = ubiquidade.", source: original },
  { id: "q17", block: "I", discipline: "Direito Penal e Processual Penal", subject: "Tentativa", difficulty: "Médio", statement: "A tentativa ocorre quando o agente inicia a execução, mas o crime não se consuma por circunstâncias alheias à sua vontade.", answer: true, explanation: "Esse é o conceito legal de tentativa.", tip: "Início de execução + não consumação por circunstância alheia.", source: original },
  { id: "q18", block: "I", discipline: "Direito Penal e Processual Penal", subject: "Ilicitude", difficulty: "Médio", statement: "O reconhecimento de uma causa de exclusão da ilicitude torna impossível a análise de eventual excesso punível.", answer: false, explanation: "Mesmo diante de causa justificante, o excesso pode ser punível.", tip: "Nos excludentes, pergunte: houve necessidade e moderação?", source: original },
  { id: "q19", block: "I", discipline: "Direito Penal e Processual Penal", subject: "Inquérito policial", difficulty: "Médio", statement: "O inquérito policial, em regra, é inquisitivo e pode ser dispensado se houver elementos suficientes para a ação penal.", answer: true, explanation: "O inquérito é procedimento investigativo e não é condição indispensável quando existem outros elementos informativos adequados.", tip: "Não confunda investigação com processo judicial.", source: original },
  { id: "q20", block: "I", discipline: "Direito Penal e Processual Penal", subject: "Provas", difficulty: "Médio", statement: "A preservação do local de crime é irrelevante para a confiabilidade da prova pericial.", answer: false, explanation: "Preservar o local é fundamental para a conservação de vestígios e a confiabilidade da perícia.", tip: "Local preservado protege vestígio, cadeia de custódia e prova.", source: original },
  { id: "q21", block: "I", discipline: "Direito Penal e Processual Penal", subject: "Prisão em flagrante", difficulty: "Fácil", statement: "A prisão em flagrante integra expressamente o conteúdo de processo penal do edital para Agente.", answer: true, explanation: "O edital inclui a restrição de liberdade, com foco em prisão em flagrante.", tip: "Monte uma lista de tópicos literais do edital para revisões rápidas.", source: original },
  { id: "q22", block: "I", discipline: "Direitos Humanos", subject: "Regras de Mandela", difficulty: "Médio", statement: "As Regras de Mandela consistem em parâmetros mínimos das Nações Unidas para o tratamento de pessoas presas.", answer: true, explanation: "O edital cita expressamente as regras mínimas da ONU, conhecidas como Regras de Mandela.", tip: "Associe instrumento, organização e objeto de proteção.", source: original },
  { id: "q23", block: "I", discipline: "Direitos Humanos", subject: "Uso da força", difficulty: "Médio", statement: "A Lei nº 13.060/2014 trata do uso de instrumentos de menor potencial ofensivo pelos agentes de segurança pública.", answer: true, explanation: "A lei disciplina esse uso e é citada expressamente no edital.", tip: "Em normas de uso da força, foque princípios, requisitos e responsabilidades.", source: original },
  { id: "q24", block: "I", discipline: "Direitos Humanos", subject: "Sistema internacional", difficulty: "Difícil", statement: "A Convenção contra a Tortura é incompatível com o estudo de direitos humanos voltado à atividade policial.", answer: false, explanation: "A convenção é conteúdo expresso do edital e é diretamente relevante para limites da atuação estatal.", tip: "Direitos humanos são parâmetro de legalidade da ação do Estado.", source: original },
  { id: "q25", block: "I", discipline: "Legislação Especial", subject: "Drogas", difficulty: "Fácil", statement: "A Lei nº 11.343/2006 integra a lista de legislação especial cobrada para Agente da Polícia Federal.", answer: true, explanation: "A Lei de Drogas é mencionada no edital, com aspectos penais e processuais penais.", tip: "Leia a lei seca após compreender seu mapa de tópicos.", source: original },
  { id: "q26", block: "I", discipline: "Legislação Especial", subject: "Migração", difficulty: "Fácil", statement: "A Lei nº 13.445/2017 é conhecida como Lei de Migração.", answer: true, explanation: "A Lei de Migração aparece expressamente na legislação especial do edital.", tip: "Associe número, nome e finalidade das leis mais recentes.", source: original },
  { id: "q27", block: "I", discipline: "Legislação Especial", subject: "Identificação", difficulty: "Médio", statement: "A Lei nº 14.534/2023 adotou o CPF como número único de identificação do cidadão.", answer: true, explanation: "A norma integra o conteúdo de identificação civil previsto no edital.", tip: "Faça flashcards com leis de identificação: número, nome, objetivo.", source: original },
  { id: "q28", block: "I", discipline: "Legislação Especial", subject: "Desarmamento", difficulty: "Fácil", statement: "A Lei nº 10.826/2003 é o Estatuto do Desarmamento.", answer: true, explanation: "O Estatuto do Desarmamento está entre as leis especiais elencadas.", tip: "Não basta decorar o nome; revise a parte penal e processual indicada.", source: original },
  { id: "q29", block: "I", discipline: "Legislação Especial", subject: "Crime cibernético", difficulty: "Médio", statement: "O Decreto nº 11.491/2023 é citado no edital em relação à Convenção sobre o Crime Cibernético.", answer: true, explanation: "O edital inclui expressamente esse decreto na lista de legislação especial.", tip: "Legislação especial recente costuma render itens de literalidade.", source: original },
  { id: "q30", block: "I", discipline: "Legislação Especial", subject: "Crimes ambientais", difficulty: "Fácil", statement: "A Lei nº 9.605/1998 trata de crimes ambientais e integra o conteúdo do edital.", answer: true, explanation: "A Lei de Crimes Ambientais é um dos diplomas explicitamente cobrados.", tip: "Destaque os tipos e sanções no texto legal atualizado.", source: original },
  { id: "q31", block: "II", discipline: "Informática", subject: "Protocolos", difficulty: "Médio", statement: "O DNS é utilizado para resolver nomes de domínio em endereços IP.", answer: true, explanation: "O DNS associa nomes legíveis a informações de endereçamento de rede.", tip: "DNS = nomes; DHCP = configuração automática; IP = endereçamento.", source: original },
  { id: "q32", block: "II", discipline: "Informática", subject: "Protocolos", difficulty: "Médio", statement: "O protocolo TCP é orientado à conexão, enquanto o UDP não estabelece conexão antes do envio de datagramas.", answer: true, explanation: "A afirmação descreve uma diferença essencial entre TCP e UDP.", tip: "TCP prioriza confiabilidade; UDP privilegia simplicidade e baixa sobrecarga.", source: original },
  { id: "q33", block: "II", discipline: "Informática", subject: "IPv6", difficulty: "Médio", statement: "IPv6 utiliza endereços de 32 bits, assim como o IPv4.", answer: false, explanation: "IPv4 usa 32 bits; IPv6 usa 128 bits.", tip: "Fixe a dupla: IPv4 = 32; IPv6 = 128.", source: original },
  { id: "q34", block: "II", discipline: "Informática", subject: "Segurança", difficulty: "Médio", statement: "Ransomware é um tipo de software malicioso que pode bloquear ou criptografar dados para exigir pagamento.", answer: true, explanation: "Esse comportamento caracteriza ataques de ransomware.", tip: "Associe malware à finalidade: worm se propaga, spyware espiona, ransomware extorque.", source: original },
  { id: "q35", block: "II", discipline: "Informática", subject: "Criptografia", difficulty: "Médio", statement: "Uma função hash criptográfica é projetada para permitir a recuperação simples e direta do conteúdo original.", answer: false, explanation: "Hash é função unidirecional: não se destina a recuperar o dado de entrada.", tip: "Hash verifica integridade; criptografia protege confidencialidade.", source: original },
  { id: "q36", block: "II", discipline: "Informática", subject: "Autenticação", difficulty: "Fácil", statement: "A autenticação multifator combina fatores de categorias diferentes para reforçar a verificação de identidade.", answer: true, explanation: "Por exemplo, senha, token e biometria pertencem a categorias distintas de fatores.", tip: "MFA não é repetir duas senhas: combine conhecimento, posse ou característica.", source: original },
  { id: "q37", block: "II", discipline: "Informática", subject: "Nuvem", difficulty: "Médio", statement: "IaaS, PaaS e SaaS são modelos de serviço associados à computação em nuvem.", answer: true, explanation: "São modelos cobrados expressamente no conteúdo de computação em nuvem.", tip: "IaaS: infraestrutura; PaaS: plataforma; SaaS: software pronto.", source: original },
  { id: "q38", block: "II", discipline: "Informática", subject: "Banco de dados", difficulty: "Médio", statement: "Em um banco de dados relacional, chaves podem ser utilizadas para estabelecer relacionamentos entre tabelas.", answer: true, explanation: "Chaves primárias e estrangeiras apoiam a identificação e o relacionamento de registros.", tip: "Desenhe entidades, atributos e relacionamentos antes de estudar SQL.", source: original },
  { id: "q39", block: "II", discipline: "Informática", subject: "SQL", difficulty: "Fácil", statement: "SQL é uma linguagem utilizada, entre outras finalidades, para consultar e manipular dados em bancos relacionais.", answer: true, explanation: "SQL é linguagem central para operações em bancos de dados relacionais.", tip: "Memorize comandos básicos: SELECT, INSERT, UPDATE e DELETE.", source: original },
  { id: "q40", block: "II", discipline: "Informática", subject: "Dados", difficulty: "Médio", statement: "Um DataLake é limitado exclusivamente ao armazenamento de dados tabulares previamente estruturados.", answer: false, explanation: "DataLakes podem armazenar dados estruturados, semiestruturados e não estruturados.", tip: "DataLake é flexível; DataWarehouse costuma ser estruturado para análise.", source: original },
  { id: "q41", block: "II", discipline: "Informática", subject: "Integração", difficulty: "Médio", statement: "Uma API pode permitir que aplicações diferentes se comuniquem por uma interface definida.", answer: true, explanation: "API é uma interface de programação que expõe formas padronizadas de interação entre sistemas.", tip: "API é contrato de comunicação, não necessariamente um banco de dados.", source: original },
  { id: "q42", block: "II", discipline: "Informática", subject: "ETL", difficulty: "Médio", statement: "No fluxo ETL, as siglas correspondem a extrair, transformar e carregar dados.", answer: true, explanation: "ETL descreve uma sequência clássica de integração e preparação de dados.", tip: "ETL: transformação antes da carga; ELT: carga antes da transformação.", source: original },
  { id: "q43", block: "II", discipline: "Informática", subject: "Sistemas operacionais", difficulty: "Fácil", statement: "O edital de Informática inclui noções dos ambientes Linux e Windows.", answer: true, explanation: "Ambos são expressamente previstos no conteúdo programático.", tip: "Estude conceitos, comandos e diferenças básicas de uso e permissões.", source: original },
  { id: "q44", block: "II", discipline: "Informática", subject: "Redes sem fio", difficulty: "Médio", statement: "WPA e WPA2 são padrões associados à segurança de redes sem fio.", answer: true, explanation: "O edital menciona IEEE 802.11, WPA/WPA2 e boas práticas de segurança wireless.", tip: "Associe 802.11 a Wi-Fi e WPA/WPA2 à proteção do acesso.", source: original },
  { id: "q45", block: "II", discipline: "Informática", subject: "Inteligência artificial", difficulty: "Fácil", statement: "O edital contempla noções de inteligência artificial e aprendizado de máquina.", answer: true, explanation: "IA e machine learning aparecem tanto no bloco de sistemas e dados como em ferramentas de mercado.", tip: "Comece por conceitos e aplicações; depois avance para limitações e dados de treinamento.", source: original },
  { id: "q46", block: "II", discipline: "Informática", subject: "Biometria", difficulty: "Difícil", statement: "FPIR e FNIR estão relacionados a medidas de erros em sistemas biométricos.", answer: true, explanation: "O edital menciona especificamente falso positivo e falso negativo, FPIR e FNIR, em testes de acurácia.", tip: "Acurácia biométrica exige distinguir erros de falsa identificação e falsa não identificação.", source: original },
  { id: "q47", block: "II", discipline: "Informática", subject: "VPN e TLS", difficulty: "Médio", statement: "VPN e SSL/TLS são citados como protocolos ou mecanismos de segurança de redes no edital.", answer: true, explanation: "Ambos aparecem na seção de protocolos e mecanismos de segurança.", tip: "VPN cria túnel; TLS protege comunicações de aplicação em trânsito.", source: original },
  { id: "q48", block: "II", discipline: "Informática", subject: "Modelagem", difficulty: "Médio", statement: "O modelo entidade-relacionamento é uma técnica associada à modelagem conceitual de bancos de dados.", answer: true, explanation: "A modelagem ER representa entidades, atributos e relacionamentos em um nível conceitual.", tip: "Em diagramas ER, identifique primeiro as entidades e as chaves.", source: original },
  { id: "q49", block: "III", discipline: "Estatística e Raciocínio Lógico", subject: "Probabilidade", difficulty: "Médio", statement: "Se dois eventos A e B são independentes, então P(A ∩ B) é igual a P(A) multiplicada por P(B).", answer: true, explanation: "Essa é a regra de multiplicação para eventos independentes.", tip: "Independência permite multiplicar probabilidades; exclusão mútua trata de interseção nula.", source: original },
  { id: "q50", block: "III", discipline: "Estatística e Raciocínio Lógico", subject: "Probabilidade", difficulty: "Médio", statement: "Dois eventos mutuamente exclusivos e não nulos são necessariamente independentes.", answer: false, explanation: "Se A e B são mutuamente exclusivos e têm probabilidade positiva, P(A ∩ B)=0, diferente de P(A)P(B).", tip: "Para eventos não nulos, exclusão mútua impede independência.", source: original },
  { id: "q51", block: "III", discipline: "Estatística e Raciocínio Lógico", subject: "Estatística descritiva", difficulty: "Fácil", statement: "Medidas de dispersão são usadas para avaliar o quanto os dados variam em torno de uma medida de posição.", answer: true, explanation: "Amplitude, variância e desvio padrão são exemplos de medidas de dispersão.", tip: "Posição descreve centro; dispersão descreve espalhamento.", source: original },
  { id: "q52", block: "III", discipline: "Estatística e Raciocínio Lógico", subject: "Inferência", difficulty: "Médio", statement: "O nível de significância de um teste de hipótese é a probabilidade de a hipótese nula ser verdadeira.", answer: false, explanation: "O nível de significância representa um critério de controle para erro tipo I, não uma probabilidade de verdade da hipótese nula.", tip: "Evite interpretar p-valor ou alfa como probabilidade direta de H0 ser verdadeira.", source: original },
  { id: "q53", block: "III", discipline: "Estatística e Raciocínio Lógico", subject: "Amostragem", difficulty: "Médio", statement: "Na amostragem estratificada, a população é separada em grupos antes da seleção de elementos da amostra.", answer: true, explanation: "Os estratos permitem representar subgrupos relevantes da população.", tip: "Estratos homogêneos internamente podem aumentar a precisão da estimativa.", source: original },
  { id: "q54", block: "III", discipline: "Estatística e Raciocínio Lógico", subject: "Regressão", difficulty: "Médio", statement: "A existência de correlação linear entre duas variáveis prova, por si só, uma relação causal entre elas.", answer: false, explanation: "Correlação mede associação, mas não demonstra causalidade sem investigação adicional.", tip: "Correlação não é causalidade: procure variáveis de confusão e desenho de estudo.", source: original },
  { id: "q55", block: "III", discipline: "Estatística e Raciocínio Lógico", subject: "Lógica proposicional", difficulty: "Médio", statement: "A negação de ‘p e q’ é logicamente equivalente a ‘não p ou não q’.", answer: true, explanation: "Trata-se de uma aplicação das Leis de De Morgan.", tip: "Negue conectivos: e vira ou; ou vira e.", source: original },
  { id: "q56", block: "III", discipline: "Estatística e Raciocínio Lógico", subject: "Lógica proposicional", difficulty: "Médio", statement: "A proposição condicional ‘se p, então q’ é falsa exatamente quando p é verdadeira e q é falsa.", answer: true, explanation: "Essa é a única linha falsa da tabela-verdade da implicação material.", tip: "Condicional só falha em V → F.", source: original },
  { id: "q57", block: "III", discipline: "Estatística e Raciocínio Lógico", subject: "Conjuntos", difficulty: "Fácil", statement: "A interseção entre dois conjuntos reúne os elementos que pertencem simultaneamente aos dois conjuntos.", answer: true, explanation: "A interseção contém apenas os elementos comuns.", tip: "União junta tudo; interseção preserva apenas o comum.", source: original },
  { id: "q58", block: "III", discipline: "Estatística e Raciocínio Lógico", subject: "Contagem", difficulty: "Médio", statement: "O princípio multiplicativo é útil quando uma tarefa é realizada em etapas sucessivas com quantidades de escolhas conhecidas.", answer: true, explanation: "Multiplicam-se as possibilidades de cada etapa quando as escolhas se combinam.", tip: "Pergunte: é escolha em sequência? Então teste o princípio multiplicativo.", source: original },
  { id: "q59", block: "III", discipline: "Estatística e Raciocínio Lógico", subject: "Distribuições", difficulty: "Difícil", statement: "O teorema central do limite ajuda a explicar o comportamento da distribuição de médias amostrais sob certas condições.", answer: true, explanation: "Ele é base para muitas aproximações inferenciais envolvendo médias amostrais.", tip: "Diferencie distribuição da população de distribuição amostral da média.", source: original },
  { id: "q60", block: "III", discipline: "Estatística e Raciocínio Lógico", subject: "Bayes", difficulty: "Difícil", statement: "A Regra de Bayes permite atualizar probabilidades condicionais à luz de nova informação.", answer: true, explanation: "A regra relaciona probabilidades condicionais e probabilidades a priori para atualização de crenças.", tip: "Em Bayes, organize o problema por eventos e condicionais antes de calcular.", source: original },
];

export const disciplines = Array.from(new Set(studyModules.map((module) => module.discipline)));
