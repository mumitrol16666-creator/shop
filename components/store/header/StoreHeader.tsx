"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CATALOG_CATEGORIES } from "../../../lib/commerce/categories";
import { SearchCombobox } from "./SearchCombobox";

export function StoreHeader({ cartCount, onCartOpen }: { cartCount: number; onCartOpen: () => void }) {
  const [compact, setCompact] = useState(false);
  const [secondaryVisible, setSecondaryVisible] = useState(true);
  const lastY = useRef(0);
  const directionDistance = useRef(0);
  const direction = useRef<"up" | "down">("up");

  useEffect(() => {
    const onScroll = () => {
      const nextY = Math.max(0, window.scrollY);
      const delta = nextY - lastY.current;
      setCompact(nextY > 96);
      if (Math.abs(delta) < 2) return;
      const nextDirection = delta > 0 ? "down" : "up";
      if (nextDirection !== direction.current) {
        direction.current = nextDirection;
        directionDistance.current = 0;
      }
      directionDistance.current += Math.abs(delta);
      if (nextDirection === "down" && nextY > 140 && directionDistance.current > 28) setSecondaryVisible(false);
      if (nextDirection === "up" && directionDistance.current > 18) setSecondaryVisible(true);
      if (nextY < 80) setSecondaryVisible(true);
      lastY.current = nextY;
    };
    lastY.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`store-header ${compact ? "is-compact" : ""} ${secondaryVisible ? "is-secondary-visible" : "is-secondary-hidden"}`}>
      <div className="store-header__main">
        <Link href="/" className="store-brand" aria-label="Maestro Music Store — на главную">
          <span>M</span><strong>MAESTRO<small>MUSIC STORE</small></strong>
        </Link>
        <Link href="/catalog" className="store-catalog-link">Каталог</Link>
        <SearchCombobox />
        <a className="store-header__contact" href="https://wa.me/77775055788" target="_blank" rel="noopener noreferrer">+7 777 505-57-88</a>
        <button type="button" className="store-cart-button" onClick={onCartOpen} aria-label={`Корзина, ${cartCount} товаров`}>
          <span aria-hidden="true">🛒</span><span>Корзина</span><b>{cartCount}</b>
        </button>
      </div>
      <nav className="store-header__secondary" aria-label="Категории магазина">
        {CATALOG_CATEGORIES.map((category) => <Link key={category.slug} href={`/catalog/${category.slug}`}>{category.displayName}</Link>)}
        <Link href="/picker">Подобрать новичку</Link>
      </nav>
    </header>
  );
}
