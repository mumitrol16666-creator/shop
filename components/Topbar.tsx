"use client";

import Link from "next/link";
import { DEFAULT_WHATSAPP_PHONE, DISPLAY_WHATSAPP_PHONE } from "../lib/catalog-data";

type TopbarProps = {
  query: string;
  setQuery: (query: string) => void;
  cartCount: number;
  setCartOpen: (open: boolean) => void;
  view?: "store" | "academy";
  setView?: (view: "store" | "academy") => void;
};

export function Topbar({
  query,
  setQuery,
  cartCount,
  setCartOpen,
  view = "store",
  setView,
}: TopbarProps) {
  return (
    <header className="topbar">
      <Link
        href="/"
        className="brand"
        aria-label="На главную"
        onClick={(e) => {
          if (setView) {
            e.preventDefault();
            setView("store");
          }
        }}
      >
        <span className="brand-mark">M</span>
        <span className="brand-titles">
          <strong>MAESTRO</strong>
          <small>MUSIC STORE & ACADEMY</small>
        </span>
      </Link>

      <nav className="main-nav" aria-label="Основная навигация">
        <button
          type="button"
          className={`nav-tab-link ${view === "store" ? "active" : ""}`}
          onClick={() => setView?.("store")}
        >
          Каталог гитар
        </button>

        <button
          type="button"
          className={`nav-tab-link academy ${view === "academy" ? "active" : ""}`}
          onClick={() => setView?.("academy")}
        >
          🎓 Обучение & Курсы
        </button>

        <a href="#pick" onClick={() => setView?.("store")}>🎯 Подбор</a>
        <a href="#reviews" onClick={() => setView?.("store")}>⭐ Отзывы</a>
        <a href="#faq" onClick={() => setView?.("store")}>❓ FAQ</a>
      </nav>

      <label className="search-box">
        <span className="search-icon">🔍</span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (setView && view !== "store") setView("store");
          }}
          placeholder="Поиск по каталогу..."
          aria-label="Поиск по каталогу"
        />
      </label>

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
          className={`mobile-nav-btn ${view === "store" ? "active" : ""}`}
          onClick={() => {
            setView?.("store");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span>🎸</span>
          <small>Каталог</small>
        </button>
        <button
          type="button"
          className={`mobile-nav-btn ${view === "academy" ? "active" : ""}`}
          onClick={() => {
            setView?.("academy");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span>🎓</span>
          <small>Обучение</small>
        </button>
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
