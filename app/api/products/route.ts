import fs from "node:fs";
import path from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import { getD1Binding, getDb } from "../../../db";
import { isAdminRequest } from "../../../lib/admin-auth-server";
import {
  crmSyncLogs,
  productPricing,
  productPublications,
  products,
  productVariants,
  ProductPricing,
  PURCHASE_CURRENCIES,
} from "../../../db/schema";
import { calculateProductPricing } from "../../../lib/product-pricing";
import { products as defaultProducts } from "../../../lib/catalog-data";

export const dynamic = "force-dynamic";

type ProductPayload = {
  productId?: string | number;
  variantId?: string;
  name?: string;
  sku?: string;
  category?: string;
  photoUrl?: string;
  description?: string;
  features?: string[];
  targetAudience?: string;
  attachedCourseId?: string;
  variant?: {
    name?: string;
    sku?: string;
    barcode?: string;
    colorName?: string;
    colorHex?: string;
    secondaryColorHex?: string;
    size?: string;
    stockQuantity?: number;
  };
  variants?: Array<{
    id?: string;
    name: string;
    stock: number;
    color: string;
    sku: string;
    image: string;
    secondary?: string;
    note?: string;
    barcode?: string;
    colorName?: string;
    size?: string;
    price?: number;
  }>;
  pricing?: {
    purchaseCurrency?: string;
    purchasePrice?: number;
    currencyRate?: number;
    chinaDeliveryKzt?: number;
    cargoKzt?: number;
    customsKzt?: number;
    packagingKzt?: number;
    setupKzt?: number;
    marketingKzt?: number;
    otherCostsKzt?: number;
    taxPercent?: number;
    bankInstallmentPercent?: number;
    installmentMonths?: number;
    sellerPercent?: number;
    targetProfitPercent?: number;
    pricingMode?: "auto" | "manual";
    manualPriceKzt?: number | null;
    hasDiscount?: boolean;
    discountPercent?: number;
    originalPriceKzt?: number | null;
  };
  publish?: boolean;
};

const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const numberOrZero = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;
const nonnegative = (value: unknown) => Math.max(0, numberOrZero(value));
const integerOrZero = (value: unknown) =>
  Math.max(0, Math.floor(numberOrZero(value)));
const money = (value: number) => Math.round(value);

const parseStringArray = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};

const slugFromSku = (sku: string) =>
  sku
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function getDataFilePath(): string {
  const p1 = path.join(process.cwd(), "data", "products.json");
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(process.cwd(), "site", "data", "products.json");
  if (fs.existsSync(p2)) return p2;
  return p1;
}

