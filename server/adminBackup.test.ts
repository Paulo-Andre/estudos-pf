import { describe, expect, it } from "vitest";
import { serializeAdminBackup } from "./adminBackup";

describe("serializeAdminBackup", () => {
  it("identifica o formato, contabiliza registros e declara a exclusão de sessões", () => {
    const exported = serializeAdminBackup(
      {
        users: [
          {
            id: 1,
            openId: "local:root",
            name: "Paulo André",
            username: "paulo",
            email: "root@example.test",
            cpf: null,
            loginMethod: "local",
            role: "admin",
            isBlocked: false,
            createdAt: new Date("2026-08-20T12:00:00.000Z"),
            updatedAt: new Date("2026-08-20T12:00:00.000Z"),
            lastSignedIn: new Date("2026-08-20T12:00:00.000Z"),
          },
        ],
        courses: [{ id: 7, title: "Polícia Federal" }],
      },
      new Date("2026-08-20T15:00:00.000Z"),
    );

    expect(exported).toMatchObject({
      format: "nucleo-concursos-logical-backup",
      version: 1,
      generatedAt: "2026-08-20T15:00:00.000Z",
      excludedTables: ["authSessions"],
      tableCounts: { users: 1, courses: 1 },
    });
    expect(exported.restoreNotes.join(" ")).toMatch(/sessões ativas foram excluídos/i);
    expect(JSON.stringify(exported)).not.toContain("passwordHash");
  });
});
