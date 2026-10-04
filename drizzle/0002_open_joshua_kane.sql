CREATE TABLE `contact_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`locale` text NOT NULL,
	`reason` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`animal_name` text,
	`message` text NOT NULL,
	`answers` text DEFAULT '{}' NOT NULL,
	`handled_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contact_messages_created` ON `contact_messages` (`created_at`);