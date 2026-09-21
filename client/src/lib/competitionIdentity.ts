export type CompetitionIdentityInput = {
  position: number | null;
  totalPoints: number;
  totalAnswered: number;
  totalCorrect: number;
};

export type CompetitionIdentity = {
  tier: "ouro" | "prata" | "bronze" | "participante" | "em_formacao";
  label: string;
  shortLabel: string;
  description: string;
  medalLabel: string;
  tone: "gold" | "silver" | "bronze" | "teal" | "slate";
};

export function getCompetitionIdentity(score: CompetitionIdentityInput): CompetitionIdentity {
  if (score.position === 1) return { tier: "ouro", label: "Medalha de Ouro", shortLabel: "OURO", description: "Lidera o ranking geral da competição.", medalLabel: "Líder da competição", tone: "gold" };
  if (score.position !== null && score.position <= 3) return { tier: "prata", label: "Medalha de Prata", shortLabel: "TOP 3", description: `Ocupa a ${score.position}ª posição do ranking geral.`, medalLabel: "Destaque do ranking", tone: "silver" };
  if (score.totalPoints >= 100) return { tier: "bronze", label: "Medalha de Bronze", shortLabel: "100+ PTS", description: "Já alcançou 100 pontos na competição.", medalLabel: "Competidor em evolução", tone: "bronze" };
  if (score.totalAnswered > 0) return { tier: "participante", label: "Selo de Participante", shortLabel: "ATIVO", description: `${score.totalCorrect} acerto(s) em ${score.totalAnswered} resposta(s) competitiva(s).`, medalLabel: "Em campo", tone: "teal" };
  return { tier: "em_formacao", label: "Selo em Formação", shortLabel: "INÍCIO", description: "Inicie uma rodada para conquistar sua primeira medalha.", medalLabel: "Pronto para competir", tone: "slate" };
}
