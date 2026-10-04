ALTER TABLE `users` ADD `totp_secret` text;--> statement-breakpoint
ALTER TABLE `users` ADD `totp_last_step` integer DEFAULT 0 NOT NULL;