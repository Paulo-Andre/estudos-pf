import { and, desc, eq, gt, inArray, isNull, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  adminAuditLogs,
  authSessions,
  commerceCoupons,
  commerceOrderItems,
  commerceOrders,
  commercePlanCourses,
  commercePlans,
  commerceTransactions,
  competitionAnswers,
  competitionMonthlyGoals,
  competitionRounds,
  competitionSettings,
  completedModules,
  contentChangelog,
  contents,
  courseDisciplines,
  courses,
  courseEnrollments,
  disciplineContents,
  disciplines,
  globalContactSettings,
  InsertUser,
  platformGeneralSettings,
  questionChangelog,
  questionContentLinks,
  passwordResetTokens,
  platformAlertDismissals,
  platformAlerts,
  questions,
  reviewQueue,
  simulationRecords,
  simulationQuestions,
  studyAnswers,
  studyContentProgress,
  studyNotes,
  studyProfiles,
  studyRoadmapItems,
  studyReviewItems,
  users,
} from "../drizzle/schema";
import { getEnrollmentLifecycleStatus } from "./enrollmentStatus";
import { DEFAULT_COURSES } from "./courseCatalog";
import { canUseQuestionInSimulation, requiresExclusiveCentralBank, uniqueSimulationQuestions } from "./question-bank-policy";
import { persistReviewDecision, type ReviewDecision as PersistedReviewDecision } from "./review-decision";
import { completeStudyModules } from "../client/src/data/pfCompleteStudyData";
import { contestCatalog, disciplineCatalog, getDisciplineIdForModule } from "../client/src/data/pfCurriculumCatalog";
import { questionBank, type StudyQuestion } from "../client/src/data/pfStudyData";
import { loadPF2018Questions } from "./importProvasPF";
import { isValidCpf, normalizeCpf } from "./cpf";
import { selectDailyQuickCheckQuestion } from "./dailyQuickCheck";
import { storagePut } from "./storage";
import { serializeAdminBackup, type AdminBackupData } from "./adminBackup";
import { isPlatformAlertVisibleForUser, type PlatformAlertAudience, type PlatformAlertLevel } from "./platformAlerts";
import { resolveStudentContentNotice, type ContentNoticeKind } from "./content-notices";

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
  cpf?: string | null;
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
  persistentAnswers?: { questionId: number; correct: boolean; snapshot: Record<string, unknown> }[];
};

export type StudyReviewSnapshot = {
  statement: string;
  answer: boolean;
  explanation: string;
  discipline: string;
  subject: string;
  source?: string;
};

export type CommercePlanInput = {
  code: string;
  title: string;
  description?: string | null;
  planType: "course_access" | "subscription";
  accessDurationDays: number;
  priceCents: number;
  isActive: boolean;
  isHighlighted: boolean;
  courseIds: string[];
};

export type CommerceCouponInput = {
  code: string;
  description?: string | null;
  discountType: "percentage" | "fixed_amount";
  discountValue: number;
  maxRedemptions?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive: boolean;
};

const emptyProfile = { xp: 0, lastStudyDate: null as string | null, studyDatesJson: "[]", usedQuestionIdsJson: "[]", dailyQuickCheckDate: null as string | null, dailyQuickCheckCourseId: null as string | null, dailyQuickCheckQuestionId: null as string | null, dailyQuickCheckDismissed: false };
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

