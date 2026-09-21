import { ENV } from "./_core/env";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function sender() {
  return ENV.resendFromEmail.trim() || "Núcleo Concursos <onboarding@resend.dev>";
}

function applicationUrl() {
  return process.env.PUBLIC_APP_URL?.trim().replace(/\/$/, "") || "https://estudospf-peiyfhjy.manus.space";
}

async function deliverEmail(input: { to: string; subject: string; html: string; text: string }) {
  const apiKey = ENV.resendApiKey.trim();
  if (!apiKey) return { sent: false as const, reason: "not_configured" as const };

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: sender(), to: [input.to], subject: input.subject, html: input.html, text: input.text }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend recusou o envio (${response.status}): ${body.slice(0, 300)}`);
  }
  const result = await response.json().catch(() => ({})) as { id?: string };
  return { sent: true as const, id: result.id ?? null };
}

export async function sendPurchaseConfirmation(input: { to: string; name: string; planTitle: string; accessExpiresAt: Date }) {
  const name = escapeHtml(input.name || "candidato(a)");
  const planTitle = escapeHtml(input.planTitle);
  const expiresAt = input.accessExpiresAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return deliverEmail({
    to: input.to,
    subject: "Compra confirmada — Núcleo Concursos",
    text: `Olá, ${input.name || "candidato(a)"}. Sua compra do plano ${input.planTitle} foi confirmada. O acesso está disponível na plataforma e possui vigência prevista até ${expiresAt}.`,
    html: `<main style="font-family:Arial,sans-serif;color:#173d4a;max-width:600px;margin:auto"><h1 style="font-size:24px">Compra confirmada</h1><p>Olá, <strong>${name}</strong>.</p><p>Recebemos a confirmação do seu pagamento para o plano <strong>${planTitle}</strong>.</p><p>Seu acesso já está disponível na plataforma, com vigência prevista até <strong>${expiresAt}</strong>.</p><p><a href="${escapeHtml(applicationUrl())}/" style="display:inline-block;background:#0e5a70;color:#fff;padding:12px 18px;text-decoration:none;border-radius:8px">Acessar meus estudos</a></p><p style="font-size:12px;color:#52716f">Núcleo Concursos</p></main>`,
  });
}

export async function sendPasswordResetEmail(input: { to: string; name: string; resetUrl: string }) {
  const name = escapeHtml(input.name || "candidato(a)");
  const resetUrl = escapeHtml(input.resetUrl);
  return deliverEmail({
    to: input.to,
    subject: "Redefina sua senha — Núcleo Concursos",
    text: `Olá, ${input.name || "candidato(a)"}. Para redefinir sua senha, abra este link em até uma hora: ${input.resetUrl}. Se você não pediu essa alteração, ignore esta mensagem.`,
    html: `<main style="font-family:Arial,sans-serif;color:#173d4a;max-width:600px;margin:auto"><h1 style="font-size:24px">Redefinição de senha</h1><p>Olá, <strong>${name}</strong>.</p><p>Recebemos uma solicitação para redefinir a senha da sua conta.</p><p><a href="${resetUrl}" style="display:inline-block;background:#0e5a70;color:#fff;padding:12px 18px;text-decoration:none;border-radius:8px">Criar nova senha</a></p><p>Este link é individual e expira em <strong>1 hora</strong>.</p><p style="font-size:13px;color:#52716f">Se você não solicitou essa alteração, ignore este e-mail. A senha atual continuará válida.</p></main>`,
  });
}
