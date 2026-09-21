CREATE TABLE `competitionAnswers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roundId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`questionId` int NOT NULL,
	`courseId` varchar(80),
	`submittedAnswerJson` text NOT NULL,
	`correct` boolean NOT NULL,
	`pointsEarned` int NOT NULL,
	`answeredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competitionAnswers_id` PRIMARY KEY(`id`),
	CONSTRAINT `competitionAnswers_round_question_unique` UNIQUE(`roundId`,`questionId`)
);
--> statement-breakpoint
CREATE TABLE `competitionRounds` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`courseId` varchar(80),
	`questionIdsJson` text NOT NULL,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competitionRounds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `competitionSettings` (
	`id` int NOT NULL,
	`pointsPerCorrect` int NOT NULL DEFAULT 10,
	`pointsPerWrong` int NOT NULL DEFAULT 0,
	`questionsPerRound` int NOT NULL DEFAULT 10,
	`isActive` boolean NOT NULL DEFAULT true,
	`updatedByUserId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competitionSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `competitionAnswers_user_course_idx` ON `competitionAnswers` (`userId`,`courseId`);--> statement-breakpoint
CREATE INDEX `competitionAnswers_ranking_idx` ON `competitionAnswers` (`courseId`,`pointsEarned`);--> statement-breakpoint
CREATE INDEX `competitionRounds_user_created_idx` ON `competitionRounds` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `competitionRounds_course_idx` ON `competitionRounds` (`courseId`);