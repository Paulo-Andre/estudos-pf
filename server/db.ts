import { and, desc, eq, gt, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  adminAuditLogs,
  authSessions,
  completedModules,
  courseEnrollments,
  InsertUser,
  simulationRecords,
  studyAnswers,
  studyNotes,
  studyProfiles,
  users,
} from "../drizzle/schema";
import { getEnrollmentLifecycleStatus } from "./enrollmentStatus";

type UserUpsertInput = {
  openId: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  passwordHash?: string | null;
  loginMethod?: string | null;
  role?: "user" | "admin";
  isBlocked?: boolean;
  lastSignedIn?: Date;
};

type LocalUserInput = {
  name: string;
  username: string;
  email: string | null;
  passwordHash: string;
  role?: "user" | "admin";
};

type SimulationInput = {
  id: string;
  total: number;
  correct: number;
  errors: number;
  elapsedSeconds: number;
  byDiscipline: Record<string, { correct: number; total: number }>;
  byBlock: Record<string, { correct: number; total: number }>;
  answers: { questionId: string; correct: boolean }[];
  questionIds: string[];
};

const emptyProfile = { xp: 0, lastStudyDate: null as string | null, studyDatesJson: "[]", usedQuestionIdsJson: "[]" };
let _db: ReturnType<typeof drizzle> | null = null;

function parseStringArray(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseMetric(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function currentStudyDay() {
  return new Date().toISOString().slice(0, 10);
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: UserUpsertInput): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = {
    openId: user.openId,
    name: user.name?.trim() || "Usuário Estudos PF",
    loginMethod: user.loginMethod || "oauth",
    role: user.role ?? "user",
    lastSignedIn: user.lastSignedIn ?? new Date(),
  };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  if (user.name) updateSet.name = user.name.trim();
  if (user.email) updateSet.email = user.email.toLowerCase();
  if (user.loginMethod) updateSet.loginMethod = user.loginMethod;
  if (user.role) updateSet.role = user.role;
  if (user.isBlocked !== undefined) updateSet.isBlocked = user.isBlocked;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.username, username.toLowerCase())).limit(1);
  return result[0];
}

export async function getUserByIdentifier(identifier: string) {
  const db = await getDb();
  if (!db) return undefined;
  const value = identifier.trim().toLowerCase();
  const result = await db.select().from(users).where(or(eq(users.username, value), eq(users.email, value))).limit(1);
  return result[0];
}

