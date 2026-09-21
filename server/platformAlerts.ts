export const platformAlertLevels = ["improvement", "warning", "urgent"] as const;
export const platformAlertAudiences = ["all", "course"] as const;

export type PlatformAlertLevel = (typeof platformAlertLevels)[number];
export type PlatformAlertAudience = (typeof platformAlertAudiences)[number];

type AlertVisibilityInput = {
  id: number;
  audience: PlatformAlertAudience;
  courseId: string | null;
};

/** Um alerta por curso é visível somente com matrícula vigente e sem fechamento individual. */
export function isPlatformAlertVisibleForUser(
  alert: AlertVisibilityInput,
  activeCourseIds: ReadonlySet<string>,
  dismissedAlertIds: ReadonlySet<number>,
) {
  if (dismissedAlertIds.has(alert.id)) return false;
  return alert.audience === "all" || Boolean(alert.courseId && activeCourseIds.has(alert.courseId));
}
