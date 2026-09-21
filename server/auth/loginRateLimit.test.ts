import { describe, expect, it, beforeEach } from "vitest";
import {
  clearSuccessfulLoginAttempt,
  isLoginAttemptAllowed,
  loginAttemptKeys,
  loginRateLimitPolicy,
  loginRetryAfterSeconds,
  recordFailedLoginAttempt,
  resetLoginRateLimitForTests,
} from "./loginRateLimit";

const request = { ip: "203.0.113.10", headers: {} };

describe("limitação de tentativas de login", () => {
  beforeEach(() => resetLoginRateLimitForTests());

  it("bloqueia novas tentativas depois do limite por identificador e libera após a janela", () => {
    const keys = loginAttemptKeys(request, "aluno@exemplo.com");
    const now = 1_000_000;

    for (let index = 0; index < loginRateLimitPolicy.identifierMaxFailures; index += 1) {
      recordFailedLoginAttempt(keys, now);
    }

    expect(isLoginAttemptAllowed(keys, now)).toBe(false);
    expect(loginRetryAfterSeconds(keys, now)).toBe(Math.ceil(loginRateLimitPolicy.windowMs / 1000));
    expect(isLoginAttemptAllowed(keys, now + loginRateLimitPolicy.windowMs)).toBe(true);
  });

  it("não permite que um login bem-sucedido remova a proteção agregada contra tentativas pulverizadas", () => {
    const primary = loginAttemptKeys(request, "primeiro@exemplo.com");
    const secondary = loginAttemptKeys(request, "segundo@exemplo.com");
    const now = 2_000_000;

    for (let index = 0; index < loginRateLimitPolicy.ipMaxFailures; index += 1) {
      recordFailedLoginAttempt(primary, now);
    }
    clearSuccessfulLoginAttempt(secondary);

    expect(isLoginAttemptAllowed(secondary, now)).toBe(false);
  });

  it("normaliza o identificador e separa os contadores por endereço de origem", () => {
    const normalized = loginAttemptKeys(request, "  Aluno@Exemplo.Com  ");
    const equivalent = loginAttemptKeys(request, "aluno@exemplo.com");
    const otherOrigin = loginAttemptKeys({ ip: "203.0.113.11", headers: {} }, "aluno@exemplo.com");

    expect(normalized.identifier).toBe(equivalent.identifier);
    expect(normalized.ip).toBe(equivalent.ip);
    expect(otherOrigin.identifier).not.toBe(normalized.identifier);
  });
});
