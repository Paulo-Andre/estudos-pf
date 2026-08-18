CREATE TABLE `courseEnrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`courseId` varchar(80) NOT NULL,
	`startAt` timestamp NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`status` enum('active','revoked') NOT NULL DEFAULT 'active',
	`createdByUserId` int NOT NULL,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courseEnrollments_id` PRIMARY KEY(`id`),
	CONSTRAINT `courseEnrollments_user_course_unique` UNIQUE(`userId`,`courseId`)
);
--> statement-breakpoint
CREATE INDEX `courseEnrollments_user_idx` ON `courseEnrollments` (`userId`);--> statement-breakpoint
CREATE INDEX `courseEnrollments_expiry_idx` ON `courseEnrollments` (`expiresAt`);