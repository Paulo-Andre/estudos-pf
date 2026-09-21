import { describe, expect, it } from "vitest";
import { upsertPrivateNote, type PrivateNoteRepository } from "./db";

type MemoryNote = { id: number; userId: number; moduleId: string; content: string };

function createMemoryRepository(): PrivateNoteRepository<MemoryNote> {
  const rows: MemoryNote[] = [];
  let nextId = 1;
  return {
    find: async (userId, moduleId) => rows.find(row => row.userId === userId && row.moduleId === moduleId) ?? null,
    create: async (userId, moduleId, content) => {
      const row = { id: nextId++, userId, moduleId, content };
      rows.push(row);
      return row;
    },
    update: async (note, content) => {
      note.content = content;
      return note;
    },
  };
}

describe("upsertPrivateNote", () => {
  it("cria, recupera e edita a mesma anotação do módulo", async () => {
    const repository = createMemoryRepository();
    const first = await upsertPrivateNote(repository, 7, "lingua-portuguesa-01", "Revisar regência.");
    const changed = await upsertPrivateNote(repository, 7, "lingua-portuguesa-01", "Revisar regência e crase.");

    expect(changed.id).toBe(first.id);
    expect((await repository.find(7, "lingua-portuguesa-01"))?.content).toBe("Revisar regência e crase.");
  });

  it("isola anotações de usuários e módulos diferentes", async () => {
    const repository = createMemoryRepository();
    await upsertPrivateNote(repository, 7, "lingua-portuguesa-01", "Nota da conta 7.");
    await upsertPrivateNote(repository, 8, "lingua-portuguesa-01", "Nota da conta 8.");
    await upsertPrivateNote(repository, 7, "informatica-01", "Nota de outro módulo.");

    expect((await repository.find(7, "lingua-portuguesa-01"))?.content).toBe("Nota da conta 7.");
    expect((await repository.find(8, "lingua-portuguesa-01"))?.content).toBe("Nota da conta 8.");
    expect((await repository.find(7, "informatica-01"))?.content).toBe("Nota de outro módulo.");
  });
});
