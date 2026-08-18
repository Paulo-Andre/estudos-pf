import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("limites de permissão", () => {
  it("não libera dados de estudo a uma sessão inexistente", async () => {
    const caller = appRouter.createCaller(contextFor(null));

    await expect(caller.study.state()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("não libera rotas administrativas a um estudante comum", async () => {
    const caller = appRouter.createCaller(contextFor({
      id: 42,
      openId: "local:estudante",
      name: "Estudante",
      username: "estudante",
      email: "estudante@example.com",
      passwordHash: "hash-inacessivel",
      loginMethod: "local",
      role: "user",
      isBlocked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    }));

    await expect(caller.admin.stats()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
