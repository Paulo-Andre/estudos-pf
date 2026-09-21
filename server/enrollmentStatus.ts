export type EnrollmentLifecycleStatus = "scheduled" | "active" | "expired" | "revoked";

const START_TIME_PRECISION_TOLERANCE_MS = 1_000;

export function getEnrollmentLifecycleStatus(
  enrollment: { status: "active" | "revoked"; startAt: Date; expiresAt: Date },
  now = new Date(),
): EnrollmentLifecycleStatus {
  if (enrollment.status === "revoked") return "revoked";
  if (enrollment.expiresAt <= now) return "expired";
  // Colunas TIMESTAMP sem milissegundos podem arredondar uma liberação imediata
  // para o próximo segundo. A margem impede um falso estado "agendado" nesse intervalo.
  if (enrollment.startAt.getTime() - now.getTime() > START_TIME_PRECISION_TOLERANCE_MS) return "scheduled";
  return "active";
}
