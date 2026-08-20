import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../components/store/store-routes.css", import.meta.url), "utf8");

test("Stage 2 responsive: desktop, tablet, mobile and narrow grid contracts exist", () => {
  assert.match(css, /store-product-grid \{[^}]*grid-template-columns: repeat\(3/);
  assert.match(css, /@media \(max-width: 1199px\)[\s\S]*store-product-grid \{ grid-template-columns: repeat\(2/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*store-product-grid \{ grid-template-columns: repeat\(2/);
  assert.match(css, /@media \(max-width: 359px\)[\s\S]*store-product-grid \{ grid-template-columns: 1fr/);
});

test("Stage 2 responsive: mobile header, search row and no-quick-view rules are explicit", () => {
  assert.match(css, /--store-header-offset: 104px/);
  assert.match(css, /store-header__main \{[^}]*height: 56px/);
  assert.match(css, /store-search__input \{ height: 48px/);
  assert.match(css, /store-quick-view-action \{ display: none/);
});

test("Stage 2 responsive: tablet/mobile filters use the shared sheet trigger", () => {
  assert.match(css, /store-catalog-page > \.store-catalog-toolbar \{ display: none/);
  assert.match(css, /store-catalog-sheet-trigger \{[^}]*display: block/);
  assert.match(css, /store-sheet \.store-catalog-toolbar \{[^}]*display: grid/);
  assert.match(css, /store-sheet \{[^}]*align-self: end/);
});
