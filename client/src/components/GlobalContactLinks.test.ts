import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    platform: {
      contacts: {
        useQuery: () => ({
          data: { email: "suporte@nucleoconcursos.example", telegramUrl: "https://t.me/nucleoconcursos" },
          isLoading: false,
        }),
      },
      settings: {
        useQuery: () => ({
          data: { brandName: "Núcleo Concursos", accentColor: "#9be0d2" },
          isLoading: false,
        }),
      },
    },
  },
}));

import { GlobalContactLinks } from "./GlobalContactLinks";

describe("GlobalContactLinks no login", () => {
  it("mostra e-mail e Telegram de suporte quando configurados pelo ROOT", () => {
    const html = renderToStaticMarkup(createElement(GlobalContactLinks, { variant: "login" }));

    expect(html).toContain("PRECISA DE AJUDA?");
    expect(html).toContain("suporte@nucleoconcursos.example");
    expect(html).toContain("https://t.me/nucleoconcursos");
    expect(html).toContain("Telegram");
  });
});
