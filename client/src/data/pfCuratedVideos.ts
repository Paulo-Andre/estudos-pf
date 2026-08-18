export type CuratedStudyVideo = {
  title: string;
  channel: string;
  url: string;
  note: string;
};

export const officialItemsByDiscipline: Record<string, number> = {
  "Língua Portuguesa": 7,
  "Direito Administrativo": 8,
  "Direito Constitucional": 4,
  "Direito Penal e Processual Penal": 7,
  "Direitos Humanos": 12,
  "Legislação Especial": 15,
  "Estatística": 10,
  "Raciocínio Lógico": 7,
  "Informática": 22,
  "Contabilidade Geral": 12,
};

const videosByModulePrefix: Record<string, CuratedStudyVideo> = {
  lp: {
    title: "Reta Final Polícia Federal Pós-Edital: Língua Portuguesa",
    channel: "Estratégia Concursos · Prof. Adriana Figueiredo",
    url: "https://www.youtube.com/watch?v=wddPyKWiXho",
    note: "Complemento para a disciplina de Português, selecionado pela aderência explícita à PF e por sinais públicos de boa recepção do material.",
  },
  da: {
    title: "Reta Final Polícia Federal Pós-Edital: Direito Administrativo",
    channel: "Estratégia Concursos · Prof. Herbert Almeida",
    url: "https://www.youtube.com/watch?v=kSZ4nJheSWA",
    note: "Aula complementar diretamente vinculada à reta final de Direito Administrativo para a Polícia Federal.",
  },
  dc: {
    title: "Reta Final Polícia Federal Pós-Edital: Direito Constitucional",
    channel: "Estratégia Concursos",
    url: "https://www.youtube.com/watch?v=rdtP8fGQZyA",
    note: "Aula complementar diretamente vinculada à preparação para a Polícia Federal.",
  },
  dh: {
    title: "Reta Final Polícia Federal Pós-Edital: Direitos Humanos",
    channel: "Estratégia Concursos",
    url: "https://www.youtube.com/watch?v=7ck3f9gbAA8",
    note: "Material complementar com foco declarado em Direitos Humanos para a PF.",
  },
  le: {
    title: "Reta Final Polícia Federal Pós-Edital: Legislação Especial",
    channel: "Estratégia Concursos",
    url: "https://www.youtube.com/watch?v=cOsGnMZyTTg",
    note: "Revisão complementar de legislação especial voltada à prova da PF.",
  },
  est: {
    title: "Reta Final Polícia Federal Pós-Edital: Estatística",
    channel: "Estratégia Concursos · Prof. Carlos Henrique",
    url: "https://www.youtube.com/watch?v=2kPa8mxTVZE",
    note: "Aula complementar de Estatística com foco direto na PF e duração adequada para revisão estruturada.",
  },
  rl: {
    title: "Reta Final Polícia Federal Pós-Edital: Raciocínio Lógico",
    channel: "Estratégia Concursos · Prof. Brunno Lima",
    url: "https://www.youtube.com/watch?v=uiTURFNatcU",
    note: "Revisão complementar alinhada ao edital de Raciocínio Lógico da PF.",
  },
  inf: {
    title: "Reta Final Polícia Federal Pós-Edital: Informática",
    channel: "Estratégia Concursos · Prof. Renato da Costa",
    url: "https://www.youtube.com/watch?v=lqlwOhgxs_0",
    note: "Material complementar de Informática selecionado pela relação direta com a preparação para PF.",
  },
  ct: {
    title: "Reta Final Polícia Federal Pós-Edital: Contabilidade",
    channel: "Estratégia Concursos · Prof. Silvio Sande",
    url: "https://www.youtube.com/watch?v=DQGTuAH52JU",
    note: "Revisão complementar voltada à Contabilidade Geral exigida na PF.",
  },
};

const penalVideo: CuratedStudyVideo = {
  title: "Reta Final Polícia Federal Pós-Edital: Direito Penal",
  channel: "Estratégia Concursos · Prof. Priscila Silveira",
  url: "https://www.youtube.com/watch?v=d8YTex6RQ6Q",
  note: "Aula complementar diretamente associada ao conteúdo de Direito Penal da PF.",
};

const processualPenalVideo: CuratedStudyVideo = {
  title: "Reta Final Polícia Federal Pós-Edital: Direito Processual Penal",
  channel: "Estratégia Concursos · Prof. Renan Araujo",
  url: "https://www.youtube.com/watch?v=uxsYwe2C2AQ",
  note: "Aula complementar diretamente associada ao conteúdo de Processo Penal da PF.",
};

export function curatedVideoForModule(moduleId: string): CuratedStudyVideo | undefined {
  if (moduleId.startsWith("dpp-")) {
    const number = Number(moduleId.split("-")[1]);
    return number <= 3 ? penalVideo : processualPenalVideo;
  }

  return videosByModulePrefix[moduleId.split("-")[0]];
}
