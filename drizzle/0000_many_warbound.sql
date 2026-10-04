CREATE TABLE `animal_photos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`animal_id` integer NOT NULL,
	`file` text NOT NULL,
	`alt` text,
	`width` integer,
	`height` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`animal_id`) REFERENCES `animals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `animal_photos_animal` ON `animal_photos` (`animal_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `animal_traits` (
	`animal_id` integer NOT NULL,
	`trait` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`animal_id`, `trait`),
	FOREIGN KEY (`animal_id`) REFERENCES `animals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `animal_traits_trait` ON `animal_traits` (`trait`);--> statement-breakpoint
CREATE TABLE `animal_translations` (
	`animal_id` integer NOT NULL,
	`locale` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`seo_title` text,
	`seo_description` text,
	PRIMARY KEY(`animal_id`, `locale`),
	FOREIGN KEY (`animal_id`) REFERENCES `animals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `animals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`species` text NOT NULL,
	`adoption_type` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`sex` text,
	`size` text,
	`color` text,
	`birth_date` text,
	`birth_date_estimated` integer DEFAULT false NOT NULL,
	`vaccinated` integer DEFAULT false NOT NULL,
	`sterilized` integer DEFAULT false NOT NULL,
	`dewormed` integer DEFAULT false NOT NULL,
	`video_url` text,
	`video_file` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `animals_collection_slug` ON `animals` (`species`,`adoption_type`,`slug`);--> statement-breakpoint
CREATE INDEX `animals_listing` ON `animals` (`species`,`adoption_type`,`status`,`sort_order`);--> statement-breakpoint
CREATE TABLE `page_translations` (
	`page_id` integer NOT NULL,
	`locale` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`seo_title` text,
	`seo_description` text,
	PRIMARY KEY(`page_id`, `locale`),
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pages_slug_unique` ON `pages` (`slug`);--> statement-breakpoint
CREATE TABLE `redirects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_path` text NOT NULL,
	`to_path` text,
	`status` integer DEFAULT 301 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `redirects_from_path_unique` ON `redirects` (`from_path`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`locale` text DEFAULT 'ro' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);