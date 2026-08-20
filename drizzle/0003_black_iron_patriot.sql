CREATE TABLE `xiaohongshu_contents` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_account_id` text,
	`category` text DEFAULT '未分类' NOT NULL,
	`cover_title` text NOT NULL,
	`cover_subtitle` text DEFAULT '' NOT NULL,
	`excerpt` text DEFAULT '' NOT NULL,
	`note_title` text DEFAULT '' NOT NULL,
	`note_body` text NOT NULL,
	`keywords` text DEFAULT '[]' NOT NULL,
	`source_name` text DEFAULT '自建小红书素材' NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`requires_verification` integer DEFAULT false NOT NULL,
	`verification_note` text DEFAULT '' NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_xiaohongshu_contents_owner_account_id` ON `xiaohongshu_contents` (`owner_account_id`);