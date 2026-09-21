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
  /** CPF normalizado somente com dígitos, validado pela regra oficial no servidor. */
  cpf: varchar("cpf", { length: 11 }).unique(),
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
}, table => [uniqueIndex("authSessions_userId_unique").on(table.userId), index("authSessions_expiresAt_idx").on(table.expiresAt)]);

/** Tokens opacos de recuperação. Apenas o hash é persistido e cada uso encerra todas as sessões da conta. */
export const passwordResetTokens = mysqlTable("passwordResetTokens", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("passwordResetTokens_userId_idx").on(table.userId),
  index("passwordResetTokens_expiresAt_idx").on(table.expiresAt),
]);

/** Estado agregado necessário para XP, sequência e seleção de questões do estudante. */
export const studyProfiles = mysqlTable("studyProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  xp: int("xp").notNull().default(0),
  lastStudyDate: varchar("lastStudyDate", { length: 10 }),
  studyDatesJson: text("studyDatesJson").notNull(),
  usedQuestionIdsJson: text("usedQuestionIdsJson").notNull(),
  /** Mantém a mesma questão por curso durante o dia e registra dispensa explícita do aluno. */
  dailyQuickCheckDate: varchar("dailyQuickCheckDate", { length: 10 }),
  dailyQuickCheckCourseId: varchar("dailyQuickCheckCourseId", { length: 80 }),
  dailyQuickCheckQuestionId: varchar("dailyQuickCheckQuestionId", { length: 80 }),
  dailyQuickCheckDismissed: boolean("dailyQuickCheckDismissed").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("studyProfiles_userId_unique").on(table.userId)]);

/** Comunicados operacionais enviados pelo ROOT, para todos os alunos ou para um curso específico. */
export const platformAlerts = mysqlTable("platformAlerts", {
  id: int("id").autoincrement().primaryKey(),
  level: mysqlEnum("level", ["improvement", "warning", "urgent"]).notNull().default("improvement"),
  title: varchar("title", { length: 180 }).notNull().default("Comunicado da plataforma"),
  categoryLabel: varchar("categoryLabel", { length: 80 }),
  message: text("message").notNull(),
  audience: mysqlEnum("audience", ["all", "course"]).notNull().default("all"),
  courseId: varchar("courseId", { length: 80 }),
  isActive: boolean("isActive").notNull().default(true),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("platformAlerts_active_created_idx").on(table.isActive, table.createdAt),
  index("platformAlerts_course_idx").on(table.courseId),
]);

/** Registro individual de fechamento: fechar um alerta não altera a experiência dos demais alunos. */
export const platformAlertDismissals = mysqlTable("platformAlertDismissals", {
  id: int("id").autoincrement().primaryKey(),
  alertId: int("alertId").notNull(),
  userId: int("userId").notNull(),
  dismissedAt: timestamp("dismissedAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("platformAlertDismissals_alert_user_unique").on(table.alertId, table.userId),
  index("platformAlertDismissals_user_idx").on(table.userId),
]);

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

/** Fila pessoal de questões que o estudante escolheu retomar em uma revisão futura. */
export const studyReviewItems = mysqlTable("studyReviewItems", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  questionKey: varchar("questionKey", { length: 80 }).notNull(),
  snapshotJson: text("snapshotJson").notNull(),
  status: mysqlEnum("status", ["pending", "mastered"]).notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
}, table => [
  uniqueIndex("studyReviewItems_user_question_unique").on(table.userId, table.questionKey),
  index("studyReviewItems_user_status_idx").on(table.userId, table.status),
]);

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

/** Progresso por conteúdo: permite que o aluno retome o último conteúdo iniciado em um curso. */
export const studyContentProgress = mysqlTable("studyContentProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  courseId: varchar("courseId", { length: 80 }).notNull(),
  contentId: int("contentId").notNull(),
  status: mysqlEnum("status", ["started", "completed"]).notNull().default("started"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  lastOpenedAt: timestamp("lastOpenedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
}, table => [
  uniqueIndex("studyContentProgress_user_course_content_unique").on(table.userId, table.courseId, table.contentId),
  index("studyContentProgress_user_lastOpened_idx").on(table.userId, table.lastOpenedAt),
]);

/** Roteiro pessoal do aluno: uma disciplina permitida por dia da semana, com conteúdo inicial para abertura. */
export const studyRoadmapItems = mysqlTable("studyRoadmapItems", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  courseId: varchar("courseId", { length: 80 }).notNull(),
  contentId: int("contentId").notNull(),
  disciplineId: int("disciplineId"),
  weekday: int("weekday").notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("studyRoadmapItems_user_course_discipline_unique").on(table.userId, table.courseId, table.disciplineId),
  index("studyRoadmapItems_user_weekday_time_idx").on(table.userId, table.weekday, table.startTime),
]);

