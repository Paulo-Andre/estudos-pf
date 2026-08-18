import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { parse as parseCookieHeader } from "cookie";
import { getUserFromSessionHash } from "../db";
import { hashSessionToken, LOCAL_SESSION_COOKIE } from "../auth/localAuth";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const cookies = parseCookieHeader(opts.req.headers.cookie ?? "");
    const localToken = cookies[LOCAL_SESSION_COOKIE];
    if (localToken) user = await getUserFromSessionHash(hashSessionToken(localToken)) ?? null;

    // OAuth is the primary login on the published site. Only fall back to it
    // when no valid local session was found, preserving the local login flow.
    if (!user) {
      try {
        user = await sdk.authenticateRequest(opts.req);
      } catch {
        // Authentication is optional for public procedures.
        user = null;
      }
    }

    if (user?.isBlocked) user = null;
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
