export type StudyWorkspaceAccessState = "loading" | "available" | "no-course" | "error";

export function resolveStudyWorkspaceAccessState(input: {
  isAdmin: boolean;
  catalogLoading: boolean;
  catalogError: boolean;
  permittedCourseCount: number;
}): StudyWorkspaceAccessState {
  if (input.isAdmin) return "available";
  if (input.catalogLoading) return "loading";
  if (input.catalogError) return "error";
  return input.permittedCourseCount > 0 ? "available" : "no-course";
}
