import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Stage 2 contract: all public routes exist as framework pages", async () => {
  for (const path of ["../app/page.tsx", "../app/catalog/page.tsx", "../app/catalog/[category]/page.tsx", "../app/product/[slug]/page.tsx", "../app/picker/page.tsx", "../app/cart/page.tsx", "../app/not-found.tsx"]) await access(new URL(path, import.meta.url));
  const [category, product] = await Promise.all([source("../app/catalog/[category]/page.tsx"), source("../app/product/[slug]/page.tsx")]);
  assert.match(category, /products\.some\(\(product\) => product\.categorySlug === category\)/);
  assert.match(category, /notFound\(\)/);
  assert.match(product, /item\.slug === slug/);
  assert.match(product, /notFound\(\)/);
});

test("Stage 2 contract: VPS serves only known routes and preserves real 404", async () => {
  const [server, entry, root] = await Promise.all([source("../server.cjs"), source("../lib/commerce/vps-entry.ts"), source("../components/store/VpsStoreRoot.tsx")]);
  assert.match(server, /knownCategoryRoute/);
  assert.match(server, /knownProductRoute/);
  assert.doesNotMatch(server, /Fallback to index\.html for client SPA routes/);
  assert.match(entry, /isCanonicalCategorySlug/);
  assert.match(root, /resolveRoute/);
});

test("Stage 2 contract: catalog, search and cards use canonical ProductReadModel", async () => {
  const [catalog, card, search, types] = await Promise.all([source("../components/store/catalog/CatalogPage.tsx"), source("../components/store/catalog/ProductCard.tsx"), source("../components/store/header/SearchCombobox.tsx"), source("../lib/commerce/types.ts")]);
  assert.match(catalog, /selectCatalogProducts/);
  assert.match(card, /ProductReadModel/);
  assert.match(card, /defaultPrice\.final/);
  assert.match(search, /fetch\("\/api\/catalog"/);
  assert.match(search, /250/);
  assert.match(search, /AbortController/);
  for (const key of ["ArrowDown", "ArrowUp", "Enter", "Escape"]) assert.match(search, new RegExp(key));
  assert.match(types, /categorySlug: string/);
});

test("Stage 2 contract: product and cart routes reuse Stage 1 domains", async () => {
  const [runtime, product, configurator, cart] = await Promise.all([source("../components/store/StoreRuntime.tsx"), source("../components/store/product/ProductPage.tsx"), source("../components/store/product/ProductConfigurator.tsx"), source("../components/store/cart/CartPage.tsx")]);
  assert.match(runtime, /CommerceCartProvider/);
  assert.match(product, /ProductConfigurator/);
  assert.match(configurator, /quoteConfiguration/);
  assert.match(configurator, /commerceCart\.add/);
  assert.match(cart, /useCommerceCart/);
  assert.doesNotMatch([runtime, product, configurator, cart].join("\n"), /status\s*:\s*["']paid["']/);
});

test("Stage 2 contract: Back restoration stores URL, scroll and focus anchor", async () => {
  const [restoration, catalog, card] = await Promise.all([source("../lib/storefront/scroll-restoration.ts"), source("../components/store/catalog/CatalogPage.tsx"), source("../components/store/catalog/ProductCard.tsx")]);
  assert.match(restoration, /scrollY/);
  assert.match(restoration, /productId/);
  assert.match(restoration, /sessionStorage/);
  assert.match(catalog, /focus\(\{ preventScroll: true \}\)/);
  assert.match(card, /saveCatalogReturn/);
});

test("Stage 2 contract: header, overlays and responsive rules are accessible", async () => {
  const [header, overlay, css, quick] = await Promise.all([source("../components/store/header/StoreHeader.tsx"), source("../components/store/feedback/Overlay.tsx"), source("../components/store/store-routes.css"), source("../components/store/product/QuickViewDialog.tsx")]);
  assert.match(header, /window\.addEventListener\("scroll"/);
  assert.match(header, /nextY > 96/);
  assert.match(overlay, /event\.key === "Escape"/);
  assert.match(overlay, /returnFocusRef/);
  assert.match(overlay, /document\.body\.style\.overflow/);
  assert.match(overlay, /createPortal/);
  assert.match(overlay, /element\.inert = true/);
  assert.match(overlay, /export function Sheet/);
  assert.match(quick, /role|Dialog/);
  assert.match(css, /--store-header-offset/);
  assert.match(css, /max-width: 359px/);
  assert.match(css, /\.store-quick-view-action \{ display: none/);
});
