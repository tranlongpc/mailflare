CREATE TABLE `mailbox_supervisors` (
	`id` text PRIMARY KEY NOT NULL,
	`mailbox_id` text NOT NULL,
	`supervisor_user_id` text NOT NULL,
	`created_by_user_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`mailbox_id`) REFERENCES `mailboxes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`supervisor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mailbox_supervisors_mailbox_user_idx` ON `mailbox_supervisors` (`mailbox_id`,`supervisor_user_id`);--> statement-breakpoint
CREATE INDEX `mailbox_supervisors_user_idx` ON `mailbox_supervisors` (`supervisor_user_id`);