function parseStudyReviewSnapshot(raw: string): StudyReviewSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StudyReviewSnapshot>;
    if (!parsed || typeof parsed !== "object" || typeof parsed.statement !== "string" || typeof parsed.answer !== "boolean" || typeof parsed.explanation !== "string" || typeof parsed.discipline !== "string" || typeof parsed.subject !== "string") return null;
    return { statement: parsed.statement, answer: parsed.answer, explanation: parsed.explanation, discipline: parsed.discipline, subject: parsed.subject, ...(typeof parsed.source === "string" ? { source: parsed.source } : {}) };
  } catch {
    return null;
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
    name: user.name?.trim() || "Usuário Núcleo Concursos",
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

export async function getUserByCpf(cpf: string) {
  const db = await getDb();
  if (!db) return undefined;
  const normalized = normalizeCpf(cpf);
  if (!normalized) return undefined;
  const result = await db.select().from(users).where(eq(users.cpf, normalized)).limit(1);
  return result[0];
}

export async function createLocalUser(input: LocalUserInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const username = input.username.trim().toLowerCase();
  const email = input.email?.trim().toLowerCase() || null;
  const cpf = input.cpf ? normalizeCpf(input.cpf) : null;
  if (cpf && !isValidCpf(cpf)) throw new Error("CPF inválido.");
  await db.insert(users).values({
    openId: `local:${username}`,
    name: input.name.trim(),
    username,
    email,
    cpf,
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

export async function createPasswordResetToken(userId: number, tokenHash: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.transaction(async (tx) => {
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    await tx.insert(passwordResetTokens).values({ id: crypto.randomUUID(), userId, tokenHash, expiresAt });
  });
}

export async function consumePasswordResetToken(tokenHash: string, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const now = new Date();
  return db.transaction(async (tx) => {
    const token = (await tx.select().from(passwordResetTokens).where(and(
      eq(passwordResetTokens.tokenHash, tokenHash),
      gt(passwordResetTokens.expiresAt, now),
      isNull(passwordResetTokens.usedAt),
    )).limit(1))[0];
    if (!token) return null;
    const marked = await tx.update(passwordResetTokens).set({ usedAt: now }).where(and(eq(passwordResetTokens.id, token.id), isNull(passwordResetTokens.usedAt)));
    if (!marked[0]?.affectedRows) return null;
    await tx.update(users).set({ passwordHash }).where(eq(users.id, token.userId));
    await tx.delete(authSessions).where(eq(authSessions.userId, token.userId));
    return { userId: token.userId };
  });
}

/** Converte a identidade proprietária existente para a conta local ROOT, preservando o userId e o histórico. */
export async function convertUserToLocalRoot(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(users).set({
    openId: "local:paulo",
    name: "Paulo André",
    username: "paulo",
    passwordHash,
    loginMethod: "local",
    role: "admin",
  }).where(eq(users.id, userId));
}

export async function updateUserProfile(userId: number, input: { name: string; username: string; email: string; cpf?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const username = input.username.trim().toLowerCase();
  const cpf = input.cpf === undefined ? undefined : normalizeCpf(input.cpf);
  if (cpf !== undefined && !isValidCpf(cpf)) throw new Error("CPF inválido.");
  await db.update(users).set({
    name: input.name.trim(),
    username,
    email: input.email.trim().toLowerCase(),
    ...(cpf === undefined ? {} : { cpf }),
  }).where(eq(users.id, userId));
  return getUserById(userId);
}

export async function replaceSessionForUser(userId: number, id: string, tokenHash: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const activeSession = await db.select({ id: authSessions.id }).from(authSessions)
    .where(and(eq(authSessions.userId, userId), gt(authSessions.expiresAt, new Date())))
    .limit(1);
  await db.transaction(async (tx) => {
    await tx.delete(authSessions).where(eq(authSessions.userId, userId));
    await tx.insert(authSessions).values({ id, userId, tokenHash, expiresAt });
  });
  return { hadActiveSession: Boolean(activeSession[0]) };
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

export type GlobalContactSettingsInput = {
  email?: string | null;
  telegramUrl?: string | null;
};

export async function getGlobalContactSettings() {
  const db = await getDb();
  if (!db) return { email: null, telegramUrl: null, updatedAt: null };
  const row = await db.select().from(globalContactSettings).where(eq(globalContactSettings.id, 1)).limit(1);
  return row[0] ?? { email: null, telegramUrl: null, updatedAt: null };
}

export async function saveGlobalContactSettings(actorUserId: number, input: GlobalContactSettingsInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const email = input.email?.trim().toLowerCase() || null;
  const telegramUrl = input.telegramUrl?.trim() || null;
  await db.insert(globalContactSettings).values({ id: 1, email, telegramUrl, updatedByUserId: actorUserId })
    .onDuplicateKeyUpdate({ set: { email, telegramUrl, updatedByUserId: actorUserId } });
  return getGlobalContactSettings();
}

export const defaultPlatformGeneralSettings = {
  logoUrl: null,
  brandName: "Núcleo Concursos",
  brandTagline: "Preparo multidisciplinar",
  heroBadge: "Estude com método, evolua com registro",
  heroTitle: "O próximo passo da sua preparação começa aqui.",
  heroDescription: "Escolha uma trilha, organize o estudo por conteúdo e acompanhe o que já foi consolidado. O acesso é individual, seguro e liberado somente após a confirmação do pagamento.",
  loginButtonText: "Entrar",
  heroPrimaryCtaText: "Ver pacotes disponíveis",
  heroSecondaryCtaText: "Já tenho uma conta",
  routineEyebrow: "UMA ROTINA EM TRÊS ETAPAS",
  routineStepOneTitle: "Escolha sua trilha",
  routineStepOneDescription: "Compare os pacotes ativos e selecione o que faz sentido para seu objetivo.",
  routineStepTwoTitle: "Crie sua conta",
  routineStepTwoDescription: "Seu histórico, seus simulados e sua evolução ficam ligados ao seu próprio acesso.",
  routineStepThreeTitle: "Comece a estudar",
  routineStepThreeDescription: "Após a confirmação do pagamento, as disciplinas da trilha ficam disponíveis.",
  benefitOneTitle: "Conteúdo organizado",
  benefitOneDescription: "Aulas e materiais distribuídos por trilha e disciplina.",
  benefitTwoTitle: "Evolução individual",
  benefitTwoDescription: "Progresso, revisões e simulados ficam registrados na sua conta.",
  benefitThreeTitle: "Pagamento protegido",
  benefitThreeDescription: "O checkout acontece no ambiente seguro do Mercado Pago.",
  packagesEyebrow: "PACOTES PUBLICADOS PELO NÚCLEO",
  packagesTitle: "Escolha a sua próxima trilha.",
  packagesDescription: "Os pacotes abaixo são atualizados diretamente pelo catálogo administrativo. Ao escolher um deles, você cria sua conta antes de seguir para o pagamento.",
  packagesLoadingText: "Carregando pacotes ativos...",
  packagesEmptyText: "Ainda não há pacotes publicados. Volte em breve para consultar novas trilhas.",
  highlightBadgeText: "OFERTA EM DESTAQUE",
  includedCoursesLabel: "TRILHAS INCLUÍDAS",
  planFallbackDescription: "Acesso organizado às trilhas incluídas neste pacote.",
  planAccountNotice: "Primeiro você cria a conta. O pagamento acontece depois, em ambiente seguro.",
  finalCtaEyebrow: "PRONTO PARA COMEÇAR?",
  finalCtaTitle: "Sua preparação pode ter um ponto de partida claro.",
  finalCtaDescription: "Conheça os pacotes ativos, escolha uma trilha e registre seu acesso para começar.",
  finalCtaButtonText: "Conhecer pacotes",
  footerPaymentText: "Acesso individual · Pagamento processado pelo Mercado Pago.",
  primaryColor: "#102F3A",
  backgroundColor: "#F6F1E7",
  textColor: "#173D4A",
  heroTextColor: "#FFFDF7",
  heroMutedTextColor: "#E4F0EE",
  accentColor: "#8AD2C3",
  accentTextColor: "#15353E",
  surfaceColor: "#FFFDF8",
  cardColor: "#FFFFFF",
  surfaceAccentColor: "#DCEEE8",
  borderColor: "#D9D0C1",
  mutedTextColor: "#52716F",
  iconBackgroundColor: "#E9F3F0",
  iconColor: "#0E5A70",
  buttonColor: "#0E5A70",
  buttonHoverColor: "#09495B",
} as const;

export type PlatformGeneralSettingsInput = {
  logoUrl?: string | null;
  brandName: string;
  brandTagline: string;
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  loginButtonText: string;
  heroPrimaryCtaText: string;
  heroSecondaryCtaText: string;
  routineEyebrow: string;
  routineStepOneTitle: string;
  routineStepOneDescription: string;
  routineStepTwoTitle: string;
  routineStepTwoDescription: string;
  routineStepThreeTitle: string;
  routineStepThreeDescription: string;
  benefitOneTitle: string;
  benefitOneDescription: string;
  benefitTwoTitle: string;
  benefitTwoDescription: string;
  benefitThreeTitle: string;
  benefitThreeDescription: string;
  packagesEyebrow: string;
  packagesTitle: string;
  packagesDescription: string;
  packagesLoadingText: string;
  packagesEmptyText: string;
  highlightBadgeText: string;
  includedCoursesLabel: string;
  planFallbackDescription: string;
  planAccountNotice: string;
  finalCtaEyebrow: string;
  finalCtaTitle: string;
  finalCtaDescription: string;
  finalCtaButtonText: string;
  footerPaymentText: string;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  heroTextColor: string;
  heroMutedTextColor: string;
  accentColor: string;
  accentTextColor: string;
  surfaceColor: string;
  cardColor: string;
  surfaceAccentColor: string;
  borderColor: string;
  mutedTextColor: string;
  iconBackgroundColor: string;
  iconColor: string;
  buttonColor: string;
  buttonHoverColor: string;
};

export async function getPlatformGeneralSettings() {
  const db = await getDb();
  if (!db) return { ...defaultPlatformGeneralSettings, updatedAt: null };
  const row = await db.select().from(platformGeneralSettings).where(eq(platformGeneralSettings.id, 1)).limit(1);
  return { ...defaultPlatformGeneralSettings, ...(row[0] ?? {}) };
}

export async function savePlatformGeneralSettings(actorUserId: number, input: PlatformGeneralSettingsInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const values = {
    logoUrl: input.logoUrl?.trim() || null,
    brandName: input.brandName.trim(),
    brandTagline: input.brandTagline.trim(),
    heroBadge: input.heroBadge.trim(),
    heroTitle: input.heroTitle.trim(),
    heroDescription: input.heroDescription.trim(),
    loginButtonText: input.loginButtonText.trim(),
    heroPrimaryCtaText: input.heroPrimaryCtaText.trim(),
    heroSecondaryCtaText: input.heroSecondaryCtaText.trim(),
    routineEyebrow: input.routineEyebrow.trim(),
    routineStepOneTitle: input.routineStepOneTitle.trim(),
    routineStepOneDescription: input.routineStepOneDescription.trim(),
    routineStepTwoTitle: input.routineStepTwoTitle.trim(),
    routineStepTwoDescription: input.routineStepTwoDescription.trim(),
    routineStepThreeTitle: input.routineStepThreeTitle.trim(),
    routineStepThreeDescription: input.routineStepThreeDescription.trim(),
    benefitOneTitle: input.benefitOneTitle.trim(),
    benefitOneDescription: input.benefitOneDescription.trim(),
    benefitTwoTitle: input.benefitTwoTitle.trim(),
    benefitTwoDescription: input.benefitTwoDescription.trim(),
    benefitThreeTitle: input.benefitThreeTitle.trim(),
    benefitThreeDescription: input.benefitThreeDescription.trim(),
    packagesEyebrow: input.packagesEyebrow.trim(),
    packagesTitle: input.packagesTitle.trim(),
    packagesDescription: input.packagesDescription.trim(),
    packagesLoadingText: input.packagesLoadingText.trim(),
    packagesEmptyText: input.packagesEmptyText.trim(),
    highlightBadgeText: input.highlightBadgeText.trim(),
    includedCoursesLabel: input.includedCoursesLabel.trim(),
    planFallbackDescription: input.planFallbackDescription.trim(),
    planAccountNotice: input.planAccountNotice.trim(),
    finalCtaEyebrow: input.finalCtaEyebrow.trim(),
    finalCtaTitle: input.finalCtaTitle.trim(),
    finalCtaDescription: input.finalCtaDescription.trim(),
    finalCtaButtonText: input.finalCtaButtonText.trim(),
    footerPaymentText: input.footerPaymentText.trim(),
    primaryColor: input.primaryColor.toUpperCase(),
    backgroundColor: input.backgroundColor.toUpperCase(),
    textColor: input.textColor.toUpperCase(),
    heroTextColor: input.heroTextColor.toUpperCase(),
    heroMutedTextColor: input.heroMutedTextColor.toUpperCase(),
    accentColor: input.accentColor.toUpperCase(),
    accentTextColor: input.accentTextColor.toUpperCase(),
    surfaceColor: input.surfaceColor.toUpperCase(),
    cardColor: input.cardColor.toUpperCase(),
    surfaceAccentColor: input.surfaceAccentColor.toUpperCase(),
    borderColor: input.borderColor.toUpperCase(),
    mutedTextColor: input.mutedTextColor.toUpperCase(),
    iconBackgroundColor: input.iconBackgroundColor.toUpperCase(),
    iconColor: input.iconColor.toUpperCase(),
    buttonColor: input.buttonColor.toUpperCase(),
    buttonHoverColor: input.buttonHoverColor.toUpperCase(),
    updatedByUserId: actorUserId,
  };
  await db.insert(platformGeneralSettings).values({ id: 1, ...values }).onDuplicateKeyUpdate({ set: values });
  return getPlatformGeneralSettings();
}

export const defaultCompetitionSettings = {
  pointsPerCorrect: 10,
  pointsPerWrong: 0,
  questionsPerRound: 10,
  isActive: true,
} as const;

export type CompetitionSettingsInput = {
  pointsPerCorrect: number;
  pointsPerWrong: number;
  questionsPerRound: number;
  isActive: boolean;
};

export const defaultCompetitionMonthlyGoal = {
  targetPoints: 100,
  targetCompletedRounds: 5,
  rewardTitle: "Destaque mensal",
  rewardDescription: "Reconhecimento definido pela administração para quem concluir a meta do mês.",
  isActive: true,
} as const;

export type CompetitionMonthlyGoalInput = {
  targetPoints: number;
  targetCompletedRounds: number;
  rewardTitle: string;
  rewardDescription: string;
  isActive: boolean;
};

type CompetitionQuestion = {
  id: number;
  statement: string;
  questionType: "certo_errado" | "multipla_escolha";
  options: string[];
  difficulty: "basic" | "intermediate" | "advanced";
  source: string | null;
  banca: string | null;
  year: number | null;
};

function parseCompetitionOptions(raw: string | null) {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((option): option is string => typeof option === "string") : [];
  } catch {
    return [];
  }
}

function toCompetitionQuestion(question: typeof questions.$inferSelect): CompetitionQuestion {
  return {
    id: question.id,
    statement: question.statement,
    questionType: question.questionType,
    options: parseCompetitionOptions(question.optionsJson),
    difficulty: question.difficulty,
    source: question.source,
    banca: question.banca,
    year: question.year,
  };
}

function parseCompetitionQuestionIds(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is number => Number.isInteger(id) && id > 0) : [];
  } catch {
    return [];
  }
}

export function evaluateCompetitionAnswer(answerJson: string, submittedAnswer: boolean | string) {
  let expectedAnswer: unknown;
  try {
    expectedAnswer = JSON.parse(answerJson);
  } catch {
    throw new Error("A resposta oficial desta questão está inválida.");
  }
  if (typeof expectedAnswer !== typeof submittedAnswer || (typeof expectedAnswer !== "boolean" && typeof expectedAnswer !== "string")) {
    throw new Error("Formato de resposta incompatível com a questão.");
  }
  return expectedAnswer === submittedAnswer;
}

export type CompetitionRankingAnswer = { userId: number; pointsEarned: number; correct: boolean };
export type CompetitionRankingUser = { id: number; name: string; username: string | null };
export type CompetitionRankingRow = { position: number; userId: number; name: string; username: string | null; totalPoints: number; totalAnswered: number; totalCorrect: number };
export type CompetitionHistoryRow = { id: string; courseId: string | null; createdAt: Date; completedAt: Date | null; totalQuestions: number; answeredQuestions: number; correctAnswers: number; earnedPoints: number };

export function buildCompetitionRanking(answers: CompetitionRankingAnswer[], participants: CompetitionRankingUser[]) {
  const byUser = new Map<number, { totalPoints: number; totalAnswered: number; totalCorrect: number }>();
  for (const answer of answers) {
    const current = byUser.get(answer.userId) ?? { totalPoints: 0, totalAnswered: 0, totalCorrect: 0 };
    current.totalPoints += answer.pointsEarned;
    current.totalAnswered += 1;
    if (answer.correct) current.totalCorrect += 1;
    byUser.set(answer.userId, current);
  }
  const rows = participants.filter(user => byUser.has(user.id)).map(user => ({ userId: user.id, name: user.name, username: user.username, ...(byUser.get(user.id) ?? { totalPoints: 0, totalAnswered: 0, totalCorrect: 0 }) }))
    .sort((a, b) => b.totalPoints - a.totalPoints || b.totalCorrect - a.totalCorrect || a.name.localeCompare(b.name));
  return rows.map((row, index) => ({ position: index + 1, ...row }));
}

export async function getCompetitionSettings() {
  const db = await getDb();
  if (!db) return { ...defaultCompetitionSettings, updatedAt: null };
  const row = await db.select().from(competitionSettings).where(eq(competitionSettings.id, 1)).limit(1);
  return { ...defaultCompetitionSettings, ...(row[0] ?? {}) };
}

export async function saveCompetitionSettings(actorUserId: number, input: CompetitionSettingsInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const values = { ...input, updatedByUserId: actorUserId };
  await db.insert(competitionSettings).values({ id: 1, ...values }).onDuplicateKeyUpdate({ set: values });
  await writeAdminAudit(actorUserId, null, "ATUALIZACAO_DE_COMPETICAO", `Regras atualizadas: ${input.questionsPerRound} questões por rodada, ${input.pointsPerCorrect} ponto(s) por acerto e ${input.pointsPerWrong} ponto(s) por erro.`);
  return getCompetitionSettings();
}

type BrazilDateParts = { year: number; month: number; day: number; weekday: number; hour: number; minute: number; second: number };
export type CompetitionWeekWindow = { key: string; startsAt: Date };

const brazilDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function getBrazilDateParts(date: Date): BrazilDateParts {
  const parts = new Map(brazilDateFormatter.formatToParts(date).map(part => [part.type, part.value]));
  const weekday = new Map([["Sun", 0], ["Mon", 1], ["Tue", 2], ["Wed", 3], ["Thu", 4], ["Fri", 5], ["Sat", 6]]).get(parts.get("weekday") ?? "");
  if (weekday === undefined) throw new Error("Não foi possível identificar o dia da semana em Brasília.");
  return {
    year: Number(parts.get("year")),
    month: Number(parts.get("month")),
    day: Number(parts.get("day")),
    weekday,
    hour: Number(parts.get("hour")),
    minute: Number(parts.get("minute")),
    second: Number(parts.get("second")),
  };
}

function getBrazilOffsetMs(utcDate: Date) {
  const parts = getBrazilDateParts(utcDate);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - utcDate.getTime();
}

function brazilLocalDateToUtc(year: number, month: number, day: number, hour: number, minute: number, second = 0) {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const firstPass = new Date(guess.getTime() - getBrazilOffsetMs(guess));
  return new Date(guess.getTime() - getBrazilOffsetMs(firstPass));
}

/**
 * Cada ciclo começa no domingo às 23h59 no fuso de Brasília. A chave também
 * mantém o callback idempotente caso a plataforma execute uma nova tentativa.
 */
export function getCompetitionWeekWindow(now = new Date()): CompetitionWeekWindow {
  const brazil = getBrazilDateParts(now);
  const afterWeeklyReset = brazil.weekday === 0 && (brazil.hour > 23 || (brazil.hour === 23 && brazil.minute >= 59));
  const daysSinceCycleStart = brazil.weekday === 0 ? (afterWeeklyReset ? 0 : 7) : brazil.weekday;
  const localCycleDay = new Date(Date.UTC(brazil.year, brazil.month - 1, brazil.day - daysSinceCycleStart));
  const year = localCycleDay.getUTCFullYear();
  const month = localCycleDay.getUTCMonth() + 1;
  const day = localCycleDay.getUTCDate();
  const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { key, startsAt: brazilLocalDateToUtc(year, month, day, 23, 59) };
}

export function shouldRegisterWeeklyCompetitionCycle(currentKey: string | null | undefined, now = new Date()) {
  return currentKey !== getCompetitionWeekWindow(now).key;
}

/** Registra o novo período exibido, mantendo todas as respostas e rodadas históricas no banco. */
export async function runWeeklyCompetitionReset(taskUid: string, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const row = (await db.select().from(competitionSettings).where(eq(competitionSettings.weeklyResetCronTaskUid, taskUid)).limit(1))[0];
  if (!row) return { status: "orphan" as const };
  const window = getCompetitionWeekWindow(now);
  if (!shouldRegisterWeeklyCompetitionCycle(row.weeklyCycleKey, now)) {
    return { status: "already_current" as const, ...window };
  }
  await db.update(competitionSettings).set({ weeklyCycleKey: window.key, weeklyCycleStartedAt: window.startsAt }).where(eq(competitionSettings.id, row.id));
  return { status: "reset" as const, ...window };
}

export function getCompetitionMonthWindow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(now);
  const year = Number(parts.find(part => part.type === "year")?.value);
  const month = Number(parts.find(part => part.type === "month")?.value);
  const startsAt = new Date(Date.UTC(year, month - 1, 1));
  const endsAt = new Date(Date.UTC(year, month, 1));
  return { period: `${year}-${String(month).padStart(2, "0")}`, startsAt, endsAt };
}

export async function getCompetitionMonthlyGoal() {
  const db = await getDb();
  if (!db) return { ...defaultCompetitionMonthlyGoal, updatedAt: null };
  const row = await db.select().from(competitionMonthlyGoals).where(eq(competitionMonthlyGoals.id, 1)).limit(1);
  return { ...defaultCompetitionMonthlyGoal, ...(row[0] ?? {}) };
}

export async function saveCompetitionMonthlyGoal(actorUserId: number, input: CompetitionMonthlyGoalInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const values = {
    targetPoints: input.targetPoints,
    targetCompletedRounds: input.targetCompletedRounds,
    rewardTitle: input.rewardTitle.trim(),
    rewardDescription: input.rewardDescription.trim(),
    isActive: input.isActive,
    updatedByUserId: actorUserId,
  };
  await db.insert(competitionMonthlyGoals).values({ id: 1, ...values }).onDuplicateKeyUpdate({ set: values });
  await writeAdminAudit(actorUserId, null, "ATUALIZACAO_META_MENSAL_COMPETICAO", `Meta mensal atualizada: ${values.targetPoints} ponto(s), ${values.targetCompletedRounds} rodada(s) concluída(s) e reconhecimento “${values.rewardTitle}”.`);
  return getCompetitionMonthlyGoal();
}

export async function listCompetitionCourses() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.select({ id: courses.id, title: courses.title, track: courses.track }).from(courses).where(and(eq(courses.isActive, true), eq(courses.courseType, "concurso"))).orderBy(courses.title);
}

async function getCompetitionQuestionsForCourse(courseId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  if (!courseId) return db.select().from(questions).where(eq(questions.status, "published"));
  const links = await db.select({ questionId: questionContentLinks.questionId })
    .from(questionContentLinks)
    .innerJoin(disciplineContents, eq(questionContentLinks.contentId, disciplineContents.contentId))
    .innerJoin(courseDisciplines, eq(disciplineContents.disciplineId, courseDisciplines.disciplineId))
    .where(eq(courseDisciplines.courseId, courseId));
  const ids = Array.from(new Set(links.map(link => link.questionId)));
  if (!ids.length) return [];
  return db.select().from(questions).where(and(eq(questions.status, "published"), inArray(questions.id, ids)));
}

function shuffleCompetitionQuestions<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target]!, copy[index]!];
  }
  return copy;
}

