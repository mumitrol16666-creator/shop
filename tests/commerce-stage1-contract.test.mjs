import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Contract: required commerce endpoints and stable error envelope exist", async () => {
  const [catalog, product, validate, orders, readOrder, report, errors] = await Promise.all([
    source("../app/api/catalog/route.ts"),
    source("../app/api/products/[slug]/route.ts"),
    source("../app/api/cart/validate/route.ts"),
    source("../app/api/orders/route.ts"),
    source("../app/api/orders/[id]/route.ts"),
    source("../app/api/orders/[id]/payment-report/route.ts"),
    source("../lib/commerce/errors.ts"),
  ]);
  assert.match(catalog, /catalogVersion/);
  assert.match(product, /PRODUCT_NOT_FOUND/);
  assert.match(validate, /reconcileCart/);
  assert.match(orders, /Idempotency|idempotency/i);
  assert.match(readOrder, /readPublicOrderD1/);
  assert.match(report, /reportPaymentD1/);
  assert.match(errors, /\{ error: CommerceErrorShape \}/);
});

test("Contract: cart persistence is versioned identifiers-only and reconciles on lifecycle triggers", async () => {
  const provider = await source("../components/CommerceCartProvider.tsx");
  assert.match(provider, /maestro-commerce-cart-v1/);
  assert.match(provider, /schemaVersion/);
  assert.match(provider, /visibilitychange/);
  assert.match(provider, /\/api\/cart\/validate/);
  assert.doesNotMatch(provider, /unitPrice|trustedTotal|totalPrice/);
});

test("Contract: UI pricing and checkout bridge use the shared domain and server order", async () => {
  const [page, runtime, configurator, modal, qr, vpsHtml] = await Promise.all([
    source("../app/page.tsx"),
    source("../components/store/StoreRuntime.tsx"),
    source("../components/store/product/ProductConfigurator.tsx"),
    source("../components/ProductModal.tsx"),
    source("../components/KaspiQrModal.tsx"),
    source("../public/index.html"),
  ]);
  assert.match(page, /commerceCatalog\(\)/);
  assert.match(runtime, /cart\.createOrder/);
  assert.match(configurator, /quoteConfiguration/);
  assert.match(modal, /quoteConfiguration/);
  assert.doesNotMatch(modal, /basePrice \+ bundleDelta \+ stringsDelta/);
  assert.match(qr, /payment-report/);
  assert.match(vpsHtml, /bundle\.js\?v=13/);
  assert.doesNotMatch(vpsHtml, /bundle\.js\?v=12/);
});

test("Contract: client has no paid mutation and trusted confirmation is authenticated", async () => {
  const [runtime, qr, provider, confirm, status] = await Promise.all([
    source("../components/store/StoreRuntime.tsx"),
    source("../components/KaspiQrModal.tsx"),
    source("../components/CommerceCartProvider.tsx"),
    source("../app/api/admin/orders/[id]/confirm-payment/route.ts"),
    source("../lib/commerce/status.ts"),
  ]);
  for (const clientSource of [runtime, qr, provider]) {
    assert.doesNotMatch(clientSource, /status\s*:\s*["']paid["']/);
  }
  assert.match(confirm, /isAdminRequest/);
  assert.match(status, /actorType !== "admin"/);
});

test("Contract: schema is additive, indexed and has atomic stock guards", async () => {
  const [migration, store] = await Promise.all([
    source("../drizzle/0002_absurd_meggan.sql"),
    source("../lib/commerce/d1-store.ts"),
  ]);
  for (const table of ["orders", "order_items", "payments", "order_status_history", "stock_reservations"]) {
    assert.ok(migration.includes(`CREATE TABLE \`${table}\``));
  }
  assert.match(migration, /orders_idempotency_key_unique/);
  assert.match(store, /stock_quantity - reserved_quantity >= \?/);
  assert.match(store, /ELSE NULL/);
  assert.match(store, /batch\(statements\)/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM/);
});
