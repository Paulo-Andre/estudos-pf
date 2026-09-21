export type ContentNoticeKind = "new" | "updated";

export const contentNoticeLabels: Record<ContentNoticeKind, string> = {
  new: "CONTEÚDO NOVO",
  updated: "CONTEÚDO ATUALIZADO",
};

export function resolveStudentContentNotice(input: {
  kind: ContentNoticeKind | null;
  activatedAt: Date | null;
  enrollmentStartedAt: Date | null;
  lastOpenedAt: Date | null;
  isAdmin?: boolean;
}) {
  if (input.isAdmin || !input.kind || !input.activatedAt || !input.enrollmentStartedAt) return null;
  if (input.enrollmentStartedAt.getTime() > input.activatedAt.getTime()) return null;
  if (input.lastOpenedAt && input.lastOpenedAt.getTime() >= input.activatedAt.getTime()) return null;
  return { kind: input.kind, label: contentNoticeLabels[input.kind], activatedAt: input.activatedAt.toISOString() };
}
