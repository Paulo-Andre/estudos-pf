export const tutorialRestrictedViews = ["Competição", "Revisar", "Simulados"] as const;

export function isTutorialCourseExperience(role: string | undefined, courseType: "concurso" | "tutorial" | null | undefined) {
  return role !== "admin" && courseType === "tutorial";
}

export function canOpenTutorialView(view: string, tutorialCourse: boolean) {
  return !tutorialCourse || !tutorialRestrictedViews.includes(view as (typeof tutorialRestrictedViews)[number]);
}
