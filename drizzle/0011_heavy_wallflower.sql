CREATE TABLE `globalContactSettings` (
	`id` int NOT NULL,
	`email` varchar(320),
	`telegramUrl` varchar(500),
	`updatedByUserId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `globalContactSettings_id` PRIMARY KEY(`id`)
);
