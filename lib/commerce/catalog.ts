import {
  products as seedProducts,
  type Product as LegacyProduct,
  type Variant as LegacyVariant,
  variantsFor,
} from "../catalog-data";
import { stableHash } from "./pricing";
import { normalizeVariantAttributes, resolveVariantUnitPrice } from "../product-variants";
import { categoryFromSource } from "./categories";
import {
  BUNDLE_SKUS,
  COMMERCE_CURRENCY,
  COMPONENT_SKUS,
  type BundleDefinition,
  type ComponentDefinition,
  type ProductReadModel,
} from "./types";

export const STAGE1_SMOKE_PRODUCT_SKU = "TEST-STAGE1-SMOKE";
export const STAGE1_SMOKE_VARIANT_SKU = "TEST-STAGE1-SMOKE-DEFAULT";

type CatalogBuildOptions = {
  includeDrafts?: boolean;
  reservedByVariantSku?: Record<string, number>;
  confirmedByVariantSku?: Record<string, number>;
};

type LinkedInventory = {
  variantId: string;
  variantSku: string;
  productSku: string;
  availableQuantity: number;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "");

const asMoney = (value: unknown, fallback = 0) => {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.round(number));
};

const mergeCatalogSources = (storedProducts: LegacyProduct[]) => {
  return storedProducts.length ? storedProducts : seedProducts;
};

const variantsForProduct = (product: LegacyProduct): LegacyVariant[] => {
  const explicit = product.variantItems?.length ? product.variantItems : variantsFor(product);
  if (explicit.length) return explicit;
  return [
    {
      id: `${product.sku}-default`,
      name: "Стандарт",
      sku: product.sku,
      stock: Math.max(0, Math.floor(product.quantity || 0)),
      color: "#8a8175",
      image: product.image,
      price: asMoney(product.price),
    },
  ];
};

function bundleDefinitions(
  product: LegacyProduct,
  inventoryByVariantSku: Map<string, LinkedInventory>,
): {
  bundles: BundleDefinition[];
  components: ComponentDefinition[];
} {
  if (product.bundleDefinitions?.length || product.componentDefinitions?.length) {
    const components = (product.componentDefinitions ?? []).map((component) => {
      const linked = component.linkedVariantSku
        ? inventoryByVariantSku.get(component.linkedVariantSku)
        : undefined;
      return {
        ...component,
        price: asMoney(component.price),
        quantity: Math.max(1, Math.floor(component.quantity || 1)),
        inventoryTracked: component.inventoryTracked === true,
        ...(linked
          ? {
              linkedVariantId: linked.variantId,
              linkedVariantSku: linked.variantSku,
              linkedProductSku: component.linkedProductSku || linked.productSku,
              availableQuantity: linked.availableQuantity,
            }
          : component.inventoryTracked
            ? { availableQuantity: 0 }
            : {}),
      };
    });
    const componentBySku = new Map(components.map((component) => [component.sku, component]));
    const configuredBundles = (product.bundleDefinitions ?? []).map((bundle) => ({
      ...bundle,
      componentSkus: [...new Set(bundle.componentSkus ?? [])],
      priceDelta: asMoney(bundle.priceDelta),
      eligible: bundle.eligible !== false && (bundle.componentSkus ?? []).every((sku) => {
        const component = componentBySku.get(sku);
        return !component?.inventoryTracked || (component.availableQuantity ?? 0) >= (component.quantity || 1);
      }),
    }));
    const bundles = configuredBundles.some((bundle) => bundle.sku === BUNDLE_SKUS.base)
      ? configuredBundles
      : [
          {
            id: "base",
            sku: BUNDLE_SKUS.base,
            title: "Базовая комплектация",
            description: "Заводская комплектация",
            componentSkus: [],
            priceDelta: 0,
            eligible: true,
          },
          ...configuredBundles,
        ];
    return { bundles, components };
  }

  const components: ComponentDefinition[] = [];
  const bundles: BundleDefinition[] = [
    {
      id: "base",
      sku: BUNDLE_SKUS.base,
      title: "Базовая комплектация",
      description: "Заводская комплектация",
      componentSkus: [],
      priceDelta: 0,
      eligible: true,
    },
  ];

  if (product.attachedCourseId && product.attachedCourseId !== "none") {
    const courseSku = `COURSE-${product.attachedCourseId.toUpperCase()}`;
    components.push({
      sku: courseSku,
      title: "Онлайн-курс Maestro",
      price: 0,
      kind: "digital",
      inventoryTracked: false,
    });
    bundles.push({
      id: "gift_course",
      sku: BUNDLE_SKUS.giftCourse,
      title: "Товар + курс",
      description: "Онлайн-курс в подарок",
      componentSkus: [courseSku],
      priceDelta: 0,
      eligible: true,
    });
  }

  if (product.allowProPack === true) {
    components.push({
      sku: COMPONENT_SKUS.proPack,
      title: product.proPackTitle || "Чехол + ремень + VIP-доступ",
      price: 0,
      kind: "physical",
      inventoryTracked: false,
    });
    bundles.push({
      id: "pro_pack",
      sku: BUNDLE_SKUS.proPack,
      title: "PRO комплект",
      description: product.proPackTitle || "Чехол + ремень + VIP-доступ",
      componentSkus: [COMPONENT_SKUS.proPack],
      priceDelta: asMoney(product.proPackPrice, 8900),
      eligible: true,
    });
  }

  if (product.allowStringsUpsell === true) {
    components.push(
      {
        sku: COMPONENT_SKUS.elixirStrings,
        title: "Струны Elixir Nanoweb",
        price: 4950,
        kind: "physical",
        inventoryTracked: false,
      },
      {
        sku: COMPONENT_SKUS.daddarioStrings,
        title: "Струны D'Addario Pro",
        price: 2450,
        kind: "physical",
        inventoryTracked: false,
      },
    );
  }

  return { bundles, components };
}

