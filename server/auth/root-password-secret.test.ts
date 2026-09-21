import { describe, expect, it } from "vitest";
import { ENV } from "../_core/env";
import { hashPassword, verifyPassword } from "./localAuth";

describe("ROOT_INITIAL_PASSWORD", () => {
  it("é aceita pelo mecanismo de senha local scrypt", async () => {
    expect(ENV.rootInitialPassword.length).toBeGreaterThanOrEqual(8);
    const storedHash = await hashPassword(ENV.rootInitialPassword);
    await expect(verifyPassword(ENV.rootInitialPassword, storedHash)).resolves.toBe(true);
  });
});
