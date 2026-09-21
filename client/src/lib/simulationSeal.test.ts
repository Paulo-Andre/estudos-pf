import { describe, expect, it } from "vitest";
import { getSimulationSealIdentity } from "./simulationSeal";

describe("selo pessoal de simulados", () => {
  it("mantém o aluno em formação antes de vinte acertos", () => {
    expect(getSimulationSealIdentity(19)).toMatchObject({ level: 0, shortLabel: "INÍCIO", nextLevelAt: 20 });
  });

  it("avança exatamente um selo a cada vinte acertos acumulados", () => {
    expect(getSimulationSealIdentity(20)).toMatchObject({ level: 1, shortLabel: "INICIANTE", nextLevelAt: 40 });
    expect(getSimulationSealIdentity(80)).toMatchObject({ level: 4, shortLabel: "TÁTICO", nextLevelAt: 100 });
    expect(getSimulationSealIdentity(199)).toMatchObject({ level: 9, shortLabel: "EXPERT", nextLevelAt: 200 });
  });

  it("limita o reconhecimento ao décimo selo a partir de duzentos acertos", () => {
    expect(getSimulationSealIdentity(200)).toMatchObject({ level: 10, shortLabel: "MESTRE", nextLevelAt: null, tone: "gold" });
    expect(getSimulationSealIdentity(245)).toMatchObject({ level: 10, shortLabel: "MESTRE", nextLevelAt: null });
  });
});