export function buildCatalogReadModels(
  storedProducts: LegacyProduct[] = [],
  options: CatalogBuildOptions = {},
): ProductReadModel[] {
  const reserved = options.reservedByVariantSku ?? {};
  const confirmed = options.confirmedByVariantSku ?? {};
  const sourceProducts = mergeCatalogSources(storedProducts);
  const inventoryByVariantSku = new Map<string, LinkedInventory>();
  for (const sourceProduct of sourceProducts) {
    variantsForProduct(sourceProduct).forEach((variant, index) => {
      const stockQuantity = Math.max(0, Math.floor(variant.stock || 0));
      const availableQuantity = Math.max(
        0,
        stockQuantity - Math.max(0, reserved[variant.sku] ?? 0) - Math.max(0, confirmed[variant.sku] ?? 0),
      );
      inventoryByVariantSku.set(variant.sku, {
        variantId: String(variant.id || `${sourceProduct.sku}-variant-${index + 1}`),
        variantSku: variant.sku,
        productSku: sourceProduct.sku,
        availableQuantity,
      });
    });
  }

  return sourceProducts
    .filter((product) =>
      options.includeDrafts
        ? true
        : !product.publicationStatus || product.publicationStatus === "published",
    )
    .map((product) => {
      const category = categoryFromSource(product.category);
      const currentBasePrice = asMoney(product.price);
      const originalBasePrice =
        product.isDiscountActive && product.originalPrice
          ? Math.max(currentBasePrice, asMoney(product.originalPrice))
          : currentBasePrice;
      const definitions = bundleDefinitions(product, inventoryByVariantSku);
      const variants = variantsForProduct(product).map((variant, index) => {
        const stockQuantity = Math.max(0, Math.floor(variant.stock || 0));
        const held = Math.max(0, reserved[variant.sku] ?? 0);
        const committed = Math.max(0, confirmed[variant.sku] ?? 0);
        const availableQuantity = Math.max(0, stockQuantity - held - committed);
        return {
          id: String(variant.id || `${product.sku}-variant-${index + 1}`),
          sku: variant.sku,
          title: variant.name,
          image: variant.image || product.image,
          color: variant.color,
          secondaryColor: variant.secondary,
          note: variant.note,
          barcode: variant.barcode,
          colorName: variant.colorName,
          size: variant.size,
          attributes: normalizeVariantAttributes(variant),
          priceMode: variant.priceMode === "override" ? "override" as const : "inherit" as const,
          stockQuantity,
          reservedQuantity: held,
          availableQuantity,
          status: availableQuantity > 0 ? ("active" as const) : ("out_of_stock" as const),
          currentPrice: asMoney(resolveVariantUnitPrice(currentBasePrice, variant), currentBasePrice),
        };
      });

      const pricingVersion = `price-${stableHash({
        sku: product.sku,
        updatedAt: product.updatedAt,
        currentBasePrice,
        originalBasePrice,
        variants: variants.map((variant) => [variant.sku, variant.currentPrice]),
        bundles: definitions.bundles.map((bundle) => [bundle.sku, bundle.priceDelta]),
        components: definitions.components.map((component) => [component.sku, component.price]),
      })}`;
      const discount = Math.max(0, originalBasePrice - currentBasePrice);
      const totalAvailable = variants.reduce(
        (sum, variant) => sum + variant.availableQuantity,
        0,
      );
      const model: ProductReadModel = {
        id: String(product.databaseId || product.id || product.sku),
        slug: slugify(product.sku) || slugify(product.name),
        sku: product.sku,
        name: product.name,
        shortName: product.shortName || product.name,
        categoryId: category.id,
        categorySlug: category.slug,
        categoryDisplayName: category.displayName,
        category: category.displayName,
        description: product.description,
        image: product.image,
        features: product.features || [],
        badge: product.badge,
        audioUrl: product.audioUrl,
        publicationStatus: product.publicationStatus,
        attachedCourseId: product.attachedCourseId,
        variants,
        selectionRequired: variants.length > 1,
        bundleDefinitions: definitions.bundles,
        componentDefinitions: definitions.components,
        pricingVersion,
        defaultPrice: {
          base: originalBasePrice,
          variantDelta: 0,
          components: [],
          subtotal: originalBasePrice,
          discount,
          final: currentBasePrice,
          currency: COMMERCE_CURRENCY,
          pricingVersion,
        },
        availability: {
          status: totalAvailable > 0 ? "in_stock" : "out_of_stock",
          totalAvailable,
        },
        searchableAttributes: [
          product.name,
          product.shortName,
          product.sku,
          category.displayName,
          category.slug,
          product.description,
          ...(product.features || []),
          ...variants.flatMap((variant) => [
            variant.title,
            variant.sku,
            ...variant.attributes.flatMap((attribute) => [attribute.name, attribute.value]),
          ]),
        ].filter(Boolean),
      };
      return model;
    });
}

