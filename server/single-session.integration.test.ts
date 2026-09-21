import { describe, expect, it } from "vitest";
import { createLocalUser, deleteManagedUser, getUserFromSessionHash, replaceSessionForUser } from "./db";
import { createSessionToken, hashSessionToken } from "./auth/localAuth";

describe("sessão local única", () => {
  it("substitui a sessão anterior e mantém somente o novo token autenticado", async () => {
    const token = `qa-single-session-${Date.now().toString(36)}`;
    const user = await createLocalUser({
      name: "Aluno sessão única QA",
      username: token,
      email: `${token}@example.invalid`,
      cpf: null,
      passwordHash: "hash-de-teste-nao-utilizado",
    });

    try {
      const firstToken = createSessionToken();
      const first = await replaceSessionForUser(user.id, crypto.randomUUID(), hashSessionToken(firstToken), new Date(Date.now() + 60_000));
      expect(first.hadActiveSession).toBe(false);
      expect((await getUserFromSessionHash(hashSessionToken(firstToken)))?.id).toBe(user.id);

      const secondToken = createSessionToken();
      const second = await replaceSessionForUser(user.id, crypto.randomUUID(), hashSessionToken(secondToken), new Date(Date.now() + 60_000));
      expect(second.hadActiveSession).toBe(true);
      expect(await getUserFromSessionHash(hashSessionToken(firstToken))).toBeUndefined();
      expect((await getUserFromSessionHash(hashSessionToken(secondToken)))?.id).toBe(user.id);
    } finally {
      await deleteManagedUser(user.id);
    }
  });
});
