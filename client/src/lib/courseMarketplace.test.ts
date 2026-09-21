import { describe, expect, it } from "vitest";
import { filterMarketplacePlans, marketplaceFilterOptions } from "./courseMarketplace";
import type { PublicStorefrontPlan } from "./publicStorefront";

const plans: PublicStorefrontPlan[] = [
  { id: "pf", title: "PF Nacional", priceCents: 1000, accessDurationDays: 30, planType: "single_course", courseIds: ["pf"], courses: [{ id: "pf", title: "Polícia Federal", track: "PF", courseType: "concurso", courseArea: "Policial/Militar", stateCode: "Nacional", coverImageUrl: null }] },
  { id: "saude", title: "Tutorial Saúde", priceCents: 1000, accessDurationDays: 30, planType: "single_course", courseIds: ["saude"], courses: [{ id: "saude", title: "Cálculos em Saúde", track: "Saúde", courseType: "tutorial", courseArea: "Saúde", stateCode: "BA", coverImageUrl: null }] },
];

describe("filtros do catálogo comercial", () => {
  it("encontra planos por estado, área, tipo e nome", () => {
    expect(filterMarketplacePlans(plans, { search: "", state: "BA", area: "", kind: "all" }).map(plan => plan.id)).toEqual(["saude"]);
    expect(filterMarketplacePlans(plans, { search: "", state: "", area: "", kind: "tutorial" }).map(plan => plan.id)).toEqual(["saude"]);
    expect(filterMarketplacePlans(plans, { search: "federal", state: "", area: "", kind: "all" }).map(plan => plan.id)).toEqual(["pf"]);
    expect(filterMarketplacePlans(plans, { search: "cálculos", state: "BA", area: "Saúde", kind: "tutorial" }).map(plan => plan.id)).toEqual(["saude"]);
    expect(filterMarketplacePlans(plans, { search: "", state: "BA", area: "Policial/Militar", kind: "all" })).toEqual([]);
  });
  it("gera opções de filtros diretamente dos cursos publicados", () => {
    expect(marketplaceFilterOptions(plans)).toEqual({ states: ["BA", "Nacional"], areas: ["Policial/Militar", "Saúde"] });
  });
});
