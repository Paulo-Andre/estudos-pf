import { describe, expect, it } from "vitest";
import { getEnrollmentLifecycleStatus } from "./enrollmentStatus";

const now = new Date("2026-08-18T12:00:00.000Z");
const base = { status: "active" as const, startAt: new Date("2026-08-18T10:00:00.000Z"), expiresAt: new Date("2026-09-18T12:00:00.000Z") };

describe("status temporal da matrícula", () => {
  it("marca como aguardando início quando a data ainda não chegou", () => {
    expect(getEnrollmentLifecycleStatus({ ...base, startAt: new Date("2026-08-19T10:00:00.000Z") }, now)).toBe("scheduled");
  });

  it("marca como ativa dentro do período contratado", () => {
    expect(getEnrollmentLifecycleStatus(base, now)).toBe("active");
  });

  it("trata a diferença de até um segundo da precisão do banco como acesso imediato", () => {
    expect(getEnrollmentLifecycleStatus({ ...base, startAt: new Date("2026-08-18T12:00:00.900Z") }, now)).toBe("active");
  });

  it("marca como vencida após o limite", () => {
    expect(getEnrollmentLifecycleStatus({ ...base, expiresAt: new Date("2026-08-18T11:59:59.000Z") }, now)).toBe("expired");
  });

  it("prioriza revogação mesmo dentro da validade", () => {
    expect(getEnrollmentLifecycleStatus({ ...base, status: "revoked" }, now)).toBe("revoked");
  });
});
