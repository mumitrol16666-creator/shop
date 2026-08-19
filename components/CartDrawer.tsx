"use client";

import Image from "next/image";
import { useState } from "react";
import {
  buildWhatsAppOrderUrl,
  DEFAULT_WHATSAPP_PHONE,
  installment,
  money,
  type CartItem,
} from "../lib/catalog-data";

type CartDrawerProps = {
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  cartItems: CartItem[];
  cartCount: number;
  updateCartQuantity: (key: string, delta: number) => void;
  removeCartItem: (key: string) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  customerCity: string;
  setCustomerCity: (city: string) => void;
  customerComment: string;
  setCustomerComment: (comment: string) => void;
  onSubmitOrder: () => void;
  onOpenKaspiQr: () => void;
};

export function CartDrawer({
  cartOpen,
  setCartOpen,
  cartItems,
  cartCount,
  updateCartQuantity,
  removeCartItem,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerCity,
  setCustomerCity,
  customerComment,
  setCustomerComment,
  onSubmitOrder,
  onOpenKaspiQr,
}: CartDrawerProps) {
  const [deliveryMethod, setDeliveryMethod] = useState("Самовывоз в магазине (Актобе)");
  const [paymentMethod, setPaymentMethod] = useState("Kaspi Рассрочка 0-0-12");

  if (!cartOpen) return null;

  const totalPrice = cartItems.reduce(
    (acc, item) => acc + (item.price || 0) * item.quantity,
    0,
  );

  const handleSendToWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cartItems.length) {
      alert("Корзина пуста. Добавьте товар из каталога.");
      return;
    }

    const fullComment = [
      `Способ доставки: ${deliveryMethod}`,
      `Способ оплаты: ${paymentMethod}`,
      customerComment ? `Комментарий: ${customerComment}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const waUrl = buildWhatsAppOrderUrl({
      phone: DEFAULT_WHATSAPP_PHONE,
      customerName,
      customerPhone,
      customerCity: customerCity || "Актобе",
      customerComment: fullComment,
      cartItems,
      totalPrice,
    });

    window.open(waUrl, "_blank", "noopener,noreferrer");
    onSubmitOrder();
  };

  const handleKaspiPayClick = () => {
    if (!cartItems.length) {
      alert("Корзина пуста. Добавьте товар из каталога.");
      return;
    }
    onOpenKaspiQr();
  };

  return (
    <div className="cart-drawer-backdrop" role="presentation" onMouseDown={() => setCartOpen(false)}>
      <aside
        className="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Корзина заявки"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="cart-head">
          <div>
            <p className="eyebrow">Заявка</p>
            <h2>Корзина магазина</h2>
          </div>
          <button onClick={() => setCartOpen(false)} aria-label="Закрыть корзину">
            ×
          </button>
        </div>

        {/* Dynamic Delivery & Gift Progress Bar */}
        {cartItems.length > 0 && (
          <div className="cart-progress-card">
            {totalPrice >= 35000 ? (
              <div className="progress-status-done">
                <span className="progress-icon">🎉</span>
                <span>Вам доступна <strong>БЕСПЛАТНАЯ доставка</strong> и набор медиаторов!</span>
              </div>
            ) : (
              <div className="progress-status-pending">
                <span className="progress-icon">🎁</span>
                <span>До бесплатной доставки и подарка: <strong>{money(35000 - totalPrice)} ₸</strong></span>
              </div>
            )}
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.min(100, (totalPrice / 35000) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {cartItems.length ? (
          <div className="cart-lines">
            {cartItems.map((item) => (
              <article className="cart-line" key={item.key}>
                <span className="cart-thumb">
                  <Image src={item.image} alt="" fill unoptimized sizes="64px" />
                </span>
                <span className="cart-copy">
                  <strong>{item.name}</strong>
                  <small>
                    {item.variantName} · {item.sku}
                  </small>
                  {item.giftCourseTitle && (
                    <span className="cart-gift-badge">
                      🎁 В комплекте: «{item.giftCourseTitle}»
                    </span>
                  )}
                  {item.price > 0 && (
                    <span className="cart-line-price">{money(item.price * item.quantity)} ₸</span>
                  )}
                </span>
                <span className="cart-qty">
                  <button onClick={() => updateCartQuantity(item.key, -1)} disabled={item.quantity <= 1}>
                    −
                  </button>
                  <b>{item.quantity}</b>
                  <button
                    onClick={() => updateCartQuantity(item.key, 1)}
                    disabled={item.quantity >= item.maxQuantity}
                  >
                    +
                  </button>
                </span>
                <button
                  className="cart-remove"
                  onClick={() => removeCartItem(item.key)}
                  aria-label={`Удалить ${item.name}`}
                >
                  ×
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="cart-empty">
            <strong>Корзина пока пустая</strong>
            <p>Добавьте инструмент или аксессуар из каталога.</p>
          </div>
        )}

        <div className="order-form">
          <label>
            Ваше имя
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Как к вам обращаться"
            />
          </label>
          <label>
            Телефон / WhatsApp
            <input
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              placeholder="+7 (7xx) xxx-xx-xx"
            />
          </label>

          <div className="form-row-two">
            <label>
              Город
              <select
                value={customerCity}
                onChange={(e) => setCustomerCity(e.target.value)}
              >
                <option value="Актобе">Актобе</option>
                <option value="Алматы">Алматы</option>
                <option value="Астана">Астана</option>
                <option value="Шымкент">Шымкент</option>
                <option value="Караганда">Караганда</option>
                <option value="Атырау">Атырау</option>
                <option value="Актау">Актау</option>
                <option value="Другой город">Другой город (по РК)</option>
              </select>
            </label>
            <label>
              Доставка
              <select
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value)}
              >
                <option value="Самовывоз в магазине (Актобе)">Самовывоз (Актобе)</option>
                <option value="Курьер по городу">Курьер по городу</option>
                <option value="Доставка курьерской службой по РК">Доставка по РК</option>
              </select>
            </label>
          </div>

          <label>
            Способ оплаты
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="Kaspi Рассрочка 0-0-12">Kaspi Рассрочка 0-0-12</option>
              <option value="Kaspi Red (3 мес)">Kaspi Red (3 мес)</option>
              <option value="Kaspi QR / Оплата картой">Kaspi QR / Оплата картой</option>
              <option value="Оплата при получении">Оплата при получении</option>
            </select>
          </label>

          <label>
            Комментарий к заказу
            <textarea
              value={customerComment}
              onChange={(event) => setCustomerComment(event.target.value)}
              placeholder="Нужна ли отстройка струн мастером, чехол, медиаторы или доставка курьером"
              rows={2}
            />
          </label>

          <div className="cart-summary">
            <div className="cart-totals">
              <span>{cartCount} ед. в заявке</span>
              {totalPrice > 0 ? (
                <strong className="cart-total-price">{money(totalPrice)} ₸</strong>
              ) : (
                <strong>Цена уточняется</strong>
              )}
            </div>

            {totalPrice > 0 && (
              <div className="cart-installment-hint">
                <span className="kaspi-badge">0-0-12</span>
                <span>
                  Или в рассрочку от <strong>{money(installment(totalPrice, 12))} ₸ / мес</strong>
                </span>
              </div>
            )}

            <div className="cart-checkout-buttons">
              <button
                type="button"
                className="kaspi-pay-cart-button"
                onClick={handleKaspiPayClick}
                disabled={!cartItems.length}
              >
                <span className="kaspi-badge-small">kaspi</span>
                <span>Оплатить через Kaspi QR / Рассрочка</span>
              </button>

              <button
                type="button"
                className="whatsapp-submit-button"
                onClick={handleSendToWhatsApp}
                disabled={!cartItems.length}
              >
                <span className="wa-icon">💬</span>
                <span>Оформить заказ в WhatsApp</span>
              </button>
            </div>

            <p className="cart-direct-contact">
              Менеджер магазина: <strong>+7 (777) 505-57-88</strong>
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
