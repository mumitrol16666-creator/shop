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

  const inventoryComponents = [...new Set([
    ...bundle.componentSkus,
    ...line.componentSkus,
  ])]
    .map((sku) => product.componentDefinitions.find((component) => component.sku === sku))
    .filter((component) => component?.inventoryTracked === true);
  const unresolvedInventoryComponents = inventoryComponents.filter(
    (component) => !component?.linkedVariantId || !component.linkedVariantSku,
  );
  const requirementMap = new Map<string, {
    variantId: string;
    variantSku: string;
    title: string;
    quantityPerUnit: number;
    availableQuantity: number;
  }>();
  const addRequirement = (requirement: {
    variantId: string;
    variantSku: string;
    title: string;
    quantityPerUnit: number;
    availableQuantity: number;
  }) => {
    const current = requirementMap.get(requirement.variantId);
    if (current) current.quantityPerUnit += requirement.quantityPerUnit;
    else requirementMap.set(requirement.variantId, requirement);
  };
  addRequirement({
    variantId: variant.id,
    variantSku: variant.sku,
    title: product.name,
    quantityPerUnit: 1,
    availableQuantity: variant.availableQuantity,
  });
  for (const component of inventoryComponents) {
    if (!component?.linkedVariantId || !component.linkedVariantSku) continue;
    addRequirement({
      variantId: component.linkedVariantId,
      variantSku: component.linkedVariantSku,
      title: component.title,
      quantityPerUnit: Math.max(1, Math.floor(component.quantity || 1)),
      availableQuantity: Math.max(0, component.availableQuantity ?? 0),
    });
  }
  const inventoryRequirements = [...requirementMap.values()];

  const stockErrors: CommerceErrorShape[] = [];
  for (const component of unresolvedInventoryComponents) {
    stockErrors.push({
      code: "INSUFFICIENT_STOCK",
      message: `Комплектующая «${component?.title || "товар"}» больше не связана со складом.`,
      recoverable: true,
      lineId: line.lineId,
      details: { componentSku: component?.sku, availableQuantity: 0 },
    });
  }
  for (const requirement of inventoryRequirements) {
    const requested = line.quantity * requirement.quantityPerUnit;
    if (requirement.availableQuantity <= 0) {
      stockErrors.push({
        code: requirement.variantSku === variant.sku ? "VARIANT_OUT_OF_STOCK" : "INSUFFICIENT_STOCK",
        message: requirement.variantSku === variant.sku
          ? "Этот вариант закончился."
          : `Комплектующая «${requirement.title}» закончилась.`,
        recoverable: true,
        lineId: line.lineId,
        details: { variantSku: requirement.variantSku, availableQuantity: 0 },
      });
    } else if (requested > requirement.availableQuantity) {
      stockErrors.push({
        code: "INSUFFICIENT_STOCK",
        message: `Для «${requirement.title}» доступно только ${requirement.availableQuantity} шт.`,
        recoverable: true,
        lineId: line.lineId,
        details: {
          variantSku: requirement.variantSku,
          availableQuantity: requirement.availableQuantity,
          requested,
        },
      });
    }
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
    inventoryRequirements,
    quantity: line.quantity,
    availableQuantity: inventoryRequirements.reduce(
      (limit, requirement) => Math.min(
        limit,
        Math.floor(requirement.availableQuantity / requirement.quantityPerUnit),
      ),
      variant.availableQuantity,
    ),
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
