ALTER TABLE `studyProfiles` ADD `dailyQuickCheckDate` varchar(10);--> statement-breakpoint
ALTER TABLE `studyProfiles` ADD `dailyQuickCheckCourseId` varchar(80);--> statement-breakpoint
ALTER TABLE `studyProfiles` ADD `dailyQuickCheckQuestionId` varchar(80);--> statement-breakpoint
ALTER TABLE `studyProfiles` ADD `dailyQuickCheckDismissed` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `cpf` varchar(11);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_cpf_unique` UNIQUE(`cpf`);