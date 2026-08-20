import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const PRODUCT_STATUSES = ["active", "archived"] as const;
export const VARIANT_STATUSES = [
  "active",
  "hidden",
  "out_of_stock",
  "discontinued",
] as const;
export const PURCHASE_CURRENCIES = ["CNY", "USD", "KZT"] as const;
export const PRICING_MODES = ["auto", "manual"] as const;
export const PUBLICATION_STATUSES = [
  "draft",
  "review",
  "published",
  "hidden",
  "out_of_stock",
  "archived",
] as const;
export const CRM_SYNC_EVENTS = [
  "product_approved",
  "product_updated",
  "stock_updated",
  "price_updated",
  "product_archived",
] as const;
export const CRM_SYNC_STATUSES = [
  "pending",
  "processing",
  "succeeded",
  "failed",
] as const;

export const courseRecords = sqliteTable(
  "course_records",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    dataJson: text("data_json").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("course_records_slug_unique").on(table.slug)],
);

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    shortName: text("short_name"),
    sku: text("sku").notNull(),
    slug: text("slug").notNull(),
    category: text("category").notNull(),
    brand: text("brand"),
    mainPhotoUrl: text("main_photo_url").notNull(),
    galleryJson: text("gallery_json").notNull().default("[]"),
    description: text("description").notNull(),
    adminNote: text("admin_note"),
    featuresJson: text("features_json").notNull().default("[]"),
    bundleJson: text("bundle_json").notNull().default("[]"),
    specificationsJson: text("specifications_json").notNull().default("{}"),
    targetAudience: text("target_audience"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    supplierName: text("supplier_name"),
    supplierProductUrl: text("supplier_product_url"),
    supplierSku: text("supplier_sku"),
    status: text("status", { enum: PRODUCT_STATUSES })
      .notNull()
      .default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("products_sku_unique").on(table.sku),
    uniqueIndex("products_slug_unique").on(table.slug),
    index("products_category_idx").on(table.category),
    index("products_status_idx").on(table.status),
    check(
      "products_status_check",
      sql`${table.status} in ('active', 'archived')`,
    ),
  ],
);

export const productVariants = sqliteTable(
  "product_variants",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sku: text("sku").notNull(),
    barcode: text("barcode"),
    colorName: text("color_name"),
    colorHex: text("color_hex"),
    secondaryColorHex: text("secondary_color_hex"),
    size: text("size"),
    photoUrl: text("photo_url").notNull(),
    galleryJson: text("gallery_json").notNull().default("[]"),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    reservedQuantity: integer("reserved_quantity").notNull().default(0),
    reorderPoint: integer("reorder_point").notNull().default(0),
    status: text("status", { enum: VARIANT_STATUSES })
      .notNull()
      .default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("product_variants_sku_unique").on(table.sku),
    uniqueIndex("product_variants_barcode_unique")
      .on(table.barcode)
      .where(sql`${table.barcode} is not null`),
    index("product_variants_product_idx").on(table.productId),
    index("product_variants_status_idx").on(table.status),
    check(
      "product_variants_stock_nonnegative_check",
      sql`${table.stockQuantity} >= 0`,
    ),
    check(
      "product_variants_reserved_nonnegative_check",
      sql`${table.reservedQuantity} >= 0`,
    ),
    check(
      "product_variants_reserved_not_above_stock_check",
      sql`${table.reservedQuantity} <= ${table.stockQuantity}`,
    ),
    check(
      "product_variants_reorder_point_nonnegative_check",
      sql`${table.reorderPoint} >= 0`,
    ),
    check(
      "product_variants_status_check",
      sql`${table.status} in ('active', 'hidden', 'out_of_stock', 'discontinued')`,
    ),
  ],
);

