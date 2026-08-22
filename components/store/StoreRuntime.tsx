"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CartDrawer } from "../CartDrawer";
import { CommerceCartProvider, useCommerceCart } from "../CommerceCartProvider";
import type { CartItem } from "../../lib/catalog-data";
import type { ProductReadModel } from "../../lib/commerce/types";
import { cartItemFromReconciled } from "../../lib/commerce/ui-adapter";
import { StoreHeader } from "./header/StoreHeader";
import { MobileNav } from "./header/MobileNav";
import { HomePage } from "./home/HomePage";
import { CatalogPage } from "./catalog/CatalogPage";
import { ProductPage } from "./product/ProductPage";
import { CartPage } from "./cart/CartPage";
import { PickerPage } from "./picker/PickerPage";
import { CheckoutPage } from "./checkout/CheckoutPage";
import { OrderPage } from "./order/OrderPage";
import { PwaLifecycle } from "./pwa/PwaLifecycle";

export type StoreRoute =
  | { kind: "home" }
  | { kind: "catalog"; categorySlug?: string }
  | { kind: "product"; product: ProductReadModel }
  | { kind: "picker" }
  | { kind: "cart" }
  | { kind: "checkout" }
  | { kind: "order"; token: string }
  | { kind: "not-found" };

export function StoreRuntime({ products, route }: { products: ProductReadModel[]; route: StoreRoute }) {
  return <CommerceCartProvider products={products}><StoreRuntimeInner products={products} route={route} /></CommerceCartProvider>;
}

function StoreRuntimeInner({ products, route }: { products: ProductReadModel[]; route: StoreRoute }) {
  const cart = useCommerceCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const cartItems = useMemo<CartItem[]>(() => cart.reconciliation.lines.map(cartItemFromReconciled), [cart.reconciliation.lines]);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const announce = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  };

  return (
    <div className="store-app-shell">
      <StoreHeader cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />
      <main className="store-main">
        {route.kind === "home" && <HomePage products={products} onNotice={announce} />}
        {route.kind === "catalog" && <CatalogPage products={products} categorySlug={route.categorySlug} onNotice={announce} />}
        {route.kind === "product" && <ProductPage product={route.product} onNotice={announce} />}
        {route.kind === "picker" && <PickerPage products={products} onNotice={announce} />}
        {route.kind === "cart" && <CartPage />}
        {route.kind === "checkout" && <CheckoutPage />}
        {route.kind === "order" && <OrderPage token={route.token} />}
        {route.kind === "not-found" && <section className="store-page store-not-found"><p className="store-eyebrow">404</p><h1>Страница не найдена</h1><p>Проверьте адрес или вернитесь в каталог.</p><Link className="store-primary-action" href="/catalog">Открыть каталог</Link></section>}
      </main>

      <MobileNav route={route} cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />
      <PwaLifecycle allowInstallPrompt={route.kind !== "checkout" && route.kind !== "order"} />

      <CartDrawer
        cartOpen={cartOpen}
        setCartOpen={setCartOpen}
        cartItems={cartItems}
        cartCount={cartCount}
        totalPrice={cart.reconciliation.totals.final}
        updateCartQuantity={cart.updateQuantity}
        removeCartItem={cart.remove}
        reconciliationMessage={cart.isReconciling ? "Проверяем цены и остатки…" : cart.reconciliation.state === "changed" ? "Цена изменилась — проверьте итог." : cart.error}
        hasPriceChanges={cart.reconciliation.state === "changed"}
        onAcceptPriceChanges={cart.acceptPriceChanges}
      />
      {notice && (
        <div className="store-toast-banner" role="status">
          <div className="store-toast-content">
            <span className="store-toast-icon">✓</span>
            <div className="store-toast-text">
              <strong>{notice}</strong>
              <small>Товар зарезервирован для оформления</small>
            </div>
            <button
              type="button"
              className="store-toast-action"
              onClick={() => {
                setNotice("");
                setCartOpen(true);
              }}
            >
              В корзину →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
