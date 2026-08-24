import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const core = require("../dist-vps/commerce-core.cjs");
const { BUNDLE_SKUS, buildCatalogReadModels } = core;

const baseProduct = (overrides = {}) => ({
  id: overrides.id || "product",
  name: overrides.name || "Товар",
  shortName: overrides.name || "Товар",
  category: overrides.category || "Аксессуары",
  image: "/placeholder.png",
  quantity: overrides.stock ?? 5,
  variants: 1,
  sku: overrides.sku || "PRODUCT",
  description: "Описание",
  features: [],
  price: overrides.price ?? 10000,
  publicationStatus: "published",
  variantItems: [{
    id: `${overrides.sku || "PRODUCT"}-variant`,
    name: "Стандарт",
    stock: overrides.stock ?? 5,
    color: "#111111",
    sku: `${overrides.sku || "PRODUCT"}-01`,
    image: "/placeholder.png",
    priceMode: "inherit",
  }],
  ...overrides,
});

test("Bundle config: a linked catalog variant controls component availability", () => {
  const strings = baseProduct({ id: "strings", sku: "STRINGS", name: "Струны", stock: 2, price: 5000 });
  const guitar = baseProduct({
    id: "guitar",
    sku: "GUITAR",
    name: "Гитара",
    componentDefinitions: [{
      sku: "COMP-STRINGS",
      title: "Струны на замену",
      price: 2500,
      kind: "physical",
      inventoryTracked: true,
      linkedProductSku: "STRINGS",
      linkedVariantSku: "STRINGS-01",
      quantity: 1,
      placement: "pro_pack",
    }],
    bundleDefinitions: [
      { id: "base", sku: BUNDLE_SKUS.base, title: "База", description: "", componentSkus: [], priceDelta: 0, eligible: true },
      { id: "pro_pack", sku: BUNDLE_SKUS.proPack, title: "PRO", description: "Со струнами", componentSkus: ["COMP-STRINGS"], priceDelta: 3000, eligible: true },
    ],
  });

  const catalog = buildCatalogReadModels([guitar, strings]);
  const configured = catalog.find((product) => product.sku === "GUITAR");
  assert.equal(configured.componentDefinitions[0].availableQuantity, 2);
  assert.equal(configured.componentDefinitions[0].linkedVariantId, "STRINGS-variant");
  assert.equal(configured.bundleDefinitions.find((bundle) => bundle.sku === BUNDLE_SKUS.proPack).eligible, true);
});

test("Bundle config: an unavailable required component disables the bundle", () => {
  const strings = baseProduct({ id: "strings", sku: "STRINGS", name: "Струны", stock: 0, price: 5000 });
  const guitar = baseProduct({
    id: "guitar",
    sku: "GUITAR",
    name: "Гитара",
    componentDefinitions: [{
      sku: "COMP-STRINGS",
      title: "Струны на замену",
      price: 0,
      kind: "physical",
      inventoryTracked: true,
      linkedProductSku: "STRINGS",
      linkedVariantSku: "STRINGS-01",
      quantity: 1,
      placement: "pro_pack",
    }],
    bundleDefinitions: [
      { id: "base", sku: BUNDLE_SKUS.base, title: "База", description: "", componentSkus: [], priceDelta: 0, eligible: true },
      { id: "pro_pack", sku: BUNDLE_SKUS.proPack, title: "PRO", description: "Со струнами", componentSkus: ["COMP-STRINGS"], priceDelta: 3000, eligible: true },
    ],
  });

  const configured = buildCatalogReadModels([guitar, strings]).find((product) => product.sku === "GUITAR");
  assert.equal(configured.bundleDefinitions.find((bundle) => bundle.sku === BUNDLE_SKUS.proPack).eligible, false);
});
