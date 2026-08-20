import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const core = require("../dist-vps/commerce-core.cjs");

const requestFor = (product, overrides = {}) => ({
  cart: {
    schemaVersion: 1,
    updatedAt: "2026-08-20T00:00:00.000Z",
    lines: [{
      lineId: "line-order",
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
  customer: { name: "Test Buyer", phone: "+77000000000", city: "Актобе", comment: "private" },
  fulfilment: { method: "Самовывоз" },
  payment: { method: "Kaspi QR / Оплата картой" },
  ...overrides,
});

test("Integration: same idempotency key and payload returns one immutable order", () => {
  const product = core.stage1SmokeProduct();
  const request = requestFor(product);
  const first = core.createOrderInMemory({ state: core.emptyCommerceStoreState(), products: [product], request, idempotencyKey: "same-key-123456" });
  const retry = core.createOrderInMemory({ state: first.state, products: [product], request, idempotencyKey: "same-key-123456" });
  assert.equal(first.state.orders.length, 1);
  assert.equal(retry.state.orders.length, 1);
  assert.equal(retry.order.orderId, first.order.orderId);
  assert.equal(retry.replayed, true);
});

test("Integration: same idempotency key with conflicting payload is rejected", () => {
  const product = core.stage1SmokeProduct();
  const first = core.createOrderInMemory({ state: core.emptyCommerceStoreState(), products: [product], request: requestFor(product), idempotencyKey: "conflict-key-123" });
  assert.throws(
    () => core.createOrderInMemory({ state: first.state, products: [product], request: requestFor(product, { customer: { name: "Other", phone: "+77000000000", city: "Актобе" } }), idempotencyKey: "conflict-key-123" }),
    (error) => error.code === "IDEMPOTENCY_CONFLICT",
  );
});

test("Integration: last stock permits exactly one order", () => {
  const product = core.stage1SmokeProduct();
  product.variants[0].stockQuantity = 1;
  product.variants[0].availableQuantity = 1;
  const first = core.createOrderInMemory({ state: core.emptyCommerceStoreState(), products: [product], request: requestFor(product), idempotencyKey: "last-stock-a" });
  assert.throws(
    () => core.createOrderInMemory({ state: first.state, products: [product], request: requestFor(product), idempotencyKey: "last-stock-b" }),
    (error) => error.code === "CART_INVALID",
  );
  assert.equal(first.state.reservations.filter((item) => item.status === "reserved").length, 1);
});

test("Integration: order snapshots survive later catalog changes", () => {
  const product = core.stage1SmokeProduct();
  product.name = "Historic name";
  const created = core.createOrderInMemory({ state: core.emptyCommerceStoreState(), products: [product], request: requestFor(product), idempotencyKey: "snapshot-key-123" });
  product.name = "New name";
  product.defaultPrice.final = 999;
  const historical = core.publicOrderFromState(created.state, created.order.publicToken);
  assert.equal(historical.items[0].title, "Historic name");
  assert.equal(historical.items[0].unitPrice, 100);
});

test("Integration: customer report is payment_reported and never paid", () => {
  const product = core.stage1SmokeProduct();
  const created = core.createOrderInMemory({ state: core.emptyCommerceStoreState(), products: [product], request: requestFor(product), idempotencyKey: "payment-key-123" });
  const reported = core.reportPaymentInMemory({ state: created.state, orderId: created.order.orderId });
  assert.equal(reported.order.status, "payment_reported");
  assert.equal(reported.order.paymentStatus, "payment_reported");
  assert.notEqual(reported.order.status, "paid");
});

test("Integration: cancellation releases a live reservation", () => {
  const product = core.stage1SmokeProduct();
  const created = core.createOrderInMemory({ state: core.emptyCommerceStoreState(), products: [product], request: requestFor(product), idempotencyKey: "cancel-key-1234" });
  const cancelled = core.cancelOrderInMemory({ state: created.state, orderId: created.order.orderId, actorType: "admin" });
  assert.equal(cancelled.order.status, "cancelled");
  assert.equal(cancelled.state.reservations[0].status, "released");
});

test("Integration: expired reservation returns stock and expires order", () => {
  const product = core.stage1SmokeProduct();
  const now = new Date("2026-08-20T10:00:00.000Z");
  const created = core.createOrderInMemory({ state: core.emptyCommerceStoreState(), products: [product], request: requestFor(product), idempotencyKey: "expiry-key-1234", now, reservationTtlMinutes: 5 });
  const expired = core.expireReservationsInMemory(created.state, new Date("2026-08-20T10:06:00.000Z"));
  assert.equal(expired.orders[0].status, "expired");
  assert.equal(expired.reservations[0].status, "expired");
  assert.equal(core.reservationUsage(expired).reservedByVariantSku[product.variants[0].sku] || 0, 0);
});

test("Integration: public order token is opaque and response excludes private PII", () => {
  const product = core.stage1SmokeProduct();
  const created = core.createOrderInMemory({ state: core.emptyCommerceStoreState(), products: [product], request: requestFor(product), idempotencyKey: "token-key-12345" });
  assert.match(created.order.publicToken, /^[a-f0-9]{48}$/);
  const serialized = JSON.stringify(created.order);
  assert.doesNotMatch(serialized, /77000000000|private/);
  assert.equal("customerPhone" in created.order, false);
});
