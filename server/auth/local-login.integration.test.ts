import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { LOCAL_SESSION_COOKIE } from "./localAuth";

type CookieRecord = { name: string; value: string };

function createContext() {
  const cookies: CookieRecord[] = [];
  const request = { protocol: "https", headers: {} } as TrpcContext["req"];
  const context: TrpcContext = {
    user: null,
    req: request,
    res: {
      cookie: (name: string, value: string) => cookies.push({ name, value }),
      clearCookie: () => undefined,
    } as TrpcContext["res"],
  };
  return { context, request, cookies };
}

describe("login local ROOT", () => {
  it("autentica paulo como admin e encerra a sessão local", async () => {
    const password = process.env.ROOT_INITIAL_PASSWORD;
    expect(password).toBeTruthy();

    const { context, request, cookies } = createContext();
    const caller = appRouter.createCaller(context);
    const signedIn = await caller.auth.login({ identifier: "paulo", password: password! });

    expect(signedIn).toMatchObject({ user: { username: "paulo", role: "admin" }, hadActiveSession: expect.any(Boolean) });
    const session = cookies.find(cookie => cookie.name === LOCAL_SESSION_COOKIE);
    expect(session?.value).toBeTruthy();

    (request.headers as Record<string, string>).cookie = `${LOCAL_SESSION_COOKIE}=${session!.value}`;
    await expect(caller.auth.logout()).resolves.toEqual({ success: true });
  });
});
