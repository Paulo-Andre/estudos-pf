ALTER TABLE `competitionSettings` ADD `weeklyCycleKey` varchar(16);--> statement-breakpoint
ALTER TABLE `competitionSettings` ADD `weeklyCycleKey` varchar(16);--> statement-breakpoint
ALTER TABLE `competitionSettings` ADD `weeklyCycleStartedAt` timestamp;--> statement-breakpoint
ALTER TABLE `competitionSettings` ADD `weeklyResetCronTaskUid` varchar(65);--> statement-breakpoint
CREATE INDEX `competitionSettings_weekly_cron_idx` ON `competitionSettings` (`weeklyResetCronTaskUid`);
