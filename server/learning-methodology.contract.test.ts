import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
const trpcSource = readFileSync(new URL("../client/src/lib/trpc.ts", import.meta.url), "utf8");

describe("contrato da metodologia de aprendizagem", () => {
  it("mantém o Ciclo de Domínio no dashboard", () => {
    expect(homeSource).toContain("CICLO DE DOMÍNIO");
    expect(homeSource).toContain("PLANO DE HOJE");
    expect(homeSource).toContain("metodologia adaptativa");
    expect(homeSource).toContain("learningPlan.recommendations");
  });

  it("mantém recuperação ativa dentro das aulas", () => {
    expect(homeSource).toContain("RECUPERAÇÃO ATIVA · 60 SEGUNDOS");
    expect(homeSource).toContain("REVISÃO ATIVA · SEM CONSULTAR");
    expect(homeSource).toContain("Faça a recuperação ativa para liberar a conclusão.");
  });

  it("mantém repetição espaçada com esforço de recuperação", () => {
    expect(homeSource).toContain("Errei · 10 min");
    expect(homeSource).toContain("Difícil");
    expect(homeSource).toContain("Bom");
    expect(homeSource).toContain("Fácil");
    expect(trpcSource).toContain('case "study.review.rate"');
  });

  it("mantém simulado adaptativo e correção dos erros", () => {
    expect(homeSource).toContain("recomendado");
    expect(homeSource).toContain("Seus erros já foram enviados para a revisão espaçada");
    expect(homeSource).toContain("Os erros do simulado entrarão automaticamente na repetição espaçada.");
  });

  it("mantém intercalamento e prioridades adaptativas nas áreas principais", () => {
    expect(homeSource).toContain("Interleaving");
    expect(homeSource).toContain("PRIORIDADE ADAPTATIVA");
    expect(homeSource).toContain("reforçar");
    expect(homeSource).toContain("HISTÓRICO · DIAGNÓSTICO");
  });

  it("mantém metacognição e sessão adaptativa", () => {
    expect(homeSource).toContain("SESSÃO RECOMENDADA");
    expect(homeSource).toContain("METACOGNIÇÃO · SUA PERCEPÇÃO");
    expect(homeSource).toContain("Qual é sua confiança nesta resposta?");
    expect(homeSource).toContain("TREINO FOCAL");
    expect(homeSource).toContain("learningPlan.interleaving.disciplines");
  });

  it("mantém reflexão pós-simulado conectada ao histórico", () => {
    expect(homeSource).toContain("REFLEXÃO PÓS-SIMULADO · 2 MIN");
    expect(homeSource).toContain("Transforme o resultado em uma decisão concreta.");
    expect(homeSource).toContain("simulationReflection.save");
    expect(homeSource).toContain("Reflexão registrada");
    expect(homeSource).toContain("Próxima ação:");
    expect(trpcSource).toContain('case "study.simulationReflection.save"');
    expect(trpcSource).toContain("/reflection/");
  });

  it("mantém endpoints REST do plano adaptativo", () => {
    expect(trpcSource).toContain('case "study.learningPlan"');
    expect(trpcSource).toContain("/api/v1/study/learning-plan/");
    expect(trpcSource).toContain("/api/v1/study/review/");
  });
});