export async function createLocalUser(input: LocalUserInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const username = input.username.trim().toLowerCase();
  const email = input.email?.trim().toLowerCase() || null;
  await db.insert(users).values({
    openId: `local:${username}`,
    name: input.name.trim(),
    username,
    email,
    passwordHash: input.passwordHash,
    loginMethod: "local",
    role: input.role ?? "user",
  });
  const user = await getUserByUsername(username);
  if (!user) throw new Error("Conta criada, mas não encontrada");
  await ensureStudyProfile(user.id);
  return user;
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function updateUserProfile(userId: number, input: { name: string; username: string; email: string }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const username = input.username.trim().toLowerCase();
  await db.update(users).set({
    name: input.name.trim(),
    username,
    email: input.email.trim().toLowerCase(),
  }).where(eq(users.id, userId));
  return getUserById(userId);
}

export async function createSession(userId: number, id: string, tokenHash: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(authSessions).values({ id, userId, tokenHash, expiresAt });
}

export async function getUserFromSessionHash(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const session = await db.select().from(authSessions).where(and(eq(authSessions.tokenHash, tokenHash), gt(authSessions.expiresAt, new Date()))).limit(1);
  if (!session[0]) return undefined;
  return getUserById(session[0].userId);
}

export async function deleteSessionByHash(tokenHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(authSessions).where(eq(authSessions.tokenHash, tokenHash));
}

export async function deleteSessionsForUser(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(authSessions).where(eq(authSessions.userId, userId));
}

async function ensureStudyProfile(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await db.select().from(studyProfiles).where(eq(studyProfiles.userId, userId)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(studyProfiles).values({ userId, ...emptyProfile });
  const created = await db.select().from(studyProfiles).where(eq(studyProfiles.userId, userId)).limit(1);
  return created[0]!;
}

async function registerStudyActivity(userId: number, xpDelta: number, questionIds: string[] = []) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const profile = await ensureStudyProfile(userId);
  const day = currentStudyDay();
  const studyDates = Array.from(new Set([...parseStringArray(profile.studyDatesJson), day]));
  const usedQuestionIds = Array.from(new Set([...parseStringArray(profile.usedQuestionIdsJson), ...questionIds]));
  await db.update(studyProfiles).set({
    xp: profile.xp + xpDelta,
    lastStudyDate: day,
    studyDatesJson: JSON.stringify(studyDates),
    usedQuestionIdsJson: JSON.stringify(usedQuestionIds),
  }).where(eq(studyProfiles.userId, userId));
}

export async function getStudyState(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const profile = await ensureStudyProfile(userId);
  const [modules, answers, simulations] = await Promise.all([
    db.select().from(completedModules).where(eq(completedModules.userId, userId)),
    db.select().from(studyAnswers).where(eq(studyAnswers.userId, userId)).orderBy(desc(studyAnswers.answeredAt)),
    db.select().from(simulationRecords).where(eq(simulationRecords.userId, userId)).orderBy(desc(simulationRecords.completedAt)),
  ]);
  return {
    completedModules: modules.map(item => item.moduleId),
    answers: answers.reverse().map(item => ({ questionId: item.questionId, correct: item.correct, answeredAt: item.answeredAt.toISOString() })),
    simulations: simulations.reverse().map(item => ({
      id: item.id,
      date: item.completedAt.toISOString(),
      total: item.total,
      correct: item.correct,
      errors: item.errors,
      elapsedSeconds: item.elapsedSeconds,
      byDiscipline: parseMetric(item.byDisciplineJson),
      byBlock: parseMetric(item.byBlockJson),
    })),
    xp: profile.xp,
    lastStudyDate: profile.lastStudyDate ?? undefined,
    studyDates: parseStringArray(profile.studyDatesJson),
    usedQuestionIds: parseStringArray(profile.usedQuestionIdsJson),
  };
}

export async function recordAnswer(userId: number, questionId: string, correct: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(studyAnswers).values({ userId, questionId, correct });
  await registerStudyActivity(userId, correct ? 8 : 2);
  return getStudyState(userId);
}

export async function completeStudyModule(userId: number, moduleId: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await db.select().from(completedModules).where(and(eq(completedModules.userId, userId), eq(completedModules.moduleId, moduleId))).limit(1);
  if (!existing[0]) {
    await db.insert(completedModules).values({ userId, moduleId });
    await registerStudyActivity(userId, 20);
  }
  return getStudyState(userId);
}

export async function recordSimulation(userId: number, input: SimulationInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(simulationRecords).values({
    id: input.id,
    userId,
    total: input.total,
    correct: input.correct,
    errors: input.errors,
    elapsedSeconds: input.elapsedSeconds,
    byDisciplineJson: JSON.stringify(input.byDiscipline),
    byBlockJson: JSON.stringify(input.byBlock),
  });
  if (input.answers.length) await db.insert(studyAnswers).values(input.answers.map(answer => ({ ...answer, userId })));
  await registerStudyActivity(userId, input.correct * 8 + 15, input.questionIds);
  return getStudyState(userId);
}

export async function getNote(userId: number, moduleId: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const note = await db.select().from(studyNotes).where(and(eq(studyNotes.userId, userId), eq(studyNotes.moduleId, moduleId))).limit(1);
  return note[0] ?? null;
}

export async function saveNote(userId: number, moduleId: string, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const note = await getNote(userId, moduleId);
  if (note) await db.update(studyNotes).set({ content }).where(eq(studyNotes.id, note.id));
  else await db.insert(studyNotes).values({ userId, moduleId, content });
  return getNote(userId, moduleId);
}

export async function listManagedUsers(search?: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const term = search?.trim().toLowerCase();
  const query = db.select({
    id: users.id, name: users.name, username: users.username, email: users.email, role: users.role,
    isBlocked: users.isBlocked, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn,
  }).from(users);
  if (!term) return query.orderBy(desc(users.createdAt)).limit(100);
  return query.where(or(like(users.name, `%${term}%`), like(users.username, `%${term}%`), like(users.email, `%${term}%`))).orderBy(desc(users.createdAt)).limit(100);
}

export async function getAdminStats() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const [usersCount, blockedCount, answersCount, simulationsCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isBlocked, true)),
    db.select({ count: sql<number>`count(*)` }).from(studyAnswers),
    db.select({ count: sql<number>`count(*)` }).from(simulationRecords),
  ]);
  return { users: Number(usersCount[0]?.count ?? 0), blocked: Number(blockedCount[0]?.count ?? 0), answers: Number(answersCount[0]?.count ?? 0), simulations: Number(simulationsCount[0]?.count ?? 0) };
}

