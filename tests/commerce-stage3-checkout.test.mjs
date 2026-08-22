import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const core = await import(path.join(root, "dist-vps/commerce-core.cjs"));

const product = core.stage1SmokeProduct();
const request = (overrides = {}) => ({
  cart: {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    lines: [{
      lineId: "stage3-line",
      productId: product.id,
      productSku: product.sku,
      variantSku: product.variants[0].sku,
      bundleSku: core.BUNDLE_SKUS.base,
      componentSkus: [],
      quantity: 1,
      observedPricingVersion: product.pricingVersion,
      observedFinal: product.defaultPrice.final,
    }],
  },
  customer: { name: "Алия", phone: "+7 700 000 00 00", city: "Актобе" },
  fulfilment: { method: "pickup" },
  payment: { method: "cash_transfer" },
  ...overrides,
});

test("Stage 3: cash/transfer order waits for manager and keeps a 30 minute reservation", () => {
  const now = new Date("2026-08-22T10:00:00.000Z");
  const created = core.createOrderInMemory({ state: core.emptyCommerceStoreState(), products: [product], request: request(), idempotencyKey: "stage3-cash-order", now });
  assert.equal(created.order.status, "pending_contact");
  assert.equal(created.order.fulfilmentMethod, "pickup");
  assert.equal(created.order.paymentMethod, "cash_transfer");
  assert.equal(created.order.reservationExpiresAt, "2026-08-22T10:30:00.000Z");
  assert.match(created.order.displayId, /^MM-20260822-/);
});

test("Stage 3: Aktobe delivery requires an address", () => {
  assert.throws(
    () => core.createOrderInMemory({ state: core.emptyCommerceStoreState(), products: [product], request: request({ fulfilment: { method: "aktobe_delivery" } }), idempotencyKey: "stage3-no-address" }),
    (error) => error?.code === "INVALID_REQUEST" && error?.field === "customer.deliveryAddress",
  );
});

test("Stage 3: storefront contains no Kazakhstan-wide delivery promise", async () => {
  const files = [
    "components/store/home/HomePage.tsx",
    "components/store/product/ProductPage.tsx",
    "components/CartDrawer.tsx",
    "public/index.html",
  ];
  const source = (await Promise.all(files.map((file) => readFile(path.join(root, file), "utf8")))).join("\n");
  assert.doesNotMatch(source, /доставк[^\n]*(по\s+рк|казахстан)/i);
  assert.match(source, /Доставка по Актобе/i);
});
