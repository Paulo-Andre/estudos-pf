import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
const accessGateSource = readFileSync(new URL("../client/src/pages/AccessGate.tsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

describe("contrato de layout móvel", () => {
  it("mantém a largura da aplicação e dos cards contida no viewport", () => {
    expect(cssSource).toContain("html, body, #root { max-width: 100%; overflow-x: clip; }");
    expect(cssSource).toContain(".shell-card { @apply min-w-0");
  });

  it("mantém a matriz vertical até telas amplas, sem comprimir título e seletor", () => {
    expect(homeSource).toContain("className=\"w-full min-w-0 rounded-xl");
    expect(homeSource).toContain("xl:flex-row xl:items-center xl:justify-between");
    expect(homeSource).toContain("w-full flex-col gap-2 border-t");
    expect(homeSource).toContain("xl:w-[min(100%,24rem)]");
    expect(homeSource).toContain("xl:min-w-[17rem] xl:flex-1");
  });

  it("preserva títulos legíveis e ações empilhadas no acesso e no painel", () => {
    expect(accessGateSource).toContain("text-[clamp(2rem,9vw,2.5rem)]");
    expect(homeSource).toContain("flex flex-col gap-2.5 sm:flex-row");
    expect(homeSource).toContain("break-words text-[clamp(1.8rem,8vw,2.5rem)]");
  });

  it("protege cabeçalhos de diálogos administrativos contra textos longos", () => {
    expect(cssSource).toContain('[role="dialog"] > header > :first-child { min-width: 0; }');
    expect(cssSource).toContain('[role="dialog"] > header h2, [role="dialog"] > header p { overflow-wrap: anywhere; }');
  });

  it("abre a navegação móvel como gaveta acessível e mantém a página de roteiro disponível", () => {
    expect(homeSource).toContain('id="study-navigation"');
    expect(homeSource).toContain('w-[min(20rem,86vw)]');
    expect(homeSource).toContain('overflow-y-auto overscroll-contain');
    expect(homeSource).toContain('aria-controls="study-navigation"');
    expect(homeSource).toContain('{ label: "Roteiro", icon: CalendarClock }');
  });
});
