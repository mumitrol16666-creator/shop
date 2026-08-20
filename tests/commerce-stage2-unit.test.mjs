import assert from "node:assert/strict";
import test from "node:test";
import { products as legacyProducts } from "../lib/catalog-data.ts";
import { CATALOG_CATEGORIES, categoryBySlug, categoryFromSource } from "../lib/commerce/categories.ts";
import { parseCatalogState, selectCatalogProducts, serializeCatalogState } from "../lib/storefront/catalog-state.ts";
import { recommendProducts } from "../lib/storefront/picker.ts";

const catalog = legacyProducts.map((product) => {
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
});

test("Stage 2 unit: canonical categories use stable slugs independent of labels", () => {
  assert.equal(categoryFromSource("Электрогитары").slug, "electric-guitars");
  assert.equal(categoryBySlug("electric-guitars")?.displayName, "Электрогитары");
  assert.equal(categoryBySlug("Электрогитары"), undefined);
  assert.equal(new Set(CATALOG_CATEGORIES.map((category) => category.slug)).size, CATALOG_CATEGORIES.length);
});

test("Stage 2 unit: catalog query state round-trips canonical filters", () => {
  const state = parseCatalogState("q=st-20&availability=in_stock&sale=1&price=30000_50000&sort=price_desc");
  assert.deepEqual(state, { q: "st-20", availability: "in_stock", sale: true, price: "30000_50000", sort: "price_desc" });
  assert.equal(serializeCatalogState(state), "q=st-20&availability=in_stock&sale=1&price=30000_50000&sort=price_desc");
});

test("Stage 2 unit: catalog selection uses ProductReadModel category slug and canonical price", () => {
  const selected = selectCatalogProducts(catalog, "electric-guitars", parseCatalogState("q=st-20&availability=in_stock"));
  assert.equal(selected.length, 1);
  assert.equal(selected[0].sku, "EG-ST20");
  assert.equal(selected[0].defaultPrice.final, 42000);
});

test("Stage 2 unit: picker returns exactly three real in-stock models when available", () => {
  const result = recommendProducts(catalog, { person: "self", size: "adult", use: "electric", budget: "under_70000", priority: "sound" });
  assert.equal(result.length, 3);
  for (const product of result) {
    assert.ok(catalog.some((candidate) => candidate.id === product.id));
    assert.equal(product.availability.status, "in_stock");
  }
});

test("Stage 2 unit: picker never invents products when fewer than three are available", () => {
  const result = recommendProducts(catalog.slice(0, 2), { use: "flexible", budget: "any" });
  assert.equal(result.length, 2);
  assert.deepEqual(result.map((product) => product.id).sort(), catalog.slice(0, 2).map((product) => product.id).sort());
});
