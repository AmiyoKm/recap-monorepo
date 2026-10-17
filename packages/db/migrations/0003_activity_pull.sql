CREATE TABLE `activity` (
	`id` text PRIMARY KEY NOT NULL,
	`identity_id` text NOT NULL,
	`connection_id` text NOT NULL,
	`source` text NOT NULL,
	`kind` text NOT NULL,
	`external_id` text NOT NULL,
	`occurred_at` text NOT NULL,
	`ends_at` text,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`actor` text,
	`detail` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`identity_id`) REFERENCES `identity`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connection_id`) REFERENCES `connection`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activity_connection_external_uidx` ON `activity` (`connection_id`,`external_id`);--> statement-breakpoint
CREATE INDEX `activity_identity_occurred_idx` ON `activity` (`identity_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `activity_source_occurred_idx` ON `activity` (`source`,`occurred_at`);--> statement-breakpoint
ALTER TABLE `connection` ADD `pull_cursor` text;--> statement-breakpoint
ALTER TABLE `connection` ADD `last_pulled_at` text;--> statement-breakpoint
ALTER TABLE `connection` ADD `last_pull_error` text;