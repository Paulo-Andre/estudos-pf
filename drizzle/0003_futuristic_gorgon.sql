CREATE TABLE `contentChangelog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contentId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`changedField` varchar(80) NOT NULL,
	`oldValue` text,
	`newValue` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contentChangelog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(220) NOT NULL,
	`description` text,
	`body` text,
	`status` enum('draft','review','approved','published','inactive') NOT NULL DEFAULT 'draft',
	`requiresReview` boolean NOT NULL DEFAULT false,
	`createdByUserId` int NOT NULL,
	`updatedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `courseDisciplines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`courseId` varchar(80) NOT NULL,
	`disciplineId` int NOT NULL,
	`linkedByUserId` int NOT NULL,
	`linkedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `courseDisciplines_id` PRIMARY KEY(`id`),
	CONSTRAINT `courseDisciplines_course_discipline_unique` UNIQUE(`courseId`,`disciplineId`)
);
--> statement-breakpoint
CREATE TABLE `disciplineContents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`disciplineId` int NOT NULL,
	`contentId` int NOT NULL,
	`linkedByUserId` int NOT NULL,
	`linkedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `disciplineContents_id` PRIMARY KEY(`id`),
	CONSTRAINT `disciplineContents_discipline_content_unique` UNIQUE(`disciplineId`,`contentId`)
);
--> statement-breakpoint
CREATE TABLE `disciplines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`shortName` varchar(48) NOT NULL,
	`description` text,
	`status` enum('draft','review','approved','published','inactive') NOT NULL DEFAULT 'draft',
	`requiresReview` boolean NOT NULL DEFAULT false,
	`createdByUserId` int NOT NULL,
	`updatedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `disciplines_id` PRIMARY KEY(`id`),
	CONSTRAINT `disciplines_shortName_unique` UNIQUE(`shortName`)
);
--> statement-breakpoint
CREATE TABLE `questionChangelog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`changedField` varchar(80) NOT NULL,
	`oldValue` text,
	`newValue` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `questionChangelog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questionContentLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`contentId` int NOT NULL,
	`linkedByUserId` int NOT NULL,
	`linkedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `questionContentLinks_id` PRIMARY KEY(`id`),
	CONSTRAINT `questionContentLinks_question_content_unique` UNIQUE(`questionId`,`contentId`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`statement` text NOT NULL,
	`questionType` enum('certo_errado','multipla_escolha') NOT NULL DEFAULT 'certo_errado',
	`optionsJson` text,
	`answerJson` text NOT NULL,
	`explanation` text,
	`difficulty` enum('basic','intermediate','advanced') NOT NULL DEFAULT 'intermediate',
	`source` varchar(240),
	`banca` varchar(120),
	`year` int,
	`status` enum('draft','review','approved','published','inactive') NOT NULL DEFAULT 'draft',
	`requiresReview` boolean NOT NULL DEFAULT false,
	`createdByUserId` int NOT NULL,
	`updatedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviewQueue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemType` enum('question','content') NOT NULL,
	`itemId` int NOT NULL,
	`status` enum('pending','approved','rejected','correction_requested') NOT NULL DEFAULT 'pending',
	`submittedByUserId` int NOT NULL,
	`reviewedByUserId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviewQueue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `simulationQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`simulationId` varchar(64) NOT NULL,
	`questionId` int NOT NULL,
	`position` int NOT NULL,
	`answeredCorrectly` boolean,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `simulationQuestions_id` PRIMARY KEY(`id`),
	CONSTRAINT `simulationQuestions_simulation_position_unique` UNIQUE(`simulationId`,`position`),
	CONSTRAINT `simulationQuestions_simulation_question_unique` UNIQUE(`simulationId`,`questionId`)
);
--> statement-breakpoint
CREATE INDEX `contentChangelog_content_idx` ON `contentChangelog` (`contentId`);--> statement-breakpoint
CREATE INDEX `contentChangelog_actor_idx` ON `contentChangelog` (`actorUserId`);--> statement-breakpoint
CREATE INDEX `contents_status_idx` ON `contents` (`status`);--> statement-breakpoint
CREATE INDEX `contents_title_idx` ON `contents` (`title`);--> statement-breakpoint
CREATE INDEX `courseDisciplines_discipline_idx` ON `courseDisciplines` (`disciplineId`);--> statement-breakpoint
CREATE INDEX `disciplineContents_content_idx` ON `disciplineContents` (`contentId`);--> statement-breakpoint
CREATE INDEX `disciplines_status_idx` ON `disciplines` (`status`);--> statement-breakpoint
CREATE INDEX `questionChangelog_question_idx` ON `questionChangelog` (`questionId`);--> statement-breakpoint
CREATE INDEX `questionChangelog_actor_idx` ON `questionChangelog` (`actorUserId`);--> statement-breakpoint
CREATE INDEX `questionContentLinks_content_idx` ON `questionContentLinks` (`contentId`);--> statement-breakpoint
CREATE INDEX `questions_status_idx` ON `questions` (`status`);--> statement-breakpoint
CREATE INDEX `questions_review_idx` ON `questions` (`requiresReview`,`status`);--> statement-breakpoint
CREATE INDEX `questions_banca_year_idx` ON `questions` (`banca`,`year`);--> statement-breakpoint
CREATE INDEX `reviewQueue_pending_idx` ON `reviewQueue` (`status`,`itemType`);--> statement-breakpoint
CREATE INDEX `reviewQueue_item_idx` ON `reviewQueue` (`itemType`,`itemId`);--> statement-breakpoint
CREATE INDEX `simulationQuestions_question_idx` ON `simulationQuestions` (`questionId`);