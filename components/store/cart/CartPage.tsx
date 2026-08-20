"use client";

import Image from "next/image";
import Link from "next/link";
import { money } from "../../../lib/catalog-data";
import { useCommerceCart } from "../../CommerceCartProvider";

export function CartPage({ onCheckout }: { onCheckout: () => void }) {
  const cart = useCommerceCart();
  const lines = cart.reconciliation.lines;
  return (
    <div className="store-page store-cart-page">
      <header><p className="store-eyebrow">ВАША КОРЗИНА</p><h1>Проверьте товары</h1><p>Цены и остатки сверяются с сервером автоматически.</p></header>
      {!lines.length ? (
        <div className="store-empty-state"><strong>Корзина пока пустая</strong><p>Добавьте инструмент из каталога.</p><Link href="/catalog" className="store-primary-action">Перейти в каталог</Link></div>
      ) : (
        <div className="store-cart-layout">
          <section className="store-cart-lines" aria-label="Товары в корзине">
            {lines.map((line) => (
              <article key={line.lineId} className={`store-cart-line is-${line.status}`}>
                <div className="store-cart-line__image"><Image src={line.variantImage || line.productImage} alt="" fill unoptimized sizes="120px" /></div>
                <div><strong>{line.productTitle}</strong><p>{line.variantTitle} · {line.bundleTitle}</p>{line.errors.map((error) => <small key={error.code}>{error.message}</small>)}</div>
                <div className="store-quantity"><button onClick={() => cart.updateQuantity(line.lineId, -1)} disabled={line.quantity <= 1}>−</button><span>{line.quantity}</span><button onClick={() => cart.updateQuantity(line.lineId, 1)} disabled={line.quantity >= line.availableQuantity}>+</button></div>
                <strong>{money(line.pricing.final * line.quantity)} ₸</strong>
                <button type="button" className="store-remove-action" onClick={() => cart.remove(line.lineId)} aria-label={`Удалить ${line.productTitle}`}>×</button>
              </article>
            ))}
          </section>
          <aside className="store-cart-summary">
            <h2>Итого</h2><p>{lines.reduce((sum, line) => sum + line.quantity, 0)} ед.</p><strong>{money(cart.reconciliation.totals.final)} ₸</strong>
            {cart.isReconciling && <p role="status">Проверяем цены и остатки…</p>}
            {cart.error && <p role="alert">{cart.error}</p>}
            {cart.reconciliation.state === "changed" && <button type="button" onClick={cart.acceptPriceChanges}>Принять новую цену</button>}
            <button type="button" className="store-primary-action" onClick={onCheckout} disabled={cart.reconciliation.state !== "ready"}>Продолжить оформление</button>
            <Link href="/catalog" className="store-text-link">Продолжить покупки</Link>
          </aside>
        </div>
      )}
    </div>
  );
}