export async function writeAdminAudit(actorUserId: number, affectedUserId: number | null, action: string, detail: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(adminAuditLogs).values({ actorUserId, affectedUserId, action, detail });
}

export async function updateManagedUser(userId: number, input: { name: string; username: string; email: string }) {
  return updateUserProfile(userId, input);
}

export async function setUserBlocked(userId: number, isBlocked: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(users).set({ isBlocked }).where(eq(users.id, userId));
  if (isBlocked) await deleteSessionsForUser(userId);
}

export async function deleteManagedUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await Promise.all([
    db.delete(authSessions).where(eq(authSessions.userId, userId)),
    db.delete(completedModules).where(eq(completedModules.userId, userId)),
    db.delete(studyAnswers).where(eq(studyAnswers.userId, userId)),
    db.delete(simulationRecords).where(eq(simulationRecords.userId, userId)),
    db.delete(studyNotes).where(eq(studyNotes.userId, userId)),
    db.delete(studyProfiles).where(eq(studyProfiles.userId, userId)),
  ]);
  await db.delete(users).where(eq(users.id, userId));
}

export async function listAdminAuditLogs() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(100);
}

function serializeEnrollment(enrollment: typeof courseEnrollments.$inferSelect) {
  return { ...enrollment, computedStatus: getEnrollmentLifecycleStatus(enrollment) };
}

export async function listUserEnrollments(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rows = await db.select().from(courseEnrollments).where(eq(courseEnrollments.userId, userId)).orderBy(desc(courseEnrollments.createdAt));
  return rows.map(serializeEnrollment);
}

export async function getUserCourseAccess(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rows = await db.select().from(courseEnrollments).where(and(
    eq(courseEnrollments.userId, userId),
    eq(courseEnrollments.status, "active"),
    sql`${courseEnrollments.startAt} <= NOW()`,
    sql`${courseEnrollments.expiresAt} > NOW()`,
  ));
  return rows.map(serializeEnrollment);
}

export async function grantCourseEnrollment(actorUserId: number, userId: number, courseId: string, startAt: Date, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await db.select().from(courseEnrollments).where(and(eq(courseEnrollments.userId, userId), eq(courseEnrollments.courseId, courseId))).limit(1);
  let enrollment;
  if (existing[0]) {
    await db.update(courseEnrollments).set({ startAt, expiresAt, status: "active", revokedAt: null }).where(eq(courseEnrollments.id, existing[0].id));
    enrollment = await db.select().from(courseEnrollments).where(eq(courseEnrollments.id, existing[0].id)).limit(1);
  } else {
    const result = await db.insert(courseEnrollments).values({ userId, courseId, startAt, expiresAt, status: "active", createdByUserId: actorUserId });
    enrollment = await db.select().from(courseEnrollments).where(eq(courseEnrollments.id, result[0].insertId)).limit(1);
  }
  const saved = enrollment[0];
  if (!saved) throw new Error("Matrícula não foi salva");
  await writeAdminAudit(actorUserId, userId, "LIBERACAO_DE_CURSO", `Curso ${courseId} liberado de ${startAt.toISOString()} até ${expiresAt.toISOString()}.`);
  return serializeEnrollment(saved);
}

export async function revokeCourseEnrollment(actorUserId: number, userId: number, courseId: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await db.select().from(courseEnrollments).where(and(eq(courseEnrollments.userId, userId), eq(courseEnrollments.courseId, courseId))).limit(1);
  if (!existing[0]) throw new Error("Matrícula não encontrada");
  await db.update(courseEnrollments).set({ status: "revoked", revokedAt: new Date() }).where(eq(courseEnrollments.id, existing[0].id));
  await writeAdminAudit(actorUserId, userId, "REVOGACAO_DE_CURSO", `Curso ${courseId} revogado.`);
  const updated = await db.select().from(courseEnrollments).where(eq(courseEnrollments.id, existing[0].id)).limit(1);
  return updated[0] ? serializeEnrollment(updated[0]) : null;
}