export const productPricing = sqliteTable(
  "product_pricing",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: text("variant_id").references(() => productVariants.id, {
      onDelete: "cascade",
    }),
    purchaseCurrency: text("purchase_currency", {
      enum: PURCHASE_CURRENCIES,
    })
      .notNull()
      .default("KZT"),
    purchasePrice: real("purchase_price").notNull().default(0),
    currencyRate: real("currency_rate").notNull().default(1),
    purchasePriceKzt: integer("purchase_price_kzt").notNull().default(0),
    chinaDeliveryKzt: integer("china_delivery_kzt").notNull().default(0),
    cargoKzt: integer("cargo_kzt").notNull().default(0),
    customsKzt: integer("customs_kzt").notNull().default(0),
    packagingKzt: integer("packaging_kzt").notNull().default(0),
    setupKzt: integer("setup_kzt").notNull().default(0),
    marketingKzt: integer("marketing_kzt").notNull().default(0),
    otherCostsKzt: integer("other_costs_kzt").notNull().default(0),
    fixedCostKzt: integer("fixed_cost_kzt").notNull().default(0),
    taxPercent: real("tax_percent").notNull().default(0),
    bankInstallmentPercent: real("bank_installment_percent")
      .notNull()
      .default(0),
    installmentMonths: integer("installment_months").notNull().default(0),
    sellerPercent: real("seller_percent").notNull().default(0),
    targetProfitPercent: real("target_profit_percent").notNull().default(0),
    pricingMode: text("pricing_mode", { enum: PRICING_MODES })
      .notNull()
      .default("auto"),
    recommendedPriceKzt: integer("recommended_price_kzt").notNull().default(0),
    manualPriceKzt: integer("manual_price_kzt"),
    finalPriceKzt: integer("final_price_kzt").notNull().default(0),
    taxAmountKzt: integer("tax_amount_kzt").notNull().default(0),
    bankAmountKzt: integer("bank_amount_kzt").notNull().default(0),
    sellerAmountKzt: integer("seller_amount_kzt").notNull().default(0),
    netRevenueKzt: integer("net_revenue_kzt").notNull().default(0),
    profitKzt: integer("profit_kzt").notNull().default(0),
    marginPercent: real("margin_percent").notNull().default(0),
    markupOnCostPercent: real("markup_on_cost_percent").notNull().default(0),
    calculatedAt: text("calculated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("product_pricing_product_default_unique")
      .on(table.productId)
      .where(sql`${table.variantId} is null`),
    uniqueIndex("product_pricing_variant_unique")
      .on(table.variantId)
      .where(sql`${table.variantId} is not null`),
    index("product_pricing_product_idx").on(table.productId),
    check(
      "product_pricing_currency_check",
      sql`${table.purchaseCurrency} in ('CNY', 'USD', 'KZT')`,
    ),
    check(
      "product_pricing_mode_check",
      sql`${table.pricingMode} in ('auto', 'manual')`,
    ),
    check(
      "product_pricing_purchase_nonnegative_check",
      sql`${table.purchasePrice} >= 0 and ${table.currencyRate} > 0`,
    ),
    check(
      "product_pricing_fixed_costs_nonnegative_check",
      sql`${table.purchasePriceKzt} >= 0
        and ${table.chinaDeliveryKzt} >= 0
        and ${table.cargoKzt} >= 0
        and ${table.customsKzt} >= 0
        and ${table.packagingKzt} >= 0
        and ${table.setupKzt} >= 0
        and ${table.marketingKzt} >= 0
        and ${table.otherCostsKzt} >= 0
        and ${table.fixedCostKzt} >= 0`,
    ),
    check(
      "product_pricing_percentages_check",
      sql`${table.taxPercent} >= 0
        and ${table.bankInstallmentPercent} >= 0
        and ${table.sellerPercent} >= 0
        and ${table.targetProfitPercent} >= 0`,
    ),
    check(
      "product_pricing_variable_percent_total_check",
      sql`${table.taxPercent} + ${table.bankInstallmentPercent} + ${table.sellerPercent} < 100`,
    ),
    check(
      "product_pricing_installment_months_nonnegative_check",
      sql`${table.installmentMonths} >= 0`,
    ),
    check(
      "product_pricing_prices_nonnegative_check",
      sql`${table.recommendedPriceKzt} >= 0
        and (${table.manualPriceKzt} is null or ${table.manualPriceKzt} >= 0)
        and ${table.finalPriceKzt} >= 0`,
    ),
  ],
);

export const productPublications = sqliteTable(
  "product_publications",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    status: text("status", { enum: PUBLICATION_STATUSES })
      .notNull()
      .default("draft"),
    storefrontVisible: integer("storefront_visible", { mode: "boolean" })
      .notNull()
      .default(false),
    installmentEnabled: integer("installment_enabled", { mode: "boolean" })
      .notNull()
      .default(false),
    showWhenOutOfStock: integer("show_when_out_of_stock", { mode: "boolean" })
      .notNull()
      .default(true),
    reviewedBy: text("reviewed_by"),
    approvedBy: text("approved_by"),
    hiddenReason: text("hidden_reason"),
    publishedAt: text("published_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("product_publications_product_unique").on(table.productId),
    index("product_publications_status_idx").on(table.status),
    check(
      "product_publications_status_check",
      sql`${table.status} in ('draft', 'review', 'published', 'hidden', 'out_of_stock', 'archived')`,
    ),
    check(
      "product_publications_visibility_check",
      sql`${table.status} = 'published' or ${table.storefrontVisible} = 0`,
    ),
  ],
);

export const crmSyncLogs = sqliteTable(
  "crm_sync_logs",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: text("variant_id").references(() => productVariants.id, {
      onDelete: "set null",
    }),
    event: text("event", { enum: CRM_SYNC_EVENTS }).notNull(),
    status: text("status", { enum: CRM_SYNC_STATUSES })
      .notNull()
      .default("pending"),
    idempotencyKey: text("idempotency_key").notNull(),
    externalProductId: text("external_product_id"),
    externalVariantId: text("external_variant_id"),
    attemptCount: integer("attempt_count").notNull().default(0),
    payloadJson: text("payload_json").notNull(),
    responseJson: text("response_json"),
    errorMessage: text("error_message"),
    nextRetryAt: text("next_retry_at"),
    syncedAt: text("synced_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("crm_sync_logs_idempotency_key_unique").on(
      table.idempotencyKey,
    ),
    index("crm_sync_logs_product_idx").on(table.productId),
    index("crm_sync_logs_status_retry_idx").on(
      table.status,
      table.nextRetryAt,
    ),
    check(
      "crm_sync_logs_event_check",
      sql`${table.event} in ('product_approved', 'product_updated', 'stock_updated', 'price_updated', 'product_archived')`,
    ),
    check(
      "crm_sync_logs_status_check",
      sql`${table.status} in ('pending', 'processing', 'succeeded', 'failed')`,
    ),
    check(
      "crm_sync_logs_attempt_count_nonnegative_check",
      sql`${table.attemptCount} >= 0`,
    ),
  ],
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
export type ProductPricing = typeof productPricing.$inferSelect;
export type NewProductPricing = typeof productPricing.$inferInsert;
export type ProductPublication = typeof productPublications.$inferSelect;
export type NewProductPublication = typeof productPublications.$inferInsert;
export type CrmSyncLog = typeof crmSyncLogs.$inferSelect;
export type NewCrmSyncLog = typeof crmSyncLogs.$inferInsert;
export type CourseRecord = typeof courseRecords.$inferSelect;
export type NewCourseRecord = typeof courseRecords.$inferInsert;
