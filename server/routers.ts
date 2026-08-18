import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  completeStudyModule,
  createLocalUser,
  createSession,
  deleteManagedUser,
  deleteSessionByHash,
  getAdminStats,
  getStudyState,
  getUserByIdentifier,
  getUserByUsername,
  listAdminAuditLogs,
  listManagedUsers,
  recordAnswer,
  recordSimulation,
  saveNote,
  setUserBlocked,
  updateManagedUser,
  updateUserPassword,
  updateUserProfile,
  writeAdminAudit,
} from "./db";
import { createSessionToken, hashPassword, hashSessionToken, LOCAL_SESSION_COOKIE, LOCAL_SESSION_MAX_AGE_MS, verifyPassword } from "./auth/localAuth";
import { hasRootBootstrapSecret } from "./auth/rootConfig";

const usernameSchema = z.string().trim().toLowerCase().min(3, "Use ao menos 3 caracteres.").max(48).regex(/^[a-z0-9._-]+$/, "Use apenas letras minúsculas, números, ponto, hífen ou sublinhado.");
const passwordSchema = z.string().min(8, "A senha deve ter pelo menos 8 caracteres.").max(128);
const profileSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo.").max(160),
  username: usernameSchema,
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(320),
});
const metricSchema = z.record(z.string(), z.object({ correct: z.number().int().nonnegative(), total: z.number().int().nonnegative() }));

function safeUser(user: NonNullable<Parameters<typeof getStudyState>[0]> extends never ? never : any) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    isBlocked: user.isBlocked,
    createdAt: user.createdAt,
    lastSignedIn: user.lastSignedIn,
  };
}

function invalidCredentials() {
  return new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha inválidos." });
}

async function startLocalSession(ctx: { req: any; res: any }, userId: number) {
  const token = createSessionToken();
  await createSession(userId, crypto.randomUUID(), hashSessionToken(token), new Date(Date.now() + LOCAL_SESSION_MAX_AGE_MS));
  const options = getSessionCookieOptions(ctx.req);
  ctx.res.cookie(LOCAL_SESSION_COOKIE, token, { ...options, maxAge: LOCAL_SESSION_MAX_AGE_MS });
}

function clearAllAuthCookies(ctx: { req: any; res: any }) {
  const options = getSessionCookieOptions(ctx.req);
  ctx.res.clearCookie(LOCAL_SESSION_COOKIE, { ...options, maxAge: -1 });
  ctx.res.clearCookie(COOKIE_NAME, { ...options, maxAge: -1 });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => (ctx.user ? safeUser(ctx.user) : null)),
    bootstrapStatus: publicProcedure.query(() => ({ rootBootstrapReady: hasRootBootstrapSecret() })),
    register: publicProcedure.input(profileSchema.extend({ password: passwordSchema, passwordConfirmation: passwordSchema })).mutation(async ({ input, ctx }) => {
      if (input.password !== input.passwordConfirmation) throw new TRPCError({ code: "BAD_REQUEST", message: "A confirmação de senha não confere." });
      const duplicate = await getUserByIdentifier(input.username) ?? await getUserByIdentifier(input.email);
      if (duplicate) throw new TRPCError({ code: "CONFLICT", message: "Usuário ou e-mail já está em uso." });
      const user = await createLocalUser({ ...input, passwordHash: await hashPassword(input.password) });
      await startLocalSession(ctx, user.id);
      return safeUser(user);
    }),
    login: publicProcedure.input(z.object({ identifier: z.string().trim().min(3), password: passwordSchema })).mutation(async ({ input, ctx }) => {
      const user = await getUserByIdentifier(input.identifier);
      if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) throw invalidCredentials();
      if (user.isBlocked) throw new TRPCError({ code: "FORBIDDEN", message: "Esta conta está bloqueada. Procure a administração." });
      await startLocalSession(ctx, user.id);
      return safeUser(user);
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
      return { success: true };
    }),
    updateProfile: protectedProcedure.input(profileSchema).mutation(async ({ input, ctx }) => {
      const user = await updateUserProfile(ctx.user.id, input);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Conta não encontrada." });
      return safeUser(user);
    }),
  }),
  study: router({
    state: protectedProcedure.query(({ ctx }) => getStudyState(ctx.user.id)),
    answer: protectedProcedure.input(z.object({ questionId: z.string().trim().min(1).max(80), correct: z.boolean() })).mutation(({ input, ctx }) => recordAnswer(ctx.user.id, input.questionId, input.correct)),
    completeModule: protectedProcedure.input(z.object({ moduleId: z.string().trim().min(1).max(80) })).mutation(({ input, ctx }) => completeStudyModule(ctx.user.id, input.moduleId)),
    submitSimulation: protectedProcedure.input(z.object({
      id: z.string().min(1).max(64), total: z.number().int().positive(), correct: z.number().int().nonnegative(), errors: z.number().int().nonnegative(), elapsedSeconds: z.number().int().nonnegative(),
      byDiscipline: metricSchema, byBlock: metricSchema,
      answers: z.array(z.object({ questionId: z.string().min(1).max(80), correct: z.boolean() })),
      questionIds: z.array(z.string().min(1).max(80)),
    })).mutation(({ input, ctx }) => recordSimulation(ctx.user.id, input)),
    note: protectedProcedure.input(z.object({ moduleId: z.string().trim().min(1).max(80) })).query(({ input, ctx }) => import("./db").then(({ getNote }) => getNote(ctx.user.id, input.moduleId))),
    saveNote: protectedProcedure.input(z.object({ moduleId: z.string().trim().min(1).max(80), content: z.string().trim().max(12000) })).mutation(({ input, ctx }) => saveNote(ctx.user.id, input.moduleId, input.content)),
  }),
  admin: router({
    users: adminProcedure.input(z.object({ search: z.string().trim().max(80).optional() })).query(({ input }) => listManagedUsers(input.search)),
    stats: adminProcedure.query(() => getAdminStats()),
    auditLogs: adminProcedure.query(() => listAdminAuditLogs()),
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
    deleteUser: adminProcedure.input(z.object({ userId: z.number().int().positive(), confirmationUsername: usernameSchema })).mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "A conta administrativa não pode excluir a si mesma." });
      const target = await getUserByUsername(input.confirmationUsername);
      if (!target || target.id !== input.userId) throw new TRPCError({ code: "BAD_REQUEST", message: "Confirmação de usuário inválida." });
      await writeAdminAudit(ctx.user.id, input.userId, "EXCLUSAO_DE_CONTA", `Conta ${target.username ?? target.name} excluída pelo administrador.`);
      await deleteManagedUser(input.userId);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
