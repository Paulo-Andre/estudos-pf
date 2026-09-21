import mysql from "mysql2/promise";
import { hashPassword } from "../server/auth/localAuth";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL ausente.");

const db = await mysql.createConnection(url);
const legacyPassword = "Legacy-Migration-Only-2026!";
const passwordHash = await hashPassword(legacyPassword);

try {
  const [rootRows] = await db.query<any[]>("SELECT id FROM users WHERE username = ? LIMIT 1", ["paulo"]);
  const rootId = Number(rootRows[0]?.id);
  if (!rootId) throw new Error("ROOT de CI não encontrado.");

  await db.execute(
    `INSERT INTO users
      (openId,name,username,email,passwordHash,loginMethod,role,isBlocked,createdAt,updatedAt,lastSignedIn)
     VALUES (?,?,?,?,?,'local','user',0,NOW(),NOW(),NOW())
     ON DUPLICATE KEY UPDATE
       name=VALUES(name),email=VALUES(email),passwordHash=VALUES(passwordHash),isBlocked=0`,
    ["local:legacy.student","Aluno Legado","legacy.student","legacy.student@example.invalid",passwordHash],
  );

  const [studentRows] = await db.query<any[]>("SELECT id FROM users WHERE username = ? LIMIT 1", ["legacy.student"]);
  const userId = Number(studentRows[0]?.id);
  if (!userId) throw new Error("Aluno legado não foi criado.");

  await db.execute(
    `INSERT INTO courses
      (id,title,track,courseType,courseArea,stateCode,description,isActive,createdByUserId,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,NOW(),NOW())
     ON DUPLICATE KEY UPDATE title=VALUES(title),isActive=1`,
    ["legacy-pf","Curso Legado PF","PF","concurso","Policial/Militar","Nacional","Fixture de migração",1,rootId],
  );

  await db.execute(
    `INSERT INTO courseEnrollments
      (userId,courseId,startAt,expiresAt,status,createdByUserId,createdAt,updatedAt)
     VALUES (?,?,DATE_SUB(NOW(),INTERVAL 1 DAY),DATE_ADD(NOW(),INTERVAL 30 DAY),'active',?,NOW(),NOW())
     ON DUPLICATE KEY UPDATE expiresAt=VALUES(expiresAt),status='active',revokedAt=NULL`,
    [userId,"legacy-pf",rootId],
  );

  await db.execute(
    `INSERT INTO studyProfiles
      (userId,xp,lastStudyDate,studyDatesJson,usedQuestionIdsJson,dailyQuickCheckDismissed,createdAt,updatedAt)
     VALUES (?,?,?,?,?,0,NOW(),NOW())
     ON DUPLICATE KEY UPDATE xp=VALUES(xp),lastStudyDate=VALUES(lastStudyDate),
       studyDatesJson=VALUES(studyDatesJson),usedQuestionIdsJson=VALUES(usedQuestionIdsJson)`,
    [userId,321,"2026-09-21",JSON.stringify(["2026-09-20","2026-09-21"]),JSON.stringify(["legacy-q-1"])],
  );

  await db.execute(
    `INSERT INTO completedModules (userId,moduleId,completedAt)
     VALUES (?,?,NOW())
     ON DUPLICATE KEY UPDATE completedAt=VALUES(completedAt)`,
    [userId,"legacy-module-1"],
  );

  await db.execute(
    "INSERT INTO studyAnswers (userId,questionId,correct,answeredAt) VALUES (?,?,?,NOW())",
    [userId,"legacy-q-1",1],
  );

  await db.execute(
    `INSERT INTO simulationRecords
      (id,userId,completedAt,total,correct,errors,elapsedSeconds,byDisciplineJson,byBlockJson)
     VALUES (?,?,NOW(),10,8,2,600,?,?)
     ON DUPLICATE KEY UPDATE total=VALUES(total),correct=VALUES(correct),errors=VALUES(errors)`,
    ["legacy-sim-1",userId,JSON.stringify({"Língua Portuguesa":{"correct":4,"total":5}}),JSON.stringify({"I":{"correct":8,"total":10}})],
  );

  await db.execute(
    `INSERT INTO studyNotes (userId,moduleId,content,createdAt,updatedAt)
     VALUES (?,?,?,NOW(),NOW())
     ON DUPLICATE KEY UPDATE content=VALUES(content),updatedAt=NOW()`,
    [userId,"legacy-module-1","Nota privada da fixture de migração."],
  );

  await db.execute(
    `INSERT INTO adminAuditLogs (actorUserId,affectedUserId,action,detail,createdAt)
     VALUES (?,?,?,?,NOW())`,
    [rootId,userId,"CI_MIGRATION_FIXTURE","Registro fictício para validar a migração."],
  );

  console.log(JSON.stringify({ userId, rootId, seeded: true }));
} finally {
  await db.end();
}
