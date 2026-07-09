CREATE TABLE `conflicts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`collection` text NOT NULL,
	`record_id` text NOT NULL,
	`local` text NOT NULL,
	`remote` text,
	`detected_at` integer NOT NULL,
	`resolved` integer DEFAULT false NOT NULL,
	`kind` text DEFAULT 'conflict' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_cursors` (
	`collection` text PRIMARY KEY NOT NULL,
	`cursor` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_queue` (
	`key` text PRIMARY KEY NOT NULL,
	`collection` text NOT NULL,
	`record_id` text NOT NULL,
	`op` text NOT NULL,
	`record` text NOT NULL,
	`enqueued_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_records` (
	`collection` text NOT NULL,
	`id` text NOT NULL,
	`user_id` text,
	`payload` text NOT NULL,
	`client_updated_at` integer NOT NULL,
	`deleted` integer DEFAULT false NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	PRIMARY KEY(`collection`, `id`)
);
