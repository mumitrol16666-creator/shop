import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { DEFAULT_STORE_SETTINGS, normalizeStoreSettings, whatsappHref } from "../lib/store-settings.ts";
import { normalizeCostPresets } from "../lib/presets.ts";

test("Store settings: invalid input is normalized and required choices stay available", () => {
  const settings = normalizeStoreSettings({
    whatsappPhone: "+7 (700) 123-45-67",
    reservationMinutes: 2,
    pickupEnabled: false,
    deliveryEnabled: false,
    kaspiEnabled: false,
    cashTransferEnabled: false,
  });
  assert.equal(settings.whatsappPhone, "77001234567");
  assert.equal(whatsappHref(settings), "https://wa.me/77001234567");
  assert.equal(settings.reservationMinutes, 5);
  assert.equal(settings.pickupEnabled, true);
  assert.equal(settings.deliveryEnabled, false);
  assert.equal(settings.kaspiEnabled, true);
  assert.equal(settings.cashTransferEnabled, false);
});

test("Store settings: empty payload keeps production-safe defaults", () => {
  assert.deepEqual(normalizeStoreSettings(null), DEFAULT_STORE_SETTINGS);
});

test("Store settings: migration creates durable JSON settings table", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "maestro-settings-"));
  const database = path.join(directory, "settings.sqlite");
  const migration = readFileSync(new URL("../drizzle/0005_store_settings.sql", import.meta.url), "utf8");
  execFileSync("sqlite3", [database], { input: migration });
  const table = execFileSync("sqlite3", [database, "SELECT name FROM sqlite_master WHERE type='table' AND name='store_settings';"], { encoding: "utf8" }).trim();
  assert.equal(table, "store_settings");
});

test("Cost presets: shared payload is normalized before persistent storage", () => {
  const presets = normalizeCostPresets([{ id: "custom", name: "Струны", purchaseCurrency: "USD", cargoKzt: "450", installmentMonths: 0 }]);
  assert.equal(presets.length, 1);
  assert.equal(presets[0].cargoKzt, 450);
  assert.equal(presets[0].installmentMonths, 12);
  assert.equal(presets[0].purchaseCurrency, "USD");
});
