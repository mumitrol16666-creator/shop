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
