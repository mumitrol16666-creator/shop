export type StoreSettings = {
  announcement: string;
  heroTitle: string;
  heroDescription: string;
  city: string;
  whatsappPhone: string;
  reservationMinutes: number;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  kaspiEnabled: boolean;
  cashTransferEnabled: boolean;
};

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  announcement: "⚡ Бесплатная отстройка мастером · Доставка по Актобе · Kaspi Pay",
  heroTitle: "Музыкальные инструменты, готовые к первой игре",
  heroDescription: "Проверяем, настраиваем и доводим каждый инструмент перед выдачей. Вы выбираете модель и цвет — мы готовим её к занятиям.",
  city: "Актобе",
  whatsappPhone: "77775055788",
  reservationMinutes: 30,
  pickupEnabled: true,
  deliveryEnabled: true,
  kaspiEnabled: true,
  cashTransferEnabled: true,
};

const textValue = (value: unknown, fallback: string, maxLength: number) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : fallback;

export function normalizeStoreSettings(value: unknown): StoreSettings {
  const input = value && typeof value === "object" ? value as Partial<StoreSettings> : {};
  let pickupEnabled = input.pickupEnabled !== false;
  const deliveryEnabled = input.deliveryEnabled !== false;
  let kaspiEnabled = input.kaspiEnabled !== false;
  const cashTransferEnabled = input.cashTransferEnabled !== false;
  if (!pickupEnabled && !deliveryEnabled) pickupEnabled = true;
  if (!kaspiEnabled && !cashTransferEnabled) kaspiEnabled = true;
  return {
    announcement: textValue(input.announcement, DEFAULT_STORE_SETTINGS.announcement, 180),
    heroTitle: textValue(input.heroTitle, DEFAULT_STORE_SETTINGS.heroTitle, 120),
    heroDescription: textValue(input.heroDescription, DEFAULT_STORE_SETTINGS.heroDescription, 320),
    city: textValue(input.city, DEFAULT_STORE_SETTINGS.city, 80),
    whatsappPhone: textValue(input.whatsappPhone, DEFAULT_STORE_SETTINGS.whatsappPhone, 24).replace(/\D/g, "") || DEFAULT_STORE_SETTINGS.whatsappPhone,
    reservationMinutes: Math.min(1440, Math.max(5, Math.round(Number(input.reservationMinutes) || DEFAULT_STORE_SETTINGS.reservationMinutes))),
    pickupEnabled,
    deliveryEnabled,
    kaspiEnabled,
    cashTransferEnabled,
  };
}

export const whatsappHref = (settings: StoreSettings) => `https://wa.me/${settings.whatsappPhone}`;
