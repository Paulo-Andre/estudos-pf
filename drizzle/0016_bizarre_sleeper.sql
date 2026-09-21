ALTER TABLE `studyRoadmapItems` ADD `disciplineId` int;--> statement-breakpoint
UPDATE `studyRoadmapItems` AS `roadmap`
INNER JOIN (
  SELECT `contentId`, MIN(`disciplineId`) AS `disciplineId`
  FROM `disciplineContents`
  GROUP BY `contentId`
) AS `links` ON `links`.`contentId` = `roadmap`.`contentId`
SET `roadmap`.`disciplineId` = `links`.`disciplineId`
WHERE `roadmap`.`disciplineId` IS NULL;--> statement-breakpoint
DELETE `duplicate`
FROM `studyRoadmapItems` AS `duplicate`
INNER JOIN `studyRoadmapItems` AS `kept`
  ON `duplicate`.`userId` = `kept`.`userId`
  AND `duplicate`.`courseId` = `kept`.`courseId`
  AND `duplicate`.`disciplineId` = `kept`.`disciplineId`
  AND `duplicate`.`id` > `kept`.`id`
WHERE `duplicate`.`disciplineId` IS NOT NULL;--> statement-breakpoint
ALTER TABLE `studyRoadmapItems` DROP INDEX `studyRoadmapItems_user_course_content_unique`;--> statement-breakpoint
ALTER TABLE `studyRoadmapItems` ADD CONSTRAINT `studyRoadmapItems_user_course_discipline_unique` UNIQUE(`userId`,`courseId`,`disciplineId`);
