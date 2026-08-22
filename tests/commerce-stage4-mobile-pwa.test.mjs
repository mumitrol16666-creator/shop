import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const source = (file) => readFile(path.join(root, file), "utf8");

test("Stage 4 PWA: manifest has installable PNG icons, scope and store shortcuts", async () => {
  const manifest = JSON.parse(await source("public/manifest.json"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.deepEqual(manifest.icons.map((icon) => icon.sizes), ["192x192", "512x512"]);
  assert.ok(manifest.icons.every((icon) => icon.type === "image/png"));
  assert.deepEqual(manifest.shortcuts.map((shortcut) => shortcut.url), ["/catalog", "/picker", "/cart"]);
  for (const file of ["public/pwa-icon-192.png", "public/pwa-icon-512.png", "public/apple-touch-icon.png"]) {
    const bytes = await readFile(path.join(root, file));
    assert.equal(bytes.subarray(1, 4).toString(), "PNG");
  }
});

test("Stage 4 PWA: service worker never caches commerce/admin mutations and provides safe offline fallback", async () => {
  const worker = await source("public/sw.js");
  assert.match(worker, /maestro-store-v18/);
  assert.match(worker, /request\.method !== "GET"/);
  assert.match(worker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(worker, /url\.pathname\.startsWith\("\/admin"\)/);
  assert.match(worker, /request\.mode === "navigate"/);
  assert.match(worker, /caches\.match\("\/offline\.html"\)/);
  assert.match(worker, /SKIP_WAITING/);
});

test("Stage 4 PWA: install/update lifecycle is wired without blocking checkout or order", async () => {
  const [runtime, lifecycle] = await Promise.all([
    source("components/store/StoreRuntime.tsx"),
    source("components/store/pwa/PwaLifecycle.tsx"),
  ]);
  assert.match(runtime, /<PwaLifecycle/);
  assert.match(runtime, /route\.kind !== "checkout" && route\.kind !== "order"/);
  assert.match(lifecycle, /beforeinstallprompt/);
  assert.match(lifecycle, /serviceWorker\.register\("\/sw\.js"/);
  assert.match(lifecycle, /controllerchange/);
  assert.match(lifecycle, /allowInstallPrompt && updateReady/);
  assert.match(lifecycle, /На экран Домой/);
});

test("Stage 4 mobile: safe areas, dynamic viewport, touch targets and iOS input zoom protection are explicit", async () => {
  const [css, html, layout] = await Promise.all([
    source("components/store/store-routes.css"),
    source("public/index.html"),
    source("app/layout.tsx"),
  ]);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /apple-touch-icon/);
  assert.match(css, /100dvh/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /input, select, textarea \{ font-size: 16px !important; \}/);
  assert.match(css, /min-width: 44px; min-height: 44px/);
  assert.match(layout, /viewportFit: "cover"/);
  assert.match(layout, /appleWebApp/);
});