/** Registro imutável das ações administrativas relevantes. */
export const adminAuditLogs = mysqlTable("adminAuditLogs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId").notNull(),
  affectedUserId: int("affectedUserId"),
  action: varchar("action", { length: 80 }).notNull(),
  detail: text("detail").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("adminAudit_actor_idx").on(table.actorUserId), index("adminAudit_affected_idx").on(table.affectedUserId)]);

/** Cursos administráveis, associados às matrizes reutilizáveis de conteúdo. */
export const courses = mysqlTable("courses", {
  id: varchar("id", { length: 80 }).primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  track: varchar("track", { length: 32 }).notNull(),
  courseType: mysqlEnum("courseType", ["concurso", "tutorial"]).notNull().default("concurso"),
  courseArea: varchar("courseArea", { length: 80 }).notNull().default("Policial/Militar"),
  stateCode: varchar("stateCode", { length: 32 }).notNull().default("Nacional"),
  description: text("description"),
  coverImageUrl: varchar("coverImageUrl", { length: 1024 }),
  panelLabel: varchar("panelLabel", { length: 80 }),
  panelBadge: varchar("panelBadge", { length: 80 }),
  panelTitle: varchar("panelTitle", { length: 240 }),
  panelDescription: text("panelDescription"),
  panelCtaText: varchar("panelCtaText", { length: 80 }),
  isActive: boolean("isActive").notNull().default(true),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("courses_active_idx").on(table.isActive)]);

