export type Block = "I" | "II" | "III";

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

export type InteractiveLesson = {
  challenge: { prompt: string; options: string[]; correct: number; feedback: string };
  recall: { prompt: string; answer: string };
};

export type DetailedStudyModule = {
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
  estimatedMinutes: number;
  fastTrack: string[];
  mnemonic: string;
  checklist: string[];
  lesson: InteractiveLesson;
};

export type ApostilaExample = { enunciado: string; resolucao: string };
export type ApostilaReference = { rotulo: string; url: string; nota: string };
export type ApostilaSection = { titulo: string; paragrafos: string[]; esquema?: string[]; exemplo?: ApostilaExample };
export type ApostilaChapter = { abertura: string; secoes: ApostilaSection[]; praticaAtiva: string; fonteOficial?: ApostilaReference };

export const blocks = [
  { id: "I" as Block, label: "Bloco I", ratio: 0.5, items: 60, description: "Conhecimentos básicos" },
  { id: "II" as Block, label: "Bloco II", ratio: 0.3, items: 36, description: "Conhecimentos básicos" },
  { id: "III" as Block, label: "Bloco III", ratio: 0.2, items: 24, description: "Conhecimentos específicos" },
];
