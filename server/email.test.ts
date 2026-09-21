import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("e-mails transacionais", () => {
  it("prepara uma confirmação de compra para o destinatário correto", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_only");
    vi.stubEnv("RESEND_FROM_EMAIL", "Núcleo Concursos <contato@example.com>");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "email_123" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { sendPurchaseConfirmation } = await import("./email");

    await sendPurchaseConfirmation({ to: "aluno@example.com", name: "Ana", planTitle: "PF Anual", accessExpiresAt: new Date("2026-12-31T12:00:00Z") });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.resend.com/emails");
    expect(body.to).toEqual(["aluno@example.com"]);
    expect(body.subject).toContain("Compra confirmada");
    expect(body.html).toContain("PF Anual");
  });

  it("prepara um link de recuperação com validade explicada", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_only");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "email_456" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { sendPasswordResetEmail } = await import("./email");

    await sendPasswordResetEmail({ to: "aluno@example.com", name: "João", resetUrl: "https://site.example/?reset=opaque-token" });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.subject).toContain("Redefina sua senha");
    expect(body.html).toContain("opaque-token");
    expect(body.html).toContain("1 hora");
  });
});
