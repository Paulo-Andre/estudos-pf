import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContentBodyEditor } from "./ContentBodyEditor";
import { parseRichContentBody, RichContentBody } from "./RichContentBody";

describe("formatação didática de conteúdos", () => {
  it("separa fórmulas em bloco e preserva os parágrafos com destaque", () => {
    expect(parseRichContentBody("Conceito [[essencial]].\n\n{{formula: \\frac{a}{b}}}")).toEqual([
      { type: "paragraph", text: "Conceito [[essencial]]." },
      { type: "formula", formula: "\\frac{a}{b}" },
    ]);
  });

  it("renderiza a marcação de destaque sem aceitar HTML livre", () => {
    const markup = renderToStaticMarkup(createElement(RichContentBody, { body: "Leia [[com atenção]] <script>alert(1)</script>." }));
    expect(markup).toContain("com atenção");
    expect(markup).toContain("&lt;script&gt;");
    expect(markup).not.toContain("<script>");
  });

  it("apresenta os comandos de destaque e fórmula no editor ROOT", () => {
    const markup = renderToStaticMarkup(createElement(ContentBodyEditor, { value: "", onChange: () => undefined }));
    expect(markup).toContain("Destacar seleção");
    expect(markup).toContain("Inserir fórmula");
  });
});
