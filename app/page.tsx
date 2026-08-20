"use client";

import { useEffect, useMemo, useState } from "react";
import { AcademyView } from "../components/AcademyView";
import { CartDrawer } from "../components/CartDrawer";
import { KaspiQrModal } from "../components/KaspiQrModal";
import { ProductModal } from "../components/ProductModal";
import { Storefront } from "../components/Storefront";
import { Topbar } from "../components/Topbar";
import {
  type CartItem,
  mergeBySku,
  type Product,
  products as defaultProducts,
  type Variant,
  variantsFor,
} from "../lib/catalog-data";

export default function Home() {
  const [view, setView] = useState<"store" | "academy">("store");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [requestedQuantity, setRequestedQuantity] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [kaspiModalOpen, setKaspiModalOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCity, setCustomerCity] = useState("Актобе");
  const [customerComment, setCustomerComment] = useState("");
  const [notice, setNotice] = useState("");
  const [storedProducts, setStoredProducts] = useState<Product[]>([]);

  useEffect(() => {
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
  }, []);

  const mergedProducts = useMemo(() => {
    const list = mergeBySku(defaultProducts, storedProducts);
    return list.filter(
      (product) =>
        !product.isStored ||
        product.publicationStatus === "published" ||
        !product.publicationStatus,
    );
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

  const cartCount = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.quantity, 0),
    [cartItems],
  );

  const cartTotalPrice = useMemo(
    () => cartItems.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0),
    [cartItems],
  );

  const openProduct = (product: Product, variantOverride?: Variant | null) => {
    const variants = variantsFor(product);
    setSelected(product);
    setSelectedVariant(variantOverride ?? variants[0] ?? null);
    setRequestedQuantity(1);
  };

  const chooseCategory = (item: string) => {
    setCategory(item);
    setView("store");
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  };

  const addToCart = (
    product: Product,
    variantOverride?: Variant | null,
    bundleType?: "base" | "gift_course" | "pro_pack",
    priceOverride?: number,
    giftCourseTitle?: string,
    bundleTitle?: string,
    stringsUpsell?: string,
    stringsUpsellPrice?: number,
  ) => {
    const variant = variantOverride ?? selectedVariant ?? variantsFor(product)[0];
    if (!variant) return;
    const maxQty = variant.stock || 1;
    const itemKey = `${product.sku}-${variant.sku}-${bundleType || "gift_course"}-${stringsUpsell ? "strings" : "none"}`;
    const qtyToAdd = Math.min(requestedQuantity, maxQty);
    const bundleLabel = bundleTitle || (
      bundleType === "gift_course"
        ? (giftCourseTitle ? `🎁 + Курс «${giftCourseTitle}»` : "🎁 + Онлайн-курс")
        : bundleType === "pro_pack"
        ? "👑 PRO Комплект"
        : "🎸 Стандарт"
    );
    const itemPrice = priceOverride ?? (variant.price || product.price || 0);

    setCartItems((current) => {
      const existingIndex = current.findIndex((item) => item.key === itemKey);
      if (existingIndex > -1) {
        const next = [...current];
        const existing = next[existingIndex];
        if (existing) {
          const newQty = Math.min(maxQty, existing.quantity + qtyToAdd);
          next[existingIndex] = { ...existing, quantity: newQty };
        }
        return next;
      }
      return [
        ...current,
        {
          key: itemKey,
          productId: product.id,
          name: product.name,
          variantName: variant.name,
          sku: variant.sku,
          image: variant.image || product.image,
          price: itemPrice,
          quantity: qtyToAdd,
          maxQuantity: maxQty,
          bundle: bundleType,
          bundleTitle: bundleLabel,
          giftCourseTitle: bundleType === "gift_course" ? giftCourseTitle : undefined,
          stringsUpsell,
          stringsUpsellPrice,
        },
      ];
    });

    setSelected(null);
    setCartOpen(true);
    setNotice(`Добавлено в заявку: ${product.shortName} (${variant.name})`);
    window.setTimeout(() => setNotice(""), 2800);
  };

  const updateCartQuantity = (key: string, delta: number) => {
    setCartItems((current) =>
      current
        .map((item) =>
          item.key === key
            ? {
                ...item,
                quantity: Math.max(1, Math.min(item.maxQuantity, item.quantity + delta)),
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeCartItem = (key: string) => {
    setCartItems((current) => current.filter((item) => item.key !== key));
  };

  const submitOrder = () => {
    setNotice("Заявка сформирована. Открываем WhatsApp для подтверждения с менеджером...");
    setCartOpen(false);
    window.setTimeout(() => setNotice(""), 3600);
  };

  return (
    <main className="site-shell">
      <Topbar
        query={query}
        setQuery={setQuery}
        cartCount={cartCount}
        setCartOpen={setCartOpen}
        view={view}
        setView={setView}
        onSelectProduct={openProduct}
      />

      {view === "academy" ? (
        <AcademyView onBackToStore={() => setView("store")} />
      ) : (
        <Storefront
          category={category}
          setCategory={setCategory}
          categories={categories}
          filteredProducts={filteredProducts}
          openProduct={openProduct}
          chooseCategory={chooseCategory}
          featuredProduct={mergedProducts[1] ?? mergedProducts[0]}
        />
      )}

      {/* Floating WhatsApp Master Speed Dial Widget */}
      {!cartOpen && !selected && !kaspiModalOpen && (
        <a
          href="https://wa.me/77775055788?text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5!%20%D0%9F%D0%BE%D0%BC%D0%BE%D0%B3%D0%B8%D1%82%D0%B5%2C%20%D0%BF%D0%BE%D0%B6%D0%B0%D0%BB%D1%83%D0%B9%D1%81%D1%82%D0%B0%2C%20%D0%BF%D0%BE%D0%B4%D0%BE%D0%B1%D1%80%D0%B0%D1%82%D1%8C%20%D0%B3%D0%B8%D1%82%D0%B0%D1%80%D1%83."
          target="_blank"
          rel="noopener noreferrer"
          className="floating-whatsapp-widget"
          title="Написать мастеру в WhatsApp"
        >
          <div className="floating-wa-bubble">
            <span className="floating-wa-dot" />
            <span>Мастер онлайн · Ответим за 1 мин</span>
          </div>
          <div className="floating-wa-icon-btn">
            💬
          </div>
        </a>
      )}

      <ProductModal
        selected={selected}
        selectedVariant={selectedVariant}
        setSelectedVariant={setSelectedVariant}
        requestedQuantity={requestedQuantity}
        setRequestedQuantity={setRequestedQuantity}
        mode="buyer"
        onClose={() => setSelected(null)}
        onAddToCart={addToCart}
      />

      <CartDrawer
        cartOpen={cartOpen}
        setCartOpen={setCartOpen}
        cartItems={cartItems}
        cartCount={cartCount}
        updateCartQuantity={updateCartQuantity}
        removeCartItem={removeCartItem}
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerPhone={customerPhone}
        setCustomerPhone={setCustomerPhone}
        customerCity={customerCity}
        setCustomerCity={setCustomerCity}
        customerComment={customerComment}
        setCustomerComment={setCustomerComment}
        onSubmitOrder={submitOrder}
        onOpenKaspiQr={() => {
          setCartOpen(false);
          setKaspiModalOpen(true);
        }}
      />

      <KaspiQrModal
        isOpen={kaspiModalOpen}
        onClose={() => setKaspiModalOpen(false)}
        cartItems={cartItems}
        totalPrice={cartTotalPrice}
        customerName={customerName}
        customerPhone={customerPhone}
        customerCity={customerCity}
        customerComment={customerComment}
        onPaymentSuccess={() => {
          setCartItems([]);
          setNotice("Оплата через Kaspi принята! Менеджер свяжется с вами.");
          window.setTimeout(() => setNotice(""), 4000);
        }}
      />

      {notice && <div className="toast">{notice}</div>}
    </main>
  );
}
