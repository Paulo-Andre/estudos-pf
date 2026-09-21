import mysql from "mysql2/promise";
import { ORIGINAL_EXPANSION_MARKER, originalPoliceCurriculum } from "./original-police-curriculum-data.mjs";

const actorUserId = 1;
const connection = await mysql.createConnection(process.env.DATABASE_URL);
let insertedDisciplines = 0;
let insertedContents = 0;
let insertedQuestions = 0;

try {
  await connection.beginTransaction();

  for (const discipline of originalPoliceCurriculum.disciplines) {
    const [result] = await connection.execute(
      `INSERT INTO disciplines (name, shortName, description, status, requiresReview, createdByUserId, updatedByUserId)
       SELECT ?, ?, ?, 'published', 0, ?, ? FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM disciplines WHERE shortName = ?)`,
      [discipline.name, discipline.shortName, discipline.description, actorUserId, actorUserId, discipline.shortName],
    );
    insertedDisciplines += result.affectedRows;
  }

  const [disciplineRows] = await connection.execute(
    `SELECT id, shortName FROM disciplines WHERE shortName IN (${originalPoliceCurriculum.disciplines.map(() => "?").join(",")})`,
    originalPoliceCurriculum.disciplines.map((discipline) => discipline.shortName),
  );
  const disciplineIdByShortName = new Map(disciplineRows.map((row) => [row.shortName, row.id]));

  for (const content of originalPoliceCurriculum.contents) {
    const title = `${content.code} — ${content.title}`;
    const [result] = await connection.execute(
      `INSERT INTO contents (title, objective, description, cardText, body, materialUrl, materialLabel, status, requiresReview, createdByUserId, updatedByUserId)
       SELECT ?, ?, ?, ?, ?, ?, ?, 'published', 0, ?, ? FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM contents WHERE title = ?)`,
      [title, content.objective, content.description, content.description, content.body, content.materialUrl, content.materialLabel, actorUserId, actorUserId, title],
    );
    insertedContents += result.affectedRows;
  }

  const contentTitles = originalPoliceCurriculum.contents.map((content) => `${content.code} — ${content.title}`);
  const [contentRows] = await connection.execute(
    `SELECT id, title FROM contents WHERE title IN (${contentTitles.map(() => "?").join(",")})`,
    contentTitles,
  );
  const contentIdByCode = new Map(contentRows.map((row) => [row.title.slice(0, 5), row.id]));

  for (const content of originalPoliceCurriculum.contents) {
    const disciplineId = disciplineIdByShortName.get(content.disciplineShortName);
    const contentId = contentIdByCode.get(content.code);
    if (disciplineId && contentId) {
      await connection.execute(
        "INSERT IGNORE INTO disciplineContents (disciplineId, contentId, linkedByUserId) VALUES (?, ?, ?)",
        [disciplineId, contentId, actorUserId],
      );
    }
  }

  for (const discipline of originalPoliceCurriculum.disciplines) {
    const disciplineId = disciplineIdByShortName.get(discipline.shortName);
    if (!disciplineId) continue;
    for (const courseId of discipline.courseIds) {
      await connection.execute(
        "INSERT IGNORE INTO courseDisciplines (courseId, disciplineId, linkedByUserId) VALUES (?, ?, ?)",
        [courseId, disciplineId, actorUserId],
      );
    }
  }

  for (let index = 0; index < originalPoliceCurriculum.questions.length; index += 1) {
    const [contentCode, statement, answer, explanation, difficulty] = originalPoliceCurriculum.questions[index];
    const source = `${ORIGINAL_EXPANSION_MARKER}:${contentCode}:Q${String(index + 1).padStart(2, "0")}`;
    const [result] = await connection.execute(
      `INSERT INTO questions (statement, questionType, optionsJson, answerJson, explanation, difficulty, source, banca, year, status, requiresReview, createdByUserId, updatedByUserId)
       SELECT ?, 'certo_errado', '[]', ?, ?, ?, ?, 'Núcleo Concursos', 2026, 'published', 0, ?, ? FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM questions WHERE source = ?)`,
      [statement, JSON.stringify(answer), explanation, difficulty, source, actorUserId, actorUserId, source],
    );
    insertedQuestions += result.affectedRows;
  }

  const [questionRows] = await connection.execute(
    "SELECT id, source FROM questions WHERE source LIKE ?",
    [`${ORIGINAL_EXPANSION_MARKER}:%`],
  );
  for (const question of questionRows) {
    const match = question.source.match(/:([A-Z]{2}-\d{2}):Q\d+$/);
    const contentId = match ? contentIdByCode.get(match[1]) : undefined;
    if (contentId) {
      await connection.execute(
        "INSERT IGNORE INTO questionContentLinks (questionId, contentId, linkedByUserId) VALUES (?, ?, ?)",
        [question.id, contentId, actorUserId],
      );
    }
  }

  if (insertedDisciplines || insertedContents || insertedQuestions) {
    await connection.execute(
      "INSERT INTO adminAuditLogs (actorUserId, action, detail) VALUES (?, ?, ?)",
      [actorUserId, "EXPANSAO_CURRICULAR_AUTORAL", `${insertedDisciplines} disciplina(s), ${insertedContents} conteúdo(s) e ${insertedQuestions} questão(ões) autorais adicionados à matriz policial.`],
    );
  }

  await connection.commit();
  console.log(JSON.stringify({ insertedDisciplines, insertedContents, insertedQuestions, marker: ORIGINAL_EXPANSION_MARKER }));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
