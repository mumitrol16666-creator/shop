import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { scryptSync } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const core = await import(path.join(root, "dist-vps/commerce-core.cjs"));
const source = (file) => readFile(path.join(root, file), "utf8");

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

test("Stage 5 contract: protected order queue and all admin actions are wired", async () => {
  const [page, listRoute, statusRoute, confirmRoute, server, client, store] = await Promise.all([
    source("components/admin/AdminOrdersPage.tsx"),
    source("app/api/admin/orders/route.ts"),
    source("app/api/admin/orders/[id]/status/route.ts"),
    source("app/api/admin/orders/[id]/confirm-payment/route.ts"),
    source("server.cjs"),
    source("src/main.tsx"),
    source("lib/commerce/d1-store.ts"),
  ]);
  assert.match(page, /Оплата на проверке/);
  assert.match(page, /Подтвердить поступление/);
  assert.match(page, /Передать в работу/);
  assert.match(page, /Завершить заказ/);
  assert.match(listRoute, /isAdminRequest/);
  assert.match(listRoute, /listAdminOrdersD1/);
  assert.match(statusRoute, /isAdminRequest/);
  assert.match(confirmRoute, /confirmPaymentD1/);
  assert.match(server, /pathname === "\/api\/admin\/orders"/);
  assert.match(server, /transitionOrderInMemory/);
  assert.match(client, /AdminOrdersPage/);
  assert.match(client, /pathname === "\/admin"/);
  assert.match(store, /transitionOrderD1/);
});

