import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("configuração inicial ROOT", () => {
  it("confirma por procedimento público que a credencial segura foi provisionada sem expor seu valor", async () => {
    const ctx = {
      user: null,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    } as TrpcContext;

    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.bootstrapStatus()).resolves.toEqual({ rootBootstrapReady: true });
  });
});
