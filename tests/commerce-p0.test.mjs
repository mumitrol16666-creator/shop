import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  COMMERCE_STAGE0_ENABLED,
  buildWhatsAppOrderUrl,
  initialVariantSelection,
  isCustomerContactComplete,
  productUnitPrice,
  products,
  variantsFor,
} from "../lib/catalog-data.ts";
import { COURSES, resolveAttachedCourse } from "../lib/courses-data.ts";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("P0: Stage 0 is enabled by default and product changes start unconfigured", () => {
  assert.equal(COMMERCE_STAGE0_ENABLED, true);
  const first = products[0];
  const second = products[1];
  assert.ok(first && second);
  assert.equal(initialVariantSelection(first), null);
  assert.equal(initialVariantSelection(second), null);
  assert.equal(initialVariantSelection(second, null), null);
});

test("P0: canonical unit price is shared by product and selected variant", () => {
  const product = products[0];
  assert.ok(product);
  const variant = variantsFor(product)[0];
  assert.ok(variant);
  assert.equal(productUnitPrice(product), product.price);
  assert.equal(productUnitPrice(product, variant), variant.price);
  assert.equal(productUnitPrice({ price: 0 }, { price: 0 }), 0);
});

test("P0: gift course requires an explicit valid attachment", () => {
  assert.equal(resolveAttachedCourse({ category: "Гитары" }), null);
  assert.equal(resolveAttachedCourse({ category: "Гитары", attachedCourseId: "missing" }), null);
  assert.equal(
    resolveAttachedCourse({ attachedCourseId: COURSES[0].id })?.id,
    COURSES[0].id,
  );
});

test("P0: checkout contact contract requires both name and a real phone length", () => {
  assert.equal(isCustomerContactComplete("", "+7 777 505 57 88"), false);
  assert.equal(isCustomerContactComplete("Влад", ""), false);
  assert.equal(isCustomerContactComplete("Влад", "123"), false);
  assert.equal(isCustomerContactComplete("Влад", "+7 (777) 505-57-88"), true);
});

test("P0: payment report handoff is structured and never claims paid", () => {
  const product = products[0];
  const variant = variantsFor(product)[0];
  assert.ok(product && variant);
  const url = new URL(buildWhatsAppOrderUrl({
    requestId: "MM-TEST-001",
    paymentStatus: "payment_reported",
    customerName: "Тест",
    customerPhone: "+7 777 000 00 00",
    customerCity: "Актобе",
    customerComment: "Stage 0 smoke",
    cartItems: [{
      key: "test",
      productId: product.id,
      name: product.name,
      variantName: variant.name,
      sku: variant.sku,
      image: variant.image,
      price: productUnitPrice(product, variant),
      quantity: 1,
      maxQuantity: variant.stock,
      bundle: "base",
    }],
    totalPrice: productUnitPrice(product, variant),
  }));
  const text = url.searchParams.get("text") || "";
  assert.match(text, /MM-TEST-001/);
  assert.match(text, /требуется ручная проверка/i);
  assert.doesNotMatch(text, /оплата подтверждена|заказ оплачен/i);
});

test("P0: UI wiring keeps one catalog source, explicit configuration and required contacts", async () => {
  const [page, runtime, vpsRoot, configurator, checkout, kaspi, css] = await Promise.all([
    readSource("../app/page.tsx"),
    readSource("../components/store/StoreRuntime.tsx"),
    readSource("../components/store/VpsStoreRoot.tsx"),
    readSource("../components/store/product/ProductConfigurator.tsx"),
    readSource("../components/store/checkout/CheckoutPage.tsx"),
    readSource("../components/KaspiQrModal.tsx"),
    readSource("../app/globals.css"),
  ]);

  assert.match(page, /commerceCatalog\(\)/);
  assert.match(page, /StoreRuntime/);
  assert.match(runtime, /CommerceCartProvider/);
  assert.match(vpsRoot, /fetch\("\/api\/catalog"/);
  assert.match(configurator, /product\.selectionRequired \? ""/);
  assert.match(configurator, /disabled=\{!variantSku \|\| !maxQuantity\}/);
  assert.match(configurator, /"Выберите вариант"/);
  assert.match(checkout, /<form[\s\S]*?onSubmit=\{submit\}/);
  assert.match(checkout, /name="customerName"[\s\S]{0,80}?required/);
  assert.match(checkout, /name="customerPhone"[\s\S]{0,80}?required/);
  assert.match(checkout, /pattern="\(\?:\\D\*\\d\)\{10,\}\\D\*"/);
  assert.match(kaspi, /payment-report/);
  assert.match(kaspi, /paymentStatus: "payment_reported"/);
  assert.match(kaspi, /Требуется ручная проверка/);
  assert.doesNotMatch(kaspi, /Спасибо за оплату|Заказ принят в обработку|onPaymentSuccess/);
  assert.doesNotMatch(runtime, /onPaymentReported=\{\(\) => \{[\s\S]{0,180}setCartItems\(\[\]\)/);
  assert.match(css, /body\.commerce-overlay-open/);
  assert.match(css, /max-height: 100dvh/);
  assert.match(css, /overflow-x: clip/);
});
