CREATE TABLE `xiaohongshu_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`kind` text DEFAULT 'subject' NOT NULL,
	`name` text NOT NULL,
	`image_url` text NOT NULL,
	`storage_key` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_xiaohongshu_assets_account_kind_order` ON `xiaohongshu_assets` (`account_id`,`kind`,`display_order`);