test("Stage 5 domain: admin sees PII and advances an order through completion", () => {
  const product = core.stage1SmokeProduct();
  const now = new Date("2026-08-22T10:00:00.000Z");
  const request = {
    cart: {
      schemaVersion: 1,
      updatedAt: now.toISOString(),
      lines: [{
        lineId: "admin-order-line",
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
    customer: { name: "Алия", phone: "+7 700 111 22 33", city: "Актобе", comment: "Позвонить заранее" },
    fulfilment: { method: "pickup" },
    payment: { method: "cash_transfer" },
  };
  let result = core.createOrderInMemory({ state: core.emptyCommerceStoreState(), products: [product], request, idempotencyKey: "stage5-admin-flow", now });
  const orderId = result.order.orderId;
  const publicToken = result.order.publicToken;
  let adminOrder = core.listAdminOrdersInMemory(result.state)[0];
  assert.equal(adminOrder.customer.phone, "+7 700 111 22 33");
  assert.equal(adminOrder.customer.comment, "Позвонить заранее");
  assert.doesNotMatch(JSON.stringify(core.publicOrderFromState(result.state, publicToken)), /700 111|Позвонить заранее/);

  result = core.transitionOrderInMemory({ state: result.state, orderId, toStatus: "awaiting_payment", now: new Date("2026-08-22T10:05:00.000Z") });
  result = core.confirmPaymentInMemory({ state: result.state, orderId, actorType: "admin", now: new Date("2026-08-22T10:06:00.000Z") });
  result = core.transitionOrderInMemory({ state: result.state, orderId, toStatus: "processing", now: new Date("2026-08-22T10:07:00.000Z") });
  result = core.transitionOrderInMemory({ state: result.state, orderId, toStatus: "completed", now: new Date("2026-08-22T10:08:00.000Z") });
  adminOrder = core.listAdminOrdersInMemory(result.state)[0];
  assert.equal(adminOrder.status, "completed");
  assert.deepEqual(adminOrder.history.map((entry) => entry.toStatus), ["pending_contact", "awaiting_payment", "paid", "processing", "completed"]);
});

test("Stage 5 domain: a reported payment cannot be confirmed after its extended reservation expires", () => {
  const product = core.stage1SmokeProduct();
  const createdAt = new Date("2026-08-22T10:00:00.000Z");
  const request = {
    cart: {
      schemaVersion: 1,
      updatedAt: createdAt.toISOString(),
      lines: [{
        lineId: "reported-expiry-line",
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
    customer: { name: "Тест", phone: "+77000000000", city: "Актобе" },
    fulfilment: { method: "pickup" },
    payment: { method: "kaspi_pay" },
  };
  const created = core.createOrderInMemory({ state: core.emptyCommerceStoreState(), products: [product], request, idempotencyKey: "stage5-reported-expiry", now: createdAt });
  const reported = core.reportPaymentInMemory({ state: created.state, orderId: created.order.orderId, now: createdAt, reportedReservationTtlMinutes: 60 });
  const expired = core.expireReservationsInMemory(reported.state, new Date("2026-08-22T11:01:00.000Z"));
  assert.equal(core.listAdminOrdersInMemory(expired)[0].status, "expired");
  assert.throws(
    () => core.confirmPaymentInMemory({ state: expired, orderId: created.order.orderId, actorType: "admin" }),
    (error) => error?.code === "FORBIDDEN_TRANSITION" || error?.code === "ORDER_EXPIRED",
  );
});

test("Stage 5 E2E: only an authenticated admin can list, confirm and complete orders", async (t) => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "maestro-stage5-admin-"));
  const product = {
    id: "admin-e2e-product",
    databaseId: "admin-e2e-product",
    name: "Admin E2E Guitar",
    shortName: "Admin E2E",
    category: "Test",
    image: "/products/01_st20_electric.png",
    quantity: 2,
    variants: 1,
    sku: "ADMIN-E2E",
    description: "Admin order flow fixture",
    features: [],
    price: 50000,
    publicationStatus: "published",
    variantItems: [{
      id: "admin-e2e-variant",
      name: "Black",
      stock: 2,
      color: "#111111",
      sku: "ADMIN-E2E-V1",
      image: "/products/01_st20_electric.png",
      price: 50000,
    }],
  };
  await writeFile(path.join(dataDir, "products.json"), JSON.stringify([product]));
  await writeFile(path.join(dataDir, "courses.json"), "[]");
  const port = await freePort();
  const password = "stage5-admin-password";
  const salt = "stage5-test-salt";
  const child = spawn(process.execPath, [path.join(root, "server.cjs")], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      COMMERCE_CORE_V2: "1",
      ADMIN_PASSWORD_SALT: salt,
      ADMIN_PASSWORD_HASH: scryptSync(password, salt, 64).toString("hex"),
      ADMIN_SESSION_SECRET: "stage5-test-session-secret",
      TELEGRAM_BOT_TOKEN: "",
      TELEGRAM_CHAT_ID: "",
    },
    stdio: "ignore",
  });
  t.after(async () => {
    child.kill("SIGTERM");
    await rm(dataDir, { recursive: true, force: true });
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitReady(baseUrl, child);

  const catalog = await fetch(`${baseUrl}/api/catalog`).then((response) => response.json());
  const model = catalog.products.find((item) => item.sku === product.sku);
  const orderResponse = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": "stage5-admin-e2e" },
    body: JSON.stringify({
      cart: {
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        lines: [{
          lineId: "stage5-admin-e2e-line",
          productId: model.id,
          productSku: model.sku,
          variantSku: model.variants[0].sku,
          bundleSku: core.BUNDLE_SKUS.base,
          componentSkus: [],
          quantity: 1,
          observedPricingVersion: model.pricingVersion,
          observedFinal: model.defaultPrice.final,
        }],
      },
      customer: { name: "Admin Buyer", phone: "+77005554433", city: "Актобе", comment: "private admin note" },
      fulfilment: { method: "pickup" },
      payment: { method: "cash_transfer" },
    }),
  });
  assert.equal(orderResponse.status, 201);
  const created = await orderResponse.json();

  assert.equal((await fetch(`${baseUrl}/api/admin/orders`)).status, 401);
  const login = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  const auth = { Cookie: cookie };

  const queue = await fetch(`${baseUrl}/api/admin/orders`, { headers: auth }).then((response) => response.json());
  assert.equal(queue.orders.length, 1);
  assert.equal(queue.orders[0].customer.phone, "+77005554433");
  assert.equal(queue.orders[0].customer.comment, "private admin note");

  const confirm = await fetch(`${baseUrl}/api/admin/orders/${created.order.orderId}/confirm-payment`, { method: "POST", headers: auth });
  assert.equal(confirm.status, 200);
  assert.equal((await confirm.json()).order.status, "paid");
  for (const status of ["processing", "completed"]) {
    const response = await fetch(`${baseUrl}/api/admin/orders/${created.order.orderId}/status`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).order.status, status);
  }
  const publicOrder = await fetch(`${baseUrl}/api/orders/${created.order.publicToken}`).then((response) => response.json());
  assert.equal(publicOrder.order.status, "completed");
  assert.doesNotMatch(JSON.stringify(publicOrder), /77005554433|private admin note/);
});