export function prioritizeUnseenCompetitionQuestions<T extends { id: number }>(candidates: T[], answeredQuestionIds: Set<number>, questionsPerRound: number) {
  const unseen = candidates.filter(question => !answeredQuestionIds.has(question.id));
  const repeated = candidates.filter(question => answeredQuestionIds.has(question.id));
  return [...shuffleCompetitionQuestions(unseen), ...shuffleCompetitionQuestions(repeated)].slice(0, questionsPerRound);
}

function competitionAnswerKey(answerJson: string) {
  try {
    const answer = JSON.parse(answerJson) as unknown;
    if (typeof answer === "boolean") return answer ? "certo" : "errado";
    if (typeof answer === "string" && answer.trim()) return answer.trim().toLocaleLowerCase("pt-BR");
  } catch {
    // Questões inválidas continuam disponíveis para o fluxo editorial tratar, sem impedir a rodada.
  }
  return "outro";
}

/** Alterna os gabaritos disponíveis e prefere itens inéditos em cada alternativa. */
export function selectBalancedCompetitionQuestions<T extends { id: number; answerJson: string }>(candidates: T[], answeredQuestionIds: Set<number>, questionsPerRound: number) {
  const unique = Array.from(new Map(candidates.map(question => [question.id, question])).values());
  const keys = shuffleCompetitionQuestions(Array.from(new Set(unique.map(question => competitionAnswerKey(question.answerJson)))));
  const buckets = new Map(keys.map(key => [key, { fresh: [] as T[], repeated: [] as T[] }]));
  unique.forEach(question => {
    const bucket = buckets.get(competitionAnswerKey(question.answerJson))!;
    if (answeredQuestionIds.has(question.id)) bucket.repeated.push(question);
    else bucket.fresh.push(question);
  });
  buckets.forEach(bucket => {
    bucket.fresh = shuffleCompetitionQuestions(bucket.fresh);
    bucket.repeated = shuffleCompetitionQuestions(bucket.repeated);
  });

  const selected: T[] = [];
  while (selected.length < questionsPerRound) {
    let found = false;
    keys.forEach(key => {
      if (selected.length >= questionsPerRound) return;
      const bucket = buckets.get(key)!;
      const next = bucket.fresh.pop() ?? bucket.repeated.pop();
      if (!next) return;
      selected.push(next);
      found = true;
    });
    if (!found) break;
  }
  return selected;
}

export async function createCompetitionRound(userId: number, courseId: string | undefined, allowedCourseIds: string[], isAdmin: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const settings = await getCompetitionSettings();
  if (!settings.isActive) throw new Error("A competição está temporariamente pausada pela administração.");
  if (courseId && !isAdmin && !allowedCourseIds.includes(courseId)) throw new Error("Você não possui acesso ativo a este concurso.");
  const candidates = await getCompetitionQuestionsForCourse(courseId);
  const previousAnswers = await db.select({ questionId: competitionAnswers.questionId }).from(competitionAnswers).where(eq(competitionAnswers.userId, userId));
  const selected = selectBalancedCompetitionQuestions(candidates, new Set(previousAnswers.map(answer => answer.questionId)), settings.questionsPerRound);
  if (!selected.length) throw new Error("Ainda não há questões publicadas para iniciar esta competição.");
  const roundId = crypto.randomUUID();
  await db.insert(competitionRounds).values({ id: roundId, userId, courseId: courseId ?? null, questionIdsJson: JSON.stringify(selected.map(question => question.id)) });
  return { id: roundId, courseId: courseId ?? null, total: selected.length, questions: selected.map(toCompetitionQuestion) };
}

export async function getCompetitionRound(userId: number, roundId: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rows = await db.select().from(competitionRounds).where(and(eq(competitionRounds.id, roundId), eq(competitionRounds.userId, userId))).limit(1);
  const round = rows[0];
  if (!round) throw new Error("Rodada competitiva não encontrada.");
  const questionIds = parseCompetitionQuestionIds(round.questionIdsJson);
  if (!questionIds.length) throw new Error("Esta rodada não possui questões válidas.");
  const foundQuestions = await db.select().from(questions).where(inArray(questions.id, questionIds));
  const byId = new Map(foundQuestions.map(question => [question.id, question]));
  const answerRows = await db.select({ questionId: competitionAnswers.questionId }).from(competitionAnswers).where(eq(competitionAnswers.roundId, round.id));
  const answeredQuestionIds = answerRows.map(answer => answer.questionId);
  return {
    id: round.id,
    courseId: round.courseId,
    completedAt: round.completedAt,
    total: questionIds.length,
    answeredQuestionIds,
    questions: questionIds.map(id => byId.get(id)).filter((question): question is typeof questions.$inferSelect => Boolean(question)).map(toCompetitionQuestion),
  };
}

export async function submitCompetitionAnswer(userId: number, input: { roundId: string; questionId: number; submittedAnswer: boolean | string }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const roundRows = await db.select().from(competitionRounds).where(and(eq(competitionRounds.id, input.roundId), eq(competitionRounds.userId, userId))).limit(1);
  const round = roundRows[0];
  if (!round) throw new Error("Rodada competitiva não encontrada.");
  if (round.completedAt) throw new Error("Esta rodada já foi concluída.");
  if (!parseCompetitionQuestionIds(round.questionIdsJson).includes(input.questionId)) throw new Error("Esta questão não pertence à rodada atual.");
  const previous = await db.select({ id: competitionAnswers.id }).from(competitionAnswers).where(and(eq(competitionAnswers.roundId, round.id), eq(competitionAnswers.questionId, input.questionId))).limit(1);
  if (previous[0]) throw new Error("Esta questão já foi respondida nesta rodada.");
  const questionRows = await db.select().from(questions).where(eq(questions.id, input.questionId)).limit(1);
  const question = questionRows[0];
  if (!question || question.status !== "published") throw new Error("Esta questão não está mais disponível.");
  const correct = evaluateCompetitionAnswer(question.answerJson, input.submittedAnswer);
  const settings = await getCompetitionSettings();
  const pointsEarned = correct ? settings.pointsPerCorrect : -settings.pointsPerWrong;
  await db.insert(competitionAnswers).values({
    roundId: round.id,
    userId,
    questionId: input.questionId,
    courseId: round.courseId,
    submittedAnswerJson: JSON.stringify(input.submittedAnswer),
    correct,
    pointsEarned,
  });
  const answered = await db.select({ count: sql<number>`count(*)` }).from(competitionAnswers).where(eq(competitionAnswers.roundId, round.id));
  const total = parseCompetitionQuestionIds(round.questionIdsJson).length;
  const completed = Number(answered[0]?.count ?? 0) >= total;
  if (completed) await db.update(competitionRounds).set({ completedAt: new Date() }).where(eq(competitionRounds.id, round.id));
  return { correct, pointsEarned, explanation: question.explanation, completed };
}

export async function getCompetitionRanking(courseId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const window = getCompetitionWeekWindow();
  const afterCycleStart = gt(competitionAnswers.answeredAt, new Date(window.startsAt.getTime() - 1));
  const answers = courseId
    ? await db.select().from(competitionAnswers).where(and(eq(competitionAnswers.courseId, courseId), afterCycleStart))
    : await db.select().from(competitionAnswers).where(afterCycleStart);
  if (!answers.length) return [] as CompetitionRankingRow[];
  const userIds = Array.from(new Set(answers.map(answer => answer.userId)));
  const userRows = await db.select({ id: users.id, name: users.name, username: users.username }).from(users).where(inArray(users.id, userIds));
  return buildCompetitionRanking(answers, userRows);
}

export async function getMyCompetitionScore(userId: number, courseId?: string) {
  const ranking = await getCompetitionRanking(courseId);
  return ranking.find(row => row.userId === userId) ?? { position: null, userId, name: null, username: null, totalPoints: 0, totalAnswered: 0, totalCorrect: 0 };
}

export async function getMyCompetitionHistory(userId: number, courseId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rounds = courseId
    ? await db.select().from(competitionRounds).where(and(eq(competitionRounds.userId, userId), eq(competitionRounds.courseId, courseId))).orderBy(desc(competitionRounds.createdAt)).limit(20)
    : await db.select().from(competitionRounds).where(eq(competitionRounds.userId, userId)).orderBy(desc(competitionRounds.createdAt)).limit(20);
  if (!rounds.length) return [] as CompetitionHistoryRow[];
  const answers = await db.select().from(competitionAnswers).where(inArray(competitionAnswers.roundId, rounds.map(round => round.id)));
  const answersByRound = new Map<string, typeof answers>();
  for (const answer of answers) answersByRound.set(answer.roundId, [...(answersByRound.get(answer.roundId) ?? []), answer]);
  return rounds.map(round => {
    const roundAnswers = answersByRound.get(round.id) ?? [];
    return {
      id: round.id,
      courseId: round.courseId,
      createdAt: round.createdAt,
      completedAt: round.completedAt,
      totalQuestions: parseCompetitionQuestionIds(round.questionIdsJson).length,
      answeredQuestions: roundAnswers.length,
      correctAnswers: roundAnswers.filter(answer => answer.correct).length,
      earnedPoints: roundAnswers.reduce((total, answer) => total + answer.pointsEarned, 0),
    };
  });
}

export async function getMyMonthlyCompetitionGoal(userId: number, courseId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const [goal, window] = await Promise.all([getCompetitionMonthlyGoal(), Promise.resolve(getCompetitionMonthWindow())]);
  const answerWhere = courseId
    ? and(eq(competitionAnswers.userId, userId), eq(competitionAnswers.courseId, courseId), gt(competitionAnswers.answeredAt, new Date(window.startsAt.getTime() - 1)))
    : and(eq(competitionAnswers.userId, userId), gt(competitionAnswers.answeredAt, new Date(window.startsAt.getTime() - 1)));
  const roundWhere = courseId
    ? and(eq(competitionRounds.userId, userId), eq(competitionRounds.courseId, courseId), gt(competitionRounds.createdAt, new Date(window.startsAt.getTime() - 1)))
    : and(eq(competitionRounds.userId, userId), gt(competitionRounds.createdAt, new Date(window.startsAt.getTime() - 1)));
  const [answers, rounds] = await Promise.all([
    db.select({ pointsEarned: competitionAnswers.pointsEarned }).from(competitionAnswers).where(answerWhere),
    db.select({ completedAt: competitionRounds.completedAt }).from(competitionRounds).where(roundWhere),
  ]);
  const earnedPoints = answers.reduce((total, answer) => total + answer.pointsEarned, 0);
  const completedRounds = rounds.filter(round => Boolean(round.completedAt)).length;
  return {
    ...goal,
    ...window,
    earnedPoints,
    completedRounds,
    remainingPoints: Math.max(0, goal.targetPoints - earnedPoints),
    remainingCompletedRounds: Math.max(0, goal.targetCompletedRounds - completedRounds),
    achieved: goal.isActive && earnedPoints >= goal.targetPoints && completedRounds >= goal.targetCompletedRounds,
  };
}

export async function clearCompetitionRanking(actorUserId: number, courseId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const answerWhere = courseId ? eq(competitionAnswers.courseId, courseId) : undefined;
  const roundWhere = courseId ? eq(competitionRounds.courseId, courseId) : undefined;
  const countRows = answerWhere
    ? await db.select({ count: sql<number>`count(*)` }).from(competitionAnswers).where(answerWhere)
    : await db.select({ count: sql<number>`count(*)` }).from(competitionAnswers);
  if (answerWhere) await db.delete(competitionAnswers).where(answerWhere); else await db.delete(competitionAnswers);
  if (roundWhere) await db.delete(competitionRounds).where(roundWhere); else await db.delete(competitionRounds);
  const deletedAnswers = Number(countRows[0]?.count ?? 0);
  await writeAdminAudit(actorUserId, null, "LIMPEZA_DE_RANKING_COMPETICAO", courseId ? `Ranking da competição do concurso ${courseId} limpo com ${deletedAnswers} resposta(s) removida(s).` : `Ranking global da competição limpo com ${deletedAnswers} resposta(s) removida(s).`);
  return { deletedAnswers };
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
  const weeklyWindow = getCompetitionWeekWindow();
  const weeklySimulationCorrect = simulations
    .filter(simulation => simulation.completedAt.getTime() >= weeklyWindow.startsAt.getTime())
    .reduce((total, simulation) => total + simulation.correct, 0);
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
    weeklySimulationCorrect,
  };
}

async function getEligibleContentIdsForCourses(courseIds: string[]) {
  const db = await getDb();
  if (!db || !courseIds.length) return [];
  const rows = await db.select({ contentId: disciplineContents.contentId }).from(courseDisciplines)
    .innerJoin(disciplineContents, eq(courseDisciplines.disciplineId, disciplineContents.disciplineId))
    .where(inArray(courseDisciplines.courseId, courseIds));
  return Array.from(new Set(rows.map(row => row.contentId)));
}

