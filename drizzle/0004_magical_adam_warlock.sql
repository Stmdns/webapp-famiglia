ALTER TABLE `groups` ADD `view_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `groups_view_token_unique` ON `groups` (`view_token`);