ALTER TABLE `campaigns` ADD `offline_amounts` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `rates` text DEFAULT '{"ron":5.3488,"eur":1,"usd":1.1225}' NOT NULL;--> statement-breakpoint
-- The amount typed so far was in the currency of the campaign.
UPDATE `campaigns` SET `offline_amounts` = json_object(`currency`, `offline_amount`) WHERE `offline_amount` > 0;