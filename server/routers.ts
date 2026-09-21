import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, enrollmentRequiredProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  completeStudyModule,
  completeStudyContent,
  clearCompetitionRanking,
  createPlatformAlert,
  createAdministrativeBackup,
  createCompetitionRound,
  createManagedContent,
  createManagedCourse,
  createManagedDiscipline,
  createManagedQuestion,
  deleteManagedQuestion,
  createLocalUser,
  createPasswordResetToken,
  deleteManagedCourse,
  replaceSessionForUser,
  deleteManagedUser,
  deleteSessionByHash,
  getAdminStats,
  getReviewPendingCount,
  getStudyState,
  getStudyCourseProgress,
  getUserCourseAccess,
  getUserByCpf,
  getDailyQuickCheck,
  getCompetitionRanking,
  getCompetitionRound,
  getCompetitionSettings,
  getCompetitionMonthlyGoal,
  getMyCompetitionHistory,
  getMyMonthlyCompetitionGoal,
  getMyCompetitionScore,
  dismissDailyQuickCheck,
  grantCourseEnrollment,
  getUserById,
  getUserByIdentifier,
  listAdminAuditLogs,
  listContentChangelog,
  listManagedCourses,
  listManagedContents,
  listManagedDisciplines,
  listManagedQuestions,
  listStudyQuestions,
  listStudyCourseCatalog,
  listManagedUsers,
  listCompetitionCourses,
  listQuestionChangelog,
  listReviewQueue,
  listStudyReviewItems,
  listStudyRoadmap,
  listUserEnrollments,
  completeStudyReviewItem,
  consumePasswordResetToken,
  recordAnswer,
  recordSimulation,
  openStudyContent,
  removeStudyReviewItem,
  saveNote,
  saveCompetitionMonthlyGoal,
  saveCompetitionSettings,
  saveStudyReviewItem,
  saveStudyRoadmapItem,
  setUserBlocked,
  removeStudyRoadmapItem,
  setManagedCourseActive,
  updateManagedUser,
  updateManagedContent,
  updateManagedCourse,
  updateManagedDiscipline,
  updateManagedQuestion,
  updateUserPassword,
  updateUserProfile,
  userHasActiveContestCourse,
  writeAdminAudit,
  submitForReview,
  submitCompetitionAnswer,
  decideReview,
  dismissPlatformAlertForUser,
  listActivePlatformAlertsForUser,
  listManagedPlatformAlerts,
  setPlatformAlertActive,
} from "./db";
import { isValidCpf, normalizeCpf } from "./cpf";
import { isAllowedCourseCoverUrl } from "./courseCoverUrl";
import { createSessionToken, hashPassword, hashSessionToken, LOCAL_SESSION_COOKIE, LOCAL_SESSION_MAX_AGE_MS, verifyPassword } from "./auth/localAuth";
import { clearSuccessfulLoginAttempt, isLoginAttemptAllowed, loginAttemptKeys, loginRetryAfterSeconds, recordFailedLoginAttempt } from "./auth/loginRateLimit";
import { hasRootBootstrapSecret } from "./auth/rootConfig";
import { storagePut } from "./storage";
import {
  approveCommerceOrder,
  cancelCommerceOrder,
  createCommerceCoupon,
  deleteCommerceCoupon,
  createCommerceOrder,
  createCommercePlan,
  getCommerceMetrics,
  listManagedCommerceCoupons,
  listManagedCommerceOrders,
  listManagedCommercePlans,
  listPublicCommercePlans,
  listUserCommerceAccesses,
  listUserCommerceOrders,
  updateCommerceCoupon,
  updateCommercePlan,
} from "./commerce";
import { createMercadoPagoCheckout } from "./mercadoPago";
import { matchesAccountDeletionConfirmation } from "./accountDeletion";
import { sendPasswordResetEmail } from "./email";

const usernameSchema = z.string().trim().toLowerCase().min(3, "Use ao menos 3 caracteres.").max(48).regex(/^[a-z0-9._-]+$/, "Use apenas letras minúsculas, números, ponto, hífen ou sublinhado.");
const passwordSchema = z.string().min(8, "A senha deve ter pelo menos 8 caracteres.").max(128);
const profileSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo.").max(160),
  username: usernameSchema,
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(320),
});
const cpfSchema = z.string().trim().transform(normalizeCpf).refine(isValidCpf, "Informe um CPF válido.");
const metricSchema = z.record(z.string(), z.object({ correct: z.number().int().nonnegative(), total: z.number().int().nonnegative() }));
const studyReviewSnapshotSchema = z.object({
  statement: z.string().trim().min(1).max(12000),
  answer: z.boolean(),
  explanation: z.string().trim().min(1).max(12000),
  discipline: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(240),
  source: z.string().trim().max(400).optional(),
});
const enrollmentSchema = z.object({
  userId: z.number().int().positive(),
  courseId: z.string().trim().min(1).max(80),
  startAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
}).refine(input => input.expiresAt > input.startAt, { message: "A data de vencimento deve ser posterior ao início.", path: ["expiresAt"] });
const courseIdSchema = z.string().trim().toLowerCase().min(2, "Use ao menos 2 caracteres.").max(80).regex(/^[a-z0-9._-]+$/, "Use letras minúsculas, números, ponto, hífen ou sublinhado.");
const courseSchema = z.object({
  id: courseIdSchema,
  title: z.string().trim().min(4, "Informe o título do curso.").max(180),
  track: z.string().trim().min(2, "Informe a trilha do curso.").max(32),
  courseType: z.enum(["concurso", "tutorial"]).default("concurso"),
  courseArea: z.string().trim().min(2, "Informe a área do curso.").max(80).default("Policial/Militar"),
  stateCode: z.string().trim().min(2, "Informe o estado ou a abrangência.").max(32).default("Nacional"),
  description: z.string().trim().max(1200).optional(),
  coverImageUrl: z.string().trim().max(1024).refine(isAllowedCourseCoverUrl, "Informe uma URL HTTPS ou uma capa enviada pela plataforma.").optional().or(z.literal("")),
  panelLabel: z.string().trim().max(80, "Use no máximo 80 caracteres.").optional().or(z.literal("")),
  panelBadge: z.string().trim().max(80, "Use no máximo 80 caracteres.").optional().or(z.literal("")),
  panelTitle: z.string().trim().max(240, "Use no máximo 240 caracteres.").optional().or(z.literal("")),
  panelDescription: z.string().trim().max(1200, "Use no máximo 1.200 caracteres.").optional().or(z.literal("")),
  panelCtaText: z.string().trim().max(80, "Use no máximo 80 caracteres.").optional().or(z.literal("")),
});
const courseUpdateSchema = courseSchema.omit({ id: true });
const accountDeletionConfirmationSchema = z.string().trim().min(3, "Digite o nome ou usuário atual para confirmar.").max(160);
const commerceCodeSchema = z.string().trim().min(3, "Use ao menos 3 caracteres.").max(48).regex(/^[A-Za-z0-9_-]+$/, "Use apenas letras, números, hífen ou sublinhado.");
const commercePlanSchema = z.object({
  code: commerceCodeSchema,
  title: z.string().trim().min(4, "Informe o nome do plano.").max(180),
  description: z.string().trim().max(3000).optional().or(z.literal("")),
  coverImageUrls: z.array(z.string().trim().max(2048).refine(isAllowedCourseCoverUrl, "Informe uma URL HTTPS ou uma imagem enviada pela plataforma.")).max(3, "Adicione no máximo três imagens ao plano.").default([]),
  planType: z.enum(["course_access", "subscription"]),
  accessDurationDays: z.number().int().min(1, "Informe uma duração mínima de 1 dia.").max(3650),
  priceCents: z.number().int().min(0, "O preço não pode ser negativo.").max(100_000_000),
  isActive: z.boolean(),
  isHighlighted: z.boolean(),
  courseIds: z.array(courseIdSchema).min(1, "Associe ao menos um curso.").max(100),
});
const commerceCouponSchema = z.object({
  code: commerceCodeSchema,
  description: z.string().trim().max(240).optional().or(z.literal("")),
  discountType: z.enum(["percentage", "fixed_amount"]),
  discountValue: z.number().int().min(1, "Informe um desconto maior que zero.").max(100_000_000),
  maxRedemptions: z.number().int().positive().max(1_000_000).nullable().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean(),
}).superRefine((input, context) => {
  if (input.discountType === "percentage" && input.discountValue > 100) context.addIssue({ code: "custom", path: ["discountValue"], message: "Cupons percentuais aceitam no máximo 100%." });
  if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) context.addIssue({ code: "custom", path: ["endsAt"], message: "O fim da campanha deve ser posterior ao início." });
});
const commerceOrderStatusSchema = z.enum(["pending_payment", "paid", "cancelled", "expired", "refunded"]);
const knowledgeStatusSchema = z.enum(["draft", "review", "approved", "published", "inactive"]);
const questionTypeSchema = z.enum(["certo_errado", "multipla_escolha"]);
const difficultySchema = z.enum(["basic", "intermediate", "advanced"]);
const platformAlertLevelSchema = z.enum(["improvement", "warning", "urgent"]);
const platformAlertAudienceSchema = z.enum(["all", "course"]);
const platformAlertSchema = z.object({
  level: platformAlertLevelSchema,
  title: z.string().trim().min(2, "Informe um título com ao menos 2 caracteres.").max(180, "Use no máximo 180 caracteres."),
  categoryLabel: z.string().trim().max(80, "Use no máximo 80 caracteres.").optional().or(z.literal("")),
  message: z.string().trim().min(4, "Escreva uma mensagem com ao menos 4 caracteres.").max(1600, "Use no máximo 1.600 caracteres."),
  audience: platformAlertAudienceSchema,
  courseId: courseIdSchema.nullable().optional(),
}).superRefine((input, context) => {
  if (input.audience === "course" && !input.courseId) context.addIssue({ code: "custom", path: ["courseId"], message: "Selecione o curso que receberá o alerta." });
});
const entityIdSchema = z.number().int().positive();
const studyTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Informe um horário válido no formato HH:MM.");
const contentSchema = z.object({
  title: z.string().trim().min(4, "Informe o título do conteúdo.").max(220),
  objective: z.string().trim().max(4000).optional(),
  description: z.string().trim().max(4000).optional(),
  cardText: z.string().trim().max(1200).optional(),
  body: z.string().trim().max(30000).optional(),
  coverImageUrl: z.string().trim().max(2048).optional().or(z.literal("")),
  videoUrl: z.string().trim().url("Informe uma URL de vídeo válida.").max(2048).optional().or(z.literal("")),
  videoLabel: z.string().trim().max(160).optional(),
  materialUrl: z.string().trim().url("Informe uma URL de material válida.").max(2048).optional().or(z.literal("")),
  materialLabel: z.string().trim().max(160).optional(),
  noticeKind: z.enum(["new", "updated"]).nullable().optional(),
  requiresReview: z.boolean().default(false),
  status: knowledgeStatusSchema.optional(),
  disciplineIds: z.array(entityIdSchema).max(100).default([]),
});
const contentImageSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  base64: z.string().min(4).max(5_600_000),
});

function imageExtension(mimeType: z.infer<typeof contentImageSchema>["mimeType"]) {
  return mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
}

const disciplineSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome da disciplina.").max(160),
  shortName: z.string().trim().min(2, "Informe a sigla.").max(48),
  description: z.string().trim().max(4000).optional(),
  requiresReview: z.boolean().default(false),
  status: knowledgeStatusSchema.optional(),
  courseIds: z.array(courseIdSchema).max(100).default([]),
  contentIds: z.array(entityIdSchema).max(500).default([]),
});
const questionSchema = z.object({
  statement: z.string().trim().min(12, "Informe o enunciado da questão.").max(20000),
  questionType: questionTypeSchema,
  options: z.array(z.string().trim().min(1).max(1000)).max(10).default([]),
  answer: z.union([z.boolean(), z.string().trim().min(1).max(1000)]),
  explanation: z.string().trim().max(12000).optional(),
  difficulty: difficultySchema.default("intermediate"),
  source: z.string().trim().max(240).optional(),
  banca: z.string().trim().max(120).optional(),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  requiresReview: z.boolean().default(false),
  status: knowledgeStatusSchema.optional(),
  contentIds: z.array(entityIdSchema).max(100).default([]),
}).superRefine((input, context) => {
  if (input.questionType === "certo_errado" && typeof input.answer !== "boolean") context.addIssue({ code: "custom", path: ["answer"], message: "Questões CERTO/ERRADO exigem resposta booleana." });
  if (input.questionType === "multipla_escolha" && (typeof input.answer !== "string" || !input.options.includes(input.answer))) context.addIssue({ code: "custom", path: ["answer"], message: "Selecione uma alternativa cadastrada como resposta." });
});

function safeUser(user: NonNullable<Parameters<typeof getStudyState>[0]> extends never ? never : any) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    cpf: user.cpf,
    role: user.role,
    isBlocked: user.isBlocked,
    createdAt: user.createdAt,
    lastSignedIn: user.lastSignedIn,
  };
}

function invalidCredentials() {
  return new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha inválidos." });
}

const contestEnrollmentRequiredProcedure = enrollmentRequiredProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin" && !(await userHasActiveContestCourse(ctx.user.id))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Este recurso está disponível apenas para matrículas em cursos do tipo Concurso." });
  }
  return next({ ctx });
});

async function startLocalSession(ctx: { req: any; res: any }, userId: number) {
  const token = createSessionToken();
  const session = await replaceSessionForUser(userId, crypto.randomUUID(), hashSessionToken(token), new Date(Date.now() + LOCAL_SESSION_MAX_AGE_MS));
  const options = getSessionCookieOptions(ctx.req);
  ctx.res.cookie(LOCAL_SESSION_COOKIE, token, { ...options, maxAge: LOCAL_SESSION_MAX_AGE_MS });
  return session;
}

function clearAllAuthCookies(ctx: { req: any; res: any }) {
  const options = getSessionCookieOptions(ctx.req);
  ctx.res.clearCookie(LOCAL_SESSION_COOKIE, { ...options, maxAge: -1 });
  ctx.res.clearCookie(COOKIE_NAME, { ...options, maxAge: -1 });
}

function requestOrigin(req: { protocol?: string; get?: (name: string) => string | undefined; headers?: Record<string, string | string[] | undefined> }) {
  const configured = process.env.PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const forwarded = req.headers?.["x-forwarded-proto"];
  const protocol = Array.isArray(forwarded) ? forwarded[0] : forwarded || req.protocol || "https";
  const host = req.get?.("host");
  if (!host) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível preparar o checkout." });
  return `${protocol}://${host}`;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => (ctx.user ? safeUser(ctx.user) : null)),
    bootstrapStatus: publicProcedure.query(() => ({ rootBootstrapReady: hasRootBootstrapSecret() })),
    register: publicProcedure.input(profileSchema.extend({ cpf: cpfSchema, password: passwordSchema, passwordConfirmation: passwordSchema })).mutation(async ({ input, ctx }) => {
      if (input.password !== input.passwordConfirmation) throw new TRPCError({ code: "BAD_REQUEST", message: "A confirmação de senha não confere." });
      if (await getUserByIdentifier(input.username)) {
        throw new TRPCError({ code: "CONFLICT", message: "Este nome de usuário já está em uso." });
      }
      if (await getUserByIdentifier(input.email)) {
        throw new TRPCError({ code: "CONFLICT", message: "Este e-mail já está em uso." });
      }
      if (await getUserByCpf(input.cpf)) {
        throw new TRPCError({ code: "CONFLICT", message: "Este CPF já está em uso." });
      }
      const user = await createLocalUser({ ...input, passwordHash: await hashPassword(input.password) });
      const session = await startLocalSession(ctx, user.id);
      return { user: safeUser(user), ...session };
    }),
    login: publicProcedure.input(z.object({ identifier: z.string().trim().min(3), password: passwordSchema })).mutation(async ({ input, ctx }) => {
      const rateLimitKeys = loginAttemptKeys(ctx.req, input.identifier);
      if (!isLoginAttemptAllowed(rateLimitKeys)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Muitas tentativas de acesso. Aguarde cerca de ${loginRetryAfterSeconds(rateLimitKeys)} segundos e tente novamente.` });
      }
      const user = await getUserByIdentifier(input.identifier);
      if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
        recordFailedLoginAttempt(rateLimitKeys);
        throw invalidCredentials();
      }
      if (user.isBlocked) {
        recordFailedLoginAttempt(rateLimitKeys);
        throw new TRPCError({ code: "FORBIDDEN", message: "Esta conta está bloqueada. Procure a administração." });
      }
      clearSuccessfulLoginAttempt(rateLimitKeys);
      const session = await startLocalSession(ctx, user.id);
      return { user: safeUser(user), ...session };
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const token = ctx.req.headers.cookie?.match(new RegExp(`${LOCAL_SESSION_COOKIE}=([^;]+)`))?.[1];
      if (token) await deleteSessionByHash(hashSessionToken(token));
      clearAllAuthCookies(ctx);
      return { success: true } as const;
    }),
    changePassword: protectedProcedure.input(z.object({ currentPassword: passwordSchema, newPassword: passwordSchema, confirmation: passwordSchema })).mutation(async ({ input, ctx }) => {
      if (input.newPassword !== input.confirmation) throw new TRPCError({ code: "BAD_REQUEST", message: "A confirmação de senha não confere." });
      if (!ctx.user.passwordHash || !(await verifyPassword(input.currentPassword, ctx.user.passwordHash))) throw new TRPCError({ code: "FORBIDDEN", message: "A senha atual não confere." });
      await updateUserPassword(ctx.user.id, await hashPassword(input.newPassword));
      await startLocalSession(ctx, ctx.user.id);
      return { success: true };
    }),
    requestPasswordReset: publicProcedure.input(z.object({ email: z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(320) })).mutation(async ({ input, ctx }) => {
      const user = await getUserByIdentifier(input.email);
      if (user?.email && !user.isBlocked && user.email.toLowerCase() === input.email) {
        const token = createSessionToken();
        await createPasswordResetToken(user.id, hashSessionToken(token), new Date(Date.now() + 60 * 60 * 1000));
        const resetUrl = `${requestOrigin(ctx.req)}/?reset=${encodeURIComponent(token)}`;
        try {
          await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
        } catch (error) {
          console.error("[auth] Falha ao enviar recuperação de senha", { userId: user.id, error: error instanceof Error ? error.message : "erro desconhecido" });
        }
      }
      return { success: true } as const;
    }),
    resetPassword: publicProcedure.input(z.object({ token: z.string().trim().min(32).max(256), newPassword: passwordSchema, confirmation: passwordSchema })).mutation(async ({ input }) => {
      if (input.newPassword !== input.confirmation) throw new TRPCError({ code: "BAD_REQUEST", message: "A confirmação de senha não confere." });
      const result = await consumePasswordResetToken(hashSessionToken(input.token), await hashPassword(input.newPassword));
      if (!result) throw new TRPCError({ code: "BAD_REQUEST", message: "Este link é inválido, já foi utilizado ou expirou. Solicite uma nova recuperação." });
      return { success: true } as const;
    }),
    updateProfile: protectedProcedure.input(profileSchema).mutation(async ({ input, ctx }) => {
      const user = await updateUserProfile(ctx.user.id, input);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Conta não encontrada." });
      return safeUser(user);
    }),
  }),
  study: router({
    state: enrollmentRequiredProcedure.query(({ ctx }) => getStudyState(ctx.user.id)),
    access: protectedProcedure.query(({ ctx }) => getUserCourseAccess(ctx.user.id)),
    courseCatalog: protectedProcedure.query(({ ctx }) => listStudyCourseCatalog(ctx.user.id, ctx.user.role === "admin")),
    answer: enrollmentRequiredProcedure.input(z.object({ questionId: z.string().trim().min(1).max(80), correct: z.boolean() })).mutation(({ input, ctx }) => recordAnswer(ctx.user.id, input.questionId, input.correct)),
    dailyCheck: enrollmentRequiredProcedure.input(z.object({ courseId: courseIdSchema })).query(({ input, ctx }) => getDailyQuickCheck(ctx.user.id, input.courseId)),
    dismissDailyCheck: enrollmentRequiredProcedure.input(z.object({ courseId: courseIdSchema })).mutation(({ input, ctx }) => dismissDailyQuickCheck(ctx.user.id, input.courseId)),
    completeModule: enrollmentRequiredProcedure.input(z.object({ moduleId: z.string().trim().min(1).max(80) })).mutation(({ input, ctx }) => completeStudyModule(ctx.user.id, input.moduleId)),
    contentProgress: router({
      get: enrollmentRequiredProcedure.input(z.object({ courseId: courseIdSchema })).query(({ input, ctx }) => getStudyCourseProgress(ctx.user.id, input.courseId, ctx.user.role === "admin")),
      open: enrollmentRequiredProcedure.input(z.object({ courseId: courseIdSchema, contentId: entityIdSchema })).mutation(({ input, ctx }) => openStudyContent(ctx.user.id, input, ctx.user.role === "admin")),
      complete: enrollmentRequiredProcedure.input(z.object({ courseId: courseIdSchema, contentId: entityIdSchema })).mutation(({ input, ctx }) => completeStudyContent(ctx.user.id, input, ctx.user.role === "admin")),
    }),
    roadmap: router({
      list: enrollmentRequiredProcedure.input(z.object({ courseId: courseIdSchema })).query(({ input, ctx }) => listStudyRoadmap(ctx.user.id, input.courseId, ctx.user.role === "admin")),
      save: enrollmentRequiredProcedure.input(z.object({ courseId: courseIdSchema, disciplineId: entityIdSchema, weekday: z.number().int().min(0).max(6), isActive: z.boolean().default(true) })).mutation(({ input, ctx }) => saveStudyRoadmapItem(ctx.user.id, input, ctx.user.role === "admin")),
      remove: enrollmentRequiredProcedure.input(z.object({ id: entityIdSchema })).mutation(({ input, ctx }) => removeStudyRoadmapItem(ctx.user.id, input.id)),
    }),
    submitSimulation: contestEnrollmentRequiredProcedure.input(z.object({
      id: z.string().min(1).max(64), total: z.number().int().positive(), correct: z.number().int().nonnegative(), errors: z.number().int().nonnegative(), elapsedSeconds: z.number().int().nonnegative(),
      byDiscipline: metricSchema, byBlock: metricSchema,
      answers: z.array(z.object({ questionId: z.string().min(1).max(80), correct: z.boolean() })),
      questionIds: z.array(z.string().min(1).max(80)),
      persistentAnswers: z.array(z.object({ questionId: entityIdSchema, correct: z.boolean(), snapshot: z.record(z.string(), z.unknown()) })).optional(),
    })).mutation(({ input, ctx }) => recordSimulation(ctx.user.id, input)),
    questions: router({
      list: enrollmentRequiredProcedure.query(() => listStudyQuestions()),
    }),
    review: router({
      list: contestEnrollmentRequiredProcedure.query(({ ctx }) => listStudyReviewItems(ctx.user.id)),
      add: contestEnrollmentRequiredProcedure.input(z.object({ questionKey: z.string().trim().min(1).max(80), snapshot: studyReviewSnapshotSchema })).mutation(({ input, ctx }) => saveStudyReviewItem(ctx.user.id, input)),
      complete: contestEnrollmentRequiredProcedure.input(z.object({ id: entityIdSchema })).mutation(({ input, ctx }) => completeStudyReviewItem(ctx.user.id, input.id)),
      remove: contestEnrollmentRequiredProcedure.input(z.object({ id: entityIdSchema })).mutation(({ input, ctx }) => removeStudyReviewItem(ctx.user.id, input.id)),
    }),
    note: enrollmentRequiredProcedure.input(z.object({ moduleId: z.string().trim().min(1).max(80) })).query(({ input, ctx }) => import("./db").then(({ getNote }) => getNote(ctx.user.id, input.moduleId))),
    saveNote: enrollmentRequiredProcedure.input(z.object({ moduleId: z.string().trim().min(1).max(80), content: z.string().trim().max(12000) })).mutation(({ input, ctx }) => saveNote(ctx.user.id, input.moduleId, input.content)),
  }),
  competition: router({
    settings: protectedProcedure.query(() => getCompetitionSettings()),
    courses: protectedProcedure.query(() => listCompetitionCourses()),
    ranking: protectedProcedure.input(z.object({ courseId: courseIdSchema.optional() })).query(({ input }) => getCompetitionRanking(input.courseId)),
    myScore: contestEnrollmentRequiredProcedure.input(z.object({ courseId: courseIdSchema.optional() })).query(({ input, ctx }) => getMyCompetitionScore(ctx.user.id, input.courseId)),
    history: contestEnrollmentRequiredProcedure.input(z.object({ courseId: courseIdSchema.optional() })).query(({ input, ctx }) => getMyCompetitionHistory(ctx.user.id, input.courseId)),
    monthlyGoal: contestEnrollmentRequiredProcedure.input(z.object({ courseId: courseIdSchema.optional() })).query(({ input, ctx }) => getMyMonthlyCompetitionGoal(ctx.user.id, input.courseId)),
    startRound: contestEnrollmentRequiredProcedure.input(z.object({ courseId: courseIdSchema.optional() })).mutation(async ({ input, ctx }) => {
      const access = ctx.user.role === "admin" ? [] : await getUserCourseAccess(ctx.user.id);
      return createCompetitionRound(ctx.user.id, input.courseId, access.map(enrollment => enrollment.courseId), ctx.user.role === "admin");
    }),
    round: contestEnrollmentRequiredProcedure.input(z.object({ roundId: z.string().uuid() })).query(({ input, ctx }) => getCompetitionRound(ctx.user.id, input.roundId)),
    submitAnswer: contestEnrollmentRequiredProcedure.input(z.object({
      roundId: z.string().uuid(),
      questionId: entityIdSchema,
      submittedAnswer: z.union([z.boolean(), z.string().trim().min(1).max(1000)]),
    })).mutation(({ input, ctx }) => submitCompetitionAnswer(ctx.user.id, input)),
  }),
  commerce: router({
    plans: publicProcedure.query(() => listPublicCommercePlans()),
    myOrders: protectedProcedure.query(({ ctx }) => listUserCommerceOrders(ctx.user.id)),
    myAccesses: protectedProcedure.query(({ ctx }) => listUserCommerceAccesses(ctx.user.id)),
    createOrder: protectedProcedure.input(z.object({ planId: z.string().uuid(), couponCode: commerceCodeSchema.optional() })).mutation(({ input, ctx }) => createCommerceOrder(ctx.user.id, input.planId, input.couponCode)),
    checkout: protectedProcedure.input(z.object({ orderId: z.string().uuid() })).mutation(({ input, ctx }) => {
      const origin = requestOrigin(ctx.req);
      return createMercadoPagoCheckout(ctx.user.id, input.orderId, { origin, notificationUrl: `${origin}/api/payments/mercado-pago/webhook` });
    }),
  }),
  platform: router({
    contacts: publicProcedure.query(() => import("./db").then(({ getGlobalContactSettings }) => getGlobalContactSettings())),
    settings: publicProcedure.query(() => import("./db").then(({ getPlatformGeneralSettings }) => getPlatformGeneralSettings())),
    alerts: protectedProcedure.query(({ ctx }) => listActivePlatformAlertsForUser(ctx.user.id)),
    dismissAlert: protectedProcedure.input(z.object({ alertId: entityIdSchema })).mutation(({ input, ctx }) => dismissPlatformAlertForUser(ctx.user.id, input.alertId)),
  }),
  admin: router({
    users: adminProcedure.input(z.object({ search: z.string().trim().max(80).optional() })).query(({ input }) => listManagedUsers(input.search)),
    stats: adminProcedure.query(() => getAdminStats()),
    courses: adminProcedure.query(() => listManagedCourses()),
    createCourse: adminProcedure.input(courseSchema).mutation(({ input, ctx }) => createManagedCourse(ctx.user.id, input)),
    updateCourse: adminProcedure.input(z.object({ courseId: courseIdSchema, data: courseUpdateSchema })).mutation(({ input, ctx }) => updateManagedCourse(ctx.user.id, input.courseId, input.data)),
    uploadCourseCover: adminProcedure.input(contentImageSchema).mutation(async ({ input, ctx }) => {
      const base64 = input.base64.replace(/\s/g, "");
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new TRPCError({ code: "BAD_REQUEST", message: "A imagem enviada não está em um formato válido." });
      const bytes = Buffer.from(base64, "base64");
      if (!bytes.length || bytes.length > 4 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Envie uma imagem JPG, PNG ou WEBP de até 4 MB." });
      const stored = await storagePut(`course-covers/${ctx.user.id}/${crypto.randomUUID()}.${imageExtension(input.mimeType)}`, bytes, input.mimeType);
      return { url: stored.url };
    }),
    setCourseActive: adminProcedure.input(z.object({ courseId: courseIdSchema, isActive: z.boolean() })).mutation(({ input, ctx }) => setManagedCourseActive(ctx.user.id, input.courseId, input.isActive)),
    deleteCourse: adminProcedure.input(z.object({ courseId: courseIdSchema, confirmation: courseIdSchema })).mutation(({ input, ctx }) => deleteManagedCourse(ctx.user.id, input.courseId, input.confirmation)),
    alerts: router({
      list: adminProcedure.query(() => listManagedPlatformAlerts()),
      create: adminProcedure.input(platformAlertSchema).mutation(({ input, ctx }) => createPlatformAlert(ctx.user.id, input)),
      setActive: adminProcedure.input(z.object({ alertId: entityIdSchema, isActive: z.boolean() })).mutation(({ input, ctx }) => setPlatformAlertActive(ctx.user.id, input.alertId, input.isActive)),
    }),
    contacts: router({
      get: adminProcedure.query(() => import("./db").then(({ getGlobalContactSettings }) => getGlobalContactSettings())),
      save: adminProcedure.input(z.object({
        email: z.string().trim().email("Informe um e-mail válido.").max(320).optional().or(z.literal("")),
        telegramUrl: z.string().trim().url("Informe um link válido.").max(500).optional().or(z.literal("")),
      })).mutation(({ input, ctx }) => import("./db").then(({ saveGlobalContactSettings }) => saveGlobalContactSettings(ctx.user.id, input))),
    }),
    settings: router({
      get: adminProcedure.query(() => import("./db").then(({ getPlatformGeneralSettings }) => getPlatformGeneralSettings())),
      save: adminProcedure.input(z.object({
        logoUrl: z.string().trim().url("Informe um link de logo válido.").max(1000).optional().or(z.literal("")),
        brandName: z.string().trim().min(2, "Informe o nome da marca.").max(120),
        brandTagline: z.string().trim().max(180),
        heroBadge: z.string().trim().max(180),
        heroTitle: z.string().trim().min(4, "Informe o título principal.").max(320),
        heroDescription: z.string().trim().min(10, "Informe uma descrição mais completa.").max(1000),
        loginButtonText: z.string().trim().min(2).max(80),
        heroPrimaryCtaText: z.string().trim().min(2).max(120),
        heroSecondaryCtaText: z.string().trim().min(2).max(120),
        routineEyebrow: z.string().trim().min(2).max(160),
        routineStepOneTitle: z.string().trim().min(2).max(160),
        routineStepOneDescription: z.string().trim().min(4).max(600),
        routineStepTwoTitle: z.string().trim().min(2).max(160),
        routineStepTwoDescription: z.string().trim().min(4).max(600),
        routineStepThreeTitle: z.string().trim().min(2).max(160),
        routineStepThreeDescription: z.string().trim().min(4).max(600),
        benefitOneTitle: z.string().trim().min(2).max(160),
        benefitOneDescription: z.string().trim().min(4).max(600),
        benefitTwoTitle: z.string().trim().min(2).max(160),
        benefitTwoDescription: z.string().trim().min(4).max(600),
        benefitThreeTitle: z.string().trim().min(2).max(160),
        benefitThreeDescription: z.string().trim().min(4).max(600),
        packagesEyebrow: z.string().trim().min(2).max(160),
        packagesTitle: z.string().trim().min(4).max(320),
        packagesDescription: z.string().trim().min(10).max(1000),
        packagesLoadingText: z.string().trim().min(2).max(160),
        packagesEmptyText: z.string().trim().min(4).max(1000),
        highlightBadgeText: z.string().trim().min(2).max(120),
        includedCoursesLabel: z.string().trim().min(2).max(120),
        planFallbackDescription: z.string().trim().min(4).max(1000),
        planAccountNotice: z.string().trim().min(4).max(1000),
        finalCtaEyebrow: z.string().trim().min(2).max(160),
        finalCtaTitle: z.string().trim().min(4).max(320),
        finalCtaDescription: z.string().trim().min(4).max(1000),
        finalCtaButtonText: z.string().trim().min(2).max(120),
        footerPaymentText: z.string().trim().min(4).max(320),
        primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use uma cor hexadecimal, como #102F3A."),
        backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use uma cor hexadecimal, como #F6F1E7."),
        textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use uma cor hexadecimal, como #173D4A."),
        heroTextColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        heroMutedTextColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        accentTextColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        surfaceColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        cardColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        surfaceAccentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        borderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        mutedTextColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        iconBackgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        iconColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        buttonColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        buttonHoverColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      })).mutation(({ input, ctx }) => import("./db").then(({ savePlatformGeneralSettings }) => savePlatformGeneralSettings(ctx.user.id, input))),
      uploadLogo: adminProcedure.input(contentImageSchema).mutation(async ({ input, ctx }) => {
        const base64 = input.base64.replace(/\s/g, "");
        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new TRPCError({ code: "BAD_REQUEST", message: "A imagem enviada não está em um formato válido." });
        const bytes = Buffer.from(base64, "base64");
        if (!bytes.length || bytes.length > 4 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Envie uma imagem JPG, PNG ou WEBP de até 4 MB." });
        const stored = await storagePut(`platform-settings/${ctx.user.id}/${crypto.randomUUID()}.${imageExtension(input.mimeType)}`, bytes, input.mimeType);
        return { url: stored.url };
      }),
    }),
    competition: router({
      getSettings: adminProcedure.query(() => getCompetitionSettings()),
      saveSettings: adminProcedure.input(z.object({
        pointsPerCorrect: z.number().int().min(1, "Informe ao menos 1 ponto por acerto.").max(1000),
        pointsPerWrong: z.number().int().min(0).max(100),
        questionsPerRound: z.number().int().min(5, "A rodada deve ter ao menos 5 questões.").max(50),
        isActive: z.boolean(),
      })).mutation(({ input, ctx }) => saveCompetitionSettings(ctx.user.id, input)),
      getMonthlyGoal: adminProcedure.query(() => getCompetitionMonthlyGoal()),
      saveMonthlyGoal: adminProcedure.input(z.object({
        targetPoints: z.number().int().min(1, "Informe ao menos 1 ponto para a meta.").max(100000),
        targetCompletedRounds: z.number().int().min(1, "Informe ao menos 1 rodada para a meta.").max(500),
        rewardTitle: z.string().trim().min(3, "Informe o título do reconhecimento.").max(160),
        rewardDescription: z.string().trim().min(10, "Descreva o reconhecimento mensal.").max(500),
        isActive: z.boolean(),
      })).mutation(({ input, ctx }) => saveCompetitionMonthlyGoal(ctx.user.id, input)),
      clearRanking: adminProcedure.input(z.object({ courseId: courseIdSchema.optional(), confirmation: z.literal("LIMPAR RANKING") })).mutation(({ input, ctx }) => clearCompetitionRanking(ctx.user.id, input.courseId)),
    }),
    backup: router({
      export: adminProcedure.mutation(({ ctx }) => createAdministrativeBackup(ctx.user.id)),
    }),
    disciplines: router({
      list: adminProcedure.query(() => listManagedDisciplines()),
      create: adminProcedure.input(disciplineSchema).mutation(({ input, ctx }) => createManagedDiscipline(ctx.user.id, input)),
      update: adminProcedure.input(z.object({ id: entityIdSchema, data: disciplineSchema })).mutation(({ input, ctx }) => updateManagedDiscipline(ctx.user.id, input.id, input.data)),
    }),
    contents: router({
      list: adminProcedure.query(() => listManagedContents()),
      uploadImage: adminProcedure.input(contentImageSchema).mutation(async ({ input, ctx }) => {
        const base64 = input.base64.replace(/\s/g, "");
        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new TRPCError({ code: "BAD_REQUEST", message: "A imagem enviada não está em um formato válido." });
        const bytes = Buffer.from(base64, "base64");
        if (!bytes.length || bytes.length > 4 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Envie uma imagem JPG, PNG ou WEBP de até 4 MB." });
        const stored = await storagePut(`content-covers/${ctx.user.id}/${crypto.randomUUID()}.${imageExtension(input.mimeType)}`, bytes, input.mimeType);
        return { url: stored.url };
      }),
      create: adminProcedure.input(contentSchema).mutation(({ input, ctx }) => createManagedContent(ctx.user.id, input)),
      update: adminProcedure.input(z.object({ id: entityIdSchema, data: contentSchema })).mutation(({ input, ctx }) => updateManagedContent(ctx.user.id, input.id, input.data)),
      changelog: adminProcedure.input(z.object({ id: entityIdSchema })).query(({ input }) => listContentChangelog(input.id)),
      sendToReview: adminProcedure.input(z.object({ id: entityIdSchema })).mutation(({ input, ctx }) => submitForReview(ctx.user.id, "content", input.id)),
    }),
    questions: router({
      list: adminProcedure.input(z.object({ search: z.string().trim().max(200).optional(), status: knowledgeStatusSchema.optional(), contentId: entityIdSchema.optional() })).query(({ input }) => listManagedQuestions(input)),
      create: adminProcedure.input(questionSchema).mutation(({ input, ctx }) => createManagedQuestion(ctx.user.id, input)),
      update: adminProcedure.input(z.object({ id: entityIdSchema, data: questionSchema })).mutation(({ input, ctx }) => updateManagedQuestion(ctx.user.id, input.id, input.data)),
      remove: adminProcedure.input(z.object({ id: entityIdSchema })).mutation(({ input, ctx }) => deleteManagedQuestion(ctx.user.id, input.id)),
      changelog: adminProcedure.input(z.object({ id: entityIdSchema })).query(({ input }) => listQuestionChangelog(input.id)),
      sendToReview: adminProcedure.input(z.object({ id: entityIdSchema })).mutation(({ input, ctx }) => submitForReview(ctx.user.id, "question", input.id)),
    }),
    review: router({
      pendingCount: adminProcedure.query(() => getReviewPendingCount()),
      list: adminProcedure.input(z.object({ itemType: z.enum(["question", "content"]).optional(), status: z.enum(["pending", "approved", "rejected", "correction_requested"]).optional(), search: z.string().trim().max(200).optional() })).query(({ input }) => listReviewQueue(input)),
      decide: adminProcedure.input(z.object({ id: entityIdSchema, decision: z.enum(["approved", "rejected", "correction_requested"]), notes: z.string().trim().max(4000).optional() }).refine(input => input.decision === "approved" || (input.notes?.trim().length ?? 0) >= 5, { message: "Explique a rejeição ou a correção solicitada em ao menos 5 caracteres.", path: ["notes"] })).mutation(({ input, ctx }) => decideReview(ctx.user.id, input.id, input.decision, input.notes)),
    }),
    auditLogs: adminProcedure.query(() => listAdminAuditLogs()),
    enrollments: adminProcedure.input(z.object({ userId: z.number().int().positive() })).query(({ input }) => listUserEnrollments(input.userId)),
    grantEnrollment: adminProcedure.input(enrollmentSchema).mutation(async ({ input, ctx }) => grantCourseEnrollment(ctx.user.id, input.userId, input.courseId, input.startAt, input.expiresAt)),
    revokeEnrollment: adminProcedure.input(z.object({ userId: z.number().int().positive(), courseId: z.string().trim().min(1).max(80) })).mutation(({ input, ctx }) => import("./db").then(({ revokeCourseEnrollment }) => revokeCourseEnrollment(ctx.user.id, input.userId, input.courseId))),
    commerce: router({
      metrics: adminProcedure.query(() => getCommerceMetrics()),
      plans: adminProcedure.query(() => listManagedCommercePlans()),
      uploadPlanImage: adminProcedure.input(contentImageSchema).mutation(async ({ input, ctx }) => {
        const base64 = input.base64.replace(/\s/g, "");
        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new TRPCError({ code: "BAD_REQUEST", message: "A imagem enviada não está em um formato válido." });
        const bytes = Buffer.from(base64, "base64");
        if (!bytes.length || bytes.length > 4 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Envie uma imagem JPG, PNG ou WEBP de até 4 MB." });
        const stored = await storagePut(`plan-covers/${ctx.user.id}/${crypto.randomUUID()}.${imageExtension(input.mimeType)}`, bytes, input.mimeType);
        return { url: stored.url };
      }),
      createPlan: adminProcedure.input(commercePlanSchema).mutation(({ input, ctx }) => createCommercePlan(ctx.user.id, input)),
      updatePlan: adminProcedure.input(z.object({ id: z.string().uuid(), data: commercePlanSchema })).mutation(({ input, ctx }) => updateCommercePlan(ctx.user.id, input.id, input.data)),
      coupons: adminProcedure.query(() => listManagedCommerceCoupons()),
      createCoupon: adminProcedure.input(commerceCouponSchema).mutation(({ input, ctx }) => createCommerceCoupon(ctx.user.id, input)),
      updateCoupon: adminProcedure.input(z.object({ id: z.string().uuid(), data: commerceCouponSchema })).mutation(({ input, ctx }) => updateCommerceCoupon(ctx.user.id, input.id, input.data)),
      deleteCoupon: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(({ input, ctx }) => deleteCommerceCoupon(ctx.user.id, input.id)),
      orders: adminProcedure.input(z.object({ status: commerceOrderStatusSchema.optional() })).query(({ input }) => listManagedCommerceOrders(input.status)),
      approveOrder: adminProcedure.input(z.object({ id: z.string().uuid(), providerReference: z.string().trim().max(160).optional() })).mutation(({ input, ctx }) => approveCommerceOrder(ctx.user.id, input.id, "manual", input.providerReference)),
      cancelOrder: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(({ input, ctx }) => cancelCommerceOrder(ctx.user.id, input.id)),
    }),
    updateUser: adminProcedure.input(z.object({ userId: z.number().int().positive(), profile: profileSchema })).mutation(async ({ input, ctx }) => {
      const user = await updateManagedUser(input.userId, input.profile);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Conta não encontrada." });
      await writeAdminAudit(ctx.user.id, input.userId, "ATUALIZACAO_DE_CONTA", `Dados básicos atualizados para ${user.username ?? user.name}.`);
      return safeUser(user);
    }),
    resetPassword: adminProcedure.input(z.object({ userId: z.number().int().positive(), newPassword: passwordSchema, confirmation: passwordSchema })).mutation(async ({ input, ctx }) => {
      if (input.newPassword !== input.confirmation) throw new TRPCError({ code: "BAD_REQUEST", message: "A confirmação de senha não confere." });
      await updateUserPassword(input.userId, await hashPassword(input.newPassword));
      await writeAdminAudit(ctx.user.id, input.userId, "REDEFINICAO_DE_SENHA", "Senha redefinida pelo administrador sem exposição da credencial anterior.");
      return { success: true };
    }),
    setBlocked: adminProcedure.input(z.object({ userId: z.number().int().positive(), isBlocked: z.boolean() })).mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "A conta administrativa não pode bloquear a si mesma." });
      await setUserBlocked(input.userId, input.isBlocked);
      await writeAdminAudit(ctx.user.id, input.userId, input.isBlocked ? "BLOQUEIO_DE_CONTA" : "DESBLOQUEIO_DE_CONTA", input.isBlocked ? "Conta bloqueada." : "Conta desbloqueada.");
      return { success: true };
    }),
    deleteUser: adminProcedure.input(z.object({
      userId: z.number().int().positive(),
      confirmation: accountDeletionConfirmationSchema.optional(),
      confirmationUsername: accountDeletionConfirmationSchema.optional(),
    }).refine(input => Boolean(input.confirmation || input.confirmationUsername), { message: "Digite o nome ou usuário atual para confirmar.", path: ["confirmation"] })).mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "A conta administrativa não pode excluir a si mesma." });
      const target = await getUserById(input.userId);
      const confirmation = input.confirmation ?? input.confirmationUsername ?? "";
      if (!target || !matchesAccountDeletionConfirmation(target, confirmation)) throw new TRPCError({ code: "BAD_REQUEST", message: "Confirmação inválida. Digite o nome ou usuário atual da conta." });
      await writeAdminAudit(ctx.user.id, input.userId, "EXCLUSAO_DE_CONTA", `Conta ${target.username ?? target.name} excluída pelo administrador.`);
      await deleteManagedUser(input.userId);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
