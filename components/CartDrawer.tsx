"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback } from "react";
import { money, type CartItem } from "../lib/catalog-data";
import { useOverlayLifecycle } from "./store/feedback/Overlay";

type CartDrawerProps = {
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  cartItems: CartItem[];
  cartCount: number;
  totalPrice: number;
  updateCartQuantity: (key: string, delta: number) => void;
  removeCartItem: (key: string) => void;
  reconciliationMessage?: string;
  hasPriceChanges?: boolean;
  onAcceptPriceChanges?: () => void;
};

export function CartDrawer({
  cartOpen,
  setCartOpen,
  cartItems,
  cartCount,
  totalPrice,
  updateCartQuantity,
  removeCartItem,
  reconciliationMessage,
  hasPriceChanges,
  onAcceptPriceChanges,
}: CartDrawerProps) {
  const closeDrawer = useCallback(() => setCartOpen(false), [setCartOpen]);
  const drawerRef = useOverlayLifecycle(cartOpen, closeDrawer);
  const displayedTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemLabel = cartCount % 10 === 1 && cartCount % 100 !== 11
    ? "товар"
    : [2, 3, 4].includes(cartCount % 10) && ![12, 13, 14].includes(cartCount % 100)
      ? "товара"
      : "товаров";
  if (!cartOpen) return null;

  return (
    <div className="cart-drawer-backdrop" role="presentation" onMouseDown={closeDrawer}>
      <aside ref={drawerRef} className="cart-drawer" role="dialog" aria-modal="true" aria-label="Корзина" onMouseDown={(event) => event.stopPropagation()}>
        <div className="cart-head"><div><p className="eyebrow">КОРЗИНА</p><h2>{cartCount ? `${cartCount} ${itemLabel}` : "Пока пусто"}</h2></div><button type="button" onClick={closeDrawer} aria-label="Закрыть корзину">×</button></div>
        {!cartItems.length ? (
          <div className="cart-empty"><strong>Добавьте инструмент из каталога</strong><p>Здесь появятся выбранные товары и итоговая стоимость.</p><Link href="/catalog" onClick={closeDrawer}>Перейти в каталог</Link></div>
        ) : (
          <>
            <div className="cart-items">
              {cartItems.map((item) => (
                <article className="cart-item" key={item.key}>
                  <div className="cart-item-image"><Image src={item.image} alt="" fill unoptimized sizes="80px" /></div>
                  <div className="cart-item-info"><strong>{item.name}</strong><small>{item.variant || item.category}</small><div className="cart-qty"><button onClick={() => updateCartQuantity(item.key, -1)} disabled={item.quantity <= 1}>−</button><span>{item.quantity}</span><button onClick={() => updateCartQuantity(item.key, 1)}>+</button></div></div>
                  <div className="cart-item-price"><strong>{money(item.price * item.quantity)} ₸</strong><button onClick={() => removeCartItem(item.key)}>Удалить</button></div>
                </article>
              ))}
            </div>
            {reconciliationMessage && <p className="checkout-inline-message" role={hasPriceChanges ? "alert" : "status"}>{reconciliationMessage}</p>}
            {hasPriceChanges && onAcceptPriceChanges && <button className="store-secondary-action" type="button" onClick={onAcceptPriceChanges}>Принять новую цену</button>}
            <div className="cart-drawer-summary">
              <div className="cart-total"><span>Итого</span><strong>{money(displayedTotal || totalPrice)} ₸</strong></div>
              <Link className="store-primary-action cart-checkout-link" href="/checkout" onClick={closeDrawer}>Перейти к оформлению</Link>
              <Link className="store-text-link cart-full-link" href="/cart" onClick={closeDrawer}>Открыть корзину целиком</Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
