import { describe, expect, it } from "vitest";
import { rootManagementSections } from "../client/src/lib/rootManagementNavigation";

describe("navegação unificada da gestão ROOT", () => {
  it("mantém áreas distintas para operação, aprendizagem e administração", () => {
    expect(rootManagementSections.map((section) => section.id)).toEqual([
      "business",
      "students",
      "security",
      "courses",
      "contents",
      "learning",
      "alerts",
      "contacts",
      "settings",
      "competition",
      "backup",
    ]);
  });

  it("mantém descrições operacionais para orientar cada área administrativa", () => {
    for (const section of rootManagementSections) {
      expect(section.label).not.toHaveLength(0);
      expect(section.description.length).toBeGreaterThan(12);
    }
  });
});