type StudyCourseContent = {
  id: number;
  disciplineId: number;
  disciplineName: string;
  title: string;
  description: string | null;
  objective: string | null;
  cardText: string | null;
  body: string | null;
  coverImageUrl: string | null;
  videoUrl: string | null;
  videoLabel: string | null;
  materialUrl: string | null;
  materialLabel: string | null;
  noticeKind: ContentNoticeKind | null;
  noticeActivatedAt: Date | null;
};

async function assertStudyCourseAccess(userId: number, courseId: string, isAdmin = false) {
  if (isAdmin) return;
  const access = await getUserCourseAccess(userId);
  if (!access.some(enrollment => enrollment.courseId === courseId)) {
    throw new Error("Este conteúdo exige uma matrícula vigente no curso selecionado.");
  }
}

async function listStudyCourseContents(courseId: string): Promise<StudyCourseContent[]> {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rows = await db.select({
    id: contents.id,
    disciplineId: disciplines.id,
    disciplineName: disciplines.name,
    title: contents.title,
    description: contents.description,
    objective: contents.objective,
    cardText: contents.cardText,
    body: contents.body,
    coverImageUrl: contents.coverImageUrl,
    videoUrl: contents.videoUrl,
    videoLabel: contents.videoLabel,
    materialUrl: contents.materialUrl,
    materialLabel: contents.materialLabel,
    noticeKind: contents.noticeKind,
    noticeActivatedAt: contents.noticeActivatedAt,
  }).from(courseDisciplines)
    .innerJoin(disciplineContents, eq(courseDisciplines.disciplineId, disciplineContents.disciplineId))
    .innerJoin(contents, eq(disciplineContents.contentId, contents.id))
    .innerJoin(disciplines, eq(disciplineContents.disciplineId, disciplines.id))
    .where(eq(courseDisciplines.courseId, courseId));
  const unique = new Map<number, StudyCourseContent>();
  rows.forEach(content => unique.set(content.id, content));
  return Array.from(unique.values()).sort((left, right) => left.title.localeCompare(right.title, "pt-BR"));
}

function serializeContentProgress(content: StudyCourseContent, progress: typeof studyContentProgress.$inferSelect | undefined, latestOpenedAt: Date | null, enrollmentStartedAt: Date | null, isAdmin: boolean) {
  return {
    ...content,
    progress: progress ? {
      status: progress.status,
      startedAt: progress.startedAt.toISOString(),
      lastOpenedAt: progress.lastOpenedAt.toISOString(),
      completedAt: progress.completedAt?.toISOString() ?? null,
    } : null,
    notice: resolveStudentContentNotice({
      kind: content.noticeKind,
      activatedAt: content.noticeActivatedAt,
      enrollmentStartedAt,
      lastOpenedAt: latestOpenedAt,
      isAdmin,
    }),
  };
}

/** Conteúdos permitidos, último acesso e próxima aula de um aluno em determinado curso. */
export async function getStudyCourseProgress(userId: number, courseId: string, isAdmin = false) {
  await assertStudyCourseAccess(userId, courseId, isAdmin);
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const courseContents = await listStudyCourseContents(courseId);
  const contentIds = courseContents.map(content => content.id);
  const rows = contentIds.length
    ? await db.select().from(studyContentProgress).where(and(
      eq(studyContentProgress.userId, userId),
      eq(studyContentProgress.courseId, courseId),
      inArray(studyContentProgress.contentId, contentIds),
    ))
    : [];
  const allContentProgressRows = contentIds.length
    ? await db.select({ contentId: studyContentProgress.contentId, lastOpenedAt: studyContentProgress.lastOpenedAt }).from(studyContentProgress).where(and(
      eq(studyContentProgress.userId, userId),
      inArray(studyContentProgress.contentId, contentIds),
    ))
    : [];
  const enrollment = isAdmin ? null : (await db.select({ startAt: courseEnrollments.startAt }).from(courseEnrollments).where(and(
    eq(courseEnrollments.userId, userId),
    eq(courseEnrollments.courseId, courseId),
    eq(courseEnrollments.status, "active"),
  )).limit(1))[0] ?? null;
  const progressByContentId = new Map(rows.map(row => [row.contentId, row]));
  const latestOpenedByContentId = new Map<number, Date>();
  allContentProgressRows.forEach(row => {
    const current = latestOpenedByContentId.get(row.contentId);
    if (!current || row.lastOpenedAt > current) latestOpenedByContentId.set(row.contentId, row.lastOpenedAt);
  });
  const items = courseContents.map(content => serializeContentProgress(content, progressByContentId.get(content.id), latestOpenedByContentId.get(content.id) ?? null, enrollment?.startAt ?? null, isAdmin));
  const lastStarted = [...items]
    .filter(item => item.progress?.status === "started")
    .sort((left, right) => new Date(right.progress!.lastOpenedAt).getTime() - new Date(left.progress!.lastOpenedAt).getTime())[0];
  const firstNotCompleted = items.find(item => item.progress?.status !== "completed");
  return {
    courseId,
    contents: items,
    continueItem: lastStarted ?? firstNotCompleted ?? items[0] ?? null,
  };
}

async function assertStudyContentAvailable(userId: number, courseId: string, contentId: number, isAdmin = false) {
  await assertStudyCourseAccess(userId, courseId, isAdmin);
  const content = (await listStudyCourseContents(courseId)).find(item => item.id === contentId);
  if (!content) throw new Error("O conteúdo escolhido não pertence ao curso selecionado.");
  return content;
}

/** Registra abertura de aula sem reabrir uma aula já concluída. */
export async function openStudyContent(userId: number, input: { courseId: string; contentId: number }, isAdmin = false) {
  await assertStudyContentAvailable(userId, input.courseId, input.contentId, isAdmin);
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const now = new Date();
  await db.insert(studyContentProgress).values({
    userId,
    courseId: input.courseId,
    contentId: input.contentId,
    status: "started",
    startedAt: now,
    lastOpenedAt: now,
    completedAt: null,
  }).onDuplicateKeyUpdate({ set: { lastOpenedAt: now } });
  return getStudyCourseProgress(userId, input.courseId, isAdmin);
}

/** Marca uma aula permitida como concluída no histórico de conteúdo do aluno. */
export async function completeStudyContent(userId: number, input: { courseId: string; contentId: number }, isAdmin = false) {
  await assertStudyContentAvailable(userId, input.courseId, input.contentId, isAdmin);
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const now = new Date();
  await db.insert(studyContentProgress).values({
    userId,
    courseId: input.courseId,
    contentId: input.contentId,
    status: "completed",
    startedAt: now,
    lastOpenedAt: now,
    completedAt: now,
  }).onDuplicateKeyUpdate({ set: { status: "completed", lastOpenedAt: now, completedAt: now } });
  return getStudyCourseProgress(userId, input.courseId, isAdmin);
}

/** Itens de roteiro do aluno, sempre filtrados pela matrícula e pelo proprietário do registro. */
export async function listStudyRoadmap(userId: number, courseId: string, isAdmin = false) {
  await assertStudyCourseAccess(userId, courseId, isAdmin);
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const [rows, courseContents] = await Promise.all([
    db.select().from(studyRoadmapItems).where(and(eq(studyRoadmapItems.userId, userId), eq(studyRoadmapItems.courseId, courseId))),
    listStudyCourseContents(courseId),
  ]);
  const contentById = new Map(courseContents.map(content => [content.id, content]));
  return rows
    .flatMap(item => {
      const content = contentById.get(item.contentId);
      return content ? [{
        id: item.id,
        contentId: item.contentId,
        disciplineId: item.disciplineId ?? content.disciplineId,
        disciplineName: content.disciplineName,
        weekday: item.weekday,
        startTime: item.startTime,
        isActive: item.isActive,
        content,
      }] : [];
    })
    .sort((left, right) => left.weekday - right.weekday || left.startTime.localeCompare(right.startTime));
}

export async function saveStudyRoadmapItem(userId: number, input: { courseId: string; disciplineId: number; weekday: number; isActive: boolean }, isAdmin = false) {
  await assertStudyCourseAccess(userId, input.courseId, isAdmin);
  const content = (await listStudyCourseContents(input.courseId)).find(item => item.disciplineId === input.disciplineId);
  if (!content) throw new Error("A disciplina escolhida não pertence ao curso selecionado.");
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(studyRoadmapItems).values({ userId, courseId: input.courseId, contentId: content.id, disciplineId: input.disciplineId, weekday: input.weekday, startTime: "00:00", isActive: input.isActive }).onDuplicateKeyUpdate({
    set: { weekday: input.weekday, disciplineId: input.disciplineId, startTime: "00:00", isActive: input.isActive },
  });
  return listStudyRoadmap(userId, input.courseId, isAdmin);
}

export async function removeStudyRoadmapItem(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.delete(studyRoadmapItems).where(and(eq(studyRoadmapItems.id, id), eq(studyRoadmapItems.userId, userId)));
  return { success: true } as const;
}

/** Utilitário interno para limpeza controlada dos testes integrados de progresso. */
export async function deleteStudyContentProgressByScope(userId: number, courseId: string, contentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.delete(studyContentProgress).where(and(
    eq(studyContentProgress.userId, userId),
    eq(studyContentProgress.courseId, courseId),
    eq(studyContentProgress.contentId, contentId),
  ));
}

export async function getDailyQuickCheck(userId: number, courseId: string) {
  const access = await getUserCourseAccess(userId);
  if (!access.some(enrollment => enrollment.courseId === courseId)) throw new Error("A checagem diária só está disponível para cursos com matrícula vigente.");
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const profile = await ensureStudyProfile(userId);
  const day = currentStudyDay();
  const allowedContentIds = await getEligibleContentIdsForCourses([courseId]);
  const questionPool = (await listStudyQuestions()).questions.filter(question => question.contentIds.some(contentId => allowedContentIds.includes(contentId)));
  const persistedQuestion = profile.dailyQuickCheckDate === day && profile.dailyQuickCheckCourseId === courseId
    ? questionPool.find(question => String(question.id) === profile.dailyQuickCheckQuestionId)
    : undefined;
  const recentAnswers = await db.select({ questionId: studyAnswers.questionId }).from(studyAnswers).where(eq(studyAnswers.userId, userId)).orderBy(desc(studyAnswers.answeredAt)).limit(20);
  const recentQuestionIds = [...recentAnswers.map(answer => answer.questionId), ...(profile.dailyQuickCheckQuestionId ? [profile.dailyQuickCheckQuestionId] : [])];
  const question = persistedQuestion ?? selectDailyQuickCheckQuestion({ questions: questionPool, userId, courseId, day, recentQuestionIds });
  if (!question) return { date: day, dismissed: false, question: null };

  if (!persistedQuestion) await db.update(studyProfiles).set({
    dailyQuickCheckDate: day,
    dailyQuickCheckCourseId: courseId,
    dailyQuickCheckQuestionId: String(question.id),
    dailyQuickCheckDismissed: false,
  }).where(eq(studyProfiles.userId, userId));

  return { date: day, dismissed: persistedQuestion ? profile.dailyQuickCheckDismissed : false, question };
}

export async function dismissDailyQuickCheck(userId: number, courseId: string) {
  const current = await getDailyQuickCheck(userId, courseId);
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  if (current.question) await db.update(studyProfiles).set({ dailyQuickCheckDismissed: true }).where(eq(studyProfiles.userId, userId));
  return { success: true } as const;
}

export async function recordAnswer(userId: number, questionId: string, correct: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(studyAnswers).values({ userId, questionId, correct });
  await registerStudyActivity(userId, correct ? 8 : 2);
  return getStudyState(userId);
}

export async function listStudyReviewItems(userId: number, status: "pending" | "mastered" = "pending") {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rows = await db.select().from(studyReviewItems).where(and(eq(studyReviewItems.userId, userId), eq(studyReviewItems.status, status))).orderBy(desc(studyReviewItems.createdAt));
  return rows.flatMap(item => {
    const snapshot = parseStudyReviewSnapshot(item.snapshotJson);
    return snapshot ? [{ id: item.id, questionKey: item.questionKey, snapshot, status: item.status, createdAt: item.createdAt.toISOString(), reviewedAt: item.reviewedAt?.toISOString() ?? null }] : [];
  });
}

export async function saveStudyReviewItem(userId: number, input: { questionKey: string; snapshot: StudyReviewSnapshot }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(studyReviewItems).values({ userId, questionKey: input.questionKey, snapshotJson: JSON.stringify(input.snapshot), status: "pending", reviewedAt: null }).onDuplicateKeyUpdate({ set: { snapshotJson: JSON.stringify(input.snapshot), status: "pending", reviewedAt: null } });
  return listStudyReviewItems(userId);
}

export async function completeStudyReviewItem(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(studyReviewItems).set({ status: "mastered", reviewedAt: new Date() }).where(and(eq(studyReviewItems.id, id), eq(studyReviewItems.userId, userId)));
  return listStudyReviewItems(userId);
}

export async function removeStudyReviewItem(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.delete(studyReviewItems).where(and(eq(studyReviewItems.id, id), eq(studyReviewItems.userId, userId)));
  return listStudyReviewItems(userId);
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
  const persistentAnswers = uniqueSimulationQuestions((input.persistentAnswers ?? []).map(answer => ({ ...answer, id: answer.questionId, status: "published" as const, requiresReview: true })));
  if (persistentAnswers.length) await db.insert(simulationQuestions).values(persistentAnswers.map((answer, position) => ({ simulationId: input.id, questionId: answer.questionId, position: position + 1, answeredCorrectly: answer.correct, snapshotJson: JSON.stringify(answer.snapshot) })));
  await registerStudyActivity(userId, input.correct * 8 + 15, input.questionIds);
  return getStudyState(userId);
}

export async function getNote(userId: number, moduleId: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const note = await db.select().from(studyNotes).where(and(eq(studyNotes.userId, userId), eq(studyNotes.moduleId, moduleId))).limit(1);
  return note[0] ?? null;
}

