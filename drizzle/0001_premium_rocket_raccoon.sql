CREATE TABLE IF NOT EXISTS `course_records` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`data_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `course_records_slug_unique` ON `course_records` (`slug`);
