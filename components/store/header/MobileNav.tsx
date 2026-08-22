"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { StoreRoute } from "../StoreRuntime";

type MobileNavProps = {
  route: StoreRoute;
  cartCount: number;
  onCartOpen: () => void;
};

export function MobileNav({ route, cartCount, onCartOpen }: MobileNavProps) {
  const isHome = route.kind === "home";
  const isCatalog = route.kind === "catalog";
  const isPicker = route.kind === "picker";
  const isCart = route.kind === "cart" || route.kind === "checkout";

  const [bump, setBump] = useState(false);
  const prevCount = useRef(cartCount);
  useEffect(() => {
    if (cartCount > prevCount.current) {
      setBump(true);
      const timer = setTimeout(() => setBump(false), 900);
      return () => clearTimeout(timer);
    }
    prevCount.current = cartCount;
  }, [cartCount]);

  return (
    <nav className="store-mobile-nav" aria-label="Мобильная навигация">
      <Link href="/" className={`store-mobile-nav__item ${isHome ? "is-active" : ""}`} aria-label="Главная">
        <svg className="store-mobile-nav__icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>Главная</span>
      </Link>

      <Link href="/catalog" className={`store-mobile-nav__item ${isCatalog ? "is-active" : ""}`} aria-label="Каталог">
        <svg className="store-mobile-nav__icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="7" x="3" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="14" rx="1" />
          <rect width="7" height="7" x="3" y="14" rx="1" />
        </svg>
        <span>Каталог</span>
      </Link>

      <Link href="/picker" className={`store-mobile-nav__item ${isPicker ? "is-active" : ""}`} aria-label="Подбор инструмента">
        <svg className="store-mobile-nav__icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
        <span>Подбор</span>
      </Link>

      <button
        type="button"
        className={`store-mobile-nav__item ${isCart ? "is-active" : ""} ${bump ? "is-cart-bumped" : ""}`}
        onClick={onCartOpen}
        aria-label={`Корзина, ${cartCount} товаров`}
      >
        <div className="store-mobile-nav__cart-wrap">
          <svg className="store-mobile-nav__icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
          {cartCount > 0 && <span className="store-mobile-nav__badge">{cartCount}</span>}
        </div>
        <span>Корзина</span>
      </button>

      <a href="https://wa.me/77775055788" target="_blank" rel="noopener noreferrer" className="store-mobile-nav__item store-mobile-nav__wa" aria-label="WhatsApp консультация">
        <svg className="store-mobile-nav__icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        <span>WhatsApp</span>
      </a>
    </nav>
  );
}