export type PrivateNoteRepository<TNote> = {
  find: (userId: number, moduleId: string) => Promise<TNote | null>;
  create: (userId: number, moduleId: string, content: string) => Promise<TNote>;
  update: (note: TNote, content: string) => Promise<TNote>;
};

export async function upsertPrivateNote<TNote>(repository: PrivateNoteRepository<TNote>, userId: number, moduleId: string, content: string) {
  const existing = await repository.find(userId, moduleId);
  return existing ? repository.update(existing, content) : repository.create(userId, moduleId, content);
}

export async function saveNote(userId: number, moduleId: string, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return upsertPrivateNote({
    find: getNote,
    create: async (ownerUserId, ownerModuleId, nextContent) => {
      await db.insert(studyNotes).values({ userId: ownerUserId, moduleId: ownerModuleId, content: nextContent });
      const created = await getNote(ownerUserId, ownerModuleId);
      if (!created) throw new Error("Anotação não foi salva");
      return created;
    },
    update: async (note, nextContent) => {
      await db.update(studyNotes).set({ content: nextContent }).where(eq(studyNotes.id, note.id));
      const updated = await getNote(note.userId, note.moduleId);
      if (!updated) throw new Error("Anotação não foi encontrada após a atualização");
      return updated;
    },
  }, userId, moduleId, content);
}

/** Utilitário interno para limpeza controlada em testes integrados. */
export async function deleteNoteByScope(userId: number, moduleId: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.delete(studyNotes).where(and(eq(studyNotes.userId, userId), eq(studyNotes.moduleId, moduleId)));
}

export async function listManagedUsers(search?: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const term = search?.trim().toLowerCase();
  const query = db.select({
    id: users.id, name: users.name, username: users.username, email: users.email, cpf: users.cpf, role: users.role,
    isBlocked: users.isBlocked, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn,
  }).from(users);
  if (!term) return query.orderBy(desc(users.createdAt)).limit(100);
  return query.where(or(like(users.name, `%${term}%`), like(users.username, `%${term}%`), like(users.email, `%${term}%`), like(users.cpf, `%${term.replace(/\D/g, "")}%`))).orderBy(desc(users.createdAt)).limit(100);
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

/** Exportação lógica para contingência, sem hashes de senha, tokens ou sessões. */
export async function createAdministrativeBackup(actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");

  const [
    backupUsers, profileRows, completedModuleRows, answerRows, reviewItemRows, simulationRecordRows, noteRows, contentProgressRows, roadmapRows,
    auditRows, courseRows, planRows, planCourseRows, couponRows, orderRows, orderItemRows, transactionRows, enrollmentRows,
    disciplineRows, contentRows, questionRows, courseDisciplineRows, disciplineContentRows, questionContentLinkRows, simulationQuestionRows,
    reviewQueueRows, questionChangelogRows, contentChangelogRows, contactRows, platformAlertRows, platformAlertDismissalRows,
  ] = await Promise.all([
    db.select({ id: users.id, openId: users.openId, name: users.name, username: users.username, email: users.email, cpf: users.cpf, loginMethod: users.loginMethod, role: users.role, isBlocked: users.isBlocked, createdAt: users.createdAt, updatedAt: users.updatedAt, lastSignedIn: users.lastSignedIn }).from(users),
    db.select().from(studyProfiles), db.select().from(completedModules), db.select().from(studyAnswers), db.select().from(studyReviewItems),
    db.select().from(simulationRecords), db.select().from(studyNotes), db.select().from(studyContentProgress), db.select().from(studyRoadmapItems),
    db.select().from(adminAuditLogs), db.select().from(courses), db.select().from(commercePlans), db.select().from(commercePlanCourses),
    db.select().from(commerceCoupons), db.select().from(commerceOrders), db.select().from(commerceOrderItems), db.select().from(commerceTransactions),
    db.select().from(courseEnrollments), db.select().from(disciplines), db.select().from(contents), db.select().from(questions),
    db.select().from(courseDisciplines), db.select().from(disciplineContents), db.select().from(questionContentLinks), db.select().from(simulationQuestions),
    db.select().from(reviewQueue), db.select().from(questionChangelog), db.select().from(contentChangelog), db.select().from(globalContactSettings),
    db.select().from(platformAlerts), db.select().from(platformAlertDismissals),
  ]);
  const data: AdminBackupData = {
    users: backupUsers,
    studyProfiles: profileRows, completedModules: completedModuleRows, studyAnswers: answerRows, studyReviewItems: reviewItemRows,
    simulationRecords: simulationRecordRows, studyNotes: noteRows, studyContentProgress: contentProgressRows, studyRoadmapItems: roadmapRows,
    adminAuditLogs: auditRows, courses: courseRows, commercePlans: planRows, commercePlanCourses: planCourseRows,
    commerceCoupons: couponRows, commerceOrders: orderRows, commerceOrderItems: orderItemRows, commerceTransactions: transactionRows,
    courseEnrollments: enrollmentRows, disciplines: disciplineRows, contents: contentRows, questions: questionRows,
    courseDisciplines: courseDisciplineRows, disciplineContents: disciplineContentRows, questionContentLinks: questionContentLinkRows,
    simulationQuestions: simulationQuestionRows, reviewQueue: reviewQueueRows, questionChangelog: questionChangelogRows,
    contentChangelog: contentChangelogRows, globalContactSettings: contactRows,
    platformAlerts: platformAlertRows, platformAlertDismissals: platformAlertDismissalRows,
  };
  const exportedAt = new Date();
  const payload = serializeAdminBackup(data, exportedAt);
  const serialized = JSON.stringify(payload, null, 2);
  const bytes = Buffer.byteLength(serialized, "utf8");
  if (bytes > 25 * 1024 * 1024) throw new Error("O backup ultrapassou 25 MB. Solicite uma exportação assistida para evitar um arquivo incompleto.");
  const stamp = exportedAt.toISOString().replace(/[:.]/g, "-");
  const fileName = `nucleo-concursos-backup-${stamp}.json`;
  const stored = await storagePut(`admin-backups/${actorUserId}/${fileName}`, serialized, "application/json");
  const recordCount = Object.values(payload.tableCounts).reduce((sum, count) => sum + count, 0);
  await writeAdminAudit(actorUserId, null, "EXPORTACAO_DE_BACKUP", `Exportação lógica gerada com ${recordCount} registros e ${bytes} bytes, sem credenciais de sessão.`);
  return { fileName, downloadUrl: stored.url, exportedAt: exportedAt.toISOString(), bytes, tableCounts: payload.tableCounts };
}

export async function updateManagedUser(userId: number, input: { name: string; username: string; email: string; cpf?: string }) {
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
    db.delete(courseEnrollments).where(eq(courseEnrollments.userId, userId)),
    db.delete(completedModules).where(eq(completedModules.userId, userId)),
    db.delete(studyAnswers).where(eq(studyAnswers.userId, userId)),
    db.delete(simulationRecords).where(eq(simulationRecords.userId, userId)),
    db.delete(studyNotes).where(eq(studyNotes.userId, userId)),
    db.delete(studyProfiles).where(eq(studyProfiles.userId, userId)),
    db.delete(studyReviewItems).where(eq(studyReviewItems.userId, userId)),
  ]);
  await db.delete(users).where(eq(users.id, userId));
}

export async function listAdminAuditLogs() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(100);
}

export type ManagedCourseInput = {
  id: string;
  title: string;
  track: string;
  courseType?: "concurso" | "tutorial";
  courseArea?: string;
  stateCode?: string;
  description?: string | null;
  coverImageUrl?: string | null;
  panelLabel?: string | null;
  panelBadge?: string | null;
  panelTitle?: string | null;
  panelDescription?: string | null;
  panelCtaText?: string | null;
};

export async function listManagedCourses() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.select().from(courses).orderBy(desc(courses.createdAt));
}

export async function getManagedCourseById(courseId: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  return result[0];
}

export async function createManagedCourse(actorUserId: number, input: ManagedCourseInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await getManagedCourseById(input.id);
  if (existing) throw new Error("Já existe um curso com este código.");
  await db.insert(courses).values({
    id: input.id,
    title: input.title,
    track: input.track,
    courseType: input.courseType ?? "concurso",
    courseArea: input.courseArea?.trim() || "Policial/Militar",
    stateCode: input.stateCode?.trim() || "Nacional",
    description: input.description?.trim() || null,
    coverImageUrl: input.coverImageUrl?.trim() || null,
    panelLabel: input.panelLabel?.trim() || null,
    panelBadge: input.panelBadge?.trim() || null,
    panelTitle: input.panelTitle?.trim() || null,
    panelDescription: input.panelDescription?.trim() || null,
    panelCtaText: input.panelCtaText?.trim() || null,
    isActive: true,
    createdByUserId: actorUserId,
  });
  const created = await getManagedCourseById(input.id);
  if (!created) throw new Error("Curso não foi salvo.");
  await writeAdminAudit(actorUserId, null, "CRIACAO_DE_CURSO", `Curso ${created.id} — ${created.title} criado.`);
  return created;
}

export async function updateManagedCourse(actorUserId: number, courseId: string, input: Omit<ManagedCourseInput, "id">) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await getManagedCourseById(courseId);
  if (!existing) throw new Error("Curso não encontrado.");
  await db.update(courses).set({
    title: input.title,
    track: input.track,
    courseType: input.courseType ?? "concurso",
    courseArea: input.courseArea?.trim() || "Policial/Militar",
    stateCode: input.stateCode?.trim() || "Nacional",
    description: input.description?.trim() || null,
    coverImageUrl: input.coverImageUrl?.trim() || null,
    panelLabel: input.panelLabel?.trim() || null,
    panelBadge: input.panelBadge?.trim() || null,
    panelTitle: input.panelTitle?.trim() || null,
    panelDescription: input.panelDescription?.trim() || null,
    panelCtaText: input.panelCtaText?.trim() || null,
  }).where(eq(courses.id, courseId));
  const updated = await getManagedCourseById(courseId);
  if (!updated) throw new Error("Curso não foi atualizado.");
  await writeAdminAudit(actorUserId, null, "ATUALIZACAO_DE_CURSO", `Curso ${courseId} atualizado.`);
  return updated;
}

export async function setManagedCourseActive(actorUserId: number, courseId: string, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await getManagedCourseById(courseId);
  if (!existing) throw new Error("Curso não encontrado.");
  await db.update(courses).set({ isActive }).where(eq(courses.id, courseId));
  const updated = await getManagedCourseById(courseId);
  if (!updated) throw new Error("Curso não encontrado.");
  await writeAdminAudit(actorUserId, null, isActive ? "ATIVACAO_DE_CURSO" : "DESATIVACAO_DE_CURSO", `Curso ${updated.id} ${isActive ? "ativado" : "desativado"}.`);
  return updated;
}

/** Remove apenas o curso e suas relações diretas; a biblioteca central continua intacta para outros concursos. */
export async function deleteManagedCourse(actorUserId: number, courseId: string, confirmation: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  if (confirmation !== courseId) throw new Error("Confirme digitando exatamente o código do curso.");
  const existing = await getManagedCourseById(courseId);
  if (!existing) throw new Error("Curso não encontrado.");
  const [links, enrollments] = await Promise.all([
    db.select({ id: courseDisciplines.id }).from(courseDisciplines).where(eq(courseDisciplines.courseId, courseId)),
    db.select({ id: courseEnrollments.id }).from(courseEnrollments).where(eq(courseEnrollments.courseId, courseId)),
  ]);
  await db.delete(courseDisciplines).where(eq(courseDisciplines.courseId, courseId));
  await db.delete(courseEnrollments).where(eq(courseEnrollments.courseId, courseId));
  await db.delete(courses).where(eq(courses.id, courseId));
  await writeAdminAudit(actorUserId, null, "EXCLUSAO_DE_CURSO", `Curso ${existing.id} — ${existing.title} excluído; ${links.length} vínculo(s) e ${enrollments.length} matrícula(s) removidos. Disciplinas, conteúdos e questões foram preservados.`);
  return { id: existing.id, title: existing.title, removedLinks: links.length, removedEnrollments: enrollments.length };
}

/** Cria as três matrizes iniciais uma única vez no banco de uma instância nova. */
export async function ensureDefaultCourses(actorUserId: number) {
  const db = await getDb();
  if (!db) return;
  for (const course of DEFAULT_COURSES) {
    const existing = await db.select({ id: courses.id }).from(courses).where(eq(courses.id, course.id)).limit(1);
    if (!existing[0]) await db.insert(courses).values({ ...course, createdByUserId: actorUserId, isActive: true });
  }
}

function normalizeSearchText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

export function legacyQuestionDifficulty(value: StudyQuestion["difficulty"]): QuestionDifficulty {
  if (value === "Fácil") return "basic";
  if (value === "Difícil") return "advanced";
  return "intermediate";
}

export function legacyDisciplineId(label: string) {
  const value = normalizeSearchText(label);
  if (value.includes("portugues")) return "lingua-portuguesa";
  if (value.includes("administrativo")) return "direito-administrativo";
  if (value.includes("constitucional")) return "direito-constitucional";
  if (value.includes("processual")) return "direito-processual-penal";
  if (value.includes("penal")) return "direito-penal";
  if (value.includes("humanos")) return "direitos-humanos";
  if (value.includes("legislacao")) return "legislacao-especial";
  if (value.includes("informatica")) return "informatica";
  if (value.includes("estatistica")) return "estatistica";
  if (value.includes("logico")) return "raciocinio-logico";
  if (value.includes("contabilidade")) return "contabilidade-geral";
  return null;
}

