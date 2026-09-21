import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { formatCpf, isValidCpf, normalizeCpf } from "./cpf";
import { appRouter } from "./routers";

describe("validação de CPF", () => {
  it("normaliza, formata e aceita CPF com dígitos verificadores válidos", () => {
    expect(normalizeCpf("529.982.247-25")).toBe("52998224725");
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
    expect(isValidCpf("529.982.247-25")).toBe(true);
  });

  it("rejeita tamanho incorreto, repetição e dígitos verificadores inválidos", () => {
    expect(isValidCpf("123")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("529.982.247-24")).toBe(false);
  });

  it("bloqueia no contrato público um cadastro com CPF inválido antes de acessar o banco", async () => {
    const context: TrpcContext = { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
    await expect(appRouter.createCaller(context).auth.register({ name: "Pessoa de Teste", username: "pessoa-teste", email: "pessoa-teste@example.invalid", cpf: "111.111.111-11", password: "SenhaSegura123", passwordConfirmation: "SenhaSegura123" })).rejects.toThrow("Informe um CPF válido.");
  });
});
