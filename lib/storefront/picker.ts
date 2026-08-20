import type { ProductReadModel } from "../commerce/types";

export type PickerAnswers = {
  person?: "self" | "child";
  size?: "small" | "teen" | "adult";
  use?: "electric" | "acoustic" | "ukulele" | "flexible";
  budget?: "under_25000" | "under_40000" | "under_70000" | "any";
  priority?: "comfort" | "price" | "sound";
};

const withinBudget = (price: number, budget: PickerAnswers["budget"]) => {
  if (budget === "under_25000") return price <= 25_000;
  if (budget === "under_40000") return price <= 40_000;
  if (budget === "under_70000") return price <= 70_000;
  return true;
};

export function recommendProducts(products: ProductReadModel[], answers: PickerAnswers, limit = 3) {
  return products
    .filter((product) => product.availability.status === "in_stock")
    .map((product) => {
      let score = 0;
      const haystack = product.searchableAttributes.join(" ").toLowerCase();
      if (withinBudget(product.defaultPrice.final, answers.budget)) score += 6;
      else score -= 5;
      if (answers.use === "electric" && product.categorySlug === "electric-guitars") score += 9;
      if (answers.use === "acoustic" && ["acoustic-guitars", "classical-guitars"].includes(product.categorySlug)) score += 9;
      if (answers.use === "ukulele" && product.categorySlug === "ukuleles") score += 9;
      if (answers.use === "flexible") score += 2;
      if (answers.person === "child" && ["ukuleles", "classical-guitars"].includes(product.categorySlug)) score += 5;
      if (answers.size === "small" && /21|23|38|компакт|дет/.test(haystack)) score += 4;
      if (answers.size === "adult" && /39|40|41|полноразмер/.test(haystack)) score += 3;
      if (answers.priority === "comfort" && /мягк|нейлон|удоб|начина/.test(haystack)) score += 4;
      if (answers.priority === "price") score += Math.max(0, 5 - product.defaultPrice.final / 20_000);
      if (answers.priority === "sound" && /звук|hss|sss|полноразмер/.test(haystack)) score += 4;
      return { product, score };
    })
    .sort((left, right) => right.score - left.score || left.product.defaultPrice.final - right.product.defaultPrice.final)
    .slice(0, Math.max(0, limit))
    .map(({ product }) => product);
}

