import {
  products as seedProducts,
  variantsFor,
  type Product as LegacyProduct,
} from "../catalog-data";
import {
  STAGE1_SMOKE_PRODUCT_SKU,
  STAGE1_SMOKE_VARIANT_SKU,
} from "./catalog";

type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
};

export type D1BindingLike = {
  prepare: (sql: string) => D1Statement & {
    first: <T = Record<string, unknown>>() => Promise<T | null>;
    all: <T = Record<string, unknown>>() => Promise<{ results?: T[] }>;
    run: () => Promise<{ meta?: { changes?: number } }>;
  };
  batch: (statements: D1Statement[]) => Promise<Array<{ meta?: { changes?: number } }>>;
};

const seedProductId = (sku: string) => `seed-product-${sku.toLowerCase()}`;
const seedVariantId = (sku: string) => `seed-variant-${sku.toLowerCase()}`;

export async function ensureSeedCatalogInD1(d1: D1BindingLike) {
  const now = new Date().toISOString();
  const statements: D1Statement[] = [];

  for (const product of seedProducts) {
    const productId = seedProductId(product.sku);
    const bundleJson = JSON.stringify({
      attachedCourseId: product.attachedCourseId ?? "none",
      allowProPack: product.allowProPack === true,
      proPackTitle: product.proPackTitle,
      proPackPrice: product.proPackPrice,
      allowStringsUpsell: product.allowStringsUpsell === true,
    });
    statements.push(
      d1
        .prepare(`INSERT OR IGNORE INTO products (
          id, name, short_name, sku, slug, category, main_photo_url,
          description, features_json, bundle_json, target_audience,
          seo_title, seo_description, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`)
        .bind(
          productId,
          product.name,
          product.shortName,
          product.sku,
          product.sku.toLowerCase(),
          product.category,
          product.image,
          product.description,
          JSON.stringify(product.features ?? []),
          bundleJson,
          product.badge ?? null,
          product.name,
          product.description.slice(0, 160),
          now,
          now,
        ),
      d1
        .prepare(`INSERT OR IGNORE INTO product_publications (
          id, product_id, status, storefront_visible, installment_enabled,
          show_when_out_of_stock, published_at, created_at, updated_at
        ) VALUES (?, ?, 'published', 1, 1, 1, ?, ?, ?)`)
        .bind(`${productId}-publication`, productId, now, now, now),
    );

    const variants = variantsFor(product);
    const normalizedVariants = variants.length
      ? variants
      : [
          {
            id: `${product.sku}-default`,
            name: "Стандарт",
            sku: product.sku,
            stock: product.quantity,
            color: "#8a8175",
            image: product.image,
            price: product.price,
          },
        ];
    for (const variant of normalizedVariants) {
      const variantId = seedVariantId(variant.sku);
      statements.push(
        d1
          .prepare(`INSERT OR IGNORE INTO product_variants (
            id, product_id, name, sku, color_name, color_hex,
            secondary_color_hex, photo_url, stock_quantity,
            reserved_quantity, reorder_point, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'active', ?, ?)`)
          .bind(
            variantId,
            productId,
            variant.name,
            variant.sku,
            variant.colorName ?? variant.name,
            variant.color,
            variant.secondary ?? null,
            variant.image || product.image,
            Math.max(0, Math.floor(variant.stock || 0)),
            now,
            now,
          ),
        d1
          .prepare(`INSERT OR IGNORE INTO product_pricing (
            id, product_id, variant_id, purchase_currency, purchase_price,
            currency_rate, purchase_price_kzt, fixed_cost_kzt, pricing_mode,
            recommended_price_kzt, final_price_kzt, pricing_version,
            calculated_at, created_at, updated_at
          ) VALUES (?, ?, ?, 'KZT', 0, 1, 0, 0, 'manual', ?, ?, 1, ?, ?, ?)`)
          .bind(
            `${variantId}-pricing`,
            productId,
            variantId,
            Math.max(0, Math.round(variant.price ?? product.price ?? 0)),
            Math.max(0, Math.round(variant.price ?? product.price ?? 0)),
            now,
            now,
            now,
          ),
      );
    }
  }

  statements.push(
    d1
      .prepare(`INSERT OR IGNORE INTO products (
        id, name, short_name, sku, slug, category, main_photo_url,
        description, features_json, bundle_json, status, created_at, updated_at
      ) VALUES ('stage1-smoke-product', 'Stage 1 smoke product', 'Stage 1 smoke', ?,
        'stage1-smoke-product', 'Системный тест', '/products/01_st20_electric.png',
        'Безопасный технический товар', '[]', '{}', 'active', ?, ?)`)
      .bind(STAGE1_SMOKE_PRODUCT_SKU, now, now),
    d1
      .prepare(`INSERT OR IGNORE INTO product_variants (
        id, product_id, name, sku, color_hex, photo_url, stock_quantity,
        reserved_quantity, reorder_point, status, created_at, updated_at
      ) VALUES ('stage1-smoke-variant', 'stage1-smoke-product', 'Тестовый вариант', ?,
        '#111111', '/products/01_st20_electric.png', 1000000, 0, 0, 'active', ?, ?)`)
      .bind(STAGE1_SMOKE_VARIANT_SKU, now, now),
    d1
      .prepare(`INSERT OR IGNORE INTO product_pricing (
        id, product_id, variant_id, purchase_currency, purchase_price,
        currency_rate, purchase_price_kzt, fixed_cost_kzt, pricing_mode,
        recommended_price_kzt, final_price_kzt, pricing_version,
        calculated_at, created_at, updated_at
      ) VALUES ('stage1-smoke-pricing', 'stage1-smoke-product', 'stage1-smoke-variant',
        'KZT', 0, 1, 0, 0, 'manual', 100, 100, 1, ?, ?, ?)`)
      .bind(now, now, now),
    d1
      .prepare(`INSERT OR IGNORE INTO product_publications (
        id, product_id, status, storefront_visible, installment_enabled,
        show_when_out_of_stock, created_at, updated_at
      ) VALUES ('stage1-smoke-publication', 'stage1-smoke-product', 'hidden', 0, 0, 0, ?, ?)`)
      .bind(now, now),
  );

  for (let offset = 0; offset < statements.length; offset += 80) {
    await d1.batch(statements.slice(offset, offset + 80));
  }
}

export const parseBundleMetadata = (
  value: string | null | undefined,
): Partial<LegacyProduct> => {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
};
