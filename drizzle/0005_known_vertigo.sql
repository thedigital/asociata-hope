CREATE TABLE `campaign_donations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stripe_id` text NOT NULL,
	`campaign_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_donations_stripe_id_unique` ON `campaign_donations` (`stripe_id`);--> statement-breakpoint
CREATE INDEX `campaign_donations_campaign` ON `campaign_donations` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `campaign_translations` (
	`campaign_id` integer NOT NULL,
	`locale` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`campaign_id`, `locale`),
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`scope` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`animal_id` integer,
	`goal_amount` integer,
	`currency` text DEFAULT 'ron' NOT NULL,
	`ends_on` text,
	`offline_amount` integer DEFAULT 0 NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`animal_id`) REFERENCES `animals`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaigns_slug_unique` ON `campaigns` (`slug`);--> statement-breakpoint
ALTER TABLE `users` ADD `setup_token_hash` text;--> statement-breakpoint
ALTER TABLE `users` ADD `setup_expires_at` integer;