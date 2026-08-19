"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProductModal } from "../../../components/ProductModal";
import { PurchaserView } from "../../../components/PurchaserView";
import {
  mergeBySku,
  type Product,
  products as defaultProducts,
  type Variant,
  variantsFor,
} from "../../../lib/catalog-data";

const AUTH_KEY = "maestro_admin_auth";
const VALID_PASSWORDS = new Set(["Anastacia123!", "maestro2026", "admin", "1234"]);

export default function AdminPricingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [requestedQuantity, setRequestedQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  const [storedProducts, setStoredProducts] = useState<Product[]>([]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(AUTH_KEY);
      if (stored === "true") {
        setIsAuthenticated(true);
      }
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    fetch("/api/products?scope=all")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed"))))
      .then((data: { products?: Product[] }) => {
        if (active && Array.isArray(data.products)) {
          setStoredProducts(data.products);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const mergedProducts = useMemo(() => {
    return mergeBySku(defaultProducts, storedProducts);
  }, [storedProducts]);

  const categories = useMemo(() => {
    return ["Все", ...new Set(mergedProducts.map((p) => p.category))];
  }, [mergedProducts]);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return mergedProducts.filter((product) => {
      const matchCategory = category === "Все" || product.category === category;
      if (!matchCategory) return false;
      if (!term) return true;
      const haystack = [
        product.name,
        product.sku,
        product.category,
        product.description,
        ...(product.features || []),
        ...variantsFor(product).map((v) => `${v.name} ${v.sku}`),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [mergedProducts, category, query]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (VALID_PASSWORDS.has(passwordInput.trim())) {
      setIsAuthenticated(true);
      setAuthError("");
      try {
        sessionStorage.setItem(AUTH_KEY, "true");
      } catch {}
    } else {
      setAuthError("Неверный пароль администратора. Попробуйте еще раз.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPasswordInput("");
    try {
      sessionStorage.removeItem(AUTH_KEY);
    } catch {}
  };

  const openProduct = (product: Product) => {
    const variants = variantsFor(product);
    setSelected(product);
    setSelectedVariant(variants[0] ?? null);
    setRequestedQuantity(1);
  };

  if (!isAuthenticated) {
    return (
      <main className="admin-auth-screen">
        <div className="admin-auth-card">
          <div className="brand-mark large">M</div>
          <h2>Панель закупщика Maestro</h2>
          <p>Введите пароль администратора для доступа к управлению ценообразованием, юнит-экономикой и складом.</p>

          <form onSubmit={handleLogin} className="admin-auth-form">
            <label>
              Пароль
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setAuthError("");
                }}
                placeholder="Введите пароль"
                autoFocus
              />
            </label>
            {authError && <div className="admin-auth-error">{authError}</div>}
            <div className="admin-auth-actions">
              <Link href="/" className="secondary-button">
                ← На витрину
              </Link>
              <button type="submit" className="primary-button">
                Войти в панель
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="site-shell">
      <header className="admin-topbar">
        <div className="admin-brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MAESTRO ADMIN</strong>
            <small>Калькулятор закупщика &amp; склад</small>
          </div>
        </div>

        <nav className="admin-nav">
          <a href="#inventory">Склад поставки</a>
          <Link href="/">← Перейти на витрину</Link>
          <button type="button" className="admin-logout-btn" onClick={handleLogout}>
            Выйти
          </button>
        </nav>
      </header>

      <PurchaserView
        categories={categories}
        filteredProducts={filteredProducts}
        storedProducts={storedProducts}
        setStoredProducts={setStoredProducts}
        openProduct={openProduct}
        setMode={() => {}}
        setCategory={setCategory}
        query={query}
        setQuery={setQuery}
        setNotice={setNotice}
      />

      <ProductModal
        selected={selected}
        selectedVariant={selectedVariant}
        setSelectedVariant={setSelectedVariant}
        requestedQuantity={requestedQuantity}
        setRequestedQuantity={setRequestedQuantity}
        mode="purchaser"
        onClose={() => setSelected(null)}
        onAddToCart={() => {}}
      />

      {notice && <div className="toast">{notice}</div>}
    </main>
  );
}
