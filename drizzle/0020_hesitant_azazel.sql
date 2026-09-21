CREATE TABLE `competitionMonthlyGoals` (
	`id` int NOT NULL,
	`targetPoints` int NOT NULL DEFAULT 100,
	`targetCompletedRounds` int NOT NULL DEFAULT 5,
	`rewardTitle` varchar(160) NOT NULL DEFAULT 'Destaque mensal',
	`rewardDescription` varchar(500) NOT NULL DEFAULT 'Reconhecimento definido pela administração para quem concluir a meta do mês.',
	`isActive` boolean NOT NULL DEFAULT true,
	`updatedByUserId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competitionMonthlyGoals_id` PRIMARY KEY(`id`)
);
