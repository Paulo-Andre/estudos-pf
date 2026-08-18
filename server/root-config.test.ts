import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { isConfiguredRootIdentity } from "./auth/rootConfig";

describe("configuração inicial ROOT", () => {
  it("promove somente a identidade do proprietário configurada", () => {
    expect(isConfiguredRootIdentity("owner-123", "owner-123")).toBe(true);
    expect(isConfiguredRootIdentity("student-456", "owner-123")).toBe(false);
    expect(isConfiguredRootIdentity("owner-123", "")).toBe(false);
  });

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
