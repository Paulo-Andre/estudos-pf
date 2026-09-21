import { parse as parseCookieHeader } from "cookie";
import { jwtVerify } from "jose";
import type { Request } from "express";
import { ENV } from "./env";
import type { GetUserInfoWithJwtResponse } from "./types/manusTypes";

const SCHEDULE_SESSION_COOKIE = "app_session_id";
const CRON_OPEN_ID_PREFIX = "cron_";
const GET_USER_INFO_WITH_JWT_PATH = "/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt";

export type ScheduledTaskIdentity = { taskUid: string };

/**
 * Valida somente as credenciais geradas pela plataforma para callbacks
 * agendados. Isso não reativa OAuth para visitantes ou alunos da aplicação.
 */
export async function authenticateScheduledTaskRequest(req: Request): Promise<ScheduledTaskIdentity | null> {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const bearer = req.header("authorization");
  const token = cookies[SCHEDULE_SESSION_COOKIE] ?? (bearer?.startsWith("Bearer ") ? bearer.slice(7) : undefined);
  if (!token || !ENV.cookieSecret || !ENV.oAuthServerUrl || !ENV.appId) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(ENV.cookieSecret), { algorithms: ["HS256"] });
    if (typeof payload.openId !== "string" || !payload.openId.startsWith(CRON_OPEN_ID_PREFIX)) return null;
    const endpoint = new URL(GET_USER_INFO_WITH_JWT_PATH, ENV.oAuthServerUrl).toString();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ jwtToken: token, projectId: ENV.appId }),
    });
    if (!response.ok) throw new Error(`Não foi possível validar a tarefa agendada (${response.status}).`);
    const user = await response.json() as GetUserInfoWithJwtResponse;
    return user.taskUid ? { taskUid: user.taskUid } : null;
  } catch (error) {
    console.warn("[Scheduled task] autenticação recusada:", error instanceof Error ? error.message : error);
    return null;
  }
}
