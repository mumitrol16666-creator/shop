"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createCartDraftLine, emptyCartDraft, reconcileCart } from "../lib/commerce/cart";
import { BUNDLE_SKUS, CART_SCHEMA_VERSION } from "../lib/commerce/types";
import type {
  CartDraft,
  CartReconciliation,
  CreateOrderRequest,
  ProductReadModel,
  PublicOrder,
} from "../lib/commerce/types";
import { quoteConfiguration, stableHash } from "../lib/commerce/pricing";

const STORAGE_KEY = "maestro-commerce-cart-v1";
const PENDING_ORDER_KEY = "maestro-commerce-pending-order-v1";
const STALE_AFTER_MS = 5 * 60_000;

type AddConfiguration = {
  product: ProductReadModel;
  variantSku: string;
  bundleSku?: string;
  componentSkus?: string[];
  quantity: number;
};

type CartContextValue = {
  draft: CartDraft;
  reconciliation: CartReconciliation;
  isReconciling: boolean;
  error: string;
  add: (configuration: AddConfiguration) => void;
  updateQuantity: (lineId: string, delta: number) => void;
  remove: (lineId: string) => void;
  clear: () => void;
  acceptPriceChanges: () => void;
  reconcile: (force?: boolean) => Promise<CartReconciliation>;
  createOrder: (input: Omit<CreateOrderRequest, "cart">) => Promise<PublicOrder>;
};

const CommerceCartContext = createContext<CartContextValue | null>(null);

function restoreDraft(): CartDraft {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as CartDraft | null;
    if (parsed?.schemaVersion === CART_SCHEMA_VERSION && Array.isArray(parsed.lines)) return parsed;
    if (parsed) localStorage.removeItem(STORAGE_KEY);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return emptyCartDraft();
}