/** Plano comercial vendável: curso avulso ou assinatura com vários cursos. Valores monetários são guardados em centavos. */
export const commercePlans = mysqlTable("commercePlans", {
  id: varchar("id", { length: 64 }).primaryKey(),
  code: varchar("code", { length: 48 }).notNull().unique(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  coverImageUrlsJson: varchar("coverImageUrlsJson", { length: 4096 }).notNull().default("[]"),
  planType: mysqlEnum("planType", ["course_access", "subscription"]).notNull(),
  accessDurationDays: int("accessDurationDays").notNull(),
  priceCents: int("priceCents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("BRL"),
  isActive: boolean("isActive").notNull().default(false),
  isHighlighted: boolean("isHighlighted").notNull().default(false),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("commercePlans_active_idx").on(table.isActive), index("commercePlans_type_idx").on(table.planType)]);

/** Cursos que uma compra de plano poderá liberar. O vínculo é reutilizável e editável no catálogo. */
export const commercePlanCourses = mysqlTable("commercePlanCourses", {
  id: int("id").autoincrement().primaryKey(),
  planId: varchar("planId", { length: 64 }).notNull(),
  courseId: varchar("courseId", { length: 80 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("commercePlanCourses_plan_course_unique").on(table.planId, table.courseId),
  index("commercePlanCourses_course_idx").on(table.courseId),
]);

/** Cupom comercial administrado pelo ROOT. O contador é atualizado somente para pedidos pagos. */
export const commerceCoupons = mysqlTable("commerceCoupons", {
  id: varchar("id", { length: 64 }).primaryKey(),
  code: varchar("code", { length: 48 }).notNull().unique(),
  description: varchar("description", { length: 240 }),
  discountType: mysqlEnum("discountType", ["percentage", "fixed_amount"]).notNull(),
  discountValue: int("discountValue").notNull(),
  maxRedemptions: int("maxRedemptions"),
  redeemedCount: int("redeemedCount").notNull().default(0),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  isActive: boolean("isActive").notNull().default(true),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("commerceCoupons_active_idx").on(table.isActive), index("commerceCoupons_validity_idx").on(table.startsAt, table.endsAt)]);

/** Pedido comercial de um plano, com valores consolidados no momento da solicitação. */
export const commerceOrders = mysqlTable("commerceOrders", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  planId: varchar("planId", { length: 64 }).notNull(),
  couponCode: varchar("couponCode", { length: 48 }),
  status: mysqlEnum("status", ["pending_payment", "paid", "cancelled", "expired", "refunded"]).notNull().default("pending_payment"),
  subtotalCents: int("subtotalCents").notNull(),
  discountCents: int("discountCents").notNull().default(0),
  totalCents: int("totalCents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("BRL"),
  provider: varchar("provider", { length: 40 }).notNull().default("manual"),
  providerReference: varchar("providerReference", { length: 160 }),
  paidAt: timestamp("paidAt"),
  accessGrantedAt: timestamp("accessGrantedAt"),
  cancelledAt: timestamp("cancelledAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("commerceOrders_user_created_idx").on(table.userId, table.createdAt),
  index("commerceOrders_status_idx").on(table.status),
  index("commerceOrders_plan_idx").on(table.planId),
  index("commerceOrders_provider_reference_idx").on(table.provider, table.providerReference),
]);

/** Instantâneo do produto comprado para preservar título, duração, preço e cursos mesmo que o plano mude depois. */
export const commerceOrderItems = mysqlTable("commerceOrderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: varchar("orderId", { length: 64 }).notNull(),
  planId: varchar("planId", { length: 64 }).notNull(),
  titleSnapshot: varchar("titleSnapshot", { length: 180 }).notNull(),
  planTypeSnapshot: mysqlEnum("planTypeSnapshot", ["course_access", "subscription"]).notNull(),
  accessDurationDaysSnapshot: int("accessDurationDaysSnapshot").notNull(),
  courseIdsSnapshotJson: text("courseIdsSnapshotJson").notNull(),
  unitPriceCents: int("unitPriceCents").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("commerceOrderItems_order_unique").on(table.orderId)]);

/** Tentativas e confirmações de pagamento; não armazena cartão, PIX, dados pessoais ou payload bruto do provedor. */
export const commerceTransactions = mysqlTable("commerceTransactions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  orderId: varchar("orderId", { length: 64 }).notNull(),
  provider: varchar("provider", { length: 40 }).notNull(),
  providerReference: varchar("providerReference", { length: 160 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled", "refunded"]).notNull().default("pending"),
  amountCents: int("amountCents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("BRL"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("commerceTransactions_order_idx").on(table.orderId), index("commerceTransactions_provider_ref_idx").on(table.provider, table.providerReference)]);

/** Matrícula individual: uma conta pode ter cursos diferentes e renová-los por período. */
export const courseEnrollments = mysqlTable("courseEnrollments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  courseId: varchar("courseId", { length: 80 }).notNull(),
  startAt: timestamp("startAt").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  status: mysqlEnum("status", ["active", "revoked"]).notNull().default("active"),
  createdByUserId: int("createdByUserId").notNull(),
  sourceOrderId: varchar("sourceOrderId", { length: 64 }),
  sourcePlanId: varchar("sourcePlanId", { length: 64 }),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("courseEnrollments_user_course_unique").on(table.userId, table.courseId),
  index("courseEnrollments_user_idx").on(table.userId),
  index("courseEnrollments_expiry_idx").on(table.expiresAt),
  index("courseEnrollments_source_order_idx").on(table.sourceOrderId),
]);

/** Disciplinas independentes e reutilizáveis por uma ou mais matrizes de curso. */
export const disciplines = mysqlTable("disciplines", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  shortName: varchar("shortName", { length: 48 }).notNull().unique(),
  description: text("description"),
  status: mysqlEnum("status", ["draft", "review", "approved", "published", "inactive"]).notNull().default("draft"),
  requiresReview: boolean("requiresReview").notNull().default(false),
  createdByUserId: int("createdByUserId").notNull(),
  updatedByUserId: int("updatedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("disciplines_status_idx").on(table.status)]);

/** Conteúdos didáticos reutilizáveis. A associação às disciplinas ocorre pela tabela de vínculos. */
export const contents = mysqlTable("contents", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 220 }).notNull(),
  objective: text("objective"),
  description: text("description"),
  cardText: text("cardText"),
  body: text("body"),
  coverImageUrl: varchar("coverImageUrl", { length: 2048 }),
  videoUrl: varchar("videoUrl", { length: 2048 }),
  videoLabel: varchar("videoLabel", { length: 160 }),
  materialUrl: varchar("materialUrl", { length: 2048 }),
  materialLabel: varchar("materialLabel", { length: 160 }),
  noticeKind: mysqlEnum("noticeKind", ["new", "updated"]),
  noticeActivatedAt: timestamp("noticeActivatedAt"),
  status: mysqlEnum("status", ["draft", "review", "approved", "published", "inactive"]).notNull().default("draft"),
  requiresReview: boolean("requiresReview").notNull().default(false),
  createdByUserId: int("createdByUserId").notNull(),
  updatedByUserId: int("updatedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("contents_status_idx").on(table.status), index("contents_title_idx").on(table.title)]);

/** Questão canônica: a edição mantém o mesmo id e não altera o histórico de tentativas anteriores. */
export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  statement: text("statement").notNull(),
  questionType: mysqlEnum("questionType", ["certo_errado", "multipla_escolha"]).notNull().default("certo_errado"),
  optionsJson: text("optionsJson"),
  answerJson: text("answerJson").notNull(),
  explanation: text("explanation"),
  difficulty: mysqlEnum("difficulty", ["basic", "intermediate", "advanced"]).notNull().default("intermediate"),
  source: varchar("source", { length: 240 }),
  banca: varchar("banca", { length: 120 }),
  year: int("year"),
  status: mysqlEnum("status", ["draft", "review", "approved", "published", "inactive"]).notNull().default("draft"),
  requiresReview: boolean("requiresReview").notNull().default(false),
  createdByUserId: int("createdByUserId").notNull(),
  updatedByUserId: int("updatedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("questions_status_idx").on(table.status),
  index("questions_review_idx").on(table.requiresReview, table.status),
  index("questions_banca_year_idx").on(table.banca, table.year),
]);

/** Curso → disciplina: vínculo reutilizável, com autoria e data. */
export const courseDisciplines = mysqlTable("courseDisciplines", {
  id: int("id").autoincrement().primaryKey(),
  courseId: varchar("courseId", { length: 80 }).notNull(),
  disciplineId: int("disciplineId").notNull(),
  linkedByUserId: int("linkedByUserId").notNull(),
  linkedAt: timestamp("linkedAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("courseDisciplines_course_discipline_unique").on(table.courseId, table.disciplineId),
  index("courseDisciplines_discipline_idx").on(table.disciplineId),
]);

/** Disciplina → conteúdo: vínculo reutilizável, com autoria e data. */
export const disciplineContents = mysqlTable("disciplineContents", {
  id: int("id").autoincrement().primaryKey(),
  disciplineId: int("disciplineId").notNull(),
  contentId: int("contentId").notNull(),
  linkedByUserId: int("linkedByUserId").notNull(),
  linkedAt: timestamp("linkedAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("disciplineContents_discipline_content_unique").on(table.disciplineId, table.contentId),
  index("disciplineContents_content_idx").on(table.contentId),
]);

/** Questão → conteúdo: associação N:N que registra a autoria e o momento do vínculo. */
export const questionContentLinks = mysqlTable("questionContentLinks", {
  id: int("id").autoincrement().primaryKey(),
  questionId: int("questionId").notNull(),
  contentId: int("contentId").notNull(),
  linkedByUserId: int("linkedByUserId").notNull(),
  linkedAt: timestamp("linkedAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("questionContentLinks_question_content_unique").on(table.questionId, table.contentId),
  index("questionContentLinks_content_idx").on(table.contentId),
]);

/** Instantâneo de uma questão persistente usada em um simulado já concluído. */
export const simulationQuestions = mysqlTable("simulationQuestions", {
  id: int("id").autoincrement().primaryKey(),
  simulationId: varchar("simulationId", { length: 64 }).notNull(),
  questionId: int("questionId").notNull(),
  position: int("position").notNull(),
  answeredCorrectly: boolean("answeredCorrectly"),
  snapshotJson: text("snapshotJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("simulationQuestions_simulation_position_unique").on(table.simulationId, table.position),
  uniqueIndex("simulationQuestions_simulation_question_unique").on(table.simulationId, table.questionId),
  index("simulationQuestions_question_idx").on(table.questionId),
]);

/** Uma solicitação por envio para revisão; novos envios preservam as decisões anteriores. */
export const reviewQueue = mysqlTable("reviewQueue", {
  id: int("id").autoincrement().primaryKey(),
  itemType: mysqlEnum("itemType", ["question", "content"]).notNull(),
  itemId: int("itemId").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "correction_requested"]).notNull().default("pending"),
  submittedByUserId: int("submittedByUserId").notNull(),
  reviewedByUserId: int("reviewedByUserId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("reviewQueue_pending_idx").on(table.status, table.itemType),
  index("reviewQueue_item_idx").on(table.itemType, table.itemId),
]);

/** Histórico por campo da questão, inclusive alterações de metadados e status. */
export const questionChangelog = mysqlTable("questionChangelog", {
  id: int("id").autoincrement().primaryKey(),
  questionId: int("questionId").notNull(),
  actorUserId: int("actorUserId").notNull(),
  changedField: varchar("changedField", { length: 80 }).notNull(),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("questionChangelog_question_idx").on(table.questionId), index("questionChangelog_actor_idx").on(table.actorUserId)]);

/** Histórico por campo dos conteúdos, necessário para uma revisão realmente auditável. */
export const contentChangelog = mysqlTable("contentChangelog", {
  id: int("id").autoincrement().primaryKey(),
  contentId: int("contentId").notNull(),
  actorUserId: int("actorUserId").notNull(),
  changedField: varchar("changedField", { length: 80 }).notNull(),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("contentChangelog_content_idx").on(table.contentId), index("contentChangelog_actor_idx").on(table.actorUserId)]);

/** Dados públicos de contato, mantidos pelo ROOT e reutilizados em toda a plataforma. */
export const globalContactSettings = mysqlTable("globalContactSettings", {
  id: int("id").primaryKey(),
  email: varchar("email", { length: 320 }),
  telegramUrl: varchar("telegramUrl", { length: 500 }),
  updatedByUserId: int("updatedByUserId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Identidade visual e textos públicos, controlados exclusivamente pelo ROOT. */
export const platformGeneralSettings = mysqlTable("platformGeneralSettings", {
  id: int("id").primaryKey(),
  logoUrl: varchar("logoUrl", { length: 1000 }),
  brandName: varchar("brandName", { length: 120 }),
  brandTagline: varchar("brandTagline", { length: 180 }),
  heroBadge: varchar("heroBadge", { length: 180 }),
  heroTitle: varchar("heroTitle", { length: 320 }),
  heroDescription: text("heroDescription"),
  loginButtonText: varchar("loginButtonText", { length: 80 }),
  heroPrimaryCtaText: varchar("heroPrimaryCtaText", { length: 120 }),
  heroSecondaryCtaText: varchar("heroSecondaryCtaText", { length: 120 }),
  routineEyebrow: varchar("routineEyebrow", { length: 160 }),
  routineStepOneTitle: varchar("routineStepOneTitle", { length: 160 }),
  routineStepOneDescription: text("routineStepOneDescription"),
  routineStepTwoTitle: varchar("routineStepTwoTitle", { length: 160 }),
  routineStepTwoDescription: text("routineStepTwoDescription"),
  routineStepThreeTitle: varchar("routineStepThreeTitle", { length: 160 }),
  routineStepThreeDescription: text("routineStepThreeDescription"),
  benefitOneTitle: varchar("benefitOneTitle", { length: 160 }),
  benefitOneDescription: text("benefitOneDescription"),
  benefitTwoTitle: varchar("benefitTwoTitle", { length: 160 }),
  benefitTwoDescription: text("benefitTwoDescription"),
  benefitThreeTitle: varchar("benefitThreeTitle", { length: 160 }),
  benefitThreeDescription: text("benefitThreeDescription"),
  packagesEyebrow: varchar("packagesEyebrow", { length: 160 }),
  packagesTitle: varchar("packagesTitle", { length: 320 }),
  packagesDescription: text("packagesDescription"),
  packagesLoadingText: varchar("packagesLoadingText", { length: 160 }),
  packagesEmptyText: text("packagesEmptyText"),
  highlightBadgeText: varchar("highlightBadgeText", { length: 120 }),
  includedCoursesLabel: varchar("includedCoursesLabel", { length: 120 }),
  planFallbackDescription: text("planFallbackDescription"),
  planAccountNotice: text("planAccountNotice"),
  finalCtaEyebrow: varchar("finalCtaEyebrow", { length: 160 }),
  finalCtaTitle: varchar("finalCtaTitle", { length: 320 }),
  finalCtaDescription: text("finalCtaDescription"),
  finalCtaButtonText: varchar("finalCtaButtonText", { length: 120 }),
  footerPaymentText: varchar("footerPaymentText", { length: 320 }),
  primaryColor: varchar("primaryColor", { length: 7 }),
  backgroundColor: varchar("backgroundColor", { length: 7 }),
  textColor: varchar("textColor", { length: 7 }),
  heroTextColor: varchar("heroTextColor", { length: 7 }),
  heroMutedTextColor: varchar("heroMutedTextColor", { length: 7 }),
  accentColor: varchar("accentColor", { length: 7 }),
  accentTextColor: varchar("accentTextColor", { length: 7 }),
  surfaceColor: varchar("surfaceColor", { length: 7 }),
  cardColor: varchar("cardColor", { length: 7 }),
  surfaceAccentColor: varchar("surfaceAccentColor", { length: 7 }),
  borderColor: varchar("borderColor", { length: 7 }),
  mutedTextColor: varchar("mutedTextColor", { length: 7 }),
  iconBackgroundColor: varchar("iconBackgroundColor", { length: 7 }),
  iconColor: varchar("iconColor", { length: 7 }),
  buttonColor: varchar("buttonColor", { length: 7 }),
  buttonHoverColor: varchar("buttonHoverColor", { length: 7 }),
  updatedByUserId: int("updatedByUserId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Regras da competição, definidas pelo ROOT e independentes de simulados e XP. */
export const competitionSettings = mysqlTable("competitionSettings", {
  id: int("id").primaryKey(),
  pointsPerCorrect: int("pointsPerCorrect").notNull().default(10),
  pointsPerWrong: int("pointsPerWrong").notNull().default(0),
  questionsPerRound: int("questionsPerRound").notNull().default(10),
  isActive: boolean("isActive").notNull().default(true),
  /** Marco do ciclo exibido no ranking e nos selos, sem excluir resultados anteriores. */
  weeklyCycleKey: varchar("weeklyCycleKey", { length: 16 }),
  weeklyCycleStartedAt: timestamp("weeklyCycleStartedAt"),
  /** UID do Heartbeat nativo, usado para validar callbacks e permitir manutenção futura. */
  weeklyResetCronTaskUid: varchar("weeklyResetCronTaskUid", { length: 65 }),
  updatedByUserId: int("updatedByUserId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("competitionSettings_weekly_cron_idx").on(table.weeklyResetCronTaskUid)]);

/** Meta e reconhecimento mensal da competição. O período é calculado sob demanda, sem cron. */
export const competitionMonthlyGoals = mysqlTable("competitionMonthlyGoals", {
  id: int("id").primaryKey(),
  targetPoints: int("targetPoints").notNull().default(100),
  targetCompletedRounds: int("targetCompletedRounds").notNull().default(5),
  rewardTitle: varchar("rewardTitle", { length: 160 }).notNull().default("Destaque mensal"),
  rewardDescription: varchar("rewardDescription", { length: 500 }).notNull().default("Reconhecimento definido pela administração para quem concluir a meta do mês."),
  isActive: boolean("isActive").notNull().default(true),
  updatedByUserId: int("updatedByUserId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Uma rodada é um recorte próprio de questões, preservado fora das tabelas de simulado. */
export const competitionRounds = mysqlTable("competitionRounds", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  courseId: varchar("courseId", { length: 80 }),
  questionIdsJson: text("questionIdsJson").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("competitionRounds_user_created_idx").on(table.userId, table.createdAt),
  index("competitionRounds_course_idx").on(table.courseId),
]);

/** Respostas competitivas; não alimentam studyAnswers, simulationRecords ou XP. */
export const competitionAnswers = mysqlTable("competitionAnswers", {
  id: int("id").autoincrement().primaryKey(),
  roundId: varchar("roundId", { length: 64 }).notNull(),
  userId: int("userId").notNull(),
  questionId: int("questionId").notNull(),
  courseId: varchar("courseId", { length: 80 }),
  submittedAnswerJson: text("submittedAnswerJson").notNull(),
  correct: boolean("correct").notNull(),
  pointsEarned: int("pointsEarned").notNull(),
  answeredAt: timestamp("answeredAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("competitionAnswers_round_question_unique").on(table.roundId, table.questionId),
  index("competitionAnswers_user_course_idx").on(table.userId, table.courseId),
  index("competitionAnswers_ranking_idx").on(table.courseId, table.pointsEarned),
]);

export type User = typeof users.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type CourseEnrollment = typeof courseEnrollments.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type StudyProfile = typeof studyProfiles.$inferSelect;
export type Discipline = typeof disciplines.$inferSelect;
export type Content = typeof contents.$inferSelect;
export type Question = typeof questions.$inferSelect;
