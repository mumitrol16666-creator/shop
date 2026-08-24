import assert from "node:assert/strict";
import test from "node:test";
import { products as legacyProducts } from "../lib/catalog-data.ts";
import { categoriesFromCatalog, categoryFromSource } from "../lib/commerce/categories.ts";
import { parseCatalogState, selectCatalogProducts } from "../lib/storefront/catalog-state.ts";
import { recommendProducts } from "../lib/storefront/picker.ts";
import { consumeCatalogReturn, saveCatalogReturn } from "../lib/storefront/scroll-restoration.ts";

function asReadModel(product) {
  const category = categoryFromSource(product.category);
  const price = product.price || 0;
  return {
    id: String(product.id), slug: product.sku.toLowerCase(), sku: product.sku, name: product.name, shortName: product.shortName,
    categoryId: category.id, categorySlug: category.slug, categoryDisplayName: category.displayName, category: category.displayName,
    description: product.description, image: product.image, features: product.features, variants: [], selectionRequired: false,
    bundleDefinitions: [], componentDefinitions: [], pricingVersion: "test", publicationStatus: "published",
    defaultPrice: { base: price, variantDelta: 0, components: [], subtotal: product.originalPrice || price, discount: Math.max(0, (product.originalPrice || price) - price), final: price, currency: "KZT", pricingVersion: "test" },
    availability: { status: product.quantity > 0 ? "in_stock" : "out_of_stock", totalAvailable: product.quantity },
    searchableAttributes: [product.name, product.shortName, product.sku, category.displayName, category.slug, product.description, ...product.features],
  };
}

const catalog = legacyProducts.map(asReadModel);

test("Stage 2 integration: URL state, canonical catalog and picker share real product read models", () => {
  const filtered = selectCatalogProducts(catalog, "electric-guitars", parseCatalogState("availability=in_stock&price=30000_50000&sort=price_asc"));
  assert.ok(filtered.length > 0);
  const recommended = recommendProducts(filtered, { person: "self", size: "adult", use: "electric", budget: "under_70000", priority: "sound" });
  assert.ok(recommended.length > 0);
  assert.ok(recommended.every((product) => filtered.some((candidate) => candidate.id === product.id)));
  assert.ok(recommended.every((product) => product.defaultPrice.final >= 30000 && product.defaultPrice.final <= 50000));
});

test("Stage 2 integration: catalog return context is exact, one-shot and URL-specific", () => {
  const previousWindow = globalThis.window;
  const storage = new Map();
  globalThis.window = {
    location: { pathname: "/catalog/electric-guitars", search: "?availability=in_stock&sort=price_asc" },
    scrollY: 920,
    sessionStorage: {
      setItem: (key, value) => storage.set(key, value),
      getItem: (key) => storage.get(key) ?? null,
      removeItem: (key) => storage.delete(key),
    },
  };
  try {
    saveCatalogReturn("eg-st20");
    assert.equal(consumeCatalogReturn("/catalog?sort=price_asc"), null);
    const restored = consumeCatalogReturn("/catalog/electric-guitars?availability=in_stock&sort=price_asc");
    assert.equal(restored?.url, "/catalog/electric-guitars?availability=in_stock&sort=price_asc");
    assert.equal(restored?.scrollY, 920);
    assert.equal(restored?.productId, "eg-st20");
    assert.equal(typeof restored?.savedAt, "number");
    assert.equal(consumeCatalogReturn("/catalog/electric-guitars?availability=in_stock&sort=price_asc"), null);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("Stage 2 integration: storefront navigation includes categories created in admin", () => {
  const custom = {
    ...catalog[0],
    categoryId: "pedals",
    categorySlug: "pedals",
    categoryDisplayName: "Педали эффектов",
  };
  const categories = categoriesFromCatalog([...catalog, custom]);
  assert.equal(categories.some((category) => category.slug === "pedals" && category.displayName === "Педали эффектов"), true);
});
