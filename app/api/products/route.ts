import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  crmSyncLogs,
  productPricing,
  productPublications,
  products,
  productVariants,
  PURCHASE_CURRENCIES,
} from "../../../db/schema";
import { calculateProductPricing } from "../../../lib/product-pricing";

export const dynamic = "force-dynamic";

type ProductPayload = {
  productId?: string;
  variantId?: string;
  name?: string;
  sku?: string;
  category?: string;
  photoUrl?: string;
  description?: string;
  features?: string[];
  targetAudience?: string;
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

async function readCatalog(includeDrafts: boolean) {
  const db = getDb();
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

  if (!ids.length) {
    return [];
  }

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
    const toAdminPricing = (pricing: typeof firstPricing) =>
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
      shortName: product.shortName ?? product.name,
      category: product.category,
      image: product.mainPhotoUrl,
      quantity: variants.reduce(
        (sum, variant) =>
          sum + variant.stockQuantity - variant.reservedQuantity,
        0,
      ),
      variants: variants.length,
      sku: product.sku,
      badge: product.targetAudience ?? undefined,
      description: product.description,
      features: parseStringArray(product.featuresJson),
      price: publicPrice,
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

export async function GET(request: Request) {
  try {
    const includeDrafts = new URL(request.url).searchParams.get("scope") === "all";
    return Response.json({ products: await readCatalog(includeDrafts) });
  } catch (error) {
    return Response.json({ error: routeError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ProductPayload;
    const name = clean(payload.name);
    const sku = clean(payload.sku).toUpperCase();
    const category = clean(payload.category);
    const photoUrl = clean(payload.photoUrl);
    const description = clean(payload.description);
    const variantName = clean(payload.variant?.name);
    const variantSku = clean(payload.variant?.sku).toUpperCase();

    if (!name || !sku || !category || !photoUrl || !description) {
      return Response.json(
        { error: "Заполните название, SKU, категорию, фото и описание." },
        { status: 400 },
      );
    }
    if (!variantName || !variantSku) {
      return Response.json(
        { error: "Укажите название и SKU варианта." },
        { status: 400 },
      );
    }

    const purchaseCurrency = PURCHASE_CURRENCIES.includes(
      payload.pricing?.purchaseCurrency as (typeof PURCHASE_CURRENCIES)[number],
    )
      ? (payload.pricing?.purchaseCurrency as (typeof PURCHASE_CURRENCIES)[number])
      : "KZT";
    const pricingMode = payload.pricing?.pricingMode === "manual" ? "manual" : "auto";
    const pricingInput = {
      purchasePrice: nonnegative(payload.pricing?.purchasePrice),
      currencyRate: Math.max(0.000001, numberOrZero(payload.pricing?.currencyRate)),
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

    const db = getDb();
    const existingProduct = payload.productId
      ? (
          await db
            .select()
            .from(products)
            .where(eq(products.id, payload.productId))
            .limit(1)
        )[0]
      : (
          await db
            .select()
            .from(products)
            .where(eq(products.sku, sku))
            .limit(1)
        )[0];
    const productId = existingProduct?.id ?? crypto.randomUUID();
    const existingVariant = payload.variantId
      ? (
          await db
            .select()
            .from(productVariants)
            .where(eq(productVariants.id, payload.variantId))
            .limit(1)
        )[0]
      : (
          await db
            .select()
            .from(productVariants)
            .where(eq(productVariants.sku, variantSku))
            .limit(1)
        )[0];
    const variantId = existingVariant?.id ?? crypto.randomUUID();
    if (existingVariant && existingVariant.productId !== productId) {
      return Response.json(
        { error: "Выбранный вариант относится к другой карточке товара." },
        { status: 400 },
      );
    }
    const existingPricing = (
      await db
        .select()
        .from(productPricing)
        .where(eq(productPricing.variantId, variantId))
        .limit(1)
    )[0];
    const existingPublication = (
      await db
        .select()
        .from(productPublications)
        .where(eq(productPublications.productId, productId))
        .limit(1)
    )[0];
    const now = new Date().toISOString();
    const publish = Boolean(payload.publish);

    const productStatement = existingProduct
      ? db
          .update(products)
          .set({
            name,
            shortName: name,
            sku,
            slug: slugFromSku(sku) || productId,
            category,
            mainPhotoUrl: photoUrl,
            description,
            featuresJson: JSON.stringify(payload.features ?? []),
            targetAudience: clean(payload.targetAudience) || null,
            seoTitle: name,
            seoDescription: description.slice(0, 160),
            updatedAt: now,
          })
          .where(eq(products.id, productId))
      : db.insert(products).values({
          id: productId,
          name,
          shortName: name,
          sku,
          slug: slugFromSku(sku) || productId,
          category,
          mainPhotoUrl: photoUrl,
          description,
          featuresJson: JSON.stringify(payload.features ?? []),
          targetAudience: clean(payload.targetAudience) || null,
          seoTitle: name,
          seoDescription: description.slice(0, 160),
        });
    const variantValues = {
      productId,
      name: variantName,
      sku: variantSku,
      barcode: clean(payload.variant?.barcode) || null,
      colorName: clean(payload.variant?.colorName) || null,
      colorHex: clean(payload.variant?.colorHex) || null,
      secondaryColorHex: clean(payload.variant?.secondaryColorHex) || null,
      size: clean(payload.variant?.size) || null,
      photoUrl,
      stockQuantity: integerOrZero(payload.variant?.stockQuantity),
      status: "active" as const,
      updatedAt: now,
    };
    const variantStatement = existingVariant
      ? db
          .update(productVariants)
          .set(variantValues)
          .where(eq(productVariants.id, variantId))
      : db.insert(productVariants).values({ id: variantId, ...variantValues });
    const pricingValues = {
      productId,
      variantId,
      purchaseCurrency,
      purchasePrice: pricingInput.purchasePrice,
      currencyRate: pricingInput.currencyRate,
      purchasePriceKzt: money(calculation.purchasePriceKzt),
      chinaDeliveryKzt: money(pricingInput.chinaDeliveryKzt),
      cargoKzt: money(pricingInput.cargoKzt),
      customsKzt: money(pricingInput.customsKzt),
      packagingKzt: money(pricingInput.packagingKzt),
      setupKzt: money(pricingInput.setupKzt),
      marketingKzt: money(pricingInput.marketingKzt),
      otherCostsKzt: money(pricingInput.otherCostsKzt),
      fixedCostKzt: money(calculation.fixedCostKzt),
      taxPercent: pricingInput.taxPercent,
      bankInstallmentPercent: pricingInput.bankInstallmentPercent,
      installmentMonths: integerOrZero(payload.pricing?.installmentMonths),
      sellerPercent: pricingInput.sellerPercent,
      targetProfitPercent: pricingInput.targetProfitPercent,
      pricingMode,
      recommendedPriceKzt: money(calculation.recommendedPriceKzt),
      manualPriceKzt:
        pricingMode === "manual" ? money(calculation.finalPriceKzt) : null,
      finalPriceKzt: money(calculation.finalPriceKzt),
      taxAmountKzt: money(calculation.taxAmountKzt),
      bankAmountKzt: money(calculation.bankAmountKzt),
      sellerAmountKzt: money(calculation.sellerAmountKzt),
      netRevenueKzt: money(calculation.netRevenueKzt),
      profitKzt: money(calculation.profitKzt),
      marginPercent: calculation.marginPercent,
      markupOnCostPercent: calculation.markupOnCostPercent,
      calculatedAt: now,
      updatedAt: now,
    };
    const pricingStatement = existingPricing
      ? db
          .update(productPricing)
          .set(pricingValues)
          .where(eq(productPricing.id, existingPricing.id))
      : db
          .insert(productPricing)
          .values({ id: crypto.randomUUID(), ...pricingValues });
    const publicationValues = {
      status: publish ? ("published" as const) : ("draft" as const),
      storefrontVisible: publish,
      installmentEnabled:
        integerOrZero(payload.pricing?.installmentMonths) > 0 &&
        pricingInput.bankInstallmentPercent > 0,
      publishedAt: publish ? now : existingPublication?.publishedAt ?? null,
      updatedAt: now,
    };
    const publicationStatement = existingPublication
      ? db
          .update(productPublications)
          .set(publicationValues)
          .where(eq(productPublications.id, existingPublication.id))
      : db.insert(productPublications).values({
          id: crypto.randomUUID(),
          productId,
          ...publicationValues,
        });

    if (publish) {
      await db.batch([
        productStatement,
        variantStatement,
        pricingStatement,
        publicationStatement,
        db.insert(crmSyncLogs).values({
          id: crypto.randomUUID(),
          productId,
          variantId,
          event: "product_approved",
          idempotencyKey: `${productId}:approved:${Date.now()}`,
          payloadJson: JSON.stringify({
            source: "Maestro Admin",
            productId,
            variantId,
            sku,
            variantSku,
            priceKzt: money(calculation.finalPriceKzt),
            stockQuantity: integerOrZero(payload.variant?.stockQuantity),
          }),
        }),
      ]);
    } else {
      await db.batch([
        productStatement,
        variantStatement,
        pricingStatement,
        publicationStatement,
      ]);
    }

    const savedProducts = await readCatalog(true);
    const savedProduct = savedProducts.find((product) => product.id === productId);
    return Response.json({ product: savedProduct }, { status: existingProduct ? 200 : 201 });
  } catch (error) {
    return Response.json({ error: routeError(error) }, { status: 500 });
  }
}
