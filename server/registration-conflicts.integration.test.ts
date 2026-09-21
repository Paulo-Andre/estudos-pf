import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { deleteManagedUser } from "./db";
import { appRouter } from "./routers";

function publicRegistrationContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { cookie: () => undefined } as TrpcContext["res"],
  };
}

describe("conflitos específicos do cadastro local", () => {
  it("distingue usuário, e-mail e CPF ocupados e aceita um CPF novo válido", async () => {
    const token = `qa-registration-${Date.now().toString(36)}`;
    const caller = appRouter.createCaller(publicRegistrationContext());
    const createdUserIds: number[] = [];
    const password = "SenhaSegura123";

    try {
      const first = await caller.auth.register({
        name: "Pessoa de teste inicial",
        username: `${token}-original`,
        email: `${token}-original@example.invalid`,
        cpf: "529.982.247-25",
        password,
        passwordConfirmation: password,
      });
      createdUserIds.push(first.user.id);

      await expect(caller.auth.register({
        name: "Conflito de usuário",
        username: `${token}-original`,
        email: `${token}-usuario@example.invalid`,
        cpf: "111.444.777-35",
        password,
        passwordConfirmation: password,
      })).rejects.toThrow("Este nome de usuário já está em uso.");

      await expect(caller.auth.register({
        name: "Conflito de e-mail",
        username: `${token}-email`,
        email: `${token}-original@example.invalid`,
        cpf: "111.444.777-35",
        password,
        passwordConfirmation: password,
      })).rejects.toThrow("Este e-mail já está em uso.");

      await expect(caller.auth.register({
        name: "Conflito de CPF",
        username: `${token}-cpf`,
        email: `${token}-cpf@example.invalid`,
        cpf: "529.982.247-25",
        password,
        passwordConfirmation: password,
      })).rejects.toThrow("Este CPF já está em uso.");

      const second = await caller.auth.register({
        name: "Pessoa de teste com CPF novo",
        username: `${token}-novo`,
        email: `${token}-novo@example.invalid`,
        cpf: "111.444.777-35",
        password,
        passwordConfirmation: password,
      });
      createdUserIds.push(second.user.id);
      expect(second.user.cpf).toBe("11144477735");
    } finally {
      for (const userId of createdUserIds.reverse()) await deleteManagedUser(userId);
    }
  });
});

