CREATE TABLE `studyContentProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`courseId` varchar(80) NOT NULL,
	`contentId` int NOT NULL,
	`status` enum('started','completed') NOT NULL DEFAULT 'started',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`lastOpenedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `studyContentProgress_id` PRIMARY KEY(`id`),
	CONSTRAINT `studyContentProgress_user_course_content_unique` UNIQUE(`userId`,`courseId`,`contentId`)
);
--> statement-breakpoint
CREATE TABLE `studyRoadmapItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`courseId` varchar(80) NOT NULL,
	`contentId` int NOT NULL,
	`weekday` int NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studyRoadmapItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `studyRoadmapItems_user_course_content_unique` UNIQUE(`userId`,`courseId`,`contentId`)
);
--> statement-breakpoint
CREATE INDEX `studyContentProgress_user_lastOpened_idx` ON `studyContentProgress` (`userId`,`lastOpenedAt`);--> statement-breakpoint
CREATE INDEX `studyRoadmapItems_user_weekday_time_idx` ON `studyRoadmapItems` (`userId`,`weekday`,`startTime`);