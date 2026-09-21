CREATE TABLE `commerceCoupons` (
	`id` varchar(64) NOT NULL,
	`code` varchar(48) NOT NULL,
	`description` varchar(240),
	`discountType` enum('percentage','fixed_amount') NOT NULL,
	`discountValue` int NOT NULL,
	`maxRedemptions` int,
	`redeemedCount` int NOT NULL DEFAULT 0,
	`startsAt` timestamp,
	`endsAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commerceCoupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `commerceCoupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `commerceOrderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` varchar(64) NOT NULL,
	`planId` varchar(64) NOT NULL,
	`titleSnapshot` varchar(180) NOT NULL,
	`planTypeSnapshot` enum('course_access','subscription') NOT NULL,
	`accessDurationDaysSnapshot` int NOT NULL,
	`courseIdsSnapshotJson` text NOT NULL,
	`unitPriceCents` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commerceOrderItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `commerceOrderItems_order_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
CREATE TABLE `commerceOrders` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`planId` varchar(64) NOT NULL,
	`couponCode` varchar(48),
	`status` enum('pending_payment','paid','cancelled','expired','refunded') NOT NULL DEFAULT 'pending_payment',
	`subtotalCents` int NOT NULL,
	`discountCents` int NOT NULL DEFAULT 0,
	`totalCents` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'BRL',
	`provider` varchar(40) NOT NULL DEFAULT 'manual',
	`providerReference` varchar(160),
	`paidAt` timestamp,
	`accessGrantedAt` timestamp,
	`cancelledAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commerceOrders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commercePlanCourses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` varchar(64) NOT NULL,
	`courseId` varchar(80) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commercePlanCourses_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercePlanCourses_plan_course_unique` UNIQUE(`planId`,`courseId`)
);
--> statement-breakpoint
CREATE TABLE `commercePlans` (
	`id` varchar(64) NOT NULL,
	`code` varchar(48) NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`planType` enum('course_access','subscription') NOT NULL,
	`accessDurationDays` int NOT NULL,
	`priceCents` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'BRL',
	`isActive` boolean NOT NULL DEFAULT false,
	`isHighlighted` boolean NOT NULL DEFAULT false,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercePlans_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercePlans_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `commerceTransactions` (
	`id` varchar(64) NOT NULL,
	`orderId` varchar(64) NOT NULL,
	`provider` varchar(40) NOT NULL,
	`providerReference` varchar(160),
	`status` enum('pending','approved','rejected','cancelled','refunded') NOT NULL DEFAULT 'pending',
	`amountCents` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'BRL',
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commerceTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `courseEnrollments` ADD `sourceOrderId` varchar(64);--> statement-breakpoint
ALTER TABLE `courseEnrollments` ADD `sourcePlanId` varchar(64);--> statement-breakpoint
CREATE INDEX `commerceCoupons_active_idx` ON `commerceCoupons` (`isActive`);--> statement-breakpoint
CREATE INDEX `commerceCoupons_validity_idx` ON `commerceCoupons` (`startsAt`,`endsAt`);--> statement-breakpoint
CREATE INDEX `commerceOrders_user_created_idx` ON `commerceOrders` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `commerceOrders_status_idx` ON `commerceOrders` (`status`);--> statement-breakpoint
CREATE INDEX `commerceOrders_plan_idx` ON `commerceOrders` (`planId`);--> statement-breakpoint
CREATE INDEX `commerceOrders_provider_reference_idx` ON `commerceOrders` (`provider`,`providerReference`);--> statement-breakpoint
CREATE INDEX `commercePlanCourses_course_idx` ON `commercePlanCourses` (`courseId`);--> statement-breakpoint
CREATE INDEX `commercePlans_active_idx` ON `commercePlans` (`isActive`);--> statement-breakpoint
CREATE INDEX `commercePlans_type_idx` ON `commercePlans` (`planType`);--> statement-breakpoint
CREATE INDEX `commerceTransactions_order_idx` ON `commerceTransactions` (`orderId`);--> statement-breakpoint
CREATE INDEX `commerceTransactions_provider_ref_idx` ON `commerceTransactions` (`provider`,`providerReference`);--> statement-breakpoint
CREATE INDEX `courseEnrollments_source_order_idx` ON `courseEnrollments` (`sourceOrderId`);