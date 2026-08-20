"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CartDrawer, type CheckoutIntent } from "../CartDrawer";
import { CommerceCartProvider, useCommerceCart } from "../CommerceCartProvider";
import { KaspiQrModal } from "../KaspiQrModal";
import { buildWhatsAppOrderUrl, type CartItem } from "../../lib/catalog-data";
import type { ProductReadModel, PublicOrder } from "../../lib/commerce/types";
import { cartItemFromReconciled, cartItemsFromOrder } from "../../lib/commerce/ui-adapter";
import { StoreHeader } from "./header/StoreHeader";
import { HomePage } from "./home/HomePage";
import { CatalogPage } from "./catalog/CatalogPage";
import { ProductPage } from "./product/ProductPage";
import { CartPage } from "./cart/CartPage";
import { PickerPage } from "./picker/PickerPage";

export type StoreRoute =
  | { kind: "home" }
  | { kind: "catalog"; categorySlug?: string }
  | { kind: "product"; product: ProductReadModel }
  | { kind: "picker" }
  | { kind: "cart" }
  | { kind: "not-found" };

export function StoreRuntime({ products, route }: { products: ProductReadModel[]; route: StoreRoute }) {
  return <CommerceCartProvider products={products}><StoreRuntimeInner products={products} route={route} /></CommerceCartProvider>;
}

function StoreRuntimeInner({ products, route }: { products: ProductReadModel[]; route: StoreRoute }) {
  const cart = useCommerceCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [kaspiOpen, setKaspiOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<PublicOrder | null>(null);
  const [notice, setNotice] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCity, setCustomerCity] = useState("Актобе");
  const [customerComment, setCustomerComment] = useState("");
  const cartItems = useMemo<CartItem[]>(() => cart.reconciliation.lines.map(cartItemFromReconciled), [cart.reconciliation.lines]);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const announce = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  };

  const createServerOrder = (intent: CheckoutIntent) => cart.createOrder({
    customer: { name: customerName, phone: customerPhone, city: customerCity || "Актобе", comment: customerComment },
    fulfilment: { method: intent.fulfilmentMethod },
    payment: { method: intent.paymentMethod },
  });
  const submitOrder = async (intent: CheckoutIntent) => {
    const order = await createServerOrder(intent);
    const url = buildWhatsAppOrderUrl({
      requestId: order.orderId,
      customerName,
      customerPhone,
      customerCity,
      customerComment,
      cartItems: cartItemsFromOrder(order),
      totalPrice: order.totals.final,
    });
    window.open(url, "_blank", "noopener,noreferrer");
    setCartOpen(false);
    announce("Заявка создана. Открываем WhatsApp для подтверждения.");
  };
  const openKaspi = async (intent: CheckoutIntent) => {
    const order = await createServerOrder(intent);
    setPaymentOrder(order);
    setCartOpen(false);
    setKaspiOpen(true);
  };

  return (
    <div className="store-app-shell">
      <StoreHeader cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />
      <main className="store-main">
        {route.kind === "home" && <HomePage products={products} onNotice={announce} />}
        {route.kind === "catalog" && <CatalogPage products={products} categorySlug={route.categorySlug} onNotice={announce} />}
        {route.kind === "product" && <ProductPage product={route.product} onNotice={announce} />}
        {route.kind === "picker" && <PickerPage products={products} onNotice={announce} />}
        {route.kind === "cart" && <CartPage onCheckout={() => setCartOpen(true)} />}
        {route.kind === "not-found" && <section className="store-page store-not-found"><p className="store-eyebrow">404</p><h1>Страница не найдена</h1><p>Проверьте адрес или вернитесь в каталог.</p><Link className="store-primary-action" href="/catalog">Открыть каталог</Link></section>}
      </main>

      <CartDrawer
        cartOpen={cartOpen}
        setCartOpen={setCartOpen}
        cartItems={cartItems}
        cartCount={cartCount}
        totalPrice={cart.reconciliation.totals.final}
        updateCartQuantity={cart.updateQuantity}
        removeCartItem={cart.remove}
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerPhone={customerPhone}
        setCustomerPhone={setCustomerPhone}
        customerCity={customerCity}
        setCustomerCity={setCustomerCity}
        customerComment={customerComment}
        setCustomerComment={setCustomerComment}
        onSubmitOrder={submitOrder}
        onOpenKaspiQr={openKaspi}
        reconciliationMessage={cart.isReconciling ? "Проверяем цены и остатки…" : cart.reconciliation.state === "changed" ? "Цена изменилась — проверьте итог." : cart.error}
        hasPriceChanges={cart.reconciliation.state === "changed"}
        onAcceptPriceChanges={cart.acceptPriceChanges}
      />
      <KaspiQrModal
        isOpen={kaspiOpen}
        onClose={() => setKaspiOpen(false)}
        order={paymentOrder}
        customerName={customerName}
        customerPhone={customerPhone}
        customerCity={customerCity}
        customerComment={customerComment}
        onPaymentReported={(order) => { setPaymentOrder(order); announce("Сообщение об оплате отправлено на проверку."); }}
      />
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
