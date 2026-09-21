import { describe, expect, it } from "vitest";
import { DEFAULT_COURSES } from "./courseCatalog";

describe("catálogo inicial de cursos", () => {
  it("oferece matrizes distintas para PF, PRF e PM", () => {
    expect(DEFAULT_COURSES.map(course => course.id)).toEqual(["pf-agente", "prf", "pm"]);
    expect(new Set(DEFAULT_COURSES.map(course => course.track)).size).toBe(3);
  });
});
