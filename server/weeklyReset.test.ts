import { describe, expect, it } from "vitest";
import { getCompetitionWeekWindow, shouldRegisterWeeklyCompetitionCycle } from "./db";

describe("ciclo semanal de competição e selos", () => {
  it("mantém o ciclo anterior até domingo às 23h58 em Brasília", () => {
    const window = getCompetitionWeekWindow(new Date("2026-08-17T02:58:00.000Z"));
    expect(window.key).toBe("2026-08-09");
    expect(window.startsAt.toISOString()).toBe("2026-08-10T02:59:00.000Z");
  });

  it("abre o novo ciclo exatamente no domingo às 23h59 em Brasília", () => {
    const window = getCompetitionWeekWindow(new Date("2026-08-17T02:59:00.000Z"));
    expect(window.key).toBe("2026-08-16");
    expect(window.startsAt.toISOString()).toBe("2026-08-17T02:59:00.000Z");
  });

  it("permanece idempotente em uma nova tentativa do mesmo cron", () => {
    const now = new Date("2026-08-17T03:02:00.000Z");
    expect(shouldRegisterWeeklyCompetitionCycle("2026-08-16", now)).toBe(false);
    expect(shouldRegisterWeeklyCompetitionCycle("2026-08-09", now)).toBe(true);
  });
});
