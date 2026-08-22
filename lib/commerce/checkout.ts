export const FULFILMENT_METHODS = ["pickup", "aktobe_delivery"] as const;
export const PAYMENT_METHODS = ["kaspi_pay", "cash_transfer"] as const;

export type FulfilmentMethod = (typeof FULFILMENT_METHODS)[number];
export type CheckoutPaymentMethod = (typeof PAYMENT_METHODS)[number];

export const fulfilmentLabels: Record<FulfilmentMethod, string> = {
  pickup: "Самовывоз",
  aktobe_delivery: "Доставка по Актобе",
};

export const paymentLabels: Record<CheckoutPaymentMethod, string> = {
  kaspi_pay: "Kaspi Pay / QR",
  cash_transfer: "Наличные или перевод",
};

export function normalizeFulfilmentMethod(value: string): FulfilmentMethod | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "pickup" || normalized.includes("самовывоз")) return "pickup";
  if (normalized === "aktobe_delivery" || normalized.includes("актобе")) return "aktobe_delivery";
  return null;
}

export function normalizePaymentMethod(value: string): CheckoutPaymentMethod | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "kaspi_pay" || normalized.includes("kaspi") || normalized.includes("каспи")) return "kaspi_pay";
  if (normalized === "cash_transfer" || normalized.includes("налич") || normalized.includes("перевод")) return "cash_transfer";
  return null;
}

export const orderDisplayId = (createdAt: string, token: string) =>
  `MM-${createdAt.slice(0, 10).replace(/-/g, "")}-${token.slice(0, 8).toUpperCase()}`;
