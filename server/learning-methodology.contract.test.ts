import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
const trpcSource = readFileSync(new URL("../client/src/lib/trpc.ts", import.meta.url), "utf8");
const intelligenceSource = readFileSync(new URL("../client/src/components/IntelligenceArea.tsx", import.meta.url), "utf8");
const intelligenceAdminSource = readFileSync(new URL("../client/src/components/LearningIntelligenceAdminPanel.tsx", import.meta.url), "utf8");
const rootNavigationSource = readFileSync(new URL("../client/src/lib/rootManagementNavigation.ts", import.meta.url), "utf8");

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
    expect(homeSource).toContain("Seguir:");
    expect(homeSource).toContain("onFollowReflectionAction");
    expect(trpcSource).toContain('case "study.simulationReflection.save"');
    expect(trpcSource).toContain("/reflection/");
  });

  it("mantém radar, treinador de erros e mapa de domínio", () => {
    expect(intelligenceSource).toContain("RADAR DE EDITAL VIVO");
    expect(intelligenceSource).toContain("TREINADOR DE ERROS");
    expect(intelligenceSource).toContain("PROVA DE DOMÍNIO");
    expect(intelligenceSource).toContain("MAPA DE DOMÍNIO DO EDITAL");
    expect(homeSource).toContain('view === "Inteligência"');
    expect(trpcSource).toContain('case "study.learningIntelligence"');
    expect(trpcSource).toContain("/api/v1/study/intelligence/");
  });

  it("mantém Modo Prova Real com telemetria sem feedback", () => {
    expect(intelligenceSource).toContain("MODO PROVA REAL");
    expect(intelligenceSource).toContain("telemetryEnabled");
    expect(homeSource).toContain("MODO PROVA REAL · SEM FEEDBACK");
    expect(homeSource).toContain('"real_exam"');
    expect(homeSource).toContain("answerChanges");
    expect(homeSource).toContain("performanceDrop");
    expect(homeSource).toContain("highConfidenceErrors");
  });

  it("mantém controles ROOT por curso para os novos recursos", () => {
    expect(intelligenceAdminSource).toContain("ROOT / INTELIGÊNCIA DE ESTUDO");
    expect(intelligenceAdminSource).toContain("Central de Inteligência disponível aos alunos");
    expect(intelligenceAdminSource).toContain("Radar de Edital Vivo");
    expect(intelligenceAdminSource).toContain("Treinador de Erros");
    expect(intelligenceAdminSource).toContain("Prova de Domínio");
    expect(intelligenceAdminSource).toContain("Modo Prova Real");
    expect(intelligenceAdminSource).toContain("Critérios avançados");
    expect(rootNavigationSource).toContain('id: "learning"');
    expect(trpcSource).toContain('case "study.learningFeatures"');
    expect(trpcSource).toContain('case "admin.learningIntelligence.getSettings"');
    expect(trpcSource).toContain('case "admin.learningIntelligence.saveSettings"');
  });

  it("oculta e bloqueia os modos conforme flags recebidas do servidor", () => {
    expect(homeSource).toContain('learningFeatures?.enabled');
    expect(homeSource).toContain('learningFeatures.domainProofEnabled');
    expect(homeSource).toContain('learningFeatures.realExamEnabled');
    expect(homeSource).toContain('learningFeatures.realExamMinQuestions');
    expect(homeSource).toContain('learningFeatures.realExamQuestionCount');
    expect(homeSource).toContain('telemetryEnabled');
  });

  it("mantém endpoints REST do plano adaptativo", () => {
    expect(trpcSource).toContain('case "study.learningPlan"');
    expect(trpcSource).toContain("/api/v1/study/learning-plan/");
    expect(trpcSource).toContain("/api/v1/study/review/");
  });
});
