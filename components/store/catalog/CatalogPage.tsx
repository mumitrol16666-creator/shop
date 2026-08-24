"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { categoriesFromCatalog } from "../../../lib/commerce/categories";
import type { ProductReadModel } from "../../../lib/commerce/types";
import { parseCatalogState, selectCatalogProducts, serializeCatalogState, type CatalogUrlState } from "../../../lib/storefront/catalog-state";
import { consumeCatalogReturn } from "../../../lib/storefront/scroll-restoration";
import { Sheet } from "../feedback/Overlay";
import { ProductGrid } from "./ProductGrid";

function CatalogControls({ state, update, className = "" }: { state: CatalogUrlState; update: (patch: Partial<CatalogUrlState>) => void; className?: string }) {
  return (
    <section className={`store-catalog-toolbar ${className}`} aria-label="Фильтры и сортировка">
      <label>Наличие<select value={state.availability} onChange={(event) => update({ availability: event.target.value as CatalogUrlState["availability"] })}><option value="all">Все</option><option value="in_stock">В наличии</option></select></label>
      <label>Цена<select value={state.price} onChange={(event) => update({ price: event.target.value as CatalogUrlState["price"] })}><option value="all">Любая</option><option value="under_30000">До 30 000 ₸</option><option value="30000_50000">30–50 тыс. ₸</option><option value="over_50000">От 50 000 ₸</option></select></label>
      <label className="store-checkbox"><input type="checkbox" checked={state.sale} onChange={(event) => update({ sale: event.target.checked })} /> Только со скидкой</label>
      <label>Сортировка<select value={state.sort} onChange={(event) => update({ sort: event.target.value as CatalogUrlState["sort"] })}><option value="popular">По популярности</option><option value="price_asc">Сначала дешевле</option><option value="price_desc">Сначала дороже</option><option value="discount">По скидке</option></select></label>
    </section>
  );
}

export function CatalogPage({ products, categorySlug, onNotice }: { products: ProductReadModel[]; categorySlug?: string; onNotice: (message: string) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const anchorRef = useRef<string | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
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

  const captureAnchor = () => {
    const cards = [...document.querySelectorAll<HTMLElement>("[data-product-id]")];
    const nearest = cards.find((card) => card.getBoundingClientRect().bottom > 140);
    anchorRef.current = nearest?.dataset.productId || null;
  };
  const update = (patch: Partial<CatalogUrlState>) => {
    captureAnchor();
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

      <CatalogControls state={state} update={update} />
      <button type="button" className="store-catalog-sheet-trigger" onClick={() => setFilterSheetOpen(true)}>Фильтры и сортировка</button>
      <Sheet open={filterSheetOpen} onClose={() => setFilterSheetOpen(false)} label="Фильтры и сортировка">
        <CatalogControls state={state} update={update} className="store-catalog-toolbar--sheet" />
      </Sheet>

      {(state.q || state.availability !== "all" || state.price !== "all" || state.sale || state.sort !== "popular") && (
        <div className="store-active-filters" aria-label="Активные фильтры">
          {state.q && <button onClick={() => update({ q: "" })}>Поиск: {state.q} ×</button>}
          {state.availability === "in_stock" && <button onClick={() => update({ availability: "all" })}>В наличии ×</button>}
          {state.sale && <button onClick={() => update({ sale: false })}>Со скидкой ×</button>}
          {state.price !== "all" && <button onClick={() => update({ price: "all" })}>Цена ×</button>}
          {state.sort !== "popular" && <button onClick={() => update({ sort: "popular" })}>Сортировка ×</button>}
          <button onClick={reset}>Сбросить всё</button>
        </div>
      )}

      <div className="store-results-summary"><strong>{displayed.length}</strong> товар(ов)</div>
      <ProductGrid products={displayed} onNotice={onNotice} />
    </div>
  );
}
