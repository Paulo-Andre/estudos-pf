export type StudyAccessRole = "user" | "admin";

/**
 * ROOT/admin tem acesso operacional independente de matrícula; alunos comuns
 * precisam de ao menos uma matrícula vigente.
 */
export function canAccessStudy(role: StudyAccessRole, activeEnrollmentCount: number) {
  return role === "admin" || activeEnrollmentCount > 0;
}
