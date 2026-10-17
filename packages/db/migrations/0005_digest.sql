CREATE TABLE `digest` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`digest_date` text NOT NULL,
	`window_start` text NOT NULL,
	`window_end` text NOT NULL,
	`status` text NOT NULL,
	`content` text,
	`missing_sources` text NOT NULL,
	`model` text,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `digest_user_date_uidx` ON `digest` (`user_id`,`digest_date`);