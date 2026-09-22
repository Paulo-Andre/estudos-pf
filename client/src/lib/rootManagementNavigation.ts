import { BellRing, BookOpenCheck, BrainCircuit, BriefcaseBusiness, ContactRound, HardDriveDownload, Palette, ShieldAlert, Trophy, UsersRound, type LucideIcon } from "lucide-react";
export type RootManagementSection = "business" | "students" | "security" | "courses" | "contents" | "learning" | "alerts" | "contacts" | "settings" | "competition" | "backup";

export type RootManagementSectionDefinition = {
  id: RootManagementSection;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const rootManagementSections: RootManagementSectionDefinition[] = [
  {
    id: "business",
    label: "Negócios",
    description: "Planos, cupons, pedidos e transações.",
    icon: BriefcaseBusiness,
  },
  {
    id: "students",
    label: "Usuários",
    description: "Contas, matrículas, acessos e auditoria.",
    icon: UsersRound,
  },
  {
    id: "security",
    label: "Segurança",
    description: "Sessões, tentativas, eventos e proteção de dados.",
    icon: ShieldAlert,
  },
  {
    id: "courses",
    label: "Catálogo de cursos",
    description: "Cursos, capas, tipo e disponibilidade.",
    icon: BookOpenCheck,
  },
  {
    id: "contents",
    label: "Conteúdos",
    description: "Disciplinas, aulas e banco de questões.",
    icon: BookOpenCheck,
  },
  {
    id: "learning",
    label: "Inteligência de estudo",
    description: "Radar, domínio, erros e Prova Real por curso.",
    icon: BrainCircuit,
  },
  {
    id: "alerts",
    label: "Alertas",
    description: "Comunicados para todos ou por curso.",
    icon: BellRing,
  },
  {
    id: "contacts",
    label: "Contatos",
    description: "E-mail e Telegram exibidos a todos os usuários.",
    icon: ContactRound,
  },
  {
    id: "settings",
    label: "Configurações",
    description: "Logo, frases e cores da identidade visual.",
    icon: Palette,
  },
  {
    id: "competition",
    label: "Competição",
    description: "Ranking, pontuação e regras do quiz.",
    icon: Trophy,
  },
  {
    id: "backup",
    label: "Backup",
    description: "Exporte uma cópia segura dos dados da plataforma.",
    icon: HardDriveDownload,
  },
];
