CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`product_sku` text NOT NULL,
	`variant_id` text NOT NULL,
	`variant_sku` text NOT NULL,
	`bundle_sku` text NOT NULL,
	`title_snapshot` text NOT NULL,
	`variant_snapshot` text NOT NULL,
	`component_snapshot_json` text DEFAULT '[]' NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price_kzt` integer NOT NULL,
	`discount_kzt` integer DEFAULT 0 NOT NULL,
	`line_total_kzt` integer NOT NULL,
	`pricing_version` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "order_items_quantity_positive_check" CHECK("order_items"."quantity" > 0),
	CONSTRAINT "order_items_totals_nonnegative_check" CHECK("order_items"."unit_price_kzt" >= 0 and "order_items"."discount_kzt" >= 0 and "order_items"."line_total_kzt" >= 0)
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_items_variant_sku_idx` ON `order_items` (`variant_sku`);--> statement-breakpoint
CREATE TABLE `order_status_history` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`reason` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "order_status_history_actor_check" CHECK("order_status_history"."actor_type" in ('customer', 'admin', 'provider', 'system'))
);
--> statement-breakpoint
CREATE INDEX `order_status_history_order_created_idx` ON `order_status_history` (`order_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`public_token` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`payload_hash` text NOT NULL,
	`customer_name` text NOT NULL,
	`customer_phone` text NOT NULL,
	`customer_city` text NOT NULL,
	`customer_comment` text DEFAULT '' NOT NULL,
	`fulfilment_method` text NOT NULL,
	`payment_method` text NOT NULL,
	`subtotal_kzt` integer NOT NULL,
	`discount_kzt` integer DEFAULT 0 NOT NULL,
	`total_kzt` integer NOT NULL,
	`currency` text DEFAULT 'KZT' NOT NULL,
	`status` text NOT NULL,
	`is_test` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "orders_totals_nonnegative_check" CHECK("orders"."subtotal_kzt" >= 0 and "orders"."discount_kzt" >= 0 and "orders"."total_kzt" >= 0),
	CONSTRAINT "orders_currency_check" CHECK("orders"."currency" = 'KZT'),
	CONSTRAINT "orders_status_check" CHECK("orders"."status" in ('draft', 'pending_contact', 'awaiting_payment', 'payment_reported', 'paid', 'processing', 'completed', 'cancelled', 'expired'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_public_token_unique` ON `orders` (`public_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_idempotency_key_unique` ON `orders` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `orders_status_created_idx` ON `orders` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`method` text NOT NULL,
	`status` text NOT NULL,
	`amount_kzt` integer NOT NULL,
	`reported_at` text,
	`verified_at` text,
	`reference` text,
	`receipt_metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "payments_amount_nonnegative_check" CHECK("payments"."amount_kzt" >= 0),
	CONSTRAINT "payments_status_check" CHECK("payments"."status" in ('awaiting_payment', 'payment_reported', 'paid', 'cancelled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_order_unique` ON `payments` (`order_id`);--> statement-breakpoint
CREATE INDEX `payments_status_idx` ON `payments` (`status`);--> statement-breakpoint
CREATE TABLE `stock_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`variant_sku` text NOT NULL,
	`quantity` integer NOT NULL,
	`status` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "stock_reservations_quantity_positive_check" CHECK("stock_reservations"."quantity" > 0),
	CONSTRAINT "stock_reservations_status_check" CHECK("stock_reservations"."status" in ('reserved', 'confirmed', 'released', 'expired'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_reservations_order_variant_unique` ON `stock_reservations` (`order_id`,`variant_id`);--> statement-breakpoint
CREATE INDEX `stock_reservations_status_expiry_idx` ON `stock_reservations` (`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `stock_reservations_variant_idx` ON `stock_reservations` (`variant_id`);--> statement-breakpoint
ALTER TABLE `product_pricing` ADD `pricing_version` integer DEFAULT 1 NOT NULL;
