CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`short_name` text,
	`sku` text NOT NULL,
	`slug` text NOT NULL,
	`category` text NOT NULL,
	`brand` text,
	`main_photo_url` text NOT NULL,
	`gallery_json` text DEFAULT '[]' NOT NULL,
	`description` text NOT NULL,
	`admin_note` text,
	`features_json` text DEFAULT '[]' NOT NULL,
	`bundle_json` text DEFAULT '[]' NOT NULL,
	`specifications_json` text DEFAULT '{}' NOT NULL,
	`target_audience` text,
	`seo_title` text,
	`seo_description` text,
	`supplier_name` text,
	`supplier_product_url` text,
	`supplier_sku` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `products_status_check` CHECK (`products`.`status` in ('active', 'archived'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_sku_unique` ON `products` (`sku`);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);
--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category`);
--> statement-breakpoint
CREATE INDEX `products_status_idx` ON `products` (`status`);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`sku` text NOT NULL,
	`barcode` text,
	`color_name` text,
	`color_hex` text,
	`secondary_color_hex` text,
	`size` text,
	`photo_url` text NOT NULL,
	`gallery_json` text DEFAULT '[]' NOT NULL,
	`stock_quantity` integer DEFAULT 0 NOT NULL,
	`reserved_quantity` integer DEFAULT 0 NOT NULL,
	`reorder_point` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `product_variants_stock_nonnegative_check` CHECK (`product_variants`.`stock_quantity` >= 0),
	CONSTRAINT `product_variants_reserved_nonnegative_check` CHECK (`product_variants`.`reserved_quantity` >= 0),
	CONSTRAINT `product_variants_reserved_not_above_stock_check` CHECK (`product_variants`.`reserved_quantity` <= `product_variants`.`stock_quantity`),
	CONSTRAINT `product_variants_reorder_point_nonnegative_check` CHECK (`product_variants`.`reorder_point` >= 0),
	CONSTRAINT `product_variants_status_check` CHECK (`product_variants`.`status` in ('active', 'hidden', 'out_of_stock', 'discontinued'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_sku_unique` ON `product_variants` (`sku`);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_barcode_unique` ON `product_variants` (`barcode`) WHERE `product_variants`.`barcode` is not null;
--> statement-breakpoint
CREATE INDEX `product_variants_product_idx` ON `product_variants` (`product_id`);
--> statement-breakpoint
CREATE INDEX `product_variants_status_idx` ON `product_variants` (`status`);
--> statement-breakpoint
CREATE TABLE `product_pricing` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text,
	`purchase_currency` text DEFAULT 'KZT' NOT NULL,
	`purchase_price` real DEFAULT 0 NOT NULL,
	`currency_rate` real DEFAULT 1 NOT NULL,
	`purchase_price_kzt` integer DEFAULT 0 NOT NULL,
	`china_delivery_kzt` integer DEFAULT 0 NOT NULL,
	`cargo_kzt` integer DEFAULT 0 NOT NULL,
	`customs_kzt` integer DEFAULT 0 NOT NULL,
	`packaging_kzt` integer DEFAULT 0 NOT NULL,
	`setup_kzt` integer DEFAULT 0 NOT NULL,
	`marketing_kzt` integer DEFAULT 0 NOT NULL,
	`other_costs_kzt` integer DEFAULT 0 NOT NULL,
	`fixed_cost_kzt` integer DEFAULT 0 NOT NULL,
	`tax_percent` real DEFAULT 0 NOT NULL,
	`bank_installment_percent` real DEFAULT 0 NOT NULL,
	`installment_months` integer DEFAULT 0 NOT NULL,
	`seller_percent` real DEFAULT 0 NOT NULL,
	`target_profit_percent` real DEFAULT 0 NOT NULL,
	`pricing_mode` text DEFAULT 'auto' NOT NULL,
	`recommended_price_kzt` integer DEFAULT 0 NOT NULL,
	`manual_price_kzt` integer,
	`final_price_kzt` integer DEFAULT 0 NOT NULL,
	`tax_amount_kzt` integer DEFAULT 0 NOT NULL,
	`bank_amount_kzt` integer DEFAULT 0 NOT NULL,
	`seller_amount_kzt` integer DEFAULT 0 NOT NULL,
	`net_revenue_kzt` integer DEFAULT 0 NOT NULL,
	`profit_kzt` integer DEFAULT 0 NOT NULL,
	`margin_percent` real DEFAULT 0 NOT NULL,
	`markup_on_cost_percent` real DEFAULT 0 NOT NULL,
	`calculated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `product_pricing_currency_check` CHECK (`product_pricing`.`purchase_currency` in ('CNY', 'USD', 'KZT')),
	CONSTRAINT `product_pricing_mode_check` CHECK (`product_pricing`.`pricing_mode` in ('auto', 'manual')),
	CONSTRAINT `product_pricing_purchase_nonnegative_check` CHECK (`product_pricing`.`purchase_price` >= 0 and `product_pricing`.`currency_rate` > 0),
	CONSTRAINT `product_pricing_fixed_costs_nonnegative_check` CHECK (`product_pricing`.`purchase_price_kzt` >= 0 and `product_pricing`.`china_delivery_kzt` >= 0 and `product_pricing`.`cargo_kzt` >= 0 and `product_pricing`.`customs_kzt` >= 0 and `product_pricing`.`packaging_kzt` >= 0 and `product_pricing`.`setup_kzt` >= 0 and `product_pricing`.`marketing_kzt` >= 0 and `product_pricing`.`other_costs_kzt` >= 0 and `product_pricing`.`fixed_cost_kzt` >= 0),
	CONSTRAINT `product_pricing_percentages_check` CHECK (`product_pricing`.`tax_percent` >= 0 and `product_pricing`.`bank_installment_percent` >= 0 and `product_pricing`.`seller_percent` >= 0 and `product_pricing`.`target_profit_percent` >= 0),
	CONSTRAINT `product_pricing_variable_percent_total_check` CHECK (`product_pricing`.`tax_percent` + `product_pricing`.`bank_installment_percent` + `product_pricing`.`seller_percent` < 100),
	CONSTRAINT `product_pricing_installment_months_nonnegative_check` CHECK (`product_pricing`.`installment_months` >= 0),
	CONSTRAINT `product_pricing_prices_nonnegative_check` CHECK (`product_pricing`.`recommended_price_kzt` >= 0 and (`product_pricing`.`manual_price_kzt` is null or `product_pricing`.`manual_price_kzt` >= 0) and `product_pricing`.`final_price_kzt` >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_pricing_product_default_unique` ON `product_pricing` (`product_id`) WHERE `product_pricing`.`variant_id` is null;
--> statement-breakpoint
CREATE UNIQUE INDEX `product_pricing_variant_unique` ON `product_pricing` (`variant_id`) WHERE `product_pricing`.`variant_id` is not null;
--> statement-breakpoint
CREATE INDEX `product_pricing_product_idx` ON `product_pricing` (`product_id`);
--> statement-breakpoint
CREATE TABLE `product_publications` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`storefront_visible` integer DEFAULT 0 NOT NULL,
	`installment_enabled` integer DEFAULT 0 NOT NULL,
	`show_when_out_of_stock` integer DEFAULT 1 NOT NULL,
	`reviewed_by` text,
	`approved_by` text,
	`hidden_reason` text,
	`published_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `product_publications_status_check` CHECK (`product_publications`.`status` in ('draft', 'review', 'published', 'hidden', 'out_of_stock', 'archived')),
	CONSTRAINT `product_publications_visibility_check` CHECK (`product_publications`.`status` = 'published' or `product_publications`.`storefront_visible` = 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_publications_product_unique` ON `product_publications` (`product_id`);
--> statement-breakpoint
CREATE INDEX `product_publications_status_idx` ON `product_publications` (`status`);
--> statement-breakpoint
CREATE TABLE `crm_sync_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text,
	`event` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`idempotency_key` text NOT NULL,
	`external_product_id` text,
	`external_variant_id` text,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`payload_json` text NOT NULL,
	`response_json` text,
	`error_message` text,
	`next_retry_at` text,
	`synced_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT `crm_sync_logs_event_check` CHECK (`crm_sync_logs`.`event` in ('product_approved', 'product_updated', 'stock_updated', 'price_updated', 'product_archived')),
	CONSTRAINT `crm_sync_logs_status_check` CHECK (`crm_sync_logs`.`status` in ('pending', 'processing', 'succeeded', 'failed')),
	CONSTRAINT `crm_sync_logs_attempt_count_nonnegative_check` CHECK (`crm_sync_logs`.`attempt_count` >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm_sync_logs_idempotency_key_unique` ON `crm_sync_logs` (`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `crm_sync_logs_product_idx` ON `crm_sync_logs` (`product_id`);
--> statement-breakpoint
CREATE INDEX `crm_sync_logs_status_retry_idx` ON `crm_sync_logs` (`status`,`next_retry_at`);
