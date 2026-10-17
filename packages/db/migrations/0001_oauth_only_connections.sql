PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_connection` (
	`id` text PRIMARY KEY NOT NULL,
	`identity_id` text NOT NULL,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`scopes` text,
	`refresh_token_enc` text NOT NULL,
	`access_token_expires_at` text,
	`provider_account_id` text,
	`provider_account_email` text,
	`provider_site` text,
	`provider_resource_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`identity_id`) REFERENCES `identity`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP TABLE `connection`;--> statement-breakpoint
ALTER TABLE `__new_connection` RENAME TO `connection`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `connection_identity_id_idx` ON `connection` (`identity_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `connection_identity_provider_uidx` ON `connection` (`identity_id`,`provider`);