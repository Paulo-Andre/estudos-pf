import type { PublicStorefrontPlan } from "./publicStorefront";

export type CourseMarketplaceFilters = { search: string; state: string; area: string; kind: "all" | "concurso" | "tutorial" };

export function filterMarketplacePlans(plans: PublicStorefrontPlan[], filters: CourseMarketplaceFilters) {
  const term = filters.search.trim().toLocaleLowerCase("pt-BR");
  return plans.filter(plan => {
    const courses = plan.courses ?? [];
    const textMatches = !term || [plan.title, plan.description ?? "", ...courses.flatMap(course => [course.title, course.track, course.courseArea ?? "", course.stateCode ?? "", course.description ?? ""])].join(" ").toLocaleLowerCase("pt-BR").includes(term);
    const stateMatches = !filters.state || courses.some(course => course.stateCode === filters.state);
    const areaMatches = !filters.area || courses.some(course => course.courseArea === filters.area);
    const kindMatches = filters.kind === "all" || courses.some(course => course.courseType === filters.kind);
    return textMatches && stateMatches && areaMatches && kindMatches;
  });
}

export function marketplaceFilterOptions(plans: PublicStorefrontPlan[]) {
  const courses = plans.flatMap(plan => plan.courses ?? []);
  return {
    states: Array.from(new Set(courses.map(course => course.stateCode).filter(Boolean))).sort() as string[],
    areas: Array.from(new Set(courses.map(course => course.courseArea).filter(Boolean))).sort() as string[],
  };
}
