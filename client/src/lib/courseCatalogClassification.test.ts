import { describe, expect, it } from "vitest";
import { getCourseClassificationOptions } from "./courseCatalogClassification";

describe("opções de classificação comercial do curso", () => {
  it("oferece as áreas e abrangências que a vitrine usa como filtros", () => {
    const options = getCourseClassificationOptions({ courseArea: "Policial/Militar", stateCode: "Nacional" });

    expect(options.areas).toContain("Policial/Militar");
    expect(options.areas).toContain("Saúde");
    expect(options.states).toContain("Nacional");
    expect(options.states).toContain("SP");
  });

  it("preserva uma classificação já cadastrada mesmo que ela não esteja na lista sugerida", () => {
    const options = getCourseClassificationOptions({ courseArea: "Preparação Corporativa", stateCode: "Sudeste" });

    expect(options.areas[0]).toBe("Preparação Corporativa");
    expect(options.states[0]).toBe("Sudeste");
  });
});
