import { describe, expect, it } from "vitest";
import { canOpenTutorialView, isTutorialCourseExperience, tutorialRestrictedViews } from "./tutorialCourse";

describe("experiência de curso Tutorial", () => {
  it("oculta somente Competição, Revisar e Simulados para aluno de Tutorial", () => {
    const visible = ["Painel", "Conteúdo", "Roteiro", "Simulados", "Competição", "Revisar", "Histórico"].filter(view => canOpenTutorialView(view, true));
    expect(tutorialRestrictedViews).toEqual(["Competição", "Revisar", "Simulados"]);
    expect(visible).toEqual(["Painel", "Conteúdo", "Roteiro", "Histórico"]);
  });

  it("mantém os recursos para Concurso e para ROOT", () => {
    expect(isTutorialCourseExperience("user", "tutorial")).toBe(true);
    expect(isTutorialCourseExperience("user", "concurso")).toBe(false);
    expect(isTutorialCourseExperience("admin", "tutorial")).toBe(false);
    expect(canOpenTutorialView("Competição", false)).toBe(true);
  });
});
