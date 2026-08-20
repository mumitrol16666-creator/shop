import { commerceError, CommerceDomainError } from "./errors";
import { catalogVersion, quoteConfiguration, stableHash } from "./pricing";
import {
  BUNDLE_SKUS,
  CART_SCHEMA_VERSION,
  COMMERCE_CURRENCY,
  type CartDraft,
  type CartDraftLine,
  type CartReconciliation,
  type CommerceErrorShape,
  type ProductReadModel,
  type ReconciledCartLine,
} from "./types";
import { productByIdentifier } from "./catalog";

export const emptyCartDraft = (): CartDraft => ({
  schemaVersion: CART_SCHEMA_VERSION,
  updatedAt: new Date(0).toISOString(),
  lines: [],
});

export const configurationKey = (line: {
  productId: string;
  variantSku?: string;
  bundleSku: string;
  componentSkus?: string[];
}) =>
  [
    line.productId,
    line.variantSku || "variant-unselected",
    line.bundleSku,
    [...new Set(line.componentSkus ?? [])].sort().join(",") || "no-components",
  ].join("::");

export const createCartDraftLine = (input: Omit<CartDraftLine, "lineId">) => ({
  ...input,
  lineId: `line-${stableHash(configurationKey(input))}`,
  componentSkus: [...new Set(input.componentSkus)].sort(),
});

const lineError = (
  lineId: string,
  error: CommerceDomainError,
): CommerceErrorShape => ({ ...error.toJSON(), lineId });

function resolveLine(
  products: ProductReadModel[],
  line: CartDraftLine,
): ReconciledCartLine {
  const product = productByIdentifier(products, {
    productId: line.productId,
    productSku: line.productSku,
  });
  if (!product) {
    throw commerceError("PRODUCT_NOT_FOUND", "Товар удалён или больше не опубликован.", {
      recoverable: true,
      lineId: line.lineId,
    });
  }

  let variantSku = line.variantSku;
  if (!variantSku && product.variants.length === 1) {
    variantSku = product.variants[0]?.sku;
  }
  if (!variantSku && product.selectionRequired) {
    throw commerceError("VARIANT_REQUIRED", "Выберите вариант товара.", {
      recoverable: true,
      lineId: line.lineId,
      field: "variantSku",
    });
  }
  const variant = product.variants.find((candidate) => candidate.sku === variantSku);
  if (!variant) {
    throw commerceError("VARIANT_NOT_FOUND", "Выбранный вариант больше недоступен.", {
      recoverable: true,
      lineId: line.lineId,
      details: { variantSku },
    });
  }
  if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
    throw commerceError("INVALID_REQUEST", "Количество должно быть целым и больше нуля.", {
      recoverable: true,
      lineId: line.lineId,
      field: "quantity",
    });
  }

  const quote = quoteConfiguration(product, {
    variantSku: variant.sku,
    bundleSku: line.bundleSku || BUNDLE_SKUS.base,
    componentSkus: line.componentSkus,
  });
  const bundle = product.bundleDefinitions.find(
    (candidate) => candidate.sku === (line.bundleSku || BUNDLE_SKUS.base),
  );
  if (!bundle) {
    throw commerceError("INVALID_BUNDLE", "Комплектация больше недоступна.", {
      recoverable: true,
      lineId: line.lineId,
    });
  }

  const stockErrors: CommerceErrorShape[] = [];
  if (variant.availableQuantity <= 0) {
    stockErrors.push({
      code: "VARIANT_OUT_OF_STOCK",
      message: "Этот вариант закончился.",
      recoverable: true,
      lineId: line.lineId,
      details: { availableQuantity: 0 },
    });
  } else if (line.quantity > variant.availableQuantity) {
    stockErrors.push({
      code: "INSUFFICIENT_STOCK",
      message: `Доступно только ${variant.availableQuantity} шт.`,
      recoverable: true,
      lineId: line.lineId,
      details: { availableQuantity: variant.availableQuantity },
    });
  }
  const priceChanged = Boolean(
    (line.observedPricingVersion &&
      line.observedPricingVersion !== quote.pricingVersion) ||
      (typeof line.observedFinal === "number" && line.observedFinal !== quote.final),
  );
  const errors = [...stockErrors];
  if (priceChanged) {
    errors.push({
      code: "PRICE_CHANGED",
      message: "Цена изменилась после добавления товара.",
      recoverable: true,
      lineId: line.lineId,
      details: { before: line.observedFinal, after: quote.final },
    });
  }
  const invalid = stockErrors.length > 0;

  return {
    lineId: line.lineId,
    configurationKey: configurationKey({
      productId: product.id,
      variantSku: variant.sku,
      bundleSku: bundle.sku,
      componentSkus: line.componentSkus,
    }),
    productId: product.id,
    productSku: product.sku,
    productTitle: product.name,
    productImage: product.image,
    variantId: variant.id,
    variantSku: variant.sku,
    variantTitle: variant.title,
    variantImage: variant.image,
    bundleSku: bundle.sku,
    bundleTitle: bundle.title,
    componentSkus: [...new Set(line.componentSkus)].sort(),
    componentSnapshot: quote.components,
    quantity: line.quantity,
    availableQuantity: variant.availableQuantity,
    pricing: quote,
    ...(typeof line.observedFinal === "number"
      ? { previousFinal: line.observedFinal }
      : {}),
    priceChanged,
    status: invalid ? "invalid" : priceChanged ? "changed" : "valid",
    errors,
  };
}

export function reconcileCart(
  products: ProductReadModel[],
  draft: CartDraft,
  now = new Date(),
): CartReconciliation {
  if (!draft || draft.schemaVersion !== CART_SCHEMA_VERSION || !Array.isArray(draft.lines)) {
    throw commerceError("CART_INVALID", "Версия корзины больше не поддерживается.", {
      recoverable: true,
      details: { expectedSchemaVersion: CART_SCHEMA_VERSION },
    });
  }

  const lines: ReconciledCartLine[] = [];
  const invalidLines: CartReconciliation["invalidLines"] = [];
  for (const line of draft.lines) {
    try {
      const reconciled = resolveLine(products, line);
      lines.push(reconciled);
      if (reconciled.status === "invalid") {
        invalidLines.push({ lineId: line.lineId, errors: reconciled.errors });
      }
    } catch (error) {
      const domainError =
        error instanceof CommerceDomainError
          ? error
          : commerceError("CART_INVALID", "Строку корзины нельзя восстановить.", {
              recoverable: true,
              lineId: line.lineId,
            });
      invalidLines.push({ lineId: line.lineId, errors: [lineError(line.lineId, domainError)] });
    }
  }

  const validLines = lines.filter((line) => line.status !== "invalid");
  const totals = validLines.reduce(
    (result, line) => {
      result.subtotal += line.pricing.subtotal * line.quantity;
      result.discount += line.pricing.discount * line.quantity;
      result.final += line.pricing.final * line.quantity;
      return result;
    },
    { subtotal: 0, discount: 0, final: 0, currency: COMMERCE_CURRENCY },
  );
  const state = invalidLines.length
    ? "invalid"
    : lines.some((line) => line.status === "changed")
      ? "changed"
      : "ready";

  return {
    schemaVersion: CART_SCHEMA_VERSION,
    catalogVersion: catalogVersion(products),
    state,
    lines,
    invalidLines,
    totals,
    reconciledAt: now.toISOString(),
  };
}
