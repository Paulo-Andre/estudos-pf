import { describe, expect, it } from "vitest";
import { formatStorefrontCurrency, storefrontCourseLabel, storefrontPlanCta, storefrontPlanType } from "./publicStorefront";

describe("vitrine pública de planos", () => {
  it("traduz os cursos conhecidos e preserva cursos criados pelo ROOT", () => {
    expect(storefrontCourseLabel("pf-agente")).toBe("Polícia Federal — Agente");
    expect(storefrontCourseLabel("curso-guarda-municipal")).toBe("curso guarda municipal");
  });

  it("mantém chamadas de aquisição coerentes com o valor do pacote", () => {
    expect(storefrontPlanCta(400)).toBe("Quero este pacote");
    expect(storefrontPlanCta(0)).toBe("Criar conta para liberar");
    expect(storefrontPlanType("subscription")).toBe("Assinatura");
    expect(formatStorefrontCurrency(400)).toBe("R$ 4,00");
  });
});