export const productByIdentifier = (
  products: ProductReadModel[],
  identifier: { productId?: string; productSku?: string; slug?: string },
) =>
  products.find(
    (product) =>
      (identifier.productId && product.id === identifier.productId) ||
      (identifier.productSku && product.sku === identifier.productSku) ||
      (identifier.slug && product.slug === identifier.slug),
  );

export const stage1SmokeProduct = (): ProductReadModel => ({
  id: "stage1-smoke-product",
  slug: "stage1-smoke-product",
  sku: STAGE1_SMOKE_PRODUCT_SKU,
  name: "Stage 1 smoke product",
  shortName: "Stage 1 smoke",
  categoryId: "system-test",
  categorySlug: "system-test",
  categoryDisplayName: "Системный тест",
  category: "Системный тест",
  description: "Безопасный технический товар, не отображается в каталоге.",
  image: "/products/01_st20_electric.png",
  features: [],
  publicationStatus: "hidden",
  variants: [
    {
      id: "stage1-smoke-variant",
      sku: STAGE1_SMOKE_VARIANT_SKU,
      title: "Тестовый вариант",
      image: "/products/01_st20_electric.png",
      color: "#111111",
      attributes: [],
      priceMode: "inherit",
      stockQuantity: 1_000_000,
      reservedQuantity: 0,
      availableQuantity: 1_000_000,
      status: "active",
      currentPrice: 100,
    },
  ],
  selectionRequired: false,
  bundleDefinitions: [
    {
      id: "base",
      sku: BUNDLE_SKUS.base,
      title: "Тестовая комплектация",
      description: "Только для production smoke",
      componentSkus: [],
      priceDelta: 0,
      eligible: true,
    },
  ],
  componentDefinitions: [],
  pricingVersion: "price-stage1-smoke-v1",
  defaultPrice: {
    base: 100,
    variantDelta: 0,
    components: [],
    subtotal: 100,
    discount: 0,
    final: 100,
    currency: COMMERCE_CURRENCY,
    pricingVersion: "price-stage1-smoke-v1",
  },
  availability: { status: "in_stock", totalAvailable: 1_000_000 },
  searchableAttributes: [],
});
