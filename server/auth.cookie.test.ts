import { describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "./_core/cookies";

describe("política de cookie de sessão", () => {
  it("usa SameSite=Lax para sessão local em HTTP", () => {
    const options = getSessionCookieOptions({
      protocol: "http",
      headers: {},
      hostname: "127.0.0.1",
    } as any);

    expect(options).toMatchObject({ secure: false, sameSite: "lax", httpOnly: true, path: "/" });
  });

  it("mantém SameSite=None somente em sessão HTTPS segura", () => {
    const options = getSessionCookieOptions({
      protocol: "https",
      headers: {},
      hostname: "estudospf-peiyfhjy.manus.space",
    } as any);

    expect(options).toMatchObject({ secure: true, sameSite: "none", httpOnly: true, path: "/" });
  });
});
