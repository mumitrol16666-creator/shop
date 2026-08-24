CREATE TABLE IF NOT EXISTS `store_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`data_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
