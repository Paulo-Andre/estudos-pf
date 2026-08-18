export type EnrollmentLifecycleStatus = "scheduled" | "active" | "expired" | "revoked";

export function getEnrollmentLifecycleStatus(
  enrollment: { status: "active" | "revoked"; startAt: Date; expiresAt: Date },
  now = new Date(),
): EnrollmentLifecycleStatus {
  if (enrollment.status === "revoked") return "revoked";
  if (enrollment.expiresAt <= now) return "expired";
  if (enrollment.startAt > now) return "scheduled";
  return "active";
}
