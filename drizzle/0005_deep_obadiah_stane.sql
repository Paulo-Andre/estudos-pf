CREATE TABLE `studyReviewItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionKey` varchar(80) NOT NULL,
	`snapshotJson` text NOT NULL,
	`status` enum('pending','mastered') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	CONSTRAINT `studyReviewItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `studyReviewItems_user_question_unique` UNIQUE(`userId`,`questionKey`)
);
--> statement-breakpoint
CREATE INDEX `studyReviewItems_user_status_idx` ON `studyReviewItems` (`userId`,`status`);