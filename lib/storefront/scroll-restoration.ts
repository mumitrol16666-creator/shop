const STORAGE_KEY = "maestro-catalog-return-v1";

export type CatalogReturnContext = {
  url: string;
  scrollY: number;
  productId: string;
  savedAt: number;
};

export function saveCatalogReturn(productId: string) {
  if (typeof window === "undefined") return;
  const context: CatalogReturnContext = {
    url: `${window.location.pathname}${window.location.search}`,
    scrollY: window.scrollY,
    productId,
    savedAt: Date.now(),
  };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context));
}

export function consumeCatalogReturn(currentUrl: string): CatalogReturnContext | null {
  if (typeof window === "undefined") return null;
  try {
    const context = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || "null") as CatalogReturnContext | null;
    if (!context || context.url !== currentUrl || Date.now() - context.savedAt > 30 * 60_000) return null;
    window.sessionStorage.removeItem(STORAGE_KEY);
    return context;
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
