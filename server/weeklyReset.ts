import type { Request, Response } from "express";
import { runWeeklyCompetitionReset } from "./db";
import { authenticateScheduledTaskRequest } from "./_core/scheduledAuth";

/** Callback do Heartbeat: reinicia a apuração semanal, nunca os registros históricos. */
export async function weeklyResetHandler(req: Request, res: Response) {
  let taskUid: string | undefined;
  try {
    const scheduledTask = await authenticateScheduledTaskRequest(req);
    if (!scheduledTask) return res.status(403).json({ error: "cron-only" });
    taskUid = scheduledTask.taskUid;
    const result = await runWeeklyCompetitionReset(taskUid);
    return res.status(200).json({ ok: true, taskUid, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Weekly reset] falhou:", message);
    return res.status(500).json({
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
      context: { url: req.originalUrl, taskUid: taskUid ?? null },
      timestamp: new Date().toISOString(),
    });
  }
}
