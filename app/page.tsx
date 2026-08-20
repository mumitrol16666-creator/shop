"use client";

import { useEffect, useMemo, useState } from "react";
import { CartDrawer, type CheckoutIntent } from "../components/CartDrawer";
import { CommerceCartProvider, useCommerceCart } from "../components/CommerceCartProvider";
import { KaspiQrModal } from "../components/KaspiQrModal";
import { ProductModal } from "../components/ProductModal";
import { Storefront } from "../components/Storefront";
import { Topbar } from "../components/Topbar";
import {
  buildWhatsAppOrderUrl,
  type CartItem,
  type Product,
  type Variant,
  variantsFor,
} from "../lib/catalog-data";
import { BUNDLE_SKUS, type ProductReadModel, type PublicOrder } from "../lib/commerce/types";
import { cartItemFromReconciled, cartItemsFromOrder, toStorefrontProduct } from "../lib/commerce/ui-adapter";

export default function Home() {
  const [catalogModels, setCatalogModels] = useState<ProductReadModel[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/catalog")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("catalog unavailable")))
      .then((payload: { products?: ProductReadModel[] }) => {
        if (active && Array.isArray(payload.products) && payload.products.length) {
          setCatalogModels(payload.products);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <CommerceCartProvider products={catalogModels}>
      <StorefrontHome catalogModels={catalogModels} />
    </CommerceCartProvider>
  );
}

function StorefrontHome({ catalogModels }: { catalogModels: ProductReadModel[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [requestedQuantity, setRequestedQuantity] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [kaspiModalOpen, setKaspiModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCity, setCustomerCity] = useState("Актобе");
  const [customerComment, setCustomerComment] = useState("");
  const [paymentOrder, setPaymentOrder] = useState<PublicOrder | null>(null);
  const [notice, setNotice] = useState("");
  const commerceCart = useCommerceCart();

  useEffect(() => {
    const hasCommerceOverlay = cartOpen || Boolean(selected) || kaspiModalOpen;
    document.body.classList.toggle("commerce-overlay-open", hasCommerceOverlay);
    return () => document.body.classList.remove("commerce-overlay-open");
  }, [cartOpen, selected, kaspiModalOpen]);

  const mergedProducts = useMemo(
    () => catalogModels.map(toStorefrontProduct),
    [catalogModels],
  );

  const cartItems = useMemo<CartItem[]>(
    () => commerceCart.reconciliation.lines.map(cartItemFromReconciled),
    [commerceCart.reconciliation.lines],
  );

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

  const openProduct = (product: Product, variantOverride?: Variant | null) => {
    setSelected(product);
    const variants = variantsFor(product);
    setSelectedVariant(variantOverride !== undefined
      ? variantOverride
      : product.commerce?.selectionRequired
        ? null
        : variants[0] ?? null);
    setRequestedQuantity(1);
  };

  const chooseCategory = (item: string) => {
    setCategory(item);
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  };

  const addToCart = (
    product: Product,
    variant: Variant,
    bundleType: "base" | "gift_course" | "pro_pack",
    componentSkus: string[],
  ) => {
    if (!variant || !product.commerce) {
      setNotice("Сначала выберите вариант товара.");
      window.setTimeout(() => setNotice(""), 2800);
      return;
    }
    commerceCart.add({
      product: product.commerce,
      variantSku: variant.sku,
      bundleSku: bundleType === "pro_pack"
        ? BUNDLE_SKUS.proPack
        : bundleType === "gift_course"
          ? BUNDLE_SKUS.giftCourse
          : BUNDLE_SKUS.base,
      componentSkus,
      quantity: Math.min(requestedQuantity, variant.stock),
    });

    setSelected(null);
    setCartOpen(true);
    setNotice(`Добавлено в заявку: ${product.shortName} (${variant.name})`);
    window.setTimeout(() => setNotice(""), 2800);
  };

  const updateCartQuantity = (key: string, delta: number) => {
    commerceCart.updateQuantity(key, delta);
  };

  const removeCartItem = (key: string) => {
    commerceCart.remove(key);
  };

  const createServerOrder = (intent: CheckoutIntent) => commerceCart.createOrder({
    customer: {
      name: customerName,
      phone: customerPhone,
      city: customerCity || "Актобе",
      comment: customerComment,
    },
    fulfilment: { method: intent.fulfilmentMethod },
    payment: { method: intent.paymentMethod },
  });

  const submitOrder = async (intent: CheckoutIntent) => {
    const order = await createServerOrder(intent);
    const waUrl = buildWhatsAppOrderUrl({
      requestId: order.orderId,
      customerName,
      customerPhone,
      customerCity,
      customerComment: [
        `Способ доставки: ${order.fulfilmentMethod}`,
        `Способ оплаты: ${order.paymentMethod}`,
        customerComment ? `Комментарий: ${customerComment}` : "",
      ].filter(Boolean).join(" | "),
      cartItems: cartItemsFromOrder(order),
      totalPrice: order.totals.final,
    });
    window.open(waUrl, "_blank", "noopener,noreferrer");
    setNotice("Заявка сформирована. Открываем WhatsApp для подтверждения с менеджером...");
    setCartOpen(false);
    window.setTimeout(() => setNotice(""), 3600);
  };

  const openKaspiOrder = async (intent: CheckoutIntent) => {
    const order = await createServerOrder(intent);
    setPaymentOrder(order);
    setCartOpen(false);
    setKaspiModalOpen(true);
  };

  return (
    <main className="site-shell">
      <Topbar
        query={query}
        setQuery={setQuery}
        catalogProducts={mergedProducts}
        cartCount={cartCount}
        setCartOpen={setCartOpen}
        onSelectProduct={openProduct}
      />

      <Storefront
        category={category}
        setCategory={setCategory}
        categories={categories}
        filteredProducts={filteredProducts}
        openProduct={openProduct}
        chooseCategory={chooseCategory}
        featuredProduct={mergedProducts[1] ?? mergedProducts[0]}
      />

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
        key={selected ? String(selected.id) : "no-product"}
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
        totalPrice={commerceCart.reconciliation.totals.final}
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
        onOpenKaspiQr={openKaspiOrder}
        reconciliationMessage={commerceCart.isReconciling
          ? "Проверяем цены и остатки…"
          : commerceCart.reconciliation.state === "changed"
            ? "Цена изменилась — проверьте итог."
            : commerceCart.error}
        hasPriceChanges={commerceCart.reconciliation.state === "changed"}
        onAcceptPriceChanges={commerceCart.acceptPriceChanges}
      />

      <KaspiQrModal
        isOpen={kaspiModalOpen}
        onClose={() => setKaspiModalOpen(false)}
        order={paymentOrder}
        customerName={customerName}
        customerPhone={customerPhone}
        customerCity={customerCity}
        customerComment={customerComment}
        onPaymentReported={(order) => {
          setPaymentOrder(order);
          setNotice("Сообщение об оплате отправлено на проверку. Корзина сохранена.");
          window.setTimeout(() => setNotice(""), 4000);
        }}
      />

      {notice && <div className="toast">{notice}</div>}
    </main>
  );
}
