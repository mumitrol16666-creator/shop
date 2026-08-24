import {
  COMMERCE_CURRENCY,
  type PriceBreakdown,
  type ProductReadModel,
} from "./types";
import { commerceError } from "./errors";

export const stableHash = (value: unknown) => {
  const source = typeof value === "string" ? value : JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
};

export const roundMoney = (value: number) =>
  Math.max(0, Math.round(Number.isFinite(value) ? value : 0));

export function quoteConfiguration(
  product: ProductReadModel,
  configuration: {
    variantSku: string;
    bundleSku: string;
    componentSkus?: string[];
  },
): PriceBreakdown {
  const variant = product.variants.find(
    (candidate) => candidate.sku === configuration.variantSku,
  );
  if (!variant) {
    throw commerceError("VARIANT_NOT_FOUND", "Вариант товара больше недоступен.", {
      recoverable: true,
      details: { variantSku: configuration.variantSku },
    });
  }

  const bundle = product.bundleDefinitions.find(
    (candidate) => candidate.sku === configuration.bundleSku && candidate.eligible,
  );
  if (!bundle) {
    throw commerceError("INVALID_BUNDLE", "Комплектация недоступна для этого товара.", {
      recoverable: true,
      details: { bundleSku: configuration.bundleSku },
    });
  }

  const selectedComponentSkus = [...new Set(configuration.componentSkus ?? [])].sort();
  const selectedComponents = selectedComponentSkus.map((sku) => {
    const component = product.componentDefinitions.find(
      (candidate) => candidate.sku === sku,
    );
    if (!component) {
      throw commerceError("INVALID_COMPONENT", "Дополнение недоступно для этого товара.", {
        recoverable: true,
        details: { componentSku: sku },
      });
    }
    return component;
  });

  const currentBase = roundMoney(product.defaultPrice.final);
  const undiscountedBase = roundMoney(
    product.defaultPrice.base || product.defaultPrice.final,
  );
  const variantDelta = roundMoney(variant.currentPrice) - currentBase;
  const bundledComponents = [...new Set(bundle.componentSkus)]
    .map((sku) => product.componentDefinitions.find((candidate) => candidate.sku === sku))
    .filter((component): component is NonNullable<typeof component> => Boolean(component));
  const bundledSkus = new Set(bundledComponents.map((component) => component.sku));
  const components = [
    ...(bundle.priceDelta > 0
      ? [{ sku: bundle.sku, title: bundle.title, amount: roundMoney(bundle.priceDelta) }]
      : []),
    ...bundledComponents.map((component) => ({
      sku: component.sku,
      title: component.title,
      amount: 0,
    })),
    ...selectedComponents.filter((component) => !bundledSkus.has(component.sku)).map((component) => ({
      sku: component.sku,
      title: component.title,
      amount: roundMoney(component.price),
    })),
  ];
  const componentTotal = components.reduce((sum, item) => sum + item.amount, 0);
  const discount = Math.max(0, undiscountedBase - currentBase);
  const subtotal = roundMoney(undiscountedBase + variantDelta + componentTotal);
  const final = roundMoney(subtotal - discount);

  return {
    base: undiscountedBase,
    variantDelta,
    components,
    subtotal,
    discount,
    final,
    currency: COMMERCE_CURRENCY,
    pricingVersion: product.pricingVersion,
  };
}

export const catalogVersion = (products: ProductReadModel[]) =>
  `catalog-${stableHash(
    products
      .map((product) => `${product.sku}:${product.pricingVersion}`)
      .sort(),
  )}`;
