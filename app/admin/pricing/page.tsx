"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminAccessGate, useAdminAccess } from "../../../components/AdminAccessGate";
import { ProductModal } from "../../../components/ProductModal";
import { PurchaserView } from "../../../components/PurchaserView";
import {
  mergeBySku,
  type Product,
  products as defaultProducts,
  type Variant,
  variantsFor,
} from "../../../lib/catalog-data";

export default function AdminPricingPage() {
  return (
    <AdminAccessGate>
      <AdminPricingContent />
    </AdminAccessGate>
  );
}

function AdminPricingContent() {
  const { logout } = useAdminAccess();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [requestedQuantity, setRequestedQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  const [storedProducts, setStoredProducts] = useState<Product[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/products?scope=all", { credentials: "same-origin", cache: "no-store" })
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
  }, []);

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

  const openProduct = (product: Product) => {
    const variants = variantsFor(product);
    setSelected(product);
    setSelectedVariant(variants[0] ?? null);
    setRequestedQuantity(1);
  };

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
          <Link href="/admin/orders">Заказы</Link>
          <Link className="is-active" href="/admin/pricing">Товары и цены</Link>
          <Link href="/admin/analytics">Аналитика</Link>
          <Link href="/">Витрина</Link>
          <button type="button" className="admin-logout-btn" onClick={() => void logout()}>
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
