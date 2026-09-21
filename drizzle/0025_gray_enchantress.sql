CREATE TABLE `platformAlertDismissals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alertId` int NOT NULL,
	`userId` int NOT NULL,
	`dismissedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `platformAlertDismissals_id` PRIMARY KEY(`id`),
	CONSTRAINT `platformAlertDismissals_alert_user_unique` UNIQUE(`alertId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `platformAlerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`level` enum('improvement','warning','urgent') NOT NULL DEFAULT 'improvement',
	`message` text NOT NULL,
	`audience` enum('all','course') NOT NULL DEFAULT 'all',
	`courseId` varchar(80),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platformAlerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `platformAlertDismissals_user_idx` ON `platformAlertDismissals` (`userId`);--> statement-breakpoint
CREATE INDEX `platformAlerts_active_created_idx` ON `platformAlerts` (`isActive`,`createdAt`);--> statement-breakpoint
CREATE INDEX `platformAlerts_course_idx` ON `platformAlerts` (`courseId`);