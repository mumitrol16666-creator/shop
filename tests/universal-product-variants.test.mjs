import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  attributeSuggestionsForCategory,
  normalizeVariantAttributes,
  resolveVariantUnitPrice,
} from "../lib/product-variants.ts";

test("universal variants do not force guitar size onto accessories", () => {
  const suggestions = attributeSuggestionsForCategory("Аксессуары");
  assert.ok(suggestions.includes("Совместимость"));
  assert.equal(suggestions.includes("Размер"), false);

  const attributes = normalizeVariantAttributes({
    name: "Золотой",
    colorName: "Золотой",
    attributes: [
      { name: "Цвет", value: "Золотой" },
      { name: "Совместимость", value: "Акустическая и электрогитара" },
    ],
  });
  assert.deepEqual(attributes, [
    { name: "Цвет", value: "Золотой" },
    { name: "Совместимость", value: "Акустическая и электрогитара" },
  ]);
});

test("variant prices inherit the product price unless an override is explicit", () => {
  assert.equal(resolveVariantUnitPrice(50_192, { price: 41_000 }), 50_192);
  assert.equal(
    resolveVariantUnitPrice(50_192, { priceMode: "override", price: 41_000 }),
    41_000,
  );
  assert.equal(
    resolveVariantUnitPrice(50_192, { priceMode: "override", price: 0 }),
    50_192,
  );
});

test("gallery navigation is separate from SKU selection", async () => {
  const source = await readFile(
    new URL("../components/store/product/ProductPage.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /onClick=\{\(\) => setActiveImage\(item\.image\)\}/);
  assert.doesNotMatch(source, /item\.sku\) setSelectedVariantSku/);
  assert.match(source, /Фото не влияет на цену|Фото можно листать отдельно/);
});

test("admin and both persistence paths keep attributes and explicit price mode", async () => {
  const [admin, route, server, schema] = await Promise.all([
    readFile(new URL("../components/PurchaserView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/products/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../server.cjs", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
  ]);
  assert.match(admin, /Характеристики варианта/);
  assert.match(admin, /Базовая цена товара/);
  assert.match(admin, /Индивидуальные настройки/);
  assert.match(admin, /Предпродажная подготовка \/ проверка/);
  assert.doesNotMatch(admin, /setSelectedPresetId\(loaded\[0\]\.id\)/);
  assert.match(route, /priceMode: hasOwnPrice/);
  assert.match(server, /normalizeVariantPayload/);
  assert.match(server, /isApplicationBundle/);
  assert.match(schema, /attributesJson: text\("attributes_json"\)/);
});
