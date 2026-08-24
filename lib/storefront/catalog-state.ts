import type { ProductReadModel } from "../commerce/types";
import { productPriceSummary } from "../product-variants.ts";

export type CatalogSort = "popular" | "price_asc" | "price_desc" | "discount";

export type CatalogUrlState = {
  q: string;
  availability: "all" | "in_stock";
  sale: boolean;
  price: "all" | "under_30000" | "30000_50000" | "over_50000";
  sort: CatalogSort;
};

export const DEFAULT_CATALOG_STATE: CatalogUrlState = {
  q: "",
  availability: "all",
  sale: false,
  price: "all",
  sort: "popular",
};

export function parseCatalogState(input: URLSearchParams | string): CatalogUrlState {
  const params = typeof input === "string" ? new URLSearchParams(input) : input;
  const availability = params.get("availability") === "in_stock" ? "in_stock" : "all";
  const priceValue = params.get("price");
  const price = ["under_30000", "30000_50000", "over_50000"].includes(priceValue || "")
    ? priceValue as CatalogUrlState["price"]
    : "all";
  const sortValue = params.get("sort");
  const sort = ["price_asc", "price_desc", "discount"].includes(sortValue || "")
    ? sortValue as CatalogSort
    : "popular";
  return {
    q: (params.get("q") || "").trim(),
    availability,
    sale: params.get("sale") === "1",
    price,
    sort,
  };
}

export function serializeCatalogState(state: CatalogUrlState): string {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.availability === "in_stock") params.set("availability", "in_stock");
  if (state.sale) params.set("sale", "1");
  if (state.price !== "all") params.set("price", state.price);
  if (state.sort !== "popular") params.set("sort", state.sort);
  return params.toString();
}

const isDiscounted = (product: ProductReadModel) => product.defaultPrice.discount > 0;

export function selectCatalogProducts(
  products: ProductReadModel[],
  categorySlug: string | null,
  state: CatalogUrlState,
) {
  const term = state.q.toLowerCase();
  const selected = products.filter((product) => {
    if (categorySlug && product.categorySlug !== categorySlug) return false;
    if (state.availability === "in_stock" && product.availability.status !== "in_stock") return false;
    if (state.sale && !isDiscounted(product)) return false;
    const price = productPriceSummary(product).minimum;
    if (state.price === "under_30000" && price >= 30_000) return false;
    if (state.price === "30000_50000" && (price < 30_000 || price > 50_000)) return false;
    if (state.price === "over_50000" && price <= 50_000) return false;
    return !term || product.searchableAttributes.some((attribute) => attribute.toLowerCase().includes(term));
  });

  return selected.sort((left, right) => {
    if (state.sort === "price_asc") return productPriceSummary(left).minimum - productPriceSummary(right).minimum;
    if (state.sort === "price_desc") return productPriceSummary(right).minimum - productPriceSummary(left).minimum;
    if (state.sort === "discount") return right.defaultPrice.discount - left.defaultPrice.discount;
    return Number(right.availability.status === "in_stock") - Number(left.availability.status === "in_stock");
  });
}
