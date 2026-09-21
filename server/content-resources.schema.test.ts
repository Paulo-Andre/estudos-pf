import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { contents } from "../drizzle/schema";

describe("contrato editorial de recursos do conteúdo", () => {
  it("mantém campos opcionais para objetivo, texto de card, imagem e links complementares", () => {
    const columns = getTableColumns(contents);

    expect(columns).toHaveProperty("objective");
    expect(columns).toHaveProperty("description");
    expect(columns).toHaveProperty("cardText");
    expect(columns).toHaveProperty("body");
    expect(columns).toHaveProperty("coverImageUrl");
    expect(columns).toHaveProperty("videoUrl");
    expect(columns).toHaveProperty("videoLabel");
    expect(columns).toHaveProperty("materialUrl");
    expect(columns).toHaveProperty("materialLabel");
  });
});
