import { describe, expect, it } from "vitest";
import { resolveStudyWorkspaceAccessState } from "./studyWorkspaceAccess";

describe("resolveStudyWorkspaceAccessState", () => {
  it("mantém o aluno em carregamento até o catálogo de cursos responder", () => {
    expect(resolveStudyWorkspaceAccessState({ isAdmin: false, catalogLoading: true, catalogError: false, permittedCourseCount: 0 })).toBe("loading");
  });

  it("libera o Painel apenas quando o catálogo confirmou curso permitido", () => {
    expect(resolveStudyWorkspaceAccessState({ isAdmin: false, catalogLoading: false, catalogError: false, permittedCourseCount: 1 })).toBe("available");
  });

  it("mostra a tela de matrícula apenas após uma resposta vazia confirmada", () => {
    expect(resolveStudyWorkspaceAccessState({ isAdmin: false, catalogLoading: false, catalogError: false, permittedCourseCount: 0 })).toBe("no-course");
  });

  it("não confunde uma falha de consulta com ausência de matrícula", () => {
    expect(resolveStudyWorkspaceAccessState({ isAdmin: false, catalogLoading: false, catalogError: true, permittedCourseCount: 0 })).toBe("error");
  });

  it("mantém o ROOT com acesso integral durante o carregamento do catálogo", () => {
    expect(resolveStudyWorkspaceAccessState({ isAdmin: true, catalogLoading: true, catalogError: false, permittedCourseCount: 0 })).toBe("available");
  });
});
