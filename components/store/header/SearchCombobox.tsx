"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { money } from "../../../lib/catalog-data";
import type { ProductReadModel } from "../../../lib/commerce/types";

export function SearchCombobox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [results, setResults] = useState<ProductReadModel[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const response = await fetch("/api/catalog", { signal: controller.signal });
        const payload = await response.json() as { products?: ProductReadModel[] };
        if (!response.ok || !Array.isArray(payload.products)) throw new Error("Поиск временно недоступен.");
        const normalized = term.toLowerCase();
        const next = payload.products
          .filter((product) => product.searchableAttributes.some((value) => value.toLowerCase().includes(normalized)))
          .slice(0, 6);
        setResults(next);
        setActiveIndex(next.length ? 0 : -1);
        setOpen(true);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError("Не удалось выполнить поиск.");
        setResults([]);
        setOpen(true);
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const allResultsUrl = `/catalog?q=${encodeURIComponent(query.trim())}`;
  const navigateResult = (product: ProductReadModel) => {
    setOpen(false);
    router.push(`/product/${product.slug}`);
  };

  return (
    <div className="store-search" ref={rootRef}>
      <label className="store-search__input">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          role="combobox"
          aria-label="Поиск по каталогу"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          placeholder="Поиск по каталогу"
          value={query}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            if (nextQuery.trim().length < 2) {
              abortRef.current?.abort();
              setResults([]);
              setOpen(false);
              setLoading(false);
              setError("");
              setActiveIndex(-1);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) => Math.min(results.length - 1, index + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(0, index - 1));
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (open && activeIndex >= 0 && results[activeIndex]) navigateResult(results[activeIndex]);
              else if (query.trim().length >= 2) router.push(allResultsUrl);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {loading && <span className="store-search__loading" aria-label="Поиск">…</span>}
      </label>
      {open && (
        <div className="store-search__results" id={listId} role="listbox">
          {error ? <p role="alert">{error}</p> : results.length ? results.map((product, index) => (
            <button
              id={`${listId}-${index}`}
              key={product.id}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              className={activeIndex === index ? "is-active" : ""}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => navigateResult(product)}
            >
              <span className="store-search__thumb"><Image src={product.image} alt="" fill unoptimized sizes="48px" /></span>
              <span><strong>{product.name}</strong><small>{product.availability.status === "in_stock" ? "В наличии" : "Нет в наличии"}</small></span>
              <b>{money(product.defaultPrice.final)} ₸</b>
            </button>
          )) : <p>По запросу ничего не найдено.</p>}
          <button type="button" className="store-search__all" onClick={() => { setOpen(false); router.push(allResultsUrl); }}>
            Все результаты →
          </button>
        </div>
      )}
    </div>
  );
}