function readLocalProducts(): any[] {
  try {
    const targetFile = getDataFilePath();
    if (fs.existsSync(targetFile)) {
      const data = fs.readFileSync(targetFile, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error("Failed to read local products.json:", err);
  }
  return defaultProducts;
}

function writeLocalProducts(items: any[]) {
  try {
    const targetFile = getDataFilePath();
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    fs.writeFileSync(targetFile, JSON.stringify(items, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to write local products.json:", err);
    return false;
  }
}

function routeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Неизвестная ошибка";
  const cause =
    error instanceof Error && error.cause instanceof Error
      ? error.cause.message
      : "";
  const combined = `${message}\n${cause}`;
  if (combined.includes("no such table")) {
    return "База магазина ещё не подготовлена. Опубликуйте версию с миграцией.";
  }
  if (combined.includes("UNIQUE constraint failed")) {
    return "Такой SKU, штрихкод или адрес товара уже используется.";
  }
  return message;
}

function toPublicProduct<T extends Record<string, any>>(product: T) {
  const {
    adminPricing: _adminPricing,
    supplierName: _supplierName,
    supplierProductUrl: _supplierProductUrl,
    ...safe
  } = product;
  if (Array.isArray(safe.variantItems)) {
    safe.variantItems = safe.variantItems.map((variant: Record<string, any>) => {
      const { adminPricing: _variantPricing, ...publicVariant } = variant;
      return publicVariant;
    });
  }
  return safe;
}

async function readCatalog(includeDrafts: boolean) {
  const db = getDb();
  if (db) {
    try {
      const baseQuery = db
        .select({ product: products, publication: productPublications })
        .from(products)
        .innerJoin(
          productPublications,
          eq(productPublications.productId, products.id),
        );
      const productRows = includeDrafts
        ? await baseQuery
        : await baseQuery.where(
            and(
              eq(productPublications.status, "published"),
              eq(productPublications.storefrontVisible, true),
            ),
          );
      const ids = productRows.map((row) => row.product.id);

      if (ids.length > 0) {
        const [variantRows, pricingRows] = await Promise.all([
          db
            .select()
            .from(productVariants)
            .where(inArray(productVariants.productId, ids)),
          db
            .select()
            .from(productPricing)
            .where(inArray(productPricing.productId, ids)),
        ]);

        return productRows.map(({ product, publication }) => {
          const variants = variantRows
            .filter((variant) => variant.productId === product.id)
            .filter((variant) =>
              includeDrafts
                ? true
                : variant.status === "active" &&
                  variant.stockQuantity > variant.reservedQuantity,
            );
          const prices = pricingRows.filter(
            (pricing) => pricing.productId === product.id,
          );
          const publicPrice = prices.length
            ? Math.min(...prices.map((pricing) => pricing.finalPriceKzt))
            : 0;
          const firstPricing = prices[0] ?? null;
          const toAdminPricing = (pricing: ProductPricing | null | undefined) =>
            pricing
              ? {
                  purchaseCurrency: pricing.purchaseCurrency,
                  purchasePrice: pricing.purchasePrice,
                  currencyRate: pricing.currencyRate,
                  chinaDeliveryKzt: pricing.chinaDeliveryKzt,
                  cargoKzt: pricing.cargoKzt,
                  customsKzt: pricing.customsKzt,
                  packagingKzt: pricing.packagingKzt,
                  setupKzt: pricing.setupKzt,
                  marketingKzt: pricing.marketingKzt,
                  otherCostsKzt: pricing.otherCostsKzt,
                  taxPercent: pricing.taxPercent,
                  bankInstallmentPercent: pricing.bankInstallmentPercent,
                  installmentMonths: pricing.installmentMonths,
                  sellerPercent: pricing.sellerPercent,
                  targetProfitPercent: pricing.targetProfitPercent,
                  pricingMode: pricing.pricingMode,
                  manualPriceKzt: pricing.manualPriceKzt,
                }
              : undefined;

          return {
            id: product.id,
            databaseId: product.id,
            name: product.name,
            shortName: product.shortName,
            category: product.category,
            image: product.mainPhotoUrl,
            quantity: variants.reduce((sum, variant) => sum + variant.stockQuantity, 0),
            variants: variants.length,
            sku: product.sku,
            badge: product.targetAudience ?? undefined,
            description: product.description,
            features: parseStringArray(product.featuresJson),
            price: publicPrice || undefined,
            publicationStatus: publication.status,
            isStored: true,
            variantItems: variants.map((variant) => {
              const variantPricing = prices.find(
                (pricing) => pricing.variantId === variant.id,
              );
              return {
                id: variant.id,
                name: variant.name,
                stock: Math.max(
                  0,
                  variant.stockQuantity - variant.reservedQuantity,
                ),
                color: variant.colorHex ?? "#8a8175",
                secondary: variant.secondaryColorHex ?? undefined,
                colorName: variant.colorName ?? undefined,
                size: variant.size ?? undefined,
                barcode: variant.barcode ?? undefined,
                sku: variant.sku,
                image: variant.photoUrl,
                price: variantPricing?.finalPriceKzt ?? undefined,
                adminPricing: includeDrafts
                  ? toAdminPricing(variantPricing ?? null)
                  : undefined,
              };
            }),
            adminPricing: includeDrafts ? toAdminPricing(firstPricing) : undefined,
          };
        });
      }
    } catch (e) {
      console.warn("DB readCatalog failed, falling back to local file:", e);
    }
  }

  // Fallback to local data/products.json
  const localList = readLocalProducts();
  if (!includeDrafts) {
    return localList.filter(
      (p) =>
        !p.isStored ||
        p.publicationStatus === "published" ||
        !p.publicationStatus,
    ).map(toPublicProduct);
  }
  return localList;
}

export async function GET(request: Request) {
  try {
    const includeDrafts = new URL(request.url).searchParams.get("scope") === "all";
    if (includeDrafts && !(await isAdminRequest(request))) {
      return Response.json({ error: "Требуется вход администратора" }, { status: 401 });
    }
    const catalog = await readCatalog(includeDrafts);
    return Response.json({ products: catalog, count: catalog.length });
  } catch (error) {
    return Response.json({ error: routeError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAdminRequest(request))) {
      return Response.json({ error: "Требуется вход администратора" }, { status: 401 });
    }
    const payload = (await request.json()) as ProductPayload;
    const name = clean(payload.name);
    const sku = clean(payload.sku).toUpperCase();
    const category = clean(payload.category);
    const photoUrl = clean(payload.photoUrl);
    const description = clean(payload.description);
    const variantName = clean(payload.variant?.name) || "Стандарт";
    const variantSku = clean(payload.variant?.sku).toUpperCase() || sku;

    if (!name || !sku || !category || !photoUrl || !description) {
      return Response.json(
        { error: "Заполните название, SKU, категорию, фото и описание." },
        { status: 400 },
      );
    }

    const purchaseCurrency = PURCHASE_CURRENCIES.includes(
      payload.pricing?.purchaseCurrency as (typeof PURCHASE_CURRENCIES)[number],
    )
      ? (payload.pricing?.purchaseCurrency as (typeof PURCHASE_CURRENCIES)[number])
      : "KZT";
    const pricingMode: "auto" | "manual" = payload.pricing?.pricingMode === "manual" ? "manual" : "auto";
    const pricingInput = {
      purchasePrice: nonnegative(payload.pricing?.purchasePrice),
      currencyRate: Math.max(0.000001, numberOrZero(payload.pricing?.currencyRate) || 1),
      chinaDeliveryKzt: nonnegative(payload.pricing?.chinaDeliveryKzt),
      cargoKzt: nonnegative(payload.pricing?.cargoKzt),
      customsKzt: nonnegative(payload.pricing?.customsKzt),
      packagingKzt: nonnegative(payload.pricing?.packagingKzt),
      setupKzt: nonnegative(payload.pricing?.setupKzt),
      marketingKzt: nonnegative(payload.pricing?.marketingKzt),
      otherCostsKzt: nonnegative(payload.pricing?.otherCostsKzt),
      taxPercent: nonnegative(payload.pricing?.taxPercent),
      bankInstallmentPercent: nonnegative(
        payload.pricing?.bankInstallmentPercent,
      ),
      sellerPercent: nonnegative(payload.pricing?.sellerPercent),
      targetProfitPercent: nonnegative(payload.pricing?.targetProfitPercent),
      pricingMode,
      manualPriceKzt: payload.pricing?.manualPriceKzt,
    } as const;

    if (
      pricingInput.taxPercent +
        pricingInput.bankInstallmentPercent +
        pricingInput.sellerPercent >=
      100
    ) {
      return Response.json(
        { error: "Сумма налога, банка и продавца должна быть меньше 100%." },
        { status: 400 },
      );
    }
    const calculation = calculateProductPricing(pricingInput);

    if (calculation.finalPriceKzt <= 0) {
      return Response.json(
        { error: "Итоговая цена должна быть больше нуля." },
        { status: 400 },
      );
    }

    const hasDiscount = Boolean(payload.pricing?.hasDiscount && (payload.pricing?.discountPercent ?? 0) > 0);
    const discountPercent = hasDiscount ? payload.pricing?.discountPercent : undefined;
    const originalPrice = hasDiscount
      ? payload.pricing?.originalPriceKzt || Math.round(calculation.originalPriceKzt)
      : undefined;

    const totalStock = payload.variants && payload.variants.length > 0
      ? payload.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
      : integerOrZero(payload.variant?.stockQuantity) || 1;

    const variantItems = payload.variants && payload.variants.length > 0
      ? payload.variants
      : [
          {
            id: payload.variantId || variantSku,
            name: variantName,
            stock: integerOrZero(payload.variant?.stockQuantity) || 1,
            color: payload.variant?.colorHex || "#8a8175",
            sku: variantSku,
            image: photoUrl,
            price: calculation.finalPriceKzt,
          },
        ];

    const localList = readLocalProducts();
    const targetId = payload.productId ? String(payload.productId) : null;
    let existingIndex = localList.findIndex(
      (p) =>
        (targetId && (String(p.id) === targetId || String(p.databaseId) === targetId)) ||
        (p.sku && p.sku.toLowerCase() === sku.toLowerCase()),
    );

    const productId = targetId || (existingIndex >= 0 ? localList[existingIndex].id : `prod-${Date.now()}`);

    const updatedProduct = {
      ...(existingIndex >= 0 ? localList[existingIndex] : {}),
      id: productId,
      databaseId: productId,
      name,
      shortName: name,
      category,
      image: photoUrl,
      quantity: totalStock,
      variants: variantItems.length,
      sku,
      badge: clean(payload.targetAudience) || undefined,
      description,
      features: payload.features || [],
      attachedCourseId: payload.attachedCourseId || (existingIndex >= 0 ? localList[existingIndex].attachedCourseId : undefined),
      price: calculation.finalPriceKzt,
      originalPrice,
      discountPercent,
      isDiscountActive: hasDiscount,
      publicationStatus: payload.publish ? "published" : "draft",
      isStored: true,
      variantItems,
      adminPricing: {
        purchaseCurrency,
        purchasePrice: pricingInput.purchasePrice,
        currencyRate: pricingInput.currencyRate,
        chinaDeliveryKzt: pricingInput.chinaDeliveryKzt,
        cargoKzt: pricingInput.cargoKzt,
        customsKzt: pricingInput.customsKzt,
        packagingKzt: pricingInput.packagingKzt,
        setupKzt: pricingInput.setupKzt,
        marketingKzt: pricingInput.marketingKzt,
        otherCostsKzt: pricingInput.otherCostsKzt,
        taxPercent: pricingInput.taxPercent,
        bankInstallmentPercent: pricingInput.bankInstallmentPercent,
        installmentMonths: integerOrZero(payload.pricing?.installmentMonths) || 12,
        sellerPercent: pricingInput.sellerPercent,
        targetProfitPercent: pricingInput.targetProfitPercent,
        pricingMode,
        manualPriceKzt: payload.pricing?.manualPriceKzt ?? null,
        hasDiscount,
        discountPercent,
        originalPriceKzt: originalPrice,
      },
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      localList[existingIndex] = updatedProduct;
    } else {
      localList.push(updatedProduct);
    }
    writeLocalProducts(localList);

    // Persist the complete catalog record atomically when D1 is available.
    const d1 = getD1Binding();
    if (d1) {
      try {
        const existingDbProduct = await d1
          .prepare("SELECT id FROM products WHERE sku = ? LIMIT 1")
          .bind(sku)
          .first<{ id: string }>();
        const dbProdId = existingDbProduct?.id ?? String(productId);
        const now = new Date().toISOString();
        const publicationStatus = payload.publish ? "published" : "draft";
        const statements = [
          d1.prepare(`INSERT INTO products (
              id, name, short_name, sku, slug, category, main_photo_url,
              description, features_json, target_audience, seo_title,
              seo_description, status, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
            ON CONFLICT(id) DO UPDATE SET
              name=excluded.name, short_name=excluded.short_name, sku=excluded.sku,
              slug=excluded.slug, category=excluded.category,
              main_photo_url=excluded.main_photo_url, description=excluded.description,
              features_json=excluded.features_json,
              target_audience=excluded.target_audience, seo_title=excluded.seo_title,
              seo_description=excluded.seo_description, status='active', updated_at=excluded.updated_at`)
            .bind(
              dbProdId,
              name,
              name,
              sku,
              slugFromSku(sku) || dbProdId,
              category,
              photoUrl,
              description,
              JSON.stringify(payload.features ?? []),
              clean(payload.targetAudience) || null,
              name,
              description.slice(0, 160),
              now,
            ),
          d1.prepare("DELETE FROM product_pricing WHERE product_id = ?").bind(dbProdId),
          d1.prepare("DELETE FROM product_variants WHERE product_id = ?").bind(dbProdId),
          ...variantItems.map((variant, index) => {
            const variantId = clean(variant.id) || `${dbProdId}-variant-${index + 1}`;
            return d1.prepare(`INSERT INTO product_variants (
                id, product_id, name, sku, barcode, color_name, color_hex,
                secondary_color_hex, size, photo_url, stock_quantity,
                reserved_quantity, reorder_point, status, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'active', ?)`)
              .bind(
                variantId,
                dbProdId,
                clean(variant.name) || `Вариант ${index + 1}`,
                clean(variant.sku).toUpperCase() || `${sku}-${index + 1}`,
                clean(variant.barcode) || null,
                clean(variant.colorName) || null,
                clean(variant.color) || null,
                clean(variant.secondary) || null,
                clean(variant.size) || null,
                clean(variant.image) || photoUrl,
                integerOrZero(variant.stock),
                now,
              );
          }),
          d1.prepare(`INSERT INTO product_pricing (
              id, product_id, variant_id, purchase_currency, purchase_price,
              currency_rate, purchase_price_kzt, china_delivery_kzt, cargo_kzt,
              customs_kzt, packaging_kzt, setup_kzt, marketing_kzt,
              other_costs_kzt, fixed_cost_kzt, tax_percent,
              bank_installment_percent, installment_months, seller_percent,
              target_profit_percent, pricing_mode, recommended_price_kzt,
              manual_price_kzt, final_price_kzt, tax_amount_kzt,
              bank_amount_kzt, seller_amount_kzt, net_revenue_kzt, profit_kzt,
              margin_percent, markup_on_cost_percent, calculated_at, updated_at
            ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .bind(
              `${dbProdId}-pricing`, dbProdId, purchaseCurrency,
              pricingInput.purchasePrice, pricingInput.currencyRate,
              money(calculation.purchasePriceKzt), money(pricingInput.chinaDeliveryKzt),
              money(pricingInput.cargoKzt), money(pricingInput.customsKzt),
              money(pricingInput.packagingKzt), money(pricingInput.setupKzt),
              money(pricingInput.marketingKzt), money(pricingInput.otherCostsKzt),
              money(calculation.fixedCostKzt), pricingInput.taxPercent,
              pricingInput.bankInstallmentPercent,
              integerOrZero(payload.pricing?.installmentMonths) || 12,
              pricingInput.sellerPercent, pricingInput.targetProfitPercent,
              pricingMode, money(calculation.recommendedPriceKzt),
              payload.pricing?.manualPriceKzt ?? null,
              money(calculation.finalPriceKzt), money(calculation.taxAmountKzt),
              money(calculation.bankAmountKzt), money(calculation.sellerAmountKzt),
              money(calculation.netRevenueKzt), money(calculation.profitKzt),
              calculation.marginPercent, calculation.markupOnCostPercent, now, now,
            ),
          d1.prepare(`INSERT INTO product_publications (
              id, product_id, status, storefront_visible, published_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(product_id) DO UPDATE SET
              status=excluded.status, storefront_visible=excluded.storefront_visible,
              published_at=excluded.published_at, updated_at=excluded.updated_at`)
            .bind(
              `${dbProdId}-publication`, dbProdId, publicationStatus,
              payload.publish ? 1 : 0, payload.publish ? now : null, now,
            ),
          d1.prepare(`INSERT INTO crm_sync_logs (
              id, product_id, event, status, idempotency_key, payload_json, created_at, updated_at
            ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)`)
            .bind(
              `sync-${crypto.randomUUID()}`,
              dbProdId,
              payload.publish ? "product_approved" : "product_updated",
              `${dbProdId}:${now}`,
              JSON.stringify({ sku, publicationStatus }),
              now,
              now,
            ),
        ];
        await d1.batch(statements);
      } catch (e) {
        throw new Error("Не удалось сохранить товар в постоянной базе", { cause: e });
      }
    }

    return Response.json({ product: updatedProduct }, { status: 200 });
  } catch (error) {
    return Response.json({ error: routeError(error) }, { status: 500 });
  }
}