function contentForLegacyQuestion(question: StudyQuestion, contentIdsByTitle: Map<string, number>) {
  const disciplineId = legacyDisciplineId(question.discipline);
  if (!disciplineId) return undefined;
  const questionText = normalizeSearchText(`${question.subject} ${question.statement}`);
  const best = completeStudyModules.filter(module => getDisciplineIdForModule(module) === disciplineId).map(module => {
    const terms = normalizeSearchText(`${module.title} ${module.concepts.join(" ")}`).split(/[^a-z0-9]+/).filter(term => term.length >= 4);
    return { module, score: terms.reduce((total, term) => total + (questionText.includes(term) ? 1 : 0), 0) };
  }).sort((left, right) => right.score - left.score || left.module.code.localeCompare(right.module.code))[0];
  return best ? contentIdsByTitle.get(`${best.module.code} — ${best.module.title}`) : undefined;
}

async function importLegacyQuestions(actorUserId: number, contentIdsByTitle: Map<string, number>) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ id: questions.id, source: questions.source }).from(questions);
  const idsBySource = new Map(rows.filter(row => row.source?.startsWith("LEGADO_ESTUDOS_PF:")).map(row => [row.source!.split(" | ")[0].replace("LEGADO_ESTUDOS_PF:", ""), row.id]));
  let imported = 0;
  for (const legacy of questionBank) {
    const marker = `LEGADO_ESTUDOS_PF:${legacy.id}`;
    let questionId = idsBySource.get(legacy.id);
    if (!questionId) {
      const result = await db.insert(questions).values({
        statement: legacy.statement, questionType: "certo_errado", optionsJson: "[]", answerJson: JSON.stringify(legacy.answer),
        explanation: `${legacy.explanation}\n\nDica de revisão: ${legacy.tip}`, difficulty: legacyQuestionDifficulty(legacy.difficulty),
        source: `${marker} | ${legacy.source}`.slice(0, 240), banca: "Estudos PF", status: "published", requiresReview: false,
        createdByUserId: actorUserId, updatedByUserId: actorUserId,
      });
      questionId = Number(result[0].insertId);
      imported += 1;
    }
    const contentId = contentForLegacyQuestion(legacy, contentIdsByTitle);
    if (!contentId) continue;
    const existingLink = await db.select({ id: questionContentLinks.id }).from(questionContentLinks).where(and(eq(questionContentLinks.questionId, questionId), eq(questionContentLinks.contentId, contentId))).limit(1);
    if (!existingLink[0]) await db.insert(questionContentLinks).values({ questionId, contentId, linkedByUserId: actorUserId });
  }
  return imported;
}

/** Importa somente itens conciliados com o gabarito oficial do Cargo 12, sem remover vínculos editoriais posteriores. */
async function importPF2018Questions(actorUserId: number, contentIdsByTitle: Map<string, number>) {
  const db = await getDb();
  if (!db) return 0;
  const drafts = loadPF2018Questions();
  const contentIdsByCode = new Map(
    Array.from(contentIdsByTitle.entries()).map(([title, contentId]) => [title.split(" — ")[0].toUpperCase(), contentId]),
  );
  const missingContentCodes = Array.from(new Set(drafts.flatMap(draft => draft.contentCodes)))
    .filter(code => !contentIdsByCode.has(code));
  if (missingContentCodes.length) {
    throw new Error(`A importação PF 2018 não encontrou conteúdos centrais para: ${missingContentCodes.join(", ")}.`);
  }

  const rows = await db.select({ id: questions.id, source: questions.source }).from(questions);
  const questionIdsByMarker = new Map(
    rows
      .filter(row => row.source?.startsWith("PROVA_PF_2018:item_"))
      .map(row => [row.source!.split(" | ")[0], row.id]),
  );
  let imported = 0;

  for (const draft of drafts) {
    const marker = `PROVA_PF_2018:item_${draft.itemNumber}`;
    let questionId = questionIdsByMarker.get(marker);
    if (!questionId) {
      const result = await db.insert(questions).values({
        statement: draft.statement,
        questionType: "certo_errado",
        optionsJson: "[]",
        answerJson: JSON.stringify(draft.answer),
        explanation: "Resposta conforme o gabarito preliminar oficial da prova PF 2018, Cargo 12 (Agente).",
        difficulty: "intermediate",
        source: draft.source,
        banca: "CESPE/CEBRASPE",
        year: 2018,
        status: "published",
        requiresReview: false,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      });
      questionId = Number(result[0].insertId);
      questionIdsByMarker.set(marker, questionId);
      await writeQuestionChange(questionId, actorUserId, "created", null, { statement: draft.statement, source: draft.source });
      imported += 1;
    }

    for (const contentCode of draft.contentCodes) {
      const contentId = contentIdsByCode.get(contentCode)!;
      const existingLink = await db.select({ id: questionContentLinks.id })
        .from(questionContentLinks)
        .where(and(eq(questionContentLinks.questionId, questionId), eq(questionContentLinks.contentId, contentId)))
        .limit(1);
      if (!existingLink[0]) {
        await db.insert(questionContentLinks).values({ questionId, contentId, linkedByUserId: actorUserId });
        await writeQuestionChange(questionId, actorUserId, "contentLink", null, contentId);
      }
    }
  }
  return imported;
}

/**
 * Disponibiliza na biblioteca persistente os módulos didáticos que já existiam
 * na trilha de estudo. A rotina é idempotente e não substitui conteúdo criado
 * manualmente: cursos apenas apontam para disciplinas e conteúdos reutilizáveis.
 */
export async function ensureDefaultKnowledgeBase(actorUserId: number) {
  const db = await getDb();
  if (!db) return;

  const currentContents = await db.select({ id: contents.id, title: contents.title }).from(contents);
  const contentIdsByTitle = new Map(currentContents.map(content => [content.title, content.id]));
  const contentIdsByDiscipline = new Map<string, number[]>();
  let importedContents = 0;

  for (const module of completeStudyModules) {
    const disciplineCatalogId = getDisciplineIdForModule(module);
    if (!disciplineCatalogId) continue;
    const title = `${module.code} — ${module.title}`;
    let contentId = contentIdsByTitle.get(title);
    if (!contentId) {
      const result = await db.insert(contents).values({
        title,
        description: module.summary,
        body: [
          module.summary,
          `Conceitos-chave: ${module.concepts.join("; ")}.`,
          `Pontos de atenção: ${module.attention.join("; ")}.`,
          `Exemplo: ${module.example}`,
          `Roteiro rápido: ${module.fastTrack.join(" ")}`,
          `Mnemônico: ${module.mnemonic}`,
        ].join("\n\n"),
        status: "published",
        requiresReview: false,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      });
      contentId = Number(result[0].insertId);
      contentIdsByTitle.set(title, contentId);
      importedContents += 1;
    }
    contentIdsByDiscipline.set(disciplineCatalogId, [...(contentIdsByDiscipline.get(disciplineCatalogId) ?? []), contentId]);
  }

  const currentDisciplines = await db.select({ id: disciplines.id, shortName: disciplines.shortName }).from(disciplines);
  const disciplineIdsByShortName = new Map(currentDisciplines.map(discipline => [discipline.shortName, discipline.id]));
  const availableCourseIds = new Set((await db.select({ id: courses.id }).from(courses)).map(course => course.id));
  let importedDisciplines = 0;

  for (const discipline of disciplineCatalog) {
    const shortName = discipline.shortName.toUpperCase();
    if (disciplineIdsByShortName.has(shortName)) continue;
    const result = await db.insert(disciplines).values({
      name: discipline.name,
      shortName,
      description: discipline.description,
      status: "published",
      requiresReview: false,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    });
    const disciplineId = Number(result[0].insertId);
    disciplineIdsByShortName.set(shortName, disciplineId);
    importedDisciplines += 1;

    for (const contest of contestCatalog.filter(contest => contest.disciplineIds.includes(discipline.id) && availableCourseIds.has(contest.id))) {
      await db.insert(courseDisciplines).values({ courseId: contest.id, disciplineId, linkedByUserId: actorUserId });
    }
    for (const contentId of contentIdsByDiscipline.get(discipline.id) ?? []) {
      await db.insert(disciplineContents).values({ disciplineId, contentId, linkedByUserId: actorUserId });
    }
  }

  const importedQuestions = await importLegacyQuestions(actorUserId, contentIdsByTitle);
  const importedPF2018Questions = await importPF2018Questions(actorUserId, contentIdsByTitle);
  if (importedContents || importedDisciplines || importedQuestions || importedPF2018Questions) {
    await writeAdminAudit(actorUserId, null, "SEMEADURA_BIBLIOTECA_CENTRAL", `${importedDisciplines} disciplina(s), ${importedContents} conteúdo(s), ${importedQuestions} questão(ões) legadas e ${importedPF2018Questions} questão(ões) da prova PF 2018 foram disponibilizadas na biblioteca central.`);
  }
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

export async function listActivePlatformAlertsForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");

  const [activeAlerts, activeEnrollments, dismissals] = await Promise.all([
    db.select().from(platformAlerts).where(eq(platformAlerts.isActive, true)).orderBy(desc(platformAlerts.createdAt)),
    getUserCourseAccess(userId),
    db.select({ alertId: platformAlertDismissals.alertId }).from(platformAlertDismissals).where(eq(platformAlertDismissals.userId, userId)),
  ]);
  const activeCourseIds = new Set(activeEnrollments.map(enrollment => enrollment.courseId));
  const dismissedAlertIds = new Set(dismissals.map(row => row.alertId));

  return activeAlerts.filter(alert => isPlatformAlertVisibleForUser(alert, activeCourseIds, dismissedAlertIds));
}

export async function dismissPlatformAlertForUser(userId: number, alertId: number) {
  const visibleAlerts = await listActivePlatformAlertsForUser(userId);
  if (!visibleAlerts.some(alert => alert.id === alertId)) throw new Error("Este alerta não está disponível para a sua conta.");
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(platformAlertDismissals).values({ alertId, userId }).onDuplicateKeyUpdate({ set: { dismissedAt: new Date() } });
  return { alertId };
}

export async function createPlatformAlert(actorUserId: number, input: { level: PlatformAlertLevel; title: string; categoryLabel?: string; message: string; audience: PlatformAlertAudience; courseId?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const courseId = input.audience === "course" ? input.courseId?.trim() || null : null;
  const categoryLabel = input.categoryLabel?.trim() || null;
  if (input.audience === "course" && !courseId) throw new Error("Selecione o curso que receberá este alerta.");
  let courseTitle: string | null = null;
  if (courseId) {
    const course = await db.select({ id: courses.id, title: courses.title }).from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!course[0]) throw new Error("Curso não encontrado para segmentação do alerta.");
    courseTitle = course[0].title;
  }
  const result = await db.insert(platformAlerts).values({
    level: input.level,
    title: input.title.trim(),
    categoryLabel,
    message: input.message.trim(),
    audience: input.audience,
    courseId,
    createdByUserId: actorUserId,
  });
  const alertId = Number(result[0].insertId);
  await writeAdminAudit(actorUserId, null, "ENVIO_DE_ALERTA", `Alerta "${input.title.trim()}" (${input.level}) enviado para ${input.audience === "all" ? "todos os alunos" : `matrículas ativas de ${courseTitle}`}.`);
  const created = await db.select().from(platformAlerts).where(eq(platformAlerts.id, alertId)).limit(1);
  if (!created[0]) throw new Error("Alerta não foi salvo.");
  return created[0];
}

export async function listManagedPlatformAlerts() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const [alerts, courseRows, dismissals] = await Promise.all([
    db.select().from(platformAlerts).orderBy(desc(platformAlerts.createdAt)),
    db.select({ id: courses.id, title: courses.title }).from(courses),
    db.select({ alertId: platformAlertDismissals.alertId }).from(platformAlertDismissals),
  ]);
  const courseTitles = new Map(courseRows.map(course => [course.id, course.title]));
  const dismissalCounts = dismissals.reduce<Map<number, number>>((counts, dismissal) => {
    counts.set(dismissal.alertId, (counts.get(dismissal.alertId) ?? 0) + 1);
    return counts;
  }, new Map());
  return alerts.map(alert => ({
    ...alert,
    courseTitle: alert.courseId ? courseTitles.get(alert.courseId) ?? alert.courseId : null,
    dismissalCount: dismissalCounts.get(alert.id) ?? 0,
  }));
}

export async function setPlatformAlertActive(actorUserId: number, alertId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await db.select({ id: platformAlerts.id }).from(platformAlerts).where(eq(platformAlerts.id, alertId)).limit(1);
  if (!existing[0]) throw new Error("Alerta não encontrado.");
  await db.update(platformAlerts).set({ isActive }).where(eq(platformAlerts.id, alertId));
  await writeAdminAudit(actorUserId, null, isActive ? "REATIVACAO_DE_ALERTA" : "ENCERRAMENTO_DE_ALERTA", `Alerta ${alertId} ${isActive ? "reativado" : "encerrado"}.`);
  return { alertId, isActive };
}

/** Cursos e capas que podem ser apresentados na área de estudos do usuário autenticado. */
export async function listStudyCourseCatalog(userId: number, includeInactive = false) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const fields = {
    id: courses.id,
    title: courses.title,
    track: courses.track,
    courseType: courses.courseType,
    description: courses.description,
    coverImageUrl: courses.coverImageUrl,
    panelLabel: courses.panelLabel,
    panelBadge: courses.panelBadge,
    panelTitle: courses.panelTitle,
    panelDescription: courses.panelDescription,
    panelCtaText: courses.panelCtaText,
    isActive: courses.isActive,
  };
  if (includeInactive) return db.select(fields).from(courses);

  const activeEnrollments = await getUserCourseAccess(userId);
  const courseIds = activeEnrollments.map(enrollment => enrollment.courseId);
  if (!courseIds.length) return [];
  return db.select(fields).from(courses).where(and(eq(courses.isActive, true), inArray(courses.id, courseIds)));
}

