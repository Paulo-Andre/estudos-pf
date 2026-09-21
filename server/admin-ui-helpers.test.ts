import { describe, expect, it } from "vitest";
import { filterLinkOptions, reviewEmptyStateMessage } from "../client/src/lib/adminUiHelpers";

describe("apoios de interface administrativa", () => {
  it("pesquisa vínculos existentes sem alterar a coleção original", () => {
    const options = [{ name: "Direito Administrativo" }, { name: "Direito Penal" }];
    expect(filterLinkOptions(options, "PENAL", option => option.name)).toEqual([{ name: "Direito Penal" }]);
    expect(options).toHaveLength(2);
  });

  it("orienta o ROOT quando a fila de revisão está vazia, com ou sem filtros", () => {
    expect(reviewEmptyStateMessage(false)).toContain("Não há pendências agora");
    expect(reviewEmptyStateMessage(true)).toContain("Nenhum item corresponde aos filtros atuais");
  });
});
