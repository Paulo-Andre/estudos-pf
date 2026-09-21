import { describe, expect, it } from "vitest";
import { createLocalUser, createManagedCourse, deleteManagedCourse, deleteManagedUser, grantCourseEnrollment, listStudyCourseCatalog, updateManagedCourse } from "./db";

describe("capas de curso administradas pelo ROOT", () => {
  it("persiste a capa criada e a capa alterada sem afetar o identificador do curso", async () => {
    const token = `qa-cover-${Date.now().toString(36)}`;
    const actor = await createLocalUser({
      name: "ROOT de capas QA",
      username: `${token}-root`,
      email: `${token}-root@example.invalid`,
      cpf: null,
      passwordHash: "hash-de-teste-nao-utilizado",
      role: "admin",
    });
    const learner = await createLocalUser({
      name: "Aluno de capas QA",
      username: `${token}-student`,
      email: `${token}-student@example.invalid`,
      cpf: null,
      passwordHash: "hash-de-teste-nao-utilizado",
    });
    const courseId = `${token}-course`;

    try {
      const created = await createManagedCourse(actor.id, {
        id: courseId,
        title: "Curso com capa de QA",
        track: "qa",
        description: "Valida persistência de imagem de capa.",
        coverImageUrl: "https://cdn.example.invalid/cover-inicial.webp",
        panelLabel: "Operação de teste",
        panelBadge: "Dossiê QA",
        panelTitle: "Preparação personalizada de QA",
        panelDescription: "Descrição inicial para validar o cartão principal.",
        panelCtaText: "Abrir trilha QA",
      });
      expect(created.coverImageUrl).toBe("https://cdn.example.invalid/cover-inicial.webp");
      expect(created.panelTitle).toBe("Preparação personalizada de QA");

      const updated = await updateManagedCourse(actor.id, courseId, {
        title: "Curso com capa atualizada de QA",
        track: "qa",
        description: "Valida alteração de imagem de capa.",
        coverImageUrl: "https://cdn.example.invalid/cover-atualizada.webp",
        panelLabel: "Operação atualizada",
        panelBadge: "Dossiê atualizado",
        panelTitle: "Cartão atualizado de QA",
        panelDescription: "Descrição atualizada para o Painel do aluno.",
        panelCtaText: "Continuar QA",
      });
      expect(updated.id).toBe(courseId);
      expect(updated.coverImageUrl).toBe("https://cdn.example.invalid/cover-atualizada.webp");
      expect(updated.panelCtaText).toBe("Continuar QA");

      await grantCourseEnrollment(actor.id, learner.id, courseId, new Date(Date.now() - 60_000), new Date(Date.now() + 60_000));
      const availableToLearner = await listStudyCourseCatalog(learner.id);
      expect(availableToLearner).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: courseId, title: "Curso com capa atualizada de QA", coverImageUrl: "https://cdn.example.invalid/cover-atualizada.webp", panelLabel: "Operação atualizada", panelBadge: "Dossiê atualizado", panelTitle: "Cartão atualizado de QA", panelDescription: "Descrição atualizada para o Painel do aluno.", panelCtaText: "Continuar QA" }),
      ]));
    } finally {
      await deleteManagedCourse(actor.id, courseId, courseId).catch(() => undefined);
      await deleteManagedUser(learner.id).catch(() => undefined);
      await deleteManagedUser(actor.id).catch(() => undefined);
    }
  });
});