/** Determina se o aluno possui ao menos uma matrícula vigente em curso do tipo Concurso. */
export async function userHasActiveContestCourse(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const activeEnrollments = await getUserCourseAccess(userId);
  const courseIds = activeEnrollments.map(enrollment => enrollment.courseId);
  if (!courseIds.length) return false;
  const matched = await db.select({ id: courses.id }).from(courses).where(and(
    eq(courses.isActive, true),
    eq(courses.courseType, "concurso"),
    inArray(courses.id, courseIds),
  )).limit(1);
  return Boolean(matched[0]);
}

export async function grantCourseEnrollment(actorUserId: number, userId: number, courseId: string, startAt: Date, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const course = await getManagedCourseById(courseId);
  if (!course || !course.isActive) throw new Error("Curso não encontrado ou indisponível para matrícula.");
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

export type KnowledgeStatus = "draft" | "review" | "approved" | "published" | "inactive";
export type QuestionType = "certo_errado" | "multipla_escolha";
export type QuestionDifficulty = "basic" | "intermediate" | "advanced";
export type ReviewItemType = "question" | "content";
export type ReviewDecision = "approved" | "rejected" | "correction_requested";

type DisciplineInput = {
  name: string;
  shortName: string;
  description?: string | null;
  requiresReview: boolean;
  status?: KnowledgeStatus;
  courseIds?: string[];
  contentIds?: number[];
};

type ContentInput = {
  title: string;
  objective?: string | null;
  description?: string | null;
  cardText?: string | null;
  body?: string | null;
  coverImageUrl?: string | null;
  videoUrl?: string | null;
  videoLabel?: string | null;
  materialUrl?: string | null;
  materialLabel?: string | null;
  noticeKind?: ContentNoticeKind | null;
  requiresReview: boolean;
  status?: KnowledgeStatus;
  disciplineIds?: number[];
};

export type ManagedQuestionInput = {
  statement: string;
  questionType: QuestionType;
  options: string[];
  answer: boolean | string;
  explanation?: string | null;
  difficulty: QuestionDifficulty;
  source?: string | null;
  banca?: string | null;
  year?: number | null;
  requiresReview: boolean;
  status?: KnowledgeStatus;
  contentIds: number[];
};

function uniqueNumbers(values: number[] = []) {
  return Array.from(new Set(values.filter(value => Number.isInteger(value) && value > 0)));
}

function uniqueCourseIds(values: string[] = []) {
  return Array.from(new Set(values.map(value => value.trim().toLowerCase()).filter(Boolean)));
}

function normalizeOptional(value?: string | null) {
  const normalized = value?.trim();
  return normalized || null;
}

function serializeField(value: unknown) {
  return value === null || value === undefined ? null : typeof value === "string" ? value : JSON.stringify(value);
}

function valueChanged(previous: unknown, next: unknown) {
  return serializeField(previous) !== serializeField(next);
}

async function assertExistingContentIds(contentIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  for (const contentId of uniqueNumbers(contentIds)) {
    const row = await db.select({ id: contents.id }).from(contents).where(eq(contents.id, contentId)).limit(1);
    if (!row[0]) throw new Error(`Conteúdo ${contentId} não encontrado.`);
  }
}

async function writeQuestionChange(questionId: number, actorUserId: number, changedField: string, oldValue: unknown, newValue: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(questionChangelog).values({ questionId, actorUserId, changedField, oldValue: serializeField(oldValue), newValue: serializeField(newValue) });
}

async function writeContentChange(contentId: number, actorUserId: number, changedField: string, oldValue: unknown, newValue: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(contentChangelog).values({ contentId, actorUserId, changedField, oldValue: serializeField(oldValue), newValue: serializeField(newValue) });
}

export async function listManagedDisciplines() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rows = await db.select().from(disciplines).orderBy(disciplines.name);
  return Promise.all(rows.map(async discipline => {
    const [courseLinks, contentLinks] = await Promise.all([
      db.select({ courseId: courseDisciplines.courseId }).from(courseDisciplines).where(eq(courseDisciplines.disciplineId, discipline.id)),
      db.select({ contentId: disciplineContents.contentId }).from(disciplineContents).where(eq(disciplineContents.disciplineId, discipline.id)),
    ]);
    return { ...discipline, courseIds: courseLinks.map(link => link.courseId), contentIds: contentLinks.map(link => link.contentId) };
  }));
}

async function getManagedDisciplineById(disciplineId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rows = await db.select().from(disciplines).where(eq(disciplines.id, disciplineId)).limit(1);
  return rows[0];
}

export async function createManagedDiscipline(actorUserId: number, input: DisciplineInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const shortName = input.shortName.trim().toUpperCase();
  const duplicate = await db.select({ id: disciplines.id }).from(disciplines).where(eq(disciplines.shortName, shortName)).limit(1);
  if (duplicate[0]) throw new Error("Já existe uma disciplina com esta sigla.");
  const result = await db.insert(disciplines).values({
    name: input.name.trim(), shortName, description: normalizeOptional(input.description),
    requiresReview: input.requiresReview, status: input.status ?? "draft", createdByUserId: actorUserId, updatedByUserId: actorUserId,
  });
  const disciplineId = Number(result[0].insertId);
  await syncCourseDisciplineLinks(actorUserId, disciplineId, input.courseIds ?? []);
  await syncDisciplineContentLinks(actorUserId, disciplineId, input.contentIds ?? []);
  await writeAdminAudit(actorUserId, null, "CRIACAO_DE_DISCIPLINA", `Disciplina ${shortName} criada.`);
  return getManagedDisciplineById(disciplineId);
}

export async function updateManagedDiscipline(actorUserId: number, disciplineId: number, input: DisciplineInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await getManagedDisciplineById(disciplineId);
  if (!existing) throw new Error("Disciplina não encontrada.");
  const shortName = input.shortName.trim().toUpperCase();
  const duplicate = await db.select({ id: disciplines.id }).from(disciplines).where(eq(disciplines.shortName, shortName)).limit(1);
  if (duplicate[0] && duplicate[0].id !== disciplineId) throw new Error("Já existe uma disciplina com esta sigla.");
  await db.update(disciplines).set({
    name: input.name.trim(), shortName, description: normalizeOptional(input.description), requiresReview: input.requiresReview,
    status: input.status ?? existing.status, updatedByUserId: actorUserId,
  }).where(eq(disciplines.id, disciplineId));
  await syncCourseDisciplineLinks(actorUserId, disciplineId, input.courseIds ?? []);
  await syncDisciplineContentLinks(actorUserId, disciplineId, input.contentIds ?? []);
  await writeAdminAudit(actorUserId, null, "ATUALIZACAO_DE_DISCIPLINA", `Disciplina ${shortName} atualizada.`);
  return getManagedDisciplineById(disciplineId);
}

export async function syncCourseDisciplineLinks(actorUserId: number, disciplineId: number, courseIds: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const requested = uniqueCourseIds(courseIds);
  for (const courseId of requested) {
    const course = await getManagedCourseById(courseId);
    if (!course) throw new Error(`Curso ${courseId} não encontrado.`);
  }
  const current = await db.select().from(courseDisciplines).where(eq(courseDisciplines.disciplineId, disciplineId));
  for (const link of current.filter(link => !requested.includes(link.courseId))) {
    await db.delete(courseDisciplines).where(eq(courseDisciplines.id, link.id));
  }
  for (const courseId of requested.filter(courseId => !current.some(link => link.courseId === courseId))) {
    await db.insert(courseDisciplines).values({ courseId, disciplineId, linkedByUserId: actorUserId });
  }
}

export async function syncDisciplineContentLinks(actorUserId: number, disciplineId: number, contentIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const requested = uniqueNumbers(contentIds);
  await assertExistingContentIds(requested);
  const current = await db.select().from(disciplineContents).where(eq(disciplineContents.disciplineId, disciplineId));
  for (const link of current.filter(link => !requested.includes(link.contentId))) {
    await db.delete(disciplineContents).where(eq(disciplineContents.id, link.id));
  }
  for (const contentId of requested.filter(contentId => !current.some(link => link.contentId === contentId))) {
    await db.insert(disciplineContents).values({ disciplineId, contentId, linkedByUserId: actorUserId });
  }
}

export async function listManagedContents() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rows = await db.select().from(contents).orderBy(desc(contents.updatedAt));
  return Promise.all(rows.map(async content => {
    const links = await db.select({ disciplineId: disciplineContents.disciplineId }).from(disciplineContents).where(eq(disciplineContents.contentId, content.id));
    return { ...content, disciplineIds: links.map(link => link.disciplineId) };
  }));
}

async function getManagedContentById(contentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rows = await db.select().from(contents).where(eq(contents.id, contentId)).limit(1);
  return rows[0];
}

export async function createManagedContent(actorUserId: number, input: ContentInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(contents).values({
    title: input.title.trim(), objective: normalizeOptional(input.objective), description: normalizeOptional(input.description), cardText: normalizeOptional(input.cardText), body: normalizeOptional(input.body), coverImageUrl: normalizeOptional(input.coverImageUrl), videoUrl: normalizeOptional(input.videoUrl), videoLabel: normalizeOptional(input.videoLabel), materialUrl: normalizeOptional(input.materialUrl), materialLabel: normalizeOptional(input.materialLabel),
    noticeKind: input.noticeKind ?? null, noticeActivatedAt: input.noticeKind ? new Date() : null,
    requiresReview: input.requiresReview, status: input.status === "review" ? "draft" : (input.status ?? "draft"), createdByUserId: actorUserId, updatedByUserId: actorUserId,
  });
  const contentId = Number(result[0].insertId);
  await syncContentDisciplineLinks(actorUserId, contentId, input.disciplineIds ?? []);
  await writeContentChange(contentId, actorUserId, "created", null, { title: input.title.trim() });
  await writeAdminAudit(actorUserId, null, "CRIACAO_DE_CONTEUDO", `Conteúdo ${contentId} criado.`);
  if (input.status === "review") await ensureItemInReviewQueue(actorUserId, "content", contentId);
  return getManagedContentById(contentId);
}

export async function updateManagedContent(actorUserId: number, contentId: number, input: ContentInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await getManagedContentById(contentId);
  if (!existing) throw new Error("Conteúdo não encontrado.");
  const requestedDisciplineIds = uniqueNumbers(input.disciplineIds ?? []);
  const currentDisciplineLinks = await db.select({ disciplineId: disciplineContents.disciplineId }).from(disciplineContents).where(eq(disciplineContents.contentId, contentId));
  const disciplineLinksChanged = currentDisciplineLinks.length !== requestedDisciplineIds.length || currentDisciplineLinks.some(link => !requestedDisciplineIds.includes(link.disciplineId));
  const next = {
    title: input.title.trim(), objective: normalizeOptional(input.objective), description: normalizeOptional(input.description), cardText: normalizeOptional(input.cardText), body: normalizeOptional(input.body), coverImageUrl: normalizeOptional(input.coverImageUrl), videoUrl: normalizeOptional(input.videoUrl), videoLabel: normalizeOptional(input.videoLabel), materialUrl: normalizeOptional(input.materialUrl), materialLabel: normalizeOptional(input.materialLabel),
    requiresReview: input.requiresReview, status: input.status ?? existing.status, noticeKind: input.noticeKind ?? null,
  };
  const contentChanged = disciplineLinksChanged || Object.entries(next).some(([field, value]) => valueChanged(existing[field as keyof typeof existing], value));
  const shouldActivateNotice = Boolean(next.noticeKind) && (!existing.noticeActivatedAt || existing.noticeKind !== next.noticeKind || contentChanged);
  await db.update(contents).set({ ...next, noticeActivatedAt: next.noticeKind ? (shouldActivateNotice ? new Date() : existing.noticeActivatedAt) : null, updatedByUserId: actorUserId }).where(eq(contents.id, contentId));
  for (const field of Object.keys(next) as (keyof typeof next)[]) {
    if (valueChanged(existing[field], next[field])) await writeContentChange(contentId, actorUserId, field, existing[field], next[field]);
  }
  await syncContentDisciplineLinks(actorUserId, contentId, input.disciplineIds ?? []);
  await writeAdminAudit(actorUserId, null, "ATUALIZACAO_DE_CONTEUDO", `Conteúdo ${contentId} atualizado.`);
  if (input.status === "review") await ensureItemInReviewQueue(actorUserId, "content", contentId);
  return getManagedContentById(contentId);
}

export async function syncContentDisciplineLinks(actorUserId: number, contentId: number, disciplineIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const requested = uniqueNumbers(disciplineIds);
  for (const disciplineId of requested) {
    if (!await getManagedDisciplineById(disciplineId)) throw new Error(`Disciplina ${disciplineId} não encontrada.`);
  }
  const current = await db.select().from(disciplineContents).where(eq(disciplineContents.contentId, contentId));
  for (const link of current.filter(link => !requested.includes(link.disciplineId))) {
    await db.delete(disciplineContents).where(eq(disciplineContents.id, link.id));
    await writeContentChange(contentId, actorUserId, "disciplineLink", link.disciplineId, null);
  }
  for (const disciplineId of requested.filter(disciplineId => !current.some(link => link.disciplineId === disciplineId))) {
    await db.insert(disciplineContents).values({ disciplineId, contentId, linkedByUserId: actorUserId });
    await writeContentChange(contentId, actorUserId, "disciplineLink", null, disciplineId);
  }
}

