import type { Variant, VariantAttribute } from "./catalog-data";
import type { ProductReadModel } from "./commerce/types";

const DEFAULT_ATTRIBUTE_SUGGESTIONS = [
  "Вариант",
  "Цвет",
  "Материал",
  "Совместимость",
  "Модель",
];

const CATEGORY_ATTRIBUTE_SUGGESTIONS: Array<{
  match: RegExp;
  names: string[];
}> = [
  {
    match: /струн/i,
    names: ["Калибр", "Назначение", "Материал", "Натяжение", "Количество струн"],
  },
  {
    match: /аксессуар|каподастр|рем/i,
    names: ["Цвет", "Совместимость", "Материал", "Тип крепления", "Ширина"],
  },
  {
    match: /оборуд|усилител|процессор/i,
    names: ["Мощность", "Версия", "Разъёмы", "Питание", "Цвет"],
  },
  {
    match: /укулеле/i,
    names: ["Размер", "Цвет", "Материал корпуса", "Комплектация"],
  },
  {
    match: /гитар|электр|акуст|классич/i,
    names: ["Цвет", "Размер", "Конфигурация звукоснимателей", "Материал корпуса"],
  },
];

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

export function attributeSuggestionsForCategory(category: string): string[] {
  const specific = CATEGORY_ATTRIBUTE_SUGGESTIONS.find((entry) => entry.match.test(category));
  return [...new Set([...(specific?.names ?? []), ...DEFAULT_ATTRIBUTE_SUGGESTIONS])];
}

export function normalizeVariantAttributes(
  variant: Pick<Variant, "attributes" | "colorName" | "size" | "name">,
): VariantAttribute[] {
  const source = Array.isArray(variant.attributes) && variant.attributes.length
    ? variant.attributes
    : [
        ...(clean(variant.colorName) && clean(variant.colorName) !== "Стандарт"
          ? [{ name: "Цвет", value: clean(variant.colorName) }]
          : []),
        ...(clean(variant.size) ? [{ name: "Размер", value: clean(variant.size) }] : []),
      ];
  const seen = new Set<string>();
  return source.flatMap((attribute) => {
    const name = clean(attribute?.name);
    const value = clean(attribute?.value);
    const key = name.toLocaleLowerCase("ru-RU");
    if (!name || !value || seen.has(key)) return [];
    seen.add(key);
    return [{ name, value }];
  });
}

export function resolveVariantUnitPrice(
  productPrice: number | undefined,
  variant: Pick<Variant, "price" | "priceMode">,
): number {
  const base = Number.isFinite(productPrice) ? Math.max(0, Number(productPrice)) : 0;
  if (variant.priceMode !== "override") return base;
  return Number.isFinite(variant.price) && Number(variant.price) > 0
    ? Math.max(0, Number(variant.price))
    : base;
}

export function variantAttributeSummary(attributes: VariantAttribute[] | undefined): string {
  if (!attributes?.length) return "";
  return attributes
    .filter((attribute) => clean(attribute.name) && clean(attribute.value))
    .map((attribute) => `${clean(attribute.name)}: ${clean(attribute.value)}`)
    .join(" · ");
}

export function productPriceSummary(product: ProductReadModel) {
  const availablePrices = product.variants
    .filter((variant) => variant.status === "active" && variant.availableQuantity > 0)
    .map((variant) => Math.max(0, Math.round(variant.currentPrice)));
  const prices = availablePrices.length
    ? availablePrices
    : [Math.max(0, Math.round(product.defaultPrice.final))];
  return {
    minimum: Math.min(...prices),
    maximum: Math.max(...prices),
    hasRange: new Set(prices).size > 1,
  };
}
