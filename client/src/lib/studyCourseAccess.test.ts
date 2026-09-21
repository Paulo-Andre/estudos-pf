import { describe, expect, it } from "vitest";
import { resolveVisibleStudyCourseId, visibleStudyCourses } from "./studyCourseAccess";

describe("seletor de cursos liberados", () => {
  const courses = [
    { id: "pf", isActive: true, courseType: "concurso" as const },
    { id: "tutorial-culinaria", isActive: true, courseType: "tutorial" as const },
    { id: "pm", isActive: false, courseType: "concurso" as const },
  ];

  it("mantém o Tutorial ativo e remove cursos sem acesso ativo", () => {
    expect(visibleStudyCourses(courses).map(course => course.id)).toEqual(["pf", "tutorial-culinaria"]);
  });

  it("seleciona o primeiro curso liberado quando o anterior deixou de estar disponível", () => {
    const visible = visibleStudyCourses(courses);
    expect(resolveVisibleStudyCourseId(visible, "pm", "pf")).toBe("pf");
    expect(resolveVisibleStudyCourseId(visible, "tutorial-culinaria", "pf")).toBe("tutorial-culinaria");
  });
});
