DROP INDEX `authSessions_userId_idx` ON `authSessions`;--> statement-breakpoint
-- Mantém apenas a sessão mais recente de cada conta antes de impor a sessão única.
DELETE stale
FROM `authSessions` AS stale
INNER JOIN `authSessions` AS current
  ON stale.`userId` = current.`userId`
  AND (stale.`createdAt` < current.`createdAt` OR (stale.`createdAt` = current.`createdAt` AND stale.`id` < current.`id`));
ALTER TABLE `authSessions` ADD CONSTRAINT `authSessions_userId_unique` UNIQUE(`userId`);
