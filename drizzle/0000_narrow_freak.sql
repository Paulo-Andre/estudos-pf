CREATE TABLE `adminAuditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int NOT NULL,
	`affectedUserId` int,
	`action` varchar(80) NOT NULL,
	`detail` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminAuditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `authSessions` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `authSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `authSessions_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `completedModules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`moduleId` varchar(80) NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `completedModules_id` PRIMARY KEY(`id`),
	CONSTRAINT `completedModules_user_module_unique` UNIQUE(`userId`,`moduleId`)
);
--> statement-breakpoint
CREATE TABLE `simulationRecords` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	`total` int NOT NULL,
	`correct` int NOT NULL,
	`errors` int NOT NULL,
	`elapsedSeconds` int NOT NULL,
	`byDisciplineJson` text NOT NULL,
	`byBlockJson` text NOT NULL,
	CONSTRAINT `simulationRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studyAnswers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionId` varchar(80) NOT NULL,
	`correct` boolean NOT NULL,
	`answeredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studyAnswers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studyNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`moduleId` varchar(80) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studyNotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `studyNotes_user_module_unique` UNIQUE(`userId`,`moduleId`)
);
--> statement-breakpoint
CREATE TABLE `studyProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`xp` int NOT NULL DEFAULT 0,
	`lastStudyDate` varchar(10),
	`studyDatesJson` text NOT NULL,
	`usedQuestionIdsJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studyProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `studyProfiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(128) NOT NULL,
	`name` varchar(160) NOT NULL,
	`username` varchar(48),
	`email` varchar(320),
	`passwordHash` varchar(255),
	`loginMethod` varchar(64) NOT NULL DEFAULT 'local',
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`isBlocked` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `adminAudit_actor_idx` ON `adminAuditLogs` (`actorUserId`);--> statement-breakpoint
CREATE INDEX `adminAudit_affected_idx` ON `adminAuditLogs` (`affectedUserId`);--> statement-breakpoint
CREATE INDEX `authSessions_userId_idx` ON `authSessions` (`userId`);--> statement-breakpoint
CREATE INDEX `authSessions_expiresAt_idx` ON `authSessions` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `completedModules_userId_idx` ON `completedModules` (`userId`);--> statement-breakpoint
CREATE INDEX `simulationRecords_userId_idx` ON `simulationRecords` (`userId`);--> statement-breakpoint
CREATE INDEX `studyAnswers_userId_idx` ON `studyAnswers` (`userId`);--> statement-breakpoint
CREATE INDEX `studyAnswers_user_question_idx` ON `studyAnswers` (`userId`,`questionId`);--> statement-breakpoint
CREATE INDEX `studyNotes_userId_idx` ON `studyNotes` (`userId`);