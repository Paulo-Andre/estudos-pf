import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { getUserByUsername } from "./db";
import { appRouter } from "./routers";

describe("fila de revisão sem pendências", () => {
  it("retorna uma lista vazia de forma segura para uma busca sem resultados", async () => {
    const root = await getUserByUsername("paulo");
    expect(root).toMatchObject({ username: "paulo", role: "admin" });
    if (!root) return;

    const context: TrpcContext = {
      user: root,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(context);
    const reviews = await caller.admin.review.list({
      status: "pending",
      search: `__sem-pendencias-${Date.now().toString(36)}`,
    });

    expect(reviews).toEqual([]);
  });
});
