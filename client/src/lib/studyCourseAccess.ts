export type VisibleStudyCourse = { id: string; isActive: boolean; courseType: "concurso" | "tutorial" };

/** O seletor do aluno recebe somente o catálogo já autorizado pelo servidor e nunca mostra cursos inativos. */
export function visibleStudyCourses<T extends VisibleStudyCourse>(courses: T[]) {
  return courses.filter(course => course.isActive);
}

export function resolveVisibleStudyCourseId(courses: VisibleStudyCourse[], requestedId: string, fallbackId: string) {
  return courses.some(course => course.id === requestedId) ? requestedId : (courses[0]?.id ?? fallbackId);
}