export function CommerceCartProvider({
  products,
  children,
}: {
  products: ProductReadModel[];
  children: ReactNode;
}) {
  const [draft, setDraft] = useState<CartDraft>(() => emptyCartDraft());
  const [reconciliation, setReconciliation] = useState<CartReconciliation>(() =>
    reconcileCart(products, emptyCartDraft()),
  );
  const [isReconciling, setIsReconciling] = useState(false);
  const [error, setError] = useState("");
  const restored = useRef(false);
  const lastServerValidation = useRef(0);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    setDraft(restoreDraft());
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  const reconcileServer = useCallback(async (force = false) => {
    if (!force && Date.now() - lastServerValidation.current < 500) return reconciliation;
    setIsReconciling(true);
    setError("");
    try {
      const response = await fetch("/api/cart/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart: draft }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.reconciliation) throw new Error(payload?.error?.message || "Не удалось проверить корзину.");
      lastServerValidation.current = Date.now();
      setReconciliation(payload.reconciliation);
      return payload.reconciliation as CartReconciliation;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Не удалось проверить корзину.";
      setError(message);
      const local = reconcileCart(products, draft);
      setReconciliation(local);
      return local;
    } finally {
      setIsReconciling(false);
    }
  }, [draft, products, reconciliation]);

  useEffect(() => {
    const timer = window.setTimeout(() => void reconcileServer(true), 180);
    return () => window.clearTimeout(timer);
  }, [draft, products]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onFocus = () => {
      if (Date.now() - lastServerValidation.current >= STALE_AFTER_MS) void reconcileServer(true);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [reconcileServer]);

  const add = useCallback((configuration: AddConfiguration) => {
    const variant = configuration.product.variants.find(
      (v) => v.sku === configuration.variantSku,
    );
    if (!variant || variant.status !== "active" || variant.availableQuantity <= 0) {
      console.warn("cart_add_rejected_out_of_stock", { sku: configuration.variantSku });
      return;
    }
    const bundleSku = configuration.bundleSku || BUNDLE_SKUS.base;
    const componentSkus = configuration.componentSkus || [];
    const quote = quoteConfiguration(configuration.product, {
      variantSku: configuration.variantSku,
      bundleSku,
      componentSkus,
    });
    const addQuantity = Math.min(
      Math.max(1, configuration.quantity),
      variant.availableQuantity,
    );
    const created = createCartDraftLine({
      productId: configuration.product.id,
      productSku: configuration.product.sku,
      variantSku: configuration.variantSku,
      bundleSku,
      componentSkus,
      quantity: addQuantity,
      observedPricingVersion: quote.pricingVersion,
      observedFinal: quote.final,
    });
    setDraft((current) => {
      const existing = current.lines.find((line) => line.lineId === created.lineId);
      const lines = existing
        ? current.lines.map((line) => line.lineId === created.lineId
          ? { ...line, quantity: Math.min(variant.availableQuantity, line.quantity + created.quantity) }
          : line)
        : [...current.lines, created];
      return { schemaVersion: CART_SCHEMA_VERSION, updatedAt: new Date().toISOString(), lines };
    });
  }, []);

  const updateQuantity = useCallback((lineId: string, delta: number) => {
    setDraft((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      lines: current.lines.map((line) => line.lineId === lineId
        ? { ...line, quantity: Math.max(1, line.quantity + delta) }
        : line),
    }));
  }, []);

  const remove = useCallback((lineId: string) => {
    setDraft((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      lines: current.lines.filter((line) => line.lineId !== lineId),
    }));
  }, []);

  const clear = useCallback(() => {
    setDraft(emptyCartDraft());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const acceptPriceChanges = useCallback(() => {
    const currentById = new Map(reconciliation.lines.map((line) => [line.lineId, line]));
    setDraft((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      lines: current.lines.map((line) => {
        const checked = currentById.get(line.lineId);
        return checked && checked.status === "changed"
          ? {
              ...line,
              observedPricingVersion: checked.pricing.pricingVersion,
              observedFinal: checked.pricing.final,
            }
          : line;
      }),
    }));
  }, [reconciliation.lines]);

  const createOrder = useCallback(async (input: Omit<CreateOrderRequest, "cart">) => {
    const checked = await reconcileServer(true);
    if (checked.state !== "ready") {
      throw new Error(checked.state === "changed" ? "Цена изменилась. Проверьте итог корзины." : "Исправьте недоступные позиции в корзине.");
    }
    const request: CreateOrderRequest = { ...input, cart: draft };
    const payloadHash = stableHash(request);
    const pending = JSON.parse(sessionStorage.getItem(PENDING_ORDER_KEY) || "null") as { hash?: string; key?: string } | null;
    const idempotencyKey = pending?.hash === payloadHash && pending.key
      ? pending.key
      : `web-${crypto.randomUUID()}`;
    sessionStorage.setItem(PENDING_ORDER_KEY, JSON.stringify({ hash: payloadHash, key: idempotencyKey }));
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(request),
    });
    const payload = await response.json();
    if (!response.ok || !payload.order) throw new Error(payload?.error?.message || "Не удалось создать заказ.");
    sessionStorage.removeItem(PENDING_ORDER_KEY);
    return payload.order as PublicOrder;
  }, [draft, reconcileServer]);

  const value = useMemo<CartContextValue>(() => ({
    draft,
    reconciliation,
    isReconciling,
    error,
    add,
    updateQuantity,
    remove,
    clear,
    acceptPriceChanges,
    reconcile: reconcileServer,
    createOrder,
  }), [draft, reconciliation, isReconciling, error, add, updateQuantity, remove, clear, acceptPriceChanges, reconcileServer, createOrder]);

  return <CommerceCartContext.Provider value={value}>{children}</CommerceCartContext.Provider>;
}

export function useCommerceCart() {
  const value = useContext(CommerceCartContext);
  if (!value) throw new Error("useCommerceCart must be used inside CommerceCartProvider");
  return value;
}
