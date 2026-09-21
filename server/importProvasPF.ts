import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type PF2018QuestionDraft = {
  itemNumber: number;
  statement: string;
  answer: boolean;
  contentCodes: string[];
  source: string;
};

const ANSWER_KEY_LINES = [
  "C C E E E C E E E C C E C E C E E E C C",
  "E C C C C E C E C E E C C E C E E E C C",
  "C C E E C E C E C E E E C C E C C E C C",
  "E C C E E E C E C E C C C E E C E C C C",
  "E E E C C C C C C C C E E E E E C E E E",
  "C C E E C C C E C E C E E E C E C C C E",
] as const;

const ANSWER_KEY = ANSWER_KEY_LINES.flatMap(line => line.split(" ")).map(answer => answer === "C");

const SOURCE_SUFFIX = "CESPE/CEBRASPE — DGP/PF — Cargo 12 (Agente) — 2018";

function cleanExtractedText(value: string) {
  return value
    .replace(/^.*(?:pciconcursos\.com\.br|pcimarkpci|Matriz_408_DGPPF012_).*$\n?/gim, "")
    .replace(/^\s*\d{1,2}\s*$/gm, "")
    .replace(/\f/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function findMarkerIndex(rawText: string, marker: string, fromIndex = 0) {
  const escapedWords = marker.trim().split(/\s+/).filter(Boolean)
    .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const match = new RegExp(escapedWords.join("\\s+"), "i").exec(rawText.slice(fromIndex));
  return match ? fromIndex + match.index : -1;
}

function extractRequiredSlice(rawText: string, startMarker: string, endMarker: string) {
  const startIndex = findMarkerIndex(rawText, startMarker);
  const endIndex = findMarkerIndex(rawText, endMarker, startIndex + startMarker.length);
  if (startIndex < 0 || endIndex < 0) {
    throw new Error(`Não foi possível recuperar o contexto entre “${startMarker}” e “${endMarker}”.`);
  }
  return cleanExtractedText(rawText.slice(startIndex, endIndex));
}

function extractItemStatement(rawText: string, itemNumber: number) {
  const currentPattern = new RegExp(`(?:^|\\n)${itemNumber}[\\t ]+`, "m");
  const currentMatch = currentPattern.exec(rawText);
  if (!currentMatch) throw new Error(`Item ${itemNumber} não localizado no caderno PF 2018.`);

  const nextPattern = itemNumber === 120 ? null : new RegExp(`(?:^|\\n)${itemNumber + 1}[\\t ]+`, "m");
  const afterCurrent = currentMatch.index + currentMatch[0].length;
  const remaining = rawText.slice(afterCurrent);
  const nextMatch = nextPattern?.exec(remaining);
  const objectiveEnd = itemNumber === 120 ? rawText.indexOf("\nEspaço livre", afterCurrent) : -1;
  const endIndex = nextMatch ? afterCurrent + nextMatch.index : (objectiveEnd >= 0 ? objectiveEnd : rawText.length);
  return cleanExtractedText(rawText.slice(afterCurrent, endIndex));
}

function addRange(target: Map<number, string[]>, from: number, to: number, ...codes: string[]) {
  for (let item = from; item <= to; item += 1) target.set(item, codes);
}

function getContentCodesByItem() {
  const byItem = new Map<number, string[]>();
  addRange(byItem, 1, 5, "LP-01");
  addRange(byItem, 6, 8, "LP-03");
  addRange(byItem, 9, 11, "LP-05");
  addRange(byItem, 12, 16, "LP-01");
  byItem.set(17, ["LP-04"]);
  addRange(byItem, 18, 19, "LP-02");
  addRange(byItem, 20, 24, "LP-03");
  addRange(byItem, 25, 26, "DA-01");
  addRange(byItem, 27, 28, "DA-04");
  addRange(byItem, 29, 30, "DC-01");
  addRange(byItem, 31, 32, "DC-03");
  byItem.set(33, ["DPP-03"]);
  byItem.set(34, ["DPP-01"]);
  byItem.set(35, ["DPP-04"]);
  byItem.set(36, ["DPP-05"]);
  byItem.set(37, ["DPP-06"]);
  byItem.set(38, ["LE-02"]);
  byItem.set(39, ["LE-01"]);
  byItem.set(40, ["LE-03"]);
  byItem.set(41, ["EST-04"]);
  addRange(byItem, 42, 43, "EST-06");
  byItem.set(44, ["EST-04"]);
  addRange(byItem, 45, 47, "EST-07");
  addRange(byItem, 48, 50, "EST-04");
  addRange(byItem, 51, 56, "RL-02");
  addRange(byItem, 57, 60, "RL-04");
  byItem.set(61, ["INF-04"]);
  byItem.set(62, ["INF-01"]);
  byItem.set(63, ["INF-02", "INF-05"]);
  byItem.set(64, ["INF-04"]);
  byItem.set(65, ["INF-01"]);
  addRange(byItem, 66, 69, "INF-05");
  addRange(byItem, 70, 73, "INF-06");
  addRange(byItem, 74, 76, "INF-01");
  addRange(byItem, 77, 78, "INF-02");
  byItem.set(79, ["INF-07"]);
  byItem.set(80, ["INF-06"]);
  addRange(byItem, 81, 83, "INF-07");
  addRange(byItem, 84, 86, "INF-08");
  addRange(byItem, 87, 88, "INF-03");
  addRange(byItem, 89, 92, "INF-04");
  addRange(byItem, 93, 96, "INF-08");
  addRange(byItem, 97, 100, "CT-01");
  addRange(byItem, 101, 108, "CT-02");
  addRange(byItem, 109, 114, "CT-03");
  addRange(byItem, 115, 120, "CT-04");
  return byItem;
}

function getContextByItem(rawText: string, itemNumber: number) {
  const sharedContexts = [
    [1, 8, "Imagine uma operação de busca na selva.", "No que se refere aos sentidos e aos aspectos linguísticos do texto apresentado, julgue os itens seguintes."],
    [9, 11, "Não se concebe que um ato normativo", "Considerandoofragmentodetextoapresentado,julgueosseguintes"],
    [12, 24, "Texto 12A1AAA", "No que se refere à tipologia e aos sentidos do texto 12A1AAA,"],
    [33, 37, "Depois de adquirir um revólver calibre 38", "Tendo como referência essa situação hipotética, julgue os itens seguintes."],
    [41, 44, "Determinado órgão governamental estimou", "Sabendo que P(Z < 2) = 0,975, em que Z representa a distribuição normal padrão, julgue os itens que se seguem, em relação a essa situação hipotética."],
    [45, 47, "Um pesquisador estudou a relação entre a taxa de criminalidade", "A respeito dessa situação hipotética, julgue os próximos itens,"],
    [48, 50, "O valor diário (em R$ mil) apreendido de contrabando", "Nessa situação hipotética,"],
    [51, 56, "As proposições P, Q e R a seguir referem-se", "Considerando que ~X representa a negação da proposição X, julgue os itens a seguir."],
    [57, 60, "Em um aeroporto, 30 passageiros", "Com referência a essa situação hipotética, julgue os itens que se seguem."],
    [61, 65, "Marta utiliza uma estação de trabalho", "Tendo como referência essa situação hipotética, julgue os itens a seguir."],
    [70, 72, "Os gestores de determinado órgão público decidiram", "Considerando essas informações, julgue os seguintes itens."],
    [97, 99, "Considerando que a contabilidade é a ciência", "julgue os itens a seguir, no que se refere a conceitos, objetivos e finalidades da contabilidade."],
    [100, 102, "Nas demonstrações contábeis de determinada empresa", "Com base nessas informações, julgue os seguintes itens."],
    [103, 105, "Determinada sociedade comercial criou uma rubrica", "A respeito dessa situação hipotética, julgue os próximos itens."],
    [109, 111, "Determinada sociedade comercial realizou", "Nessa situação hipotética,"],
    [115, 117, "Considere os dados da tabela a seguir", "Com base nessas informações, julgue os itens que se seguem."],
    [118, 120, "Com base no disposto na Lei n.º 6.404/1976", "julgue os itens subsecutivos."],
  ] as const;

  const contextDefinition = sharedContexts.find(([from, to]) => itemNumber >= from && itemNumber <= to);
  if (contextDefinition) return extractRequiredSlice(rawText, contextDefinition[2], contextDefinition[3]);
  if (itemNumber >= 81 && itemNumber <= 83) {
    return "Modelo entidade-relacionamento apresentado na prova: produto (atributos código, descrição e preço) relacionado N:1 a tipo de produto (atributos código e descrição).";
  }
  return null;
}

function correctKnownExtractionLosses(itemNumber: number, statement: string) {
  if (itemNumber === 50) return "a razão (W − 20) / √4 segue distribuição normal padrão.";
  if (itemNumber === 58) return "Se 2 dos 30 passageiros selecionados forem escolhidos ao acaso, então a probabilidade de esses 2 passageiros terem estado em 2 desses países é inferior a 1/30.";
  return statement;
}

export function parsePF2018Questions(rawText: string): PF2018QuestionDraft[] {
  if (ANSWER_KEY.length !== 120) throw new Error("A chave oficial PF 2018 deve conter exatamente 120 respostas.");
  const contentCodesByItem = getContentCodesByItem();
  const drafts = Array.from({ length: 120 }, (_, index) => {
    const itemNumber = index + 1;
    const statement = correctKnownExtractionLosses(itemNumber, extractItemStatement(rawText, itemNumber));
    const context = getContextByItem(rawText, itemNumber);
    const contentCodes = contentCodesByItem.get(itemNumber);
    if (!contentCodes?.length) throw new Error(`Item ${itemNumber} sem vínculo pedagógico definido.`);
    if (!statement) throw new Error(`Item ${itemNumber} sem enunciado extraído.`);
    return {
      itemNumber,
      statement: context ? `Contexto da prova:\n${context}\n\nItem ${itemNumber}:\n${statement}` : `Item ${itemNumber}:\n${statement}`,
      answer: ANSWER_KEY[index],
      contentCodes,
      source: `PROVA_PF_2018:item_${itemNumber} | ${SOURCE_SUFFIX}`,
    };
  });
  return drafts;
}

export function loadPF2018Questions() {
  const rawExamPath = fileURLToPath(new URL("../importacao_pdf_texto/raw/agente_pf_2018_raw.txt", import.meta.url));
  return parsePF2018Questions(readFileSync(rawExamPath, "utf8"));
}
