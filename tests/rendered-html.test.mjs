import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { calculateProductPricing } from "../lib/product-pricing.ts";

test("calculates automatic and manual product economics", () => {
  const input = {
    purchasePrice: 220,
    currencyRate: 70,
    chinaDeliveryKzt: 1200,
    cargoKzt: 2800,
    customsKzt: 500,
    packagingKzt: 700,
    setupKzt: 2500,
    marketingKzt: 1200,
    otherCostsKzt: 300,
    taxPercent: 3,
    bankInstallmentPercent: 11,
    sellerPercent: 5,
    targetProfitPercent: 35,
    pricingMode: "auto",
  };
  const automatic = calculateProductPricing(input);

  assert.equal(automatic.purchasePriceKzt, 15400);
  assert.equal(automatic.fixedCostKzt, 24600);
  assert.equal(Math.round(automatic.recommendedPriceKzt), 41000);
  assert.equal(Math.round(automatic.profitKzt), 8610);

  const manual = calculateProductPricing({
    ...input,
    pricingMode: "manual",
    manualPriceKzt: 56000,
  });
  assert.equal(manual.finalPriceKzt, 56000);
  assert.equal(Math.round(manual.profitKzt), 20760);
  assert.equal(Math.round(manual.marginPercent * 10) / 10, 37.1);
});

test("rejects an impossible percentage structure", () => {
  assert.throws(
    () =>
      calculateProductPricing({
        purchasePrice: 1000,
        currencyRate: 1,
        chinaDeliveryKzt: 0,
        cargoKzt: 0,
        customsKzt: 0,
        packagingKzt: 0,
        setupKzt: 0,
        marketingKzt: 0,
        otherCostsKzt: 0,
        taxPercent: 40,
        bankInstallmentPercent: 40,
        sellerPercent: 20,
        targetProfitPercent: 10,
        pricingMode: "auto",
      }),
    /меньше 100%/,
  );
});

test("wires the admin form to the persistent catalog API", async () => {
  const [page, adminPage, purchaserView, route, schema, hosting] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/pricing/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/PurchaserView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/products/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /fetch\("\/api\/products\?scope=all"\)/);
  assert.match(adminPage, /fetch\("\/api\/products\?scope=all"\)/);
  assert.match(purchaserView, /Сохранить и показать на витрине/);
  assert.match(purchaserView, /Добавить вариант/);
  assert.match(route, /db\.batch\(/);
  assert.match(route, /product_approved/);
  assert.match(schema, /export const products = sqliteTable/);
  assert.match(schema, /export const crmSyncLogs = sqliteTable/);
  assert.match(hosting, /"d1": "DB"/);

  await access(new URL("../drizzle/0000_product_catalog.sql", import.meta.url));
  await access(new URL("../drizzle/meta/0000_snapshot.json", import.meta.url));
});
