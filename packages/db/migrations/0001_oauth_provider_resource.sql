ALTER TABLE `connection` ADD `provider_resource_id` text;
--> statement-breakpoint
UPDATE `connection` SET `status` = 'needs_reconnect', `api_key_enc` = NULL WHERE `auth_kind` = 'api_key';
