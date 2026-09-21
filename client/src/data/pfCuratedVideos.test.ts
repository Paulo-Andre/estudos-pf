import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { curatedVideoForModule, officialItemsByDiscipline } from "./pfCuratedVideos";

describe("catálogo de vídeos curados", () => {
  it("associa cada disciplina à referência curada registrada", () => {
    const expectedUrls: Record<string, string> = {
      "lp-01": "https://www.youtube.com/watch?v=wddPyKWiXho",
      "da-01": "https://www.youtube.com/watch?v=kSZ4nJheSWA",
      "dc-01": "https://www.youtube.com/watch?v=rdtP8fGQZyA",
      "dpp-01": "https://www.youtube.com/watch?v=d8YTex6RQ6Q",
      "dpp-04": "https://www.youtube.com/watch?v=uxsYwe2C2AQ",
      "dh-01": "https://www.youtube.com/watch?v=7ck3f9gbAA8",
      "le-01": "https://www.youtube.com/watch?v=cOsGnMZyTTg",
      "est-01": "https://www.youtube.com/watch?v=2kPa8mxTVZE",
      "rl-01": "https://www.youtube.com/watch?v=uiTURFNatcU",
      "inf-01": "https://www.youtube.com/watch?v=lqlwOhgxs_0",
      "ct-01": "https://www.youtube.com/watch?v=DQGTuAH52JU",
    };

    for (const [moduleId, url] of Object.entries(expectedUrls)) {
      expect(curatedVideoForModule(moduleId)?.url).toBe(url);
    }

    const curationRecord = readFileSync(`${process.cwd()}/fontes_videos_curadoria.md`, "utf8");
    for (const url of Object.values(expectedUrls)) {
      expect(curationRecord).toContain(url);
    }

    expect(curationRecord).toContain("Responsável pela curadoria");
    expect(curationRecord).toContain("Última revisão de disponibilidade e metadados");
    expect(curationRecord).toContain("análise pedagógica quadro a quadro");
  });

  it("mantém a contagem de itens oficiais de todas as disciplinas da trilha", () => {
    expect(Object.keys(officialItemsByDiscipline)).toHaveLength(10);
    expect(Object.values(officialItemsByDiscipline).reduce((total, count) => total + count, 0)).toBe(104);
  });
});
