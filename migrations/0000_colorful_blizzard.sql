CREATE TABLE `junction_apps_users` (
	`user_id` integer NOT NULL,
	`app_id` integer NOT NULL,
	PRIMARY KEY(`app_id`, `user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `apps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creation_date` integer NOT NULL,
	`slug` text NOT NULL,
	`allowed_hosts` text
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text(32) PRIMARY KEY NOT NULL,
	`creation_date` integer NOT NULL,
	`last_usage_date` integer NOT NULL,
	`app_id` integer NOT NULL,
	`user_id` integer,
	`status` text NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creation_date` integer NOT NULL,
	`public_key` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`data` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `slug` ON `apps` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `public_key` ON `users` (`public_key`);