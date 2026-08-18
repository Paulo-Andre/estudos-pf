import { describe, expect, it } from "vitest";
import { createSessionToken, hashPassword, hashSessionToken, verifyPassword } from "./localAuth";

describe("autenticação local", () => {
  it("gera hashes de senha com sal e aceita somente a senha correspondente", async () => {
    const password = "Senha-para-teste-123";
    const firstHash = await hashPassword(password);
    const secondHash = await hashPassword(password);

    expect(firstHash).toMatch(/^scrypt\$/);
    expect(firstHash).not.toBe(password);
    expect(firstHash).not.toBe(secondHash);
    await expect(verifyPassword(password, firstHash)).resolves.toBe(true);
    await expect(verifyPassword("senha-incorreta", firstHash)).resolves.toBe(false);
    await expect(verifyPassword(password, "hash-malformado")).resolves.toBe(false);
  });

  it("cria tokens opacos e guarda somente o identificador hashable da sessão", () => {
    const first = createSessionToken();
    const second = createSessionToken();

    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(40);
    expect(hashSessionToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashSessionToken(first)).not.toBe(first);
  });
});
