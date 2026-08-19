export type PricingInput = {
  purchasePrice: number;
  currencyRate: number;
  chinaDeliveryKzt: number;
  cargoKzt: number;
  customsKzt: number;
  packagingKzt: number;
  setupKzt: number;
  marketingKzt: number;
  otherCostsKzt: number;
  taxPercent: number;
  bankInstallmentPercent: number;
  sellerPercent: number;
  targetProfitPercent: number;
  pricingMode: "auto" | "manual";
  manualPriceKzt?: number | null;
  hasDiscount?: boolean;
  discountPercent?: number;
  originalPriceKzt?: number | null;
};

export type PricingResult = {
  purchasePriceKzt: number;
  fixedCostKzt: number;
  variableExpensePercent: number;
  targetProfitKzt: number;
  recommendedPriceKzt: number;
  basePriceKzt: number;
  originalPriceKzt: number;
  finalPriceKzt: number;
  hasDiscount: boolean;
  discountPercent: number;
  discountAmountKzt: number;
  breakEvenPriceKzt: number;
  taxAmountKzt: number;
  bankAmountKzt: number;
  sellerAmountKzt: number;
  netRevenueKzt: number;
  profitKzt: number;
  marginPercent: number;
  markupOnCostPercent: number;
};

const finiteNonnegative = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

export function calculateProductPricing(input: PricingInput): PricingResult {
  const purchasePrice = finiteNonnegative(input.purchasePrice);
  const currencyRate = finiteNonnegative(input.currencyRate);
  const purchasePriceKzt = purchasePrice * currencyRate;
  const fixedCostKzt =
    purchasePriceKzt +
    finiteNonnegative(input.chinaDeliveryKzt) +
    finiteNonnegative(input.cargoKzt) +
    finiteNonnegative(input.customsKzt) +
    finiteNonnegative(input.packagingKzt) +
    finiteNonnegative(input.setupKzt) +
    finiteNonnegative(input.marketingKzt) +
    finiteNonnegative(input.otherCostsKzt);
  const taxPercent = finiteNonnegative(input.taxPercent);
  const bankInstallmentPercent = finiteNonnegative(
    input.bankInstallmentPercent,
  );
  const sellerPercent = finiteNonnegative(input.sellerPercent);
  const variableExpensePercent =
    taxPercent + bankInstallmentPercent + sellerPercent;

  if (variableExpensePercent >= 100) {
    throw new Error("Сумма налога, банка и продавца должна быть меньше 100%.");
  }

  const targetProfitKzt =
    fixedCostKzt * (finiteNonnegative(input.targetProfitPercent) / 100);
  const expenseFactor = 1 - variableExpensePercent / 100;
  const recommendedPriceKzt =
    (fixedCostKzt + targetProfitKzt) / expenseFactor;
  
  const manualPriceKzt = finiteNonnegative(input.manualPriceKzt ?? 0);
  const basePriceKzt =
    input.pricingMode === "manual" ? manualPriceKzt : recommendedPriceKzt;

  const hasDiscount = Boolean(input.hasDiscount && (input.discountPercent || 0) > 0);
  const discountPercent = hasDiscount ? finiteNonnegative(input.discountPercent || 0) : 0;

  let originalPriceKzt = basePriceKzt;
  let finalPriceKzt = basePriceKzt;
  let discountAmountKzt = 0;

  if (hasDiscount && discountPercent > 0) {
    if (input.originalPriceKzt && input.originalPriceKzt > 0) {
      originalPriceKzt = input.originalPriceKzt;
      finalPriceKzt = Math.round(originalPriceKzt * (1 - discountPercent / 100));
    } else {
      originalPriceKzt = Math.round(basePriceKzt / (1 - discountPercent / 100));
      finalPriceKzt = Math.round(basePriceKzt);
    }
    discountAmountKzt = Math.max(0, originalPriceKzt - finalPriceKzt);
  }

  const breakEvenPriceKzt = fixedCostKzt / expenseFactor;
  const taxAmountKzt = finalPriceKzt * (taxPercent / 100);
  const bankAmountKzt =
    finalPriceKzt * (bankInstallmentPercent / 100);
  const sellerAmountKzt = finalPriceKzt * (sellerPercent / 100);
  const netRevenueKzt =
    finalPriceKzt - taxAmountKzt - bankAmountKzt - sellerAmountKzt;
  const profitKzt = netRevenueKzt - fixedCostKzt;
  const marginPercent = finalPriceKzt
    ? (profitKzt / finalPriceKzt) * 100
    : 0;
  const markupOnCostPercent = fixedCostKzt
    ? (profitKzt / fixedCostKzt) * 100
    : 0;

  return {
    purchasePriceKzt,
    fixedCostKzt,
    variableExpensePercent,
    targetProfitKzt,
    recommendedPriceKzt,
    basePriceKzt,
    originalPriceKzt,
    finalPriceKzt,
    hasDiscount,
    discountPercent,
    discountAmountKzt,
    breakEvenPriceKzt,
    taxAmountKzt,
    bankAmountKzt,
    sellerAmountKzt,
    netRevenueKzt,
    profitKzt,
    marginPercent,
    markupOnCostPercent,
  };
}
