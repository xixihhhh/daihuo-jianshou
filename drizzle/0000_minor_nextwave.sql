CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`shot_id` integer NOT NULL,
	`type` text NOT NULL,
	`file_path` text,
	`thumbnail_path` text,
	`provider` text,
	`model` text,
	`prompt` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `compositions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`output_path` text,
	`resolution` text DEFAULT '1080p',
	`aspect_ratio` text DEFAULT '9:16',
	`duration` integer,
	`bgm_path` text,
	`tts_enabled` integer DEFAULT false,
	`subtitle_style` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`product_name` text,
	`product_category` text,
	`product_description` text,
	`product_images` text DEFAULT '[]',
	`product_analysis` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `scripts` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`style_type` text NOT NULL,
	`title` text,
	`total_duration` integer,
	`shots` text DEFAULT '[]',
	`selected` integer DEFAULT false,
	`created_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `video_clips` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`shot_id` integer NOT NULL,
	`asset_id` text,
	`file_path` text,
	`duration` integer,
	`provider` text,
	`model` text,
	`transition_type` text DEFAULT 'cut',
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
