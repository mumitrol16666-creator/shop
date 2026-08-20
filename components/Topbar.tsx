"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { DEFAULT_WHATSAPP_PHONE, DISPLAY_WHATSAPP_PHONE, products as defaultProducts, money, type Product } from "../lib/catalog-data";

type TopbarProps = {
  query: string;
  setQuery: (query: string) => void;
  cartCount: number;
  setCartOpen: (open: boolean) => void;
  onSelectProduct?: (product: Product) => void;
};

export function Topbar({
  query,
  setQuery,
  cartCount,
  setCartOpen,
  onSelectProduct,
}: TopbarProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const searchResults = query.trim().length >= 2
    ? defaultProducts.filter((p) => {
        const q = query.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
        );
      }).slice(0, 4)
    : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="topbar">
      <Link
        href="/"
        className="brand"
        aria-label="На главную"
      >
        <span className="brand-mark">M</span>
        <span className="brand-titles">
          <strong>MAESTRO</strong>
          <small>MUSIC STORE & ACADEMY</small>
        </span>
      </Link>

      <nav className="main-nav" aria-label="Основная навигация">
        <a href="#catalog" className="nav-tab-link active">
          Каталог гитар
        </a>

        <a
          href="https://maestro-school.duckdns.org/login"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-tab-link academy"
          title="Вход на учебную платформу Maestro School"
        >
          🎓 Академия и курсы ↗
        </a>

        <a href="#pick">🎯 Подбор</a>
        <a href="#reviews">⭐ Отзывы</a>
        <a href="#faq">❓ FAQ</a>
      </nav>

      <div className="search-wrap-relative" ref={searchWrapRef}>
        <label className="search-box">
          <span className="search-icon">🔍</span>
          <input
            value={query}
            onFocus={() => setIsSearchFocused(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsSearchFocused(true);
            }}
            placeholder="Поиск по каталогу..."
            aria-label="Поиск по каталогу"
          />
          {query.trim().length > 0 && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setQuery("")}
              aria-label="Очистить поиск"
            >
              ×
            </button>
          )}
        </label>

        {isSearchFocused && searchResults.length > 0 && (
          <div className="search-live-dropdown">
            <div className="search-dropdown-header">
              <span>Найдено в каталоге:</span>
            </div>
            {searchResults.map((item) => (
              <div
                key={item.id}
                className="search-dropdown-item"
                onClick={() => {
                  setIsSearchFocused(false);
                  if (onSelectProduct) {
                    onSelectProduct(item);
                  } else {
                    const el = document.getElementById("catalog");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }
                }}
              >
                <div className="search-item-thumb">
                  <img src={item.image} alt={item.name} />
                </div>
                <div className="search-item-info">
                  <strong>{item.name}</strong>
                  <small>{item.category}</small>
                </div>
                <div className="search-item-price">
                  <span>{money(item.price)} ₸</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="topbar-right-actions">
        <a
          href={`https://wa.me/${DEFAULT_WHATSAPP_PHONE}`}
          target="_blank"
          rel="noopener noreferrer"
          className="wa-header-btn"
          title="Написать менеджеру в WhatsApp"
        >
          <span className="wa-icon">💬</span>
          <span className="wa-text">{DISPLAY_WHATSAPP_PHONE}</span>
        </a>

        <button
          className="cart-button"
          onClick={() => setCartOpen(true)}
          aria-label={`Корзина, ${cartCount} товаров`}
        >
          <span className="cart-label">🛒</span>
          <span className="cart-text">Заявка</span>
          <span className="cart-btn-badge">{cartCount}</span>
        </button>
      </div>

      {/* Mobile Fast Navigation Strip */}
      <div className="mobile-nav-strip">
        <button
          type="button"
          className="mobile-nav-btn active"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span>🎸</span>
          <small>Каталог</small>
        </button>
        <a
          href="https://maestro-school.duckdns.org/login"
          target="_blank"
          rel="noopener noreferrer"
          className="mobile-nav-btn"
        >
          <span>🎓</span>
          <small>Обучение</small>
        </a>
        <a
          href="https://maestro-school.duckdns.org/login"
          target="_blank"
          rel="noopener noreferrer"
          className="mobile-nav-btn"
        >
          <span>🔑</span>
          <small>Кабинет</small>
        </a>
        <button
          type="button"
          className="mobile-nav-btn"
          onClick={() => setCartOpen(true)}
        >
          <span>🛒</span>
          <small>Корзина ({cartCount})</small>
        </button>
      </div>
    </header>
  );
}
