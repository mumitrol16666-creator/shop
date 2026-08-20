"use client";

import { useEffect, useMemo, useState } from "react";
import { categoryBySlug } from "../../lib/commerce/categories";
import type { ProductReadModel } from "../../lib/commerce/types";
import { StoreRuntime, type StoreRoute } from "./StoreRuntime";

function resolveRoute(pathname: string, products: ProductReadModel[]): StoreRoute {
  if (pathname === "/") return { kind: "home" };
  if (pathname === "/catalog") return { kind: "catalog" };
  const category = pathname.match(/^\/catalog\/([^/]+)\/?$/)?.[1];
  if (category) return categoryBySlug(category) ? { kind: "catalog", categorySlug: category } : { kind: "not-found" };
  const productSlug = pathname.match(/^\/product\/([^/]+)\/?$/)?.[1];
  if (productSlug) {
    const product = products.find((item) => item.slug === decodeURIComponent(productSlug));
    return product ? { kind: "product", product } : { kind: "not-found" };
  }
  if (pathname === "/picker") return { kind: "picker" };
  if (pathname === "/cart") return { kind: "cart" };
  return { kind: "not-found" };
}

export function VpsStoreRoot() {
  const [locationKey, setLocationKey] = useState(() => `${window.location.pathname}${window.location.search}`);
  const [products, setProducts] = useState<ProductReadModel[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const onPopState = () => setLocationKey(`${window.location.pathname}${window.location.search}`);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/catalog", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("catalog unavailable")))
      .then((payload: { products?: ProductReadModel[] }) => setProducts(Array.isArray(payload.products) ? payload.products : []))
      .catch((cause) => { if (!(cause instanceof DOMException && cause.name === "AbortError")) setError("Каталог временно недоступен."); });
    return () => controller.abort();
  }, []);
  const route = useMemo(() => resolveRoute(new URL(locationKey, window.location.origin).pathname, products), [locationKey, products]);
  if (error) return <main className="store-main"><section className="store-page store-not-found"><h1>Не удалось загрузить каталог</h1><p>{error}</p></section></main>;
  if (!products.length) return <main className="store-main"><section className="store-page" role="status">Загружаем каталог…</section></main>;
  return <StoreRuntime products={products} route={route} />;
}
