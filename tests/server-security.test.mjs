import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { scryptSync } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function freePort() {
  return await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

async function waitUntilReady(baseUrl, child) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Server exited with ${child.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/api/products`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Server did not become ready");
}

test("protects administration and strips internal product economics", async (t) => {
  const root = path.resolve(new URL("..", import.meta.url).pathname);
  const dataDir = await mkdtemp(path.join(tmpdir(), "maestro-shop-test-"));
  const port = await freePort();
  const password = "test-password-that-is-not-deployed";
  const salt = "test-salt";
  const hash = scryptSync(password, salt, 64).toString("hex");
  await writeFile(
    path.join(dataDir, "products.json"),
    JSON.stringify([
      {
        id: "published",
        name: "Public",
        sku: "PUB",
        publicationStatus: "published",
        adminPricing: { purchasePrice: 1 },
        variantItems: [{ sku: "PUB-1", adminPricing: { purchasePrice: 1 } }],
      },
      {
        id: "draft",
        name: "Draft",
        sku: "DRAFT",
        publicationStatus: "draft",
        adminPricing: { purchasePrice: 2 },
      },
    ]),
  );
  await writeFile(path.join(dataDir, "courses.json"), "[]");

  const child = spawn(process.execPath, [path.join(root, "server.cjs")], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      ADMIN_PASSWORD_SALT: salt,
      ADMIN_PASSWORD_HASH: hash,
      ADMIN_SESSION_SECRET: "test-session-secret",
    },
    stdio: "ignore",
  });
  t.after(async () => {
    child.kill("SIGTERM");
    await rm(dataDir, { recursive: true, force: true });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  await waitUntilReady(baseUrl, child);

  const publicResponse = await fetch(`${baseUrl}/api/products`);
  const publicPayload = await publicResponse.json();
  assert.equal(publicPayload.count, 1);
  assert.equal(publicPayload.products[0].id, "published");
  assert.equal("adminPricing" in publicPayload.products[0], false);
  assert.equal("adminPricing" in publicPayload.products[0].variantItems[0], false);

  assert.equal((await fetch(`${baseUrl}/api/products?scope=all`)).status, 401);
  assert.equal((await fetch(`${baseUrl}/api/products`, { method: "POST", body: "{}" })).status, 401);

  const badLogin = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "wrong" }),
  });
  assert.equal(badLogin.status, 401);

  const login = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);

  const adminResponse = await fetch(`${baseUrl}/api/products?scope=all`, {
    headers: { Cookie: cookie },
  });
  const adminPayload = await adminResponse.json();
  assert.equal(adminPayload.count, 2);
  assert.equal(adminPayload.products[0].adminPricing.purchasePrice, 1);

  const courseResponse = await fetch(`${baseUrl}/api/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      id: "course-test",
      slug: "course-test",
      title: "Test course",
      price: 1000,
    }),
  });
  assert.equal(courseResponse.status, 200);
  const persistedCourses = JSON.parse(await readFile(path.join(dataDir, "courses.json"), "utf8"));
  assert.equal(persistedCourses[0].id, "course-test");
});
