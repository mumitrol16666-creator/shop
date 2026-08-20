import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const freePort = () => new Promise((resolve, reject) => { const server = createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const address = server.address(); server.close(() => resolve(typeof address === "object" && address ? address.port : 0)); }); });
async function waitReady(baseUrl, child) { for (let attempt = 0; attempt < 80; attempt += 1) { if (child.exitCode !== null) throw new Error(`server exited ${child.exitCode}`); try { if ((await fetch(`${baseUrl}/api/catalog`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error("server unavailable"); }

test("Stage 2 E2E: VPS direct routes reload and unknown entities return 404", async (t) => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "maestro-stage2-e2e-"));
  await writeFile(path.join(dataDir, "products.json"), JSON.stringify([{ id: "route-product", databaseId: "route-product", name: "Route Guitar", shortName: "Route", category: "Электрогитары", image: "/products/01_st20_electric.png", quantity: 1, variants: 1, sku: "ROUTE-GUITAR", description: "Route fixture", features: [], price: 123, publicationStatus: "published", variantItems: [{ id: "route-variant", name: "Only", stock: 1, color: "#111", sku: "ROUTE-GUITAR-V1", image: "/products/01_st20_electric.png", price: 123 }] }]));
  await writeFile(path.join(dataDir, "courses.json"), "[]");
  const port = await freePort();
  const child = spawn(process.execPath, [path.join(root, "server.cjs")], { cwd: root, env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, COMMERCE_CORE_V2: "1" }, stdio: "ignore" });
  t.after(async () => { child.kill("SIGTERM"); await rm(dataDir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${port}`;
  await waitReady(base, child);
  for (const route of ["/", "/catalog", "/catalog/electric-guitars", "/product/route-guitar", "/picker", "/cart"]) {
    const response = await fetch(`${base}${route}`);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get("content-type") || "", /text\/html/);
  }
  assert.equal((await fetch(`${base}/product/not-real`)).status, 404);
  assert.equal((await fetch(`${base}/catalog/something-random`)).status, 404);
  const catalog = await fetch(`${base}/api/catalog`).then((response) => response.json());
  assert.equal(catalog.products.some((product) => product.sku === "TEST-STAGE1-SMOKE"), false);
});
