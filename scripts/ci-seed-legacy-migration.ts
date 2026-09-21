import mysql from "mysql2/promise";
import { hashPassword } from "../server/auth/localAuth";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL ausente.");

const db = await mysql.createConnection(url);
const legacyPassword = "Legacy-Migration-Only-2026!";
const passwordHash = await hashPassword(legacyPassword);

async function firstId(sql: string, params: unknown[]) {
  const [rows] = await db.query<any[]>(sql, params);
  const id = Number(rows[0]?.id);
  if (!id) throw new Error("Fixture relacional não encontrada.");
  return id;
}

try {
  const rootId = await firstId("SELECT id FROM users WHERE username = ? LIMIT 1", ["paulo"]);

  await db.execute(
    `INSERT INTO users
      (openId,name,username,email,passwordHash,loginMethod,role,isBlocked,createdAt,updatedAt,lastSignedIn)
     VALUES (?,?,?,?,?,'local','user',0,NOW(),NOW(),NOW())
     ON DUPLICATE KEY UPDATE
       name=VALUES(name),email=VALUES(email),passwordHash=VALUES(passwordHash),isBlocked=0`,
    ["local:legacy.student","Aluno Legado","legacy.student","legacy.student@example.invalid",passwordHash],
  );
  const userId = await firstId("SELECT id FROM users WHERE username = ? LIMIT 1", ["legacy.student"]);

  await db.execute(
    `INSERT INTO courses
      (id,title,track,courseType,courseArea,stateCode,description,isActive,createdByUserId,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,NOW(),NOW())
     ON DUPLICATE KEY UPDATE title=VALUES(title),isActive=1`,
    ["legacy-pf","Curso Legado PF","PF","concurso","Policial/Militar","Nacional","Fixture de migração",1,rootId],
  );

  await db.execute(
    `INSERT INTO disciplines
      (name,shortName,description,status,requiresReview,createdByUserId,updatedByUserId,createdAt,updatedAt)
     VALUES (?,?,?,'published',0,?,?,NOW(),NOW())
     ON DUPLICATE KEY UPDATE name=VALUES(name),updatedByUserId=VALUES(updatedByUserId)`,
    ["Disciplina Legada CI","legacy-ci","Disciplina fictícia para validar ETL",rootId,rootId],
  );
  const disciplineId = await firstId("SELECT id FROM disciplines WHERE shortName = ? LIMIT 1", ["legacy-ci"]);

  await db.execute(
    `INSERT INTO contents
      (title,objective,description,cardText,body,status,requiresReview,createdByUserId,updatedByUserId,createdAt,updatedAt)
     VALUES (?,?,?,?,?,'published',0,?,?,NOW(),NOW())`,
    ["Conteúdo Legado CI","Objetivo","Descrição","Card","Corpo legado",rootId,rootId],
  );
  const contentId = await firstId(
    "SELECT id FROM contents WHERE title = ? ORDER BY id DESC LIMIT 1",
    ["Conteúdo Legado CI"],
  );

  await db.execute(
    `INSERT INTO questions
      (statement,questionType,optionsJson,answerJson,explanation,difficulty,source,banca,year,status,requiresReview,createdByUserId,updatedByUserId,createdAt,updatedAt)
     VALUES (?,'certo_errado',NULL,?,?,?,?,?,?,'published',0,?,?,NOW(),NOW())`,
    ["Questão legada CI",JSON.stringify(true),"Explicação legada","intermediate","CI legacy","Cebraspe",2026,rootId,rootId],
  );
  const questionId = await firstId(
    "SELECT id FROM questions WHERE source = ? ORDER BY id DESC LIMIT 1",
    ["CI legacy"],
  );

  await db.execute(
    `INSERT INTO courseDisciplines (courseId,disciplineId,linkedByUserId,linkedAt)
     VALUES (?,?,?,NOW())
     ON DUPLICATE KEY UPDATE linkedByUserId=VALUES(linkedByUserId)`,
    ["legacy-pf",disciplineId,rootId],
  );
  await db.execute(
    `INSERT INTO disciplineContents (disciplineId,contentId,linkedByUserId,linkedAt)
     VALUES (?,?,?,NOW())
     ON DUPLICATE KEY UPDATE linkedByUserId=VALUES(linkedByUserId)`,
    [disciplineId,contentId,rootId],
  );
  await db.execute(
    `INSERT INTO questionContentLinks (questionId,contentId,linkedByUserId,linkedAt)
     VALUES (?,?,?,NOW())
     ON DUPLICATE KEY UPDATE linkedByUserId=VALUES(linkedByUserId)`,
    [questionId,contentId,rootId],
  );

  await db.execute(
    `INSERT INTO courseEnrollments
      (userId,courseId,startAt,expiresAt,status,createdByUserId,sourceOrderId,sourcePlanId,createdAt,updatedAt)
     VALUES (?,?,DATE_SUB(NOW(),INTERVAL 1 DAY),DATE_ADD(NOW(),INTERVAL 30 DAY),'active',?,?,?,NOW(),NOW())
     ON DUPLICATE KEY UPDATE expiresAt=VALUES(expiresAt),status='active',sourceOrderId=VALUES(sourceOrderId),sourcePlanId=VALUES(sourcePlanId),revokedAt=NULL`,
    [userId,"legacy-pf",rootId,"legacy-order-1","legacy-plan-1"],
  );

  await db.execute(
    `INSERT INTO studyProfiles
      (userId,xp,lastStudyDate,studyDatesJson,usedQuestionIdsJson,dailyQuickCheckCourseId,dailyQuickCheckQuestionId,dailyQuickCheckDismissed,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,0,NOW(),NOW())
     ON DUPLICATE KEY UPDATE xp=VALUES(xp),lastStudyDate=VALUES(lastStudyDate),
       studyDatesJson=VALUES(studyDatesJson),usedQuestionIdsJson=VALUES(usedQuestionIdsJson),
       dailyQuickCheckCourseId=VALUES(dailyQuickCheckCourseId),dailyQuickCheckQuestionId=VALUES(dailyQuickCheckQuestionId)`,
    [userId,321,"2026-09-21",JSON.stringify(["2026-09-20","2026-09-21"]),JSON.stringify(["central-"+questionId]),"legacy-pf",String(questionId)],
  );
  await db.execute(
    `INSERT INTO completedModules (userId,moduleId,completedAt)
     VALUES (?,?,NOW()) ON DUPLICATE KEY UPDATE completedAt=VALUES(completedAt)`,
    [userId,"legacy-module-1"],
  );
  await db.execute(
    "INSERT INTO studyAnswers (userId,questionId,correct,answeredAt) VALUES (?,?,?,NOW())",
    [userId,"central-"+questionId,1],
  );
  await db.execute(
    `INSERT INTO studyReviewItems (userId,questionKey,snapshotJson,status,createdAt)
     VALUES (?,?,?,'pending',NOW())
     ON DUPLICATE KEY UPDATE snapshotJson=VALUES(snapshotJson),status='pending'`,
    [userId,"central-"+questionId,JSON.stringify({id:"central-"+questionId,statement:"Questão legada CI"})],
  );
  await db.execute(
    `INSERT INTO simulationRecords
      (id,userId,completedAt,total,correct,errors,elapsedSeconds,byDisciplineJson,byBlockJson)
     VALUES (?,?,NOW(),10,8,2,600,?,?)
     ON DUPLICATE KEY UPDATE total=VALUES(total),correct=VALUES(correct),errors=VALUES(errors)`,
    ["legacy-sim-1",userId,JSON.stringify({"Disciplina Legada CI":{"correct":4,"total":5}}),JSON.stringify({"I":{"correct":8,"total":10}})],
  );
  await db.execute(
    `INSERT INTO simulationQuestions
      (simulationId,questionId,position,answeredCorrectly,snapshotJson,createdAt)
     VALUES (?,?,0,1,?,NOW())
     ON DUPLICATE KEY UPDATE answeredCorrectly=1,snapshotJson=VALUES(snapshotJson)`,
    ["legacy-sim-1",questionId,JSON.stringify({id:questionId,statement:"Questão legada CI"})],
  );
  await db.execute(
    `INSERT INTO studyNotes (userId,moduleId,content,createdAt,updatedAt)
     VALUES (?,?,?,NOW(),NOW())
     ON DUPLICATE KEY UPDATE content=VALUES(content),updatedAt=NOW()`,
    [userId,"legacy-module-1","Nota privada da fixture de migração."],
  );
  await db.execute(
    `INSERT INTO studyContentProgress
      (userId,courseId,contentId,status,startedAt,lastOpenedAt,completedAt)
     VALUES (?,?,?,'completed',DATE_SUB(NOW(),INTERVAL 1 DAY),NOW(),NOW())
     ON DUPLICATE KEY UPDATE status='completed',completedAt=NOW()`,
    [userId,"legacy-pf",contentId],
  );
  await db.execute(
    `INSERT INTO studyRoadmapItems
      (userId,courseId,contentId,disciplineId,weekday,startTime,isActive,createdAt,updatedAt)
     VALUES (?,?,?,?,1,'19:30',1,NOW(),NOW())
     ON DUPLICATE KEY UPDATE contentId=VALUES(contentId),weekday=1,startTime='19:30',isActive=1`,
    [userId,"legacy-pf",contentId,disciplineId],
  );

  await db.execute(
    `INSERT INTO reviewQueue
      (itemType,itemId,status,submittedByUserId,reviewedByUserId,notes,createdAt,updatedAt)
     VALUES ('question',?,'approved',?,?,?,NOW(),NOW())`,
    [questionId,rootId,rootId,"Aprovado na fixture"],
  );
  await db.execute(
    `INSERT INTO questionChangelog
      (questionId,actorUserId,changedField,oldValue,newValue,createdAt)
     VALUES (?,?,?,'rascunho','publicado',NOW())`,
    [questionId,rootId,"status"],
  );
  await db.execute(
    `INSERT INTO contentChangelog
      (contentId,actorUserId,changedField,oldValue,newValue,createdAt)
     VALUES (?,?,?,'rascunho','publicado',NOW())`,
    [contentId,rootId,"status"],
  );

  await db.execute(
    `INSERT INTO platformAlerts
      (level,title,categoryLabel,message,audience,courseId,isActive,createdByUserId,createdAt,updatedAt)
     VALUES ('warning','Alerta legado','CI','Mensagem da fixture','course',?,1,?,NOW(),NOW())`,
    ["legacy-pf",rootId],
  );
  const alertId = await firstId(
    "SELECT id FROM platformAlerts WHERE title = ? ORDER BY id DESC LIMIT 1",
    ["Alerta legado"],
  );
  await db.execute(
    `INSERT INTO platformAlertDismissals (alertId,userId,dismissedAt)
     VALUES (?,?,NOW()) ON DUPLICATE KEY UPDATE dismissedAt=VALUES(dismissedAt)`,
    [alertId,userId],
  );
  await db.execute(
    `INSERT INTO globalContactSettings (id,email,telegramUrl,updatedByUserId,updatedAt)
     VALUES (1,?,?,?,NOW())
     ON DUPLICATE KEY UPDATE email=VALUES(email),telegramUrl=VALUES(telegramUrl),updatedByUserId=VALUES(updatedByUserId)`,
    ["contato@example.invalid","https://example.invalid/legacy",rootId],
  );
  await db.execute(
    `INSERT INTO platformGeneralSettings (id,brandName,heroTitle,primaryColor,updatedByUserId,updatedAt)
     VALUES (1,'Marca Legada','Título legado','#0e5a70',?,NOW())
     ON DUPLICATE KEY UPDATE brandName=VALUES(brandName),heroTitle=VALUES(heroTitle),primaryColor=VALUES(primaryColor),updatedByUserId=VALUES(updatedByUserId)`,
    [rootId],
  );

  await db.execute(
    `INSERT INTO competitionSettings
      (id,pointsPerCorrect,pointsPerWrong,questionsPerRound,isActive,weeklyCycleKey,weeklyCycleStartedAt,weeklyResetCronTaskUid,updatedByUserId,updatedAt)
     VALUES (1,10,-2,1,1,'2026-W39',NOW(),'legacy-manus-heartbeat',?,NOW())
     ON DUPLICATE KEY UPDATE pointsPerCorrect=10,pointsPerWrong=-2,questionsPerRound=1,isActive=1,weeklyCycleKey='2026-W39',weeklyResetCronTaskUid='legacy-manus-heartbeat',updatedByUserId=VALUES(updatedByUserId)`,
    [rootId],
  );
  await db.execute(
    `INSERT INTO competitionMonthlyGoals
      (id,targetPoints,targetCompletedRounds,rewardTitle,rewardDescription,isActive,updatedByUserId,updatedAt)
     VALUES (1,500,3,'Meta CI','Reconhecimento legado',1,?,NOW())
     ON DUPLICATE KEY UPDATE targetPoints=500,targetCompletedRounds=3,rewardTitle='Meta CI',isActive=1,updatedByUserId=VALUES(updatedByUserId)`,
    [rootId],
  );
  await db.execute(
    `INSERT INTO competitionRounds (id,userId,courseId,questionIdsJson,completedAt,createdAt)
     VALUES (?,?,?, ?,NOW(),NOW())
     ON DUPLICATE KEY UPDATE questionIdsJson=VALUES(questionIdsJson),completedAt=NOW()`,
    ["legacy-round-1",userId,"legacy-pf",JSON.stringify([questionId])],
  );
  await db.execute(
    `INSERT INTO competitionAnswers
      (roundId,userId,questionId,courseId,submittedAnswerJson,correct,pointsEarned,answeredAt)
     VALUES (?,?,?,?,?,1,10,NOW())
     ON DUPLICATE KEY UPDATE submittedAnswerJson=VALUES(submittedAnswerJson),correct=1,pointsEarned=10`,
    ["legacy-round-1",userId,questionId,"legacy-pf",JSON.stringify(true)],
  );

  await db.execute(
    `INSERT INTO commercePlans
      (id,code,title,description,coverImageUrlsJson,planType,accessDurationDays,priceCents,currency,isActive,isHighlighted,createdByUserId,createdAt,updatedAt)
     VALUES ('legacy-plan-1','LEGACY-CI','Plano legado','Plano fixture','[]','course_access',30,1990,'BRL',1,1,?,NOW(),NOW())
     ON DUPLICATE KEY UPDATE title=VALUES(title),priceCents=1990,isActive=1`,
    [rootId],
  );
  await db.execute(
    `INSERT INTO commercePlanCourses (planId,courseId,createdAt)
     VALUES ('legacy-plan-1','legacy-pf',NOW())
     ON DUPLICATE KEY UPDATE courseId=VALUES(courseId)`,
  );
  await db.execute(
    `INSERT INTO commerceCoupons
      (id,code,description,discountType,discountValue,maxRedemptions,redeemedCount,isActive,createdByUserId,createdAt,updatedAt)
     VALUES ('legacy-coupon-1','CILEGACY','Cupom fixture','percentage',10,100,1,1,?,NOW(),NOW())
     ON DUPLICATE KEY UPDATE redeemedCount=1,isActive=1`,
    [rootId],
  );
  await db.execute(
    `INSERT INTO commerceOrders
      (id,userId,planId,couponCode,status,subtotalCents,discountCents,totalCents,currency,provider,providerReference,paidAt,accessGrantedAt,createdAt,updatedAt)
     VALUES ('legacy-order-1',?,'legacy-plan-1','CILEGACY','paid',1990,199,1791,'BRL','mercado_pago','legacy-payment-1',NOW(),NOW(),NOW(),NOW())
     ON DUPLICATE KEY UPDATE status='paid',providerReference='legacy-payment-1',paidAt=NOW(),accessGrantedAt=NOW()`,
    [userId],
  );
  await db.execute(
    `INSERT INTO commerceOrderItems
      (orderId,planId,titleSnapshot,planTypeSnapshot,accessDurationDaysSnapshot,courseIdsSnapshotJson,unitPriceCents,createdAt)
     VALUES ('legacy-order-1','legacy-plan-1','Plano legado','course_access',30,?,1990,NOW())
     ON DUPLICATE KEY UPDATE titleSnapshot=VALUES(titleSnapshot),courseIdsSnapshotJson=VALUES(courseIdsSnapshotJson)`,
    [JSON.stringify(["legacy-pf"])],
  );
  await db.execute(
    `INSERT INTO commerceTransactions
      (id,orderId,provider,providerReference,status,amountCents,currency,processedAt,createdAt)
     VALUES ('legacy-tx-1','legacy-order-1','mercado_pago','legacy-payment-1','approved',1791,'BRL',NOW(),NOW())
     ON DUPLICATE KEY UPDATE status='approved',providerReference='legacy-payment-1',processedAt=NOW()`,
  );

  await db.execute(
    `INSERT INTO adminAuditLogs (actorUserId,affectedUserId,action,detail,createdAt)
     VALUES (?,?,?,?,NOW())`,
    [rootId,userId,"CI_MIGRATION_FIXTURE","Registro fictício para validar a migração."],
  );

  console.log(JSON.stringify({userId,rootId,disciplineId,contentId,questionId,seeded:true}));
} finally {
  await db.end();
}
