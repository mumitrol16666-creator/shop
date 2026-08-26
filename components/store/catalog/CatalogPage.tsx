"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { categoriesFromCatalog } from "../../../lib/commerce/categories";
import type { ProductReadModel } from "../../../lib/commerce/types";
import { parseCatalogState, selectCatalogProducts, serializeCatalogState, type CatalogUrlState } from "../../../lib/storefront/catalog-state";
import { consumeCatalogReturn } from "../../../lib/storefront/scroll-restoration";
import { ProductGrid } from "./ProductGrid";

export function CatalogPage({ products, categorySlug, onNotice }: { products: ProductReadModel[]; categorySlug?: string; onNotice: (message: string) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const anchorRef = useRef<string | null>(null);
  const state = useMemo(() => parseCatalogState(searchParams), [searchParams]);
  const displayed = useMemo(() => selectCatalogProducts(products, categorySlug || null, state), [products, categorySlug, state]);
  const categories = useMemo(() => categoriesFromCatalog(products), [products]);
  const category = categorySlug ? categories.find((item) => item.slug === categorySlug) : null;

  useEffect(() => {
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    const context = consumeCatalogReturn(currentUrl);
    if (!context) return;
    window.requestAnimationFrame(() => {
      const card = document.getElementById(`product-${context.productId}`);
      if (card) {
        card.scrollIntoView({ block: "center" });
        card.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
      } else window.scrollTo({ top: context.scrollY });
    });
  }, []);

  useEffect(() => {
    if (!anchorRef.current) return;
    const anchor = document.getElementById(`product-${anchorRef.current}`);
    if (anchor) anchor.scrollIntoView({ block: "start" });
    else headingRef.current?.scrollIntoView({ block: "start" });
    anchorRef.current = null;
  }, [searchParams]);

  const update = (patch: Partial<CatalogUrlState>) => {
    const query = serializeCatalogState({ ...state, ...patch });
    router.replace(`${pathname}${query ? `?${query}` : ""}`);
  };
  const reset = () => router.replace(pathname);

  return (
    <div className="store-page store-catalog-page">
      <header className="store-catalog-heading">
        <p className="store-eyebrow">КАТАЛОГ MAESTRO</p>
        <h1 ref={headingRef}>{category?.displayName || "Все инструменты"}</h1>
        <p>{state.q ? `Результаты по запросу «${state.q}»` : "Реальные цены, варианты и остатки из единого каталога."}</p>
      </header>

      <nav className="store-category-rail" aria-label="Категории каталога">
        <Link href="/catalog" aria-current={!categorySlug ? "page" : undefined}>Все</Link>
        {categories.map((item) => <Link key={item.slug} href={`/catalog/${item.slug}`} aria-current={categorySlug === item.slug ? "page" : undefined}>{item.displayName}</Link>)}
      </nav>

      {state.q && (
        <div className="store-active-filters" aria-label="Активные фильтры">
          <button onClick={() => update({ q: "" })}>Поиск: {state.q} ×</button>
          <button onClick={reset}>Сбросить всё</button>
        </div>
      )}

      <div className="store-results-summary"><strong>{displayed.length}</strong> товар(ов)</div>
      <ProductGrid products={displayed} onNotice={onNotice} />
    </div>
  );
}
