import { describe, expect, it } from "vitest";
import { matchesAccountDeletionConfirmation } from "./accountDeletion";

describe("confirmação de exclusão ROOT", () => {
  it("aceita o nome atual e o usuário atual sem diferenciar maiúsculas ou minúsculas", () => {
    const account = { name: "Paulo André Atualizado", username: "aluno.renomeado" };

    expect(matchesAccountDeletionConfirmation(account, "PAULO ANDRÉ ATUALIZADO")).toBe(true);
    expect(matchesAccountDeletionConfirmation(account, "Aluno.Renomeado")).toBe(true);
    expect(matchesAccountDeletionConfirmation(account, "nome antigo")).toBe(false);
  });
});
