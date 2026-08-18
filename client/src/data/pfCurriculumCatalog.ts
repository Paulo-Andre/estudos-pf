/**
 * Catálogo compartilhado da plataforma.
 *
 * A regra arquitetural é simples: conteúdo pertence a uma disciplina; o concurso
 * apenas declara quais disciplinas compõem sua trilha e quais ficam liberadas.
 * Assim, uma disciplina pode ser reutilizada por PF, PRF e diferentes editais
 * de Polícia Militar sem duplicar módulos autorais.
 */

export type DisciplineId =
  | "lingua-portuguesa"
  | "direito-administrativo"
  | "direito-constitucional"
  | "direito-penal"
  | "direito-processual-penal"
  | "direitos-humanos"
  | "legislacao-especial"
  | "informatica"
  | "estatistica"
  | "raciocinio-logico"
  | "contabilidade-geral";

export type ContestId = "pf-agente" | "prf" | "pm";
export type CatalogStatus = "active" | "planned";

export type DisciplineCatalogEntry = {
  id: DisciplineId;
  name: string;
  shortName: string;
  description: string;
  status: CatalogStatus;
};

export type ContestCatalogEntry = {
  id: ContestId;
  name: string;
  role: string;
  description: string;
  status: CatalogStatus;
  disciplineIds: DisciplineId[];
  needsEditalReview: boolean;
};

export const disciplineCatalog: DisciplineCatalogEntry[] = [
  { id: "lingua-portuguesa", name: "Língua Portuguesa", shortName: "Português", description: "Leitura, gramática, reescrita e comunicação oficial.", status: "active" },
  { id: "direito-administrativo", name: "Direito Administrativo", shortName: "Administrativo", description: "Organização administrativa, atos, poderes, licitações, controle e responsabilidade estatal.", status: "active" },
  { id: "direito-constitucional", name: "Direito Constitucional", shortName: "Constitucional", description: "Direitos fundamentais, organização do Estado, segurança pública e ordem social.", status: "active" },
  { id: "direito-penal", name: "Direito Penal", shortName: "Penal", description: "Princípios, aplicação da lei penal, teoria do crime e crimes em espécie.", status: "active" },
  { id: "direito-processual-penal", name: "Direito Processual Penal", shortName: "Processual Penal", description: "Investigação, provas, prisões, ação penal e procedimentos.", status: "active" },
  { id: "direitos-humanos", name: "Direitos Humanos", shortName: "Direitos Humanos", description: "Sistemas de proteção, tratados e atuação estatal orientada por direitos.", status: "active" },
  { id: "legislacao-especial", name: "Legislação Especial", shortName: "Legislação Especial", description: "Leis penais e administrativas especiais organizadas por incidência e procedimento.", status: "active" },
  { id: "informatica", name: "Informática", shortName: "Informática", description: "Redes, segurança, sistemas, dados, nuvem, inteligência artificial e ferramentas digitais.", status: "active" },
  { id: "estatistica", name: "Estatística", shortName: "Estatística", description: "Estatística descritiva, probabilidade, inferência, amostragem e regressão.", status: "active" },
  { id: "raciocinio-logico", name: "Raciocínio Lógico", shortName: "Raciocínio Lógico", description: "Proposições, equivalências, argumentos, conjuntos, contagem e resolução estruturada.", status: "active" },
  { id: "contabilidade-geral", name: "Contabilidade Geral", shortName: "Contabilidade", description: "Patrimônio, fatos contábeis, demonstrações e análise dos registros.", status: "active" },
];

/**
 * Matrizes iniciais de concurso. As entradas planejadas são apenas scaffolding:
 * antes de uma venda/liberação real, a composição deve ser conferida contra o
 * edital do cargo e da corporação escolhidos.
 */
export const contestCatalog: ContestCatalogEntry[] = [
  {
    id: "pf-agente",
    name: "Polícia Federal",
    role: "Agente de Polícia Federal",
    description: "Trilha principal atualmente publicada na plataforma.",
    status: "active",
    disciplineIds: disciplineCatalog.map((discipline) => discipline.id),
    needsEditalReview: false,
  },
  {
    id: "prf",
    name: "Polícia Rodoviária Federal",
    role: "Policial Rodoviário Federal",
    description: "Matriz inicial reutilizando disciplinas comuns; deve ser ajustada ao edital da turma.",
    status: "planned",
    disciplineIds: [
      "lingua-portuguesa", "direito-administrativo", "direito-constitucional",
      "direito-penal", "direito-processual-penal", "direitos-humanos",
      "legislacao-especial", "informatica", "raciocinio-logico",
    ],
    needsEditalReview: true,
  },
  {
    id: "pm",
    name: "Polícia Militar",
    role: "Carreira policial militar — edital a definir",
    description: "Espaço para matrizes por estado, cargo e edital, com reaproveitamento do catálogo comum.",
    status: "planned",
    disciplineIds: [
      "lingua-portuguesa", "direito-constitucional", "direito-penal",
      "direito-processual-penal", "direitos-humanos", "legislacao-especial",
      "informatica", "raciocinio-logico",
    ],
    needsEditalReview: true,
  },
];

export const activeContestId: ContestId = "pf-agente";

export function getContestById(id: ContestId) {
  return contestCatalog.find((contest) => contest.id === id);
}

export function getDisciplineById(id: DisciplineId) {
  return disciplineCatalog.find((discipline) => discipline.id === id);
}

export function getDisciplinesForContest(id: ContestId) {
  const contest = getContestById(id);
  return contest?.disciplineIds.map(getDisciplineById).filter((discipline): discipline is DisciplineCatalogEntry => Boolean(discipline)) ?? [];
}


/** Resolve o vínculo canônico de um módulo sem depender do rótulo legado exibido na interface. */
export function getDisciplineIdForModule(module: { code: string; discipline: string }): DisciplineId | null {
  const code = module.code.toUpperCase();
  if (code.startsWith("LP-")) return "lingua-portuguesa";
  if (code.startsWith("DA-")) return "direito-administrativo";
  if (code.startsWith("DC-")) return "direito-constitucional";
  if (code.startsWith("DPP-")) {
    const number = Number(code.slice(4));
    return number <= 3 ? "direito-penal" : "direito-processual-penal";
  }
  if (code.startsWith("DH-")) return "direitos-humanos";
  if (code.startsWith("LE-")) return "legislacao-especial";
  if (code.startsWith("INF-")) return "informatica";
  if (code.startsWith("EST-")) return "estatistica";
  if (code.startsWith("RL-")) return "raciocinio-logico";
  if (code.startsWith("CT-")) return "contabilidade-geral";

  return disciplineCatalog.find((discipline) => discipline.name === module.discipline)?.id ?? null;
}

export function isModuleInContest(module: { code: string; discipline: string }, contestId: ContestId) {
  const disciplineId = getDisciplineIdForModule(module);
  return disciplineId ? getContestById(contestId)?.disciplineIds.includes(disciplineId) ?? false : false;
}
