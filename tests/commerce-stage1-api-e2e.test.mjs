import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(new URL("..", import.meta.url).pathname);

const freePort = () => new Promise((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    server.close(() => resolve(typeof address === "object" && address ? address.port : 0));
  });
});

async function waitReady(baseUrl, child) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`server exited ${child.exitCode}`);
    try {
      if ((await fetch(`${baseUrl}/api/catalog`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("commerce server did not start");
}

test("E2E: storefront commerce bridge validates, serializes last stock, retries and reports payment", async (t) => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "maestro-stage1-e2e-"));
  const product = {
    id: "last-one-product",
    databaseId: "last-one-product",
    name: "Last One Guitar",
    shortName: "Last One",
    category: "Test",
    image: "/products/01_st20_electric.png",
    quantity: 1,
    variants: 1,
    sku: "TEST-LAST-ONE",
    description: "Synthetic concurrency fixture",
    features: [],
    price: 123,
    publicationStatus: "published",
    variantItems: [{
      id: "last-one-variant",
      name: "Only",
      stock: 1,
      color: "#111111",
      sku: "TEST-LAST-ONE-V1",
      image: "/products/01_st20_electric.png",
      price: 123,
    }],
  };
  await writeFile(path.join(dataDir, "products.json"), JSON.stringify([product]));
  await writeFile(path.join(dataDir, "courses.json"), "[]");
  const port = await freePort();
  const child = spawn(process.execPath, [path.join(root, "server.cjs")], {
    cwd: root,
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, COMMERCE_CORE_V2: "1" },
    stdio: "ignore",
  });
  t.after(async () => {
    child.kill("SIGTERM");
    await rm(dataDir, { recursive: true, force: true });
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitReady(baseUrl, child);

  const catalogResponse = await fetch(`${baseUrl}/api/catalog`);
  const catalog = await catalogResponse.json();
  const model = catalog.products.find((item) => item.sku === product.sku);
  assert.ok(model);
  assert.equal(model.defaultPrice.final, 123);
  assert.equal(model.variants[0].availableQuantity, 1);
  assert.equal(catalog.products.some((item) => item.sku === "TEST-STAGE1-SMOKE"), false);

  const cart = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    lines: [{
      lineId: "last-one-line",
      productId: model.id,
      productSku: model.sku,
      variantSku: model.variants[0].sku,
      bundleSku: "BUNDLE-BASE",
      componentSkus: [],
      quantity: 1,
      observedPricingVersion: model.pricingVersion,
      observedFinal: 123,
    }],
  };
  const validation = await fetch(`${baseUrl}/api/cart/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cart }),
  }).then((response) => response.json());
  assert.equal(validation.reconciliation.state, "ready");
  assert.equal(validation.reconciliation.totals.final, 123);

  const malformedResponse = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": "malformed-request-key" },
    body: JSON.stringify({ status: "paid", total: 1 }),
  });
  const malformed = await malformedResponse.json();
  assert.equal(malformedResponse.status, 400);
  assert.equal(malformed.error.code, "INVALID_REQUEST");

  const orderPayload = {
    cart,
    customer: { name: "E2E Buyer", phone: "+77000000000", city: "Актобе", comment: "secret" },
    fulfilment: { method: "Самовывоз" },
    payment: { method: "Kaspi QR / Оплата картой" },
    status: "paid",
  };
  const create = (key) => fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(orderPayload),
  });
  const [left, right] = await Promise.all([create("parallel-order-left"), create("parallel-order-right")]);
  assert.deepEqual([left.status, right.status].sort((a, b) => a - b), [201, 409]);
  const successResponse = left.status === 201 ? left : right;
  const successKey = left.status === 201 ? "parallel-order-left" : "parallel-order-right";
  const created = await successResponse.json();
  const failed = await (left.status === 409 ? left : right).json();
  assert.equal(failed.error.code, "CART_INVALID");
  assert.equal(created.order.status, "awaiting_payment");
  assert.notEqual(created.order.status, "paid");

  const replayResponse = await create(successKey);
  const replay = await replayResponse.json();
  assert.equal(replayResponse.status, 200);
  assert.equal(replay.replayed, true);
  assert.equal(replay.order.orderId, created.order.orderId);

  const reportResponse = await fetch(`${baseUrl}/api/orders/${created.order.orderId}/payment-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reference: "e2e" }),
  });
  const reported = await reportResponse.json();
  assert.equal(reported.order.status, "payment_reported");
  assert.equal(reported.order.paymentStatus, "payment_reported");
  assert.notEqual(reported.order.status, "paid");

  const publicResponse = await fetch(`${baseUrl}/api/orders/${created.order.publicToken}`);
  const publicPayload = await publicResponse.json();
  const serialized = JSON.stringify(publicPayload);
  assert.equal(publicResponse.status, 200);
  assert.doesNotMatch(serialized, /77000000000|secret/);

  const bySlug = await fetch(`${baseUrl}/api/products/${model.slug}`).then((response) => response.json());
  assert.equal(bySlug.product.sku, model.sku);
});