export async function listManagedQuestions(input: { search?: string; status?: KnowledgeStatus; contentId?: number } = {}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  let rows;
  if (input.status && input.search) rows = await db.select().from(questions).where(and(eq(questions.status, input.status), like(questions.statement, `%${input.search.trim()}%`))).orderBy(desc(questions.updatedAt));
  else if (input.status) rows = await db.select().from(questions).where(eq(questions.status, input.status)).orderBy(desc(questions.updatedAt));
  else if (input.search?.trim()) rows = await db.select().from(questions).where(like(questions.statement, `%${input.search.trim()}%`)).orderBy(desc(questions.updatedAt));
  else rows = await db.select().from(questions).orderBy(desc(questions.updatedAt));
  const enriched = await Promise.all(rows.map(async question => {
    const links = await db.select({ id: contents.id, title: contents.title, status: contents.status }).from(questionContentLinks).innerJoin(contents, eq(questionContentLinks.contentId, contents.id)).where(eq(questionContentLinks.questionId, question.id));
    return { ...question, contentIds: links.map(link => link.id), contents: links, options: question.optionsJson ? JSON.parse(question.optionsJson) : [], answer: JSON.parse(question.answerJson) };
  }));
  return input.contentId ? enriched.filter(question => question.contentIds.includes(input.contentId!)) : enriched;
}

/** Projeção para alunos: respeita o modo simples e a revisão configurável, sem duplicar a questão por conteúdo. */
export async function listStudyQuestions() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const allRows = await db.select().from(questions).orderBy(desc(questions.updatedAt));
  const rows = uniqueSimulationQuestions(allRows.filter(question => canUseQuestionInSimulation(question)));
  const studyQuestions = await Promise.all(rows.map(async question => {
    const linkedContents = await db.select({ id: contents.id, title: contents.title }).from(questionContentLinks).innerJoin(contents, eq(questionContentLinks.contentId, contents.id)).where(eq(questionContentLinks.questionId, question.id));
    const disciplineNames: string[] = [];
    for (const content of linkedContents) {
      const links = await db.select({ name: disciplines.name }).from(disciplineContents).innerJoin(disciplines, eq(disciplineContents.disciplineId, disciplines.id)).where(eq(disciplineContents.contentId, content.id));
      for (const link of links) if (!disciplineNames.includes(link.name)) disciplineNames.push(link.name);
    }
    return {
      id: question.id, statement: question.statement, questionType: question.questionType,
      options: question.optionsJson ? JSON.parse(question.optionsJson) : [], answer: JSON.parse(question.answerJson),
      explanation: question.explanation, difficulty: question.difficulty, source: question.source, banca: question.banca, year: question.year,
      discipline: disciplineNames[0] ?? "Biblioteca central", subject: linkedContents.map(content => content.title).join(" · ") || "Conteúdo geral",
      contentIds: linkedContents.map(content => content.id),
    };
  }));
  return { requiresReviewMode: requiresExclusiveCentralBank(allRows), questions: studyQuestions };
}

async function getManagedQuestionById(questionId: number) {
  const rows = await listManagedQuestions();
  return rows.find(question => question.id === questionId);
}

export async function createManagedQuestion(actorUserId: number, input: ManagedQuestionInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(questions).values({
    statement: input.statement.trim(), questionType: input.questionType, optionsJson: input.questionType === "multipla_escolha" ? JSON.stringify(input.options) : null,
    answerJson: JSON.stringify(input.answer), explanation: normalizeOptional(input.explanation), difficulty: input.difficulty,
    source: normalizeOptional(input.source), banca: normalizeOptional(input.banca), year: input.year ?? null,
    requiresReview: input.requiresReview, status: input.status === "review" ? "draft" : (input.status ?? "draft"), createdByUserId: actorUserId, updatedByUserId: actorUserId,
  });
  const questionId = Number(result[0].insertId);
  await writeQuestionChange(questionId, actorUserId, "created", null, { statement: input.statement.trim() });
  await syncQuestionContentLinks(actorUserId, questionId, input.contentIds);
  await writeAdminAudit(actorUserId, null, "CRIACAO_DE_QUESTAO", `Questão ${questionId} criada.`);
  if (input.status === "review") await ensureItemInReviewQueue(actorUserId, "question", questionId);
  const created = await getManagedQuestionById(questionId);
  if (!created) throw new Error("A questão foi criada, mas não pôde ser recuperada para confirmação.");
  return created;
}

export async function updateManagedQuestion(actorUserId: number, questionId: number, input: ManagedQuestionInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
  const previous = existing[0];
  if (!previous) throw new Error("Questão não encontrada.");
  const next = {
    statement: input.statement.trim(), questionType: input.questionType, optionsJson: input.questionType === "multipla_escolha" ? JSON.stringify(input.options) : null,
    answerJson: JSON.stringify(input.answer), explanation: normalizeOptional(input.explanation), difficulty: input.difficulty,
    source: normalizeOptional(input.source), banca: normalizeOptional(input.banca), year: input.year ?? null,
    requiresReview: input.requiresReview, status: input.status ?? previous.status,
  };
  await db.update(questions).set({ ...next, updatedByUserId: actorUserId }).where(eq(questions.id, questionId));
  for (const field of Object.keys(next) as (keyof typeof next)[]) {
    if (valueChanged(previous[field], next[field])) await writeQuestionChange(questionId, actorUserId, field, previous[field], next[field]);
  }
  await syncQuestionContentLinks(actorUserId, questionId, input.contentIds);
  await writeAdminAudit(actorUserId, null, "ATUALIZACAO_DE_QUESTAO", `Questão ${questionId} atualizada sem substituição do identificador.`);
  if (input.status === "review") await ensureItemInReviewQueue(actorUserId, "question", questionId);
  return getManagedQuestionById(questionId);
}

/** Exclui apenas questões que ainda não foram usadas em simulados, preservando a integridade do histórico estudantil. */
export async function deleteManagedQuestion(actorUserId: number, questionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await db.select({ id: questions.id, statement: questions.statement }).from(questions).where(eq(questions.id, questionId)).limit(1);
  if (!existing[0]) throw new Error("Questão não encontrada.");
  const simulationUse = await db.select({ id: simulationQuestions.id }).from(simulationQuestions).where(eq(simulationQuestions.questionId, questionId)).limit(1);
  if (simulationUse[0]) throw new Error("Esta questão já foi usada em um simulado e não pode ser excluída. Mude seu status para INATIVO para preservá-la no histórico.");

  await db.delete(reviewQueue).where(and(eq(reviewQueue.itemType, "question"), eq(reviewQueue.itemId, questionId)));
  await db.delete(questionChangelog).where(eq(questionChangelog.questionId, questionId));
  await db.delete(questionContentLinks).where(eq(questionContentLinks.questionId, questionId));
  await db.delete(questions).where(eq(questions.id, questionId));
  await writeAdminAudit(actorUserId, null, "EXCLUSAO_DE_QUESTAO", `Questão ${questionId} excluída antes de ser usada em simulado.`);
  return { id: questionId, statement: existing[0].statement };
}

export async function syncQuestionContentLinks(actorUserId: number, questionId: number, contentIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const requested = uniqueNumbers(contentIds);
  await assertExistingContentIds(requested);
  const current = await db.select().from(questionContentLinks).where(eq(questionContentLinks.questionId, questionId));
  for (const link of current.filter(link => !requested.includes(link.contentId))) {
    await db.delete(questionContentLinks).where(eq(questionContentLinks.id, link.id));
    await writeQuestionChange(questionId, actorUserId, "contentLink", link.contentId, null);
  }
  for (const contentId of requested.filter(contentId => !current.some(link => link.contentId === contentId))) {
    await db.insert(questionContentLinks).values({ questionId, contentId, linkedByUserId: actorUserId });
    await writeQuestionChange(questionId, actorUserId, "contentLink", null, contentId);
  }
}

export async function listQuestionChangelog(questionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.select().from(questionChangelog).where(eq(questionChangelog.questionId, questionId)).orderBy(desc(questionChangelog.createdAt));
}

export async function listContentChangelog(contentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.select().from(contentChangelog).where(eq(contentChangelog.contentId, contentId)).orderBy(desc(contentChangelog.createdAt));
}

async function ensureItemInReviewQueue(actorUserId: number, itemType: ReviewItemType, itemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const pending = await db.select({ id: reviewQueue.id }).from(reviewQueue).where(and(eq(reviewQueue.itemType, itemType), eq(reviewQueue.itemId, itemId), eq(reviewQueue.status, "pending"))).limit(1);
  if (!pending[0]) await submitForReview(actorUserId, itemType, itemId);
}

export async function submitForReview(actorUserId: number, itemType: ReviewItemType, itemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const pending = await db.select({ id: reviewQueue.id }).from(reviewQueue).where(and(eq(reviewQueue.itemType, itemType), eq(reviewQueue.itemId, itemId), eq(reviewQueue.status, "pending"))).limit(1);
  if (pending[0]) throw new Error("Este item já está na fila de revisão.");
  if (itemType === "question") {
    const item = await db.select().from(questions).where(eq(questions.id, itemId)).limit(1);
    if (!item[0]) throw new Error("Questão não encontrada.");
    await db.update(questions).set({ status: "review", updatedByUserId: actorUserId }).where(eq(questions.id, itemId));
    await writeQuestionChange(itemId, actorUserId, "status", item[0].status, "review");
  } else {
    const item = await db.select().from(contents).where(eq(contents.id, itemId)).limit(1);
    if (!item[0]) throw new Error("Conteúdo não encontrado.");
    await db.update(contents).set({ status: "review", updatedByUserId: actorUserId }).where(eq(contents.id, itemId));
    await writeContentChange(itemId, actorUserId, "status", item[0].status, "review");
  }
  await db.insert(reviewQueue).values({ itemType, itemId, submittedByUserId: actorUserId, status: "pending" });
  await writeAdminAudit(actorUserId, null, "ENVIO_PARA_REVISAO", `${itemType === "question" ? "Questão" : "Conteúdo"} ${itemId} enviado para revisão.`);
  return { success: true };
}

export async function listReviewQueue(input: { itemType?: ReviewItemType; status?: "pending" | ReviewDecision; search?: string } = {}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  let rows;
  if (input.itemType && input.status) rows = await db.select().from(reviewQueue).where(and(eq(reviewQueue.itemType, input.itemType), eq(reviewQueue.status, input.status))).orderBy(desc(reviewQueue.createdAt));
  else if (input.itemType) rows = await db.select().from(reviewQueue).where(eq(reviewQueue.itemType, input.itemType)).orderBy(desc(reviewQueue.createdAt));
  else if (input.status) rows = await db.select().from(reviewQueue).where(eq(reviewQueue.status, input.status)).orderBy(desc(reviewQueue.createdAt));
  else rows = await db.select().from(reviewQueue).orderBy(desc(reviewQueue.createdAt));
  const enriched = await Promise.all(rows.map(async row => {
    if (row.itemType === "question") {
      const item = await db.select({ statement: questions.statement, status: questions.status }).from(questions).where(eq(questions.id, row.itemId)).limit(1);
      return { ...row, title: item[0]?.statement ?? `Questão removida #${row.itemId}`, itemStatus: item[0]?.status ?? "inactive" };
    }
    const item = await db.select({ title: contents.title, status: contents.status }).from(contents).where(eq(contents.id, row.itemId)).limit(1);
    return { ...row, title: item[0]?.title ?? `Conteúdo removido #${row.itemId}`, itemStatus: item[0]?.status ?? "inactive" };
  }));
  const term = input.search?.trim().toLowerCase();
  return term ? enriched.filter(item => item.title.toLowerCase().includes(term)) : enriched;
}

export async function getReviewPendingCount() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rows = await db.select({ count: sql<number>`count(*)` }).from(reviewQueue).where(eq(reviewQueue.status, "pending"));
  return Number(rows[0]?.count ?? 0);
}

export async function decideReview(actorUserId: number, reviewId: number, decision: ReviewDecision, notes?: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const review = await db.select().from(reviewQueue).where(eq(reviewQueue.id, reviewId)).limit(1);
  if (!review[0]) throw new Error("Item de revisão não encontrado.");
  if (review[0].status !== "pending") throw new Error("Esta revisão já recebeu uma decisão.");
  const nextStatus: KnowledgeStatus = decision === "approved" ? "approved" : "draft";
  if (review[0].itemType === "question") {
    const item = await db.select().from(questions).where(eq(questions.id, review[0].itemId)).limit(1);
    if (!item[0]) throw new Error("Questão não encontrada.");
    await db.update(questions).set({ status: nextStatus, updatedByUserId: actorUserId }).where(eq(questions.id, review[0].itemId));
    await writeQuestionChange(review[0].itemId, actorUserId, "reviewDecision", item[0].status, nextStatus);
  } else {
    const item = await db.select().from(contents).where(eq(contents.id, review[0].itemId)).limit(1);
    if (!item[0]) throw new Error("Conteúdo não encontrado.");
    await db.update(contents).set({ status: nextStatus, updatedByUserId: actorUserId }).where(eq(contents.id, review[0].itemId));
    await writeContentChange(review[0].itemId, actorUserId, "reviewDecision", item[0].status, nextStatus);
  }
  await persistReviewDecision({ find: async id => id === reviewId ? review[0] : null, update: async (id, changes) => { await db.update(reviewQueue).set(changes).where(eq(reviewQueue.id, id)); } }, reviewId, actorUserId, decision as PersistedReviewDecision, normalizeOptional(notes));
  await writeAdminAudit(actorUserId, null, "DECISAO_DE_REVISAO", `Revisão ${reviewId} concluída como ${decision}.`);
  return { success: true, status: decision };
}
