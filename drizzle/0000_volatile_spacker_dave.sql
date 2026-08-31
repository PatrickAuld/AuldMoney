CREATE TABLE `children` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`accent` text DEFAULT 'gold' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_children_sort_order` ON `children` (`sort_order`);--> statement-breakpoint
CREATE TABLE `interest_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`child_id` text NOT NULL,
	`annual_rate_bps` integer DEFAULT 0 NOT NULL,
	`payment_schedule` text DEFAULT 'monthly' NOT NULL,
	`updated_by_email` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_interest_settings_child` ON `interest_settings` (`child_id`);--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`child_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`effective_at` text NOT NULL,
	`created_by_email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_ledger_entries_child_effective` ON `ledger_entries` (`child_id`,`effective_at`);--> statement-breakpoint
CREATE TABLE `parents` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`added_by_email` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_parents_email` ON `parents` (`email`);--> statement-breakpoint
PRAGMA optimize;
