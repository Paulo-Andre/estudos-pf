CREATE TABLE `passwordResetTokens` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `passwordResetTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `passwordResetTokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE INDEX `passwordResetTokens_userId_idx` ON `passwordResetTokens` (`userId`);--> statement-breakpoint
CREATE INDEX `passwordResetTokens_expiresAt_idx` ON `passwordResetTokens` (`expiresAt`);