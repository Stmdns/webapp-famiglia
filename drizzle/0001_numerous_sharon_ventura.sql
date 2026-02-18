CREATE TABLE `expense_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`expense_id` text NOT NULL,
	`month` integer NOT NULL,
	`year` integer NOT NULL,
	`amount` real NOT NULL,
	`paid_at` integer,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`expense_id`) REFERENCES `recurring_expenses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `one_time_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`category_id` text,
	`name` text NOT NULL,
	`amount` real NOT NULL,
	`date` integer NOT NULL,
	`month` integer NOT NULL,
	`year` integer NOT NULL,
	`is_paid` integer DEFAULT false NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `expense_categories`(`id`) ON UPDATE no action ON DELETE set null
);
