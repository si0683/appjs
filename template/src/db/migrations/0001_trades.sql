CREATE TABLE `trades` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`symbol` text NOT NULL,
	`side` text NOT NULL,
	`price` text NOT NULL,
	`qty` text NOT NULL,
	`fee` text DEFAULT '0' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
