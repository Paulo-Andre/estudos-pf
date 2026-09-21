import { describe, expect, it } from "vitest";

describe("credenciais do Mercado Pago", () => {
  it("autentica o Access Token de servidor sem expor seu valor", async () => {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    expect(accessToken).toBeTruthy();

    const response = await fetch("https://api.mercadopago.com/users/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.ok).toBe(true);
    const account = (await response.json()) as { id?: number };
    expect(account.id).toEqual(expect.any(Number));
  }, 20_000);
});
