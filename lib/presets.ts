export type CostPreset = {
  id: string;
  name: string;
  description?: string;
  categoryHint?: string;
  purchaseCurrency: "CNY" | "USD" | "KZT";
  chinaDeliveryKzt: number;
  cargoKzt: number;
  customsKzt: number;
  packagingKzt: number;
  setupKzt: number;
  marketingKzt: number;
  otherCostsKzt: number;
  taxPercent: number;
  bankInstallmentPercent: number;
  installmentMonths: number;
  sellerPercent: number;
  targetProfitPercent: number;
};

export const DEFAULT_PRESETS: CostPreset[] = [
  {
    id: "preset-electric",
    name: "Электрогитара (с отстройкой мастера)",
    description: "Стандарт для электрогитар: карго 2.8к, упаковка 700₸, доводка анкера и мензуры 2.5к",
    categoryHint: "Электрогитары",
    purchaseCurrency: "CNY",
    chinaDeliveryKzt: 1200,
    cargoKzt: 2800,
    customsKzt: 500,
    packagingKzt: 700,
    setupKzt: 2500,
    marketingKzt: 1200,
    otherCostsKzt: 300,
    taxPercent: 3,
    bankInstallmentPercent: 11,
    installmentMonths: 12,
    sellerPercent: 5,
    targetProfitPercent: 35,
  },
  {
    id: "preset-acoustic-41",
    name: "Акустическая / Классическая гитара (40–41″)",
    description: "Полноразмерная акустика: объемная коробка, отстройка высоты струн 2к",
    categoryHint: "Акустические",
    purchaseCurrency: "CNY",
    chinaDeliveryKzt: 1100,
    cargoKzt: 2600,
    customsKzt: 400,
    packagingKzt: 800,
    setupKzt: 2000,
    marketingKzt: 1000,
    otherCostsKzt: 300,
    taxPercent: 3,
    bankInstallmentPercent: 11,
    installmentMonths: 12,
    sellerPercent: 5,
    targetProfitPercent: 35,
  },
  {
    id: "preset-ukulele",
    name: "Укулеле (компактная партия)",
    description: "Компактная упаковка, легкий вес, проверка строя 1к",
    categoryHint: "Укулеле",
    purchaseCurrency: "CNY",
    chinaDeliveryKzt: 600,
    cargoKzt: 1200,
    customsKzt: 200,
    packagingKzt: 400,
    setupKzt: 1000,
    marketingKzt: 800,
    otherCostsKzt: 200,
    taxPercent: 3,
    bankInstallmentPercent: 11,
    installmentMonths: 12,
    sellerPercent: 5,
    targetProfitPercent: 35,
  },
  {
    id: "preset-effects-amp",
    name: "Процессоры эффектов / Комбоусилители",
    description: "Электроника: заводская упаковка, проверка питания, без доводки мастера",
    categoryHint: "Оборудование",
    purchaseCurrency: "CNY",
    chinaDeliveryKzt: 800,
    cargoKzt: 1800,
    customsKzt: 300,
    packagingKzt: 500,
    setupKzt: 0,
    marketingKzt: 1000,
    otherCostsKzt: 200,
    taxPercent: 3,
    bankInstallmentPercent: 11,
    installmentMonths: 12,
    sellerPercent: 5,
    targetProfitPercent: 30,
  },
  {
    id: "preset-accessories",
    name: "Аксессуары (струны, каподастры, ремни)",
    description: "Мелкий опт: минимальное карго на единицу, без доводки",
    categoryHint: "Аксессуары",
    purchaseCurrency: "CNY",
    chinaDeliveryKzt: 100,
    cargoKzt: 300,
    customsKzt: 50,
    packagingKzt: 150,
    setupKzt: 0,
    marketingKzt: 300,
    otherCostsKzt: 50,
    taxPercent: 3,
    bankInstallmentPercent: 11,
    installmentMonths: 12,
    sellerPercent: 5,
    targetProfitPercent: 40,
  },
];

export function normalizeCostPresets(value: unknown): CostPreset[] {
  if (!Array.isArray(value)) return DEFAULT_PRESETS;
  const normalized = value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const source = item as Partial<CostPreset>;
    const name = typeof source.name === "string" ? source.name.trim().slice(0, 100) : "";
    if (!name) return [];
    const number = (candidate: unknown) => Math.max(0, Number.isFinite(Number(candidate)) ? Number(candidate) : 0);
    const purchaseCurrency = ["CNY", "USD", "KZT"].includes(source.purchaseCurrency || "")
      ? source.purchaseCurrency as CostPreset["purchaseCurrency"]
      : "KZT";
    return [{
      id: typeof source.id === "string" && source.id.trim() ? source.id.trim().slice(0, 80) : `preset-${index + 1}`,
      name,
      description: typeof source.description === "string" ? source.description.trim().slice(0, 240) : "",
      categoryHint: typeof source.categoryHint === "string" ? source.categoryHint.trim().slice(0, 80) : "",
      purchaseCurrency,
      chinaDeliveryKzt: number(source.chinaDeliveryKzt),
      cargoKzt: number(source.cargoKzt),
      customsKzt: number(source.customsKzt),
      packagingKzt: number(source.packagingKzt),
      setupKzt: number(source.setupKzt),
      marketingKzt: number(source.marketingKzt),
      otherCostsKzt: number(source.otherCostsKzt),
      taxPercent: number(source.taxPercent),
      bankInstallmentPercent: number(source.bankInstallmentPercent),
      installmentMonths: Math.max(1, Math.round(number(source.installmentMonths) || 12)),
      sellerPercent: number(source.sellerPercent),
      targetProfitPercent: number(source.targetProfitPercent),
    }];
  });
  return normalized.length ? normalized : DEFAULT_PRESETS;
}

const STORAGE_KEY = "maestro_cost_presets";

export function loadPresets(): CostPreset[] {
  if (typeof window === "undefined") return DEFAULT_PRESETS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PRESETS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {}
  return DEFAULT_PRESETS;
}

export function savePresets(presets: CostPreset[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {}
}

export async function loadPresetsRemote(): Promise<CostPreset[]> {
  const response = await fetch("/api/cost-presets", { cache: "no-store", credentials: "same-origin" });
  const payload = await response.json();
  if (!response.ok || !Array.isArray(payload.presets)) throw new Error(payload.error || "Шаблоны не загрузились");
  const presets = normalizeCostPresets(payload.presets);
  savePresets(presets);
  return presets;
}

export async function savePresetsRemote(presets: CostPreset[]): Promise<void> {
  const response = await fetch("/api/cost-presets", {
    method: "PUT",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ presets: normalizeCostPresets(presets) }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Шаблоны не сохранились");
}
