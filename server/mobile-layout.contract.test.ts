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
    expect(homeSource).toContain("xl:flex-row xl:items-center");
    expect(homeSource).toContain("flex flex-col gap-3 xl:flex-row");
    expect(homeSource).toContain("xl:w-[22rem]");
    expect(homeSource).toContain("min-w-0 flex-1");
  });

  it("preserva títulos legíveis e ações empilhadas no acesso e no painel", () => {
    expect(accessGateSource).toContain("text-[clamp(2rem,9vw,2.5rem)]");
    expect(homeSource).toContain("flex flex-col gap-2.5 sm:flex-row");
    expect(homeSource).toContain("text-[clamp(2rem,7vw,3.5rem)]");
  });

  it("protege cabeçalhos de diálogos administrativos contra textos longos", () => {
    expect(cssSource).toContain('[role="dialog"] > header > :first-child { min-width: 0; }');
    expect(cssSource).toContain('[role="dialog"] > header h2, [role="dialog"] > header p { overflow-wrap: anywhere; }');
  });

  it("abre a navegação móvel como gaveta acessível e mantém a página de roteiro disponível", () => {
    expect(homeSource).toContain('id="study-navigation"');
    expect(homeSource).toContain('w-[min(19rem,88vw)]');
    expect(homeSource).toContain('overflow-y-auto overscroll-contain');
    expect(homeSource).toContain('aria-controls="study-navigation"');
    expect(homeSource).toContain('{ label: "Roteiro", icon: CalendarClock }');
    expect(homeSource).toContain('className="mobile-tabbar"');
    expect(cssSource).toContain(".mobile-tabbar");
  });
});
