CREATE TABLE `courses` (
	`id` varchar(80) NOT NULL,
	`title` varchar(180) NOT NULL,
	`track` varchar(32) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `courses_active_idx` ON `courses` (`isActive`);