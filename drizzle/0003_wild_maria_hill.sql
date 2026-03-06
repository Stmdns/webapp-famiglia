CREATE TABLE `expense_month_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`expense_id` text NOT NULL,
	`month` integer NOT NULL,
	`year` integer NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`expense_id`) REFERENCES `recurring_expenses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `one_time_expenses` ADD `expense_id` text REFERENCES recurring_expenses(id);--> statement-breakpoint
ALTER TABLE `one_time_expenses` ADD `receipt_text` text;--> statement-breakpoint
ALTER TABLE `recurring_expenses` ADD `start_month` integer;--> statement-breakpoint
ALTER TABLE `recurring_expenses` ADD `start_year` integer;--> statement-breakpoint
ALTER TABLE `recurring_expenses` ADD `end_month` integer;--> statement-breakpoint
ALTER TABLE `recurring_expenses` ADD `end_year` integer;