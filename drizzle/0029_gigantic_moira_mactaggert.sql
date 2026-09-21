ALTER TABLE `contents` ADD `noticeKind` enum('new','updated');--> statement-breakpoint
ALTER TABLE `contents` ADD `noticeActivatedAt` timestamp;