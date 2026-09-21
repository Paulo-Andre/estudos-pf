CREATE TABLE `platformGeneralSettings` (
	`id` int NOT NULL,
	`logoUrl` varchar(1000),
	`brandName` varchar(120),
	`brandTagline` varchar(180),
	`heroBadge` varchar(180),
	`heroTitle` varchar(320),
	`heroDescription` text,
	`primaryColor` varchar(7),
	`backgroundColor` varchar(7),
	`textColor` varchar(7),
	`updatedByUserId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platformGeneralSettings_id` PRIMARY KEY(`id`)
);
