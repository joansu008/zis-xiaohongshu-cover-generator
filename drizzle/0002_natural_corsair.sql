CREATE TABLE `backgrounds` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`tags` text DEFAULT '' NOT NULL,
	`image_url` text NOT NULL,
	`storage_key` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('city-1', '香港海边', '香港 城市 海边 蓝天', '/backgrounds/city-1.jpg', NULL, 1, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('city-2', '城市天际线', '香港 城市 天际线 日落', '/backgrounds/city-2.jpg', NULL, 2, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('city-3', '街头夜景', '城市 街头 夜景 情绪', '/backgrounds/city-3.jpg', NULL, 3, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('city-4', '山海风景', '自然 山 海 风景', '/backgrounds/city-4.jpg', NULL, 4, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('hk-day', '香港港口', '香港 港口 白天 城市', '/backgrounds/hk-harbor-day.jpg', NULL, 5, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('hk-mountain', '山城天际线', '香港 山 城市 天际线', '/backgrounds/hk-mountain-city.jpg', NULL, 6, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('neon-street', '霓虹街头', '城市 夜景 霓虹 街头 情绪', '/backgrounds/neon-street.jpg', NULL, 7, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('hk-aerial', '香港俯瞰夜景', '香港 俯瞰 夜景 灯光', '/backgrounds/hk-aerial-night.jpg', NULL, 8, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('hk-night', '维港夜景', '香港 维多利亚港 夜景 倒影', '/backgrounds/hk-harbor-night.jpg', NULL, 9, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('tower-night', '城市高楼', '城市 高楼 夜景 竖图', '/backgrounds/city-tower-night.jpg', NULL, 10, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('hk-peak', '太平山夜景', '香港 太平山 夜景 天际线', '/backgrounds/hk-peak-night.jpg', NULL, 11, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('aurora', '极光流动', 'AI 科技 极光 蓝紫 抽象', '/backgrounds/generated-aurora.svg', NULL, 12, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('sunset', '日落山丘', '日落 山丘 橙色 自然', '/backgrounds/generated-sunset.svg', NULL, 13, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('ocean', '深海微光', '海洋 蓝色 微光 安静', '/backgrounds/generated-ocean.svg', NULL, 14, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('paper', '暖色纸张', '纸张 米色 极简 认知', '/backgrounds/generated-paper.svg', NULL, 15, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('grid', '未来网格', 'AI 科技 网格 黑色 未来', '/backgrounds/generated-grid.svg', NULL, 16, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('forest', '雾中森林', '森林 绿色 雾 自然', '/backgrounds/generated-forest.svg', NULL, 17, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('dawn', '城市清晨', '城市 清晨 粉色 天空', '/backgrounds/generated-dawn.svg', NULL, 18, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('ink', '水墨山水', '水墨 山水 黑白 中国风', '/backgrounds/generated-ink.svg', NULL, 19, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('neon', '霓虹渐变', '霓虹 紫色 蓝色 AI 抽象', '/backgrounds/generated-neon.svg', NULL, 20, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('desert', '沙漠光影', '沙漠 金色 光影 自然', '/backgrounds/generated-desert.svg', NULL, 21, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('cloud', '云上蓝天', '蓝天 云朵 清新 自由', '/backgrounds/generated-cloud.svg', NULL, 22, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `backgrounds` (`id`, `name`, `tags`, `image_url`, `storage_key`, `display_order`, `created_at`) VALUES ('matrix', '矩阵光线', '矩阵 光线 绿色 黑色 科技', '/backgrounds/generated-matrix.svg', NULL, 23, '2026-08-20T00:00:00.000Z');
--> statement-breakpoint
PRAGMA optimize;
