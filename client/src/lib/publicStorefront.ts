export type PublicStorefrontPlan = {
  id: string;
  title: string;
  description?: string | null;
  coverImageUrls?: string[];
  priceCents: number;
  accessDurationDays: number;
  planType: "single_course" | "subscription" | string;
  courseIds: string[];
  courses?: { id: string; title: string; track: string; courseType?: "concurso" | "tutorial" | string; courseArea?: string; stateCode?: string; description?: string | null; coverImageUrl: string | null }[];
  isHighlighted?: boolean;
};

const knownCourseLabels: Record<string, string> = {
  "pf-agente": "Polícia Federal — Agente",
  prf: "Polícia Rodoviária Federal",
  pm: "Polícia Militar",
};

export function storefrontCourseLabel(courseId: string) {
  return knownCourseLabels[courseId] ?? courseId.replace(/[-_]+/g, " ");
}

export function storefrontPlanCta(priceCents: number) {
  return priceCents === 0 ? "Criar conta para liberar" : "Quero este pacote";
}

export function storefrontPlanType(planType: string) {
  return planType === "subscription" ? "Assinatura" : "Curso avulso";
}

export function formatStorefrontCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}
