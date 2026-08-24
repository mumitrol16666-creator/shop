import { getD1Binding } from "../db";
import { DEFAULT_STORE_SETTINGS, normalizeStoreSettings, type StoreSettings } from "./store-settings";
import { DEFAULT_PRESETS, normalizeCostPresets, type CostPreset } from "./presets";

type SettingsD1 = {
  prepare: (sql: string) => {
    bind: (...values: unknown[]) => {
      first: <T = Record<string, unknown>>() => Promise<T | null>;
      run: () => Promise<unknown>;
    };
    run: () => Promise<unknown>;
  };
};

const SETTINGS_ID = "storefront";

async function ensureSettingsTable(d1: SettingsD1) {
  await d1.prepare(`CREATE TABLE IF NOT EXISTS store_settings (
    id TEXT PRIMARY KEY NOT NULL,
    data_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

export async function readStoreSettings(): Promise<StoreSettings> {
  const d1 = getD1Binding() as SettingsD1 | null;
  if (!d1) return DEFAULT_STORE_SETTINGS;
  await ensureSettingsTable(d1);
  const row = await d1.prepare("SELECT data_json FROM store_settings WHERE id = ? LIMIT 1")
    .bind(SETTINGS_ID)
    .first<{ data_json?: string }>();
  if (!row?.data_json) return DEFAULT_STORE_SETTINGS;
  try {
    return normalizeStoreSettings(JSON.parse(row.data_json));
  } catch {
    return DEFAULT_STORE_SETTINGS;
  }
}

export async function saveStoreSettings(value: unknown): Promise<StoreSettings> {
  const d1 = getD1Binding() as SettingsD1 | null;
  if (!d1) throw new Error("Постоянная база настроек недоступна");
  await ensureSettingsTable(d1);
  const settings = normalizeStoreSettings(value);
  const now = new Date().toISOString();
  await d1.prepare(`INSERT INTO store_settings (id, data_json, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`)
    .bind(SETTINGS_ID, JSON.stringify(settings), now, now)
    .run();
  return settings;
}

export async function readCostPresets(): Promise<CostPreset[]> {
  const d1 = getD1Binding() as SettingsD1 | null;
  if (!d1) return DEFAULT_PRESETS;
  await ensureSettingsTable(d1);
  const row = await d1.prepare("SELECT data_json FROM store_settings WHERE id = ? LIMIT 1")
    .bind("cost-presets")
    .first<{ data_json?: string }>();
  if (!row?.data_json) return DEFAULT_PRESETS;
  try {
    return normalizeCostPresets(JSON.parse(row.data_json));
  } catch {
    return DEFAULT_PRESETS;
  }
}

export async function saveCostPresets(value: unknown): Promise<CostPreset[]> {
  const d1 = getD1Binding() as SettingsD1 | null;
  if (!d1) throw new Error("Постоянная база шаблонов недоступна");
  await ensureSettingsTable(d1);
  const presets = normalizeCostPresets(value);
  const now = new Date().toISOString();
  await d1.prepare(`INSERT INTO store_settings (id, data_json, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`)
    .bind("cost-presets", JSON.stringify(presets), now, now)
    .run();
  return presets;
}
