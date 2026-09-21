CREATE TABLE IF NOT EXISTS `courses` (
  `id` varchar(80) NOT NULL,
  `title` varchar(180) NOT NULL,
  `track` varchar(32) NOT NULL,
  `description` text,
  `isActive` boolean NOT NULL DEFAULT true,
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `courses_active_idx` (`isActive`)
);

