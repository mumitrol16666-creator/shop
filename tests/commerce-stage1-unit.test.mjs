import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const core = require("../dist-vps/commerce-core.cjs");

const draftFor = (product, overrides = {}) => ({
  schemaVersion: 1,
  updatedAt: "2026-08-20T00:00:00.000Z",
  lines: [{
    lineId: "line-test",
    productId: product.id,
    productSku: product.sku,
    variantSku: product.variants[0].sku,
    bundleSku: core.BUNDLE_SKUS.base,
    componentSkus: [],
    quantity: 1,
    observedPricingVersion: product.pricingVersion,
    observedFinal: product.defaultPrice.final,
    ...overrides,
  }],
});

test("Unit: pricing covers base, variant delta, bundle, component and discount", () => {
  const product = core.stage1SmokeProduct();
  product.defaultPrice = { ...product.defaultPrice, base: 120, subtotal: 120, discount: 20, final: 100 };
  product.variants[0].currentPrice = 150;
  product.bundleDefinitions.push({
    id: "pro_pack",
    sku: core.BUNDLE_SKUS.proPack,
    title: "PRO",
    description: "PRO",
    componentSkus: [],
    priceDelta: 50,
    eligible: true,
  });
  product.componentDefinitions.push({
    sku: "COMP-TEST",
    title: "Component",
    price: 25.4,
    kind: "physical",
    inventoryTracked: false,
  });
  const quote = core.quoteConfiguration(product, {
    variantSku: product.variants[0].sku,
    bundleSku: core.BUNDLE_SKUS.proPack,
    componentSkus: ["COMP-TEST"],
  });
  assert.deepEqual(
    { base: quote.base, variantDelta: quote.variantDelta, subtotal: quote.subtotal, discount: quote.discount, final: quote.final },
    { base: 120, variantDelta: 50, subtotal: 245, discount: 20, final: 225 },
  );
});

test("Unit: invalid bundle and component are rejected with stable domain codes", () => {
  const product = core.stage1SmokeProduct();
  assert.throws(
    () => core.quoteConfiguration(product, { variantSku: product.variants[0].sku, bundleSku: "MISSING", componentSkus: [] }),
    (error) => error.code === "INVALID_BUNDLE",
  );
  assert.throws(
    () => core.quoteConfiguration(product, { variantSku: product.variants[0].sku, bundleSku: core.BUNDLE_SKUS.base, componentSkus: ["MISSING"] }),
    (error) => error.code === "INVALID_COMPONENT",
  );
});

test("Unit: multi-variant product requires explicit selection", () => {
  const product = core.stage1SmokeProduct();
  product.selectionRequired = true;
  product.variants.push({ ...product.variants[0], id: "second", sku: "SECOND" });
  const result = core.reconcileCart([product], draftFor(product, { variantSku: undefined }));
  assert.equal(result.state, "invalid");
  assert.equal(result.invalidLines[0].errors[0].code, "VARIANT_REQUIRED");
});

test("Unit: deterministic configuration merges component ordering", () => {
  const product = core.stage1SmokeProduct();
  product.componentDefinitions.push(
    { sku: "A", title: "A", price: 1, kind: "physical", inventoryTracked: false },
    { sku: "B", title: "B", price: 1, kind: "physical", inventoryTracked: false },
  );
  const first = core.reconcileCart([product], draftFor(product, { componentSkus: ["B", "A"] }));
  const second = core.reconcileCart([product], draftFor(product, { componentSkus: ["A", "B"] }));
  assert.equal(first.lines[0].configurationKey, second.lines[0].configurationKey);
});

test("Unit: price version drift returns changed with before/after", () => {
  const product = core.stage1SmokeProduct();
  const result = core.reconcileCart([product], draftFor(product, {
    observedPricingVersion: "old-version",
    observedFinal: 90,
  }));
  assert.equal(result.state, "changed");
  assert.equal(result.lines[0].previousFinal, 90);
  assert.equal(result.lines[0].pricing.final, 100);
});

test("Unit: deleted product, removed variant and reduced stock become controlled invalid lines", () => {
  const product = core.stage1SmokeProduct();
  assert.equal(core.reconcileCart([], draftFor(product)).invalidLines[0].errors[0].code, "PRODUCT_NOT_FOUND");
  assert.equal(core.reconcileCart([product], draftFor(product, { variantSku: "REMOVED" })).invalidLines[0].errors[0].code, "VARIANT_NOT_FOUND");
  product.variants[0].availableQuantity = 1;
  assert.equal(core.reconcileCart([product], draftFor(product, { quantity: 2 })).invalidLines[0].errors[0].code, "INSUFFICIENT_STOCK");
});

test("Unit: only trusted actors can transition payment_reported to paid", () => {
  assert.equal(core.canTransitionOrder("payment_reported", "paid", "customer"), false);
  assert.equal(core.canTransitionOrder("payment_reported", "paid", "admin"), true);
  assert.throws(
    () => core.assertOrderTransition("payment_reported", "paid", "customer"),
    (error) => error.code === "FORBIDDEN_TRANSITION",
  );
});
