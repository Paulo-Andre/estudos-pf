import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Identidade principal da plataforma. Contas locais usam openId no formato
 * `local:<nomeDeUsuario>`; contas OAuth continuam compatíveis com o modelo do template.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  username: varchar("username", { length: 48 }).unique(),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }).notNull().default("local"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isBlocked: boolean("isBlocked").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** Sessões opacas: somente o hash do token é persistido. */
export const authSessions = mysqlTable("authSessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("authSessions_userId_idx").on(table.userId), index("authSessions_expiresAt_idx").on(table.expiresAt)]);

/** Estado agregado necessário para XP, sequência e seleção de questões do estudante. */
export const studyProfiles = mysqlTable("studyProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  xp: int("xp").notNull().default(0),
  lastStudyDate: varchar("lastStudyDate", { length: 10 }),
  studyDatesJson: text("studyDatesJson").notNull(),
  usedQuestionIdsJson: text("usedQuestionIdsJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("studyProfiles_userId_unique").on(table.userId)]);

/** Módulos concluídos — uma linha por estudante e módulo. */
export const completedModules = mysqlTable("completedModules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  moduleId: varchar("moduleId", { length: 80 }).notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
}, table => [uniqueIndex("completedModules_user_module_unique").on(table.userId, table.moduleId), index("completedModules_userId_idx").on(table.userId)]);

/** Histórico de respostas, associado exclusivamente ao estudante que respondeu. */
export const studyAnswers = mysqlTable("studyAnswers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  questionId: varchar("questionId", { length: 80 }).notNull(),
  correct: boolean("correct").notNull(),
  answeredAt: timestamp("answeredAt").defaultNow().notNull(),
}, table => [index("studyAnswers_userId_idx").on(table.userId), index("studyAnswers_user_question_idx").on(table.userId, table.questionId)]);

/** Resultados de simulados, com recortes por disciplina e bloco serializados em JSON. */
export const simulationRecords = mysqlTable("simulationRecords", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
  total: int("total").notNull(),
  correct: int("correct").notNull(),
  errors: int("errors").notNull(),
  elapsedSeconds: int("elapsedSeconds").notNull(),
  byDisciplineJson: text("byDisciplineJson").notNull(),
  byBlockJson: text("byBlockJson").notNull(),
}, table => [index("simulationRecords_userId_idx").on(table.userId)]);

/** Anotações privadas do estudante por módulo. */
export const studyNotes = mysqlTable("studyNotes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  moduleId: varchar("moduleId", { length: 80 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("studyNotes_user_module_unique").on(table.userId, table.moduleId), index("studyNotes_userId_idx").on(table.userId)]);

/** Registro imutável das ações administrativas relevantes. */
export const adminAuditLogs = mysqlTable("adminAuditLogs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId").notNull(),
  affectedUserId: int("affectedUserId"),
  action: varchar("action", { length: 80 }).notNull(),
  detail: text("detail").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("adminAudit_actor_idx").on(table.actorUserId), index("adminAudit_affected_idx").on(table.affectedUserId)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type StudyProfile = typeof studyProfiles.$inferSelect;
