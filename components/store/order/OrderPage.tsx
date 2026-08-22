"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { OFFICIAL_KASPI_PAY_LINK } from "../../KaspiQrModal";
import { money } from "../../../lib/catalog-data";
import { fulfilmentLabels, paymentLabels, type CheckoutPaymentMethod, type FulfilmentMethod } from "../../../lib/commerce/checkout";
import type { PublicOrder } from "../../../lib/commerce/types";

const statusText: Record<string, { title: string; text: string }> = {
  pending_contact: { title: "Заказ принят", text: "Менеджер скоро свяжется и подтвердит детали." },
  awaiting_payment: { title: "Заказ принят", text: "Оплатите через Kaspi и отправьте отметку на проверку." },
  payment_reported: { title: "Оплата на проверке", text: "Менеджер проверит поступление и подтвердит заказ." },
  paid: { title: "Оплата подтверждена", text: "Заказ передан в работу." },
  processing: { title: "Заказ готовится", text: "Сообщим, когда его можно будет получить." },
  completed: { title: "Заказ выполнен", text: "Спасибо, что выбрали Maestro." },
  expired: { title: "Резерв истёк", text: "Свяжитесь с менеджером или соберите заказ заново." },
  cancelled: { title: "Заказ отменён", text: "Если это ошибка, свяжитесь с менеджером." },
};

export function OrderPage({ token }: { token: string }) {
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [error, setError] = useState("");
  const [reporting, setReporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState("");
  const [remaining, setRemaining] = useState("");

  const load = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
      setRefreshNotice("");
    }
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(token)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.order) throw new Error(payload?.error?.message || "Заказ не найден.");
      setOrder(payload.order as PublicOrder);
      setError("");
      if (isManual) {
        setRefreshNotice("✓ Статус обновлен");
        setTimeout(() => setRefreshNotice(""), 3000);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Заказ не найден.");
    } finally {
      if (isManual) {
        setIsRefreshing(false);
      }
    }
  }, [token]);

  useEffect(() => {
    void load();
    const poll = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(poll);
  }, [load]);

  useEffect(() => {
    const update = () => {
      if (!order?.reservationExpiresAt) return setRemaining("");
      const seconds = Math.max(0, Math.ceil((new Date(order.reservationExpiresAt).getTime() - Date.now()) / 1000));
      setRemaining(seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "истёк");
    };
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [order?.reservationExpiresAt]);

  const reportPayment = async () => {
    if (!order) return;
    setReporting(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(order.orderId)}/payment-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: "customer_kaspi_report" }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.order) throw new Error(payload?.error?.message || "Не удалось отправить отметку.");
      setOrder(payload.order as PublicOrder);
      setRefreshNotice("✓ Отметка об оплате отправлена менеджеру");
      setTimeout(() => setRefreshNotice(""), 4000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось отправить отметку.");
    } finally {
      setReporting(false);
    }
  };

  if (error && !order) {
    return (
      <section className="store-page store-order-page">
        <div className="store-empty-state">
          <strong>Не удалось открыть заказ</strong>
          <p>{error}</p>
          <Link className="store-primary-action" href="/catalog">
            В каталог
          </Link>
        </div>
      </section>
    );
  }

  if (!order) {
    return (
      <section className="store-page store-order-page" role="status">
        Загружаем заказ…
      </section>
    );
  }

  const state = statusText[order.status] || statusText.pending_contact;
  const canPay = order.paymentMethod === "kaspi_pay" && order.status === "awaiting_payment";
  const isCancelledOrExpired = order.status === "cancelled" || order.status === "expired";

  return (
    <div className="store-page store-order-page">
      <section className={`order-success is-${order.status}`}>
        <span>{isCancelledOrExpired ? "✕" : "✓"}</span>
        <div>
          <p className="store-eyebrow">ЗАКАЗ #{order.displayId}</p>
          <h1>{state.title}</h1>
          <p>{state.text}</p>
        </div>
      </section>

      <div className="store-order-layout">
        <section className="order-details">
          <div className="order-heading">
            <h2>Состав заказа</h2>
            {remaining && !isCancelledOrExpired && <span>Резерв: {remaining}</span>}
          </div>
          {order.items.map((item) => (
            <article key={`${item.variantSku}-${item.bundleSku}`}>
              <div>
                <Image src="/favicon.svg" alt="" fill unoptimized sizes="64px" />
              </div>
              <p>
                <strong>{item.title}</strong>
                <small>
                  {item.variant} · {item.quantity} шт.
                </small>
              </p>
              <b>{money(item.lineTotal)} ₸</b>
            </article>
          ))}
          <dl>
            <div>
              <dt>Получение</dt>
              <dd>{fulfilmentLabels[order.fulfilmentMethod as FulfilmentMethod] || order.fulfilmentMethod}</dd>
            </div>
            {order.customer.deliveryAddress && (
              <div>
                <dt>Адрес</dt>
                <dd>{order.customer.deliveryAddress}</dd>
              </div>
            )}
            <div>
              <dt>Оплата</dt>
              <dd>{paymentLabels[order.paymentMethod as CheckoutPaymentMethod] || order.paymentMethod}</dd>
            </div>
            {order.customer.preferredContactTime && (
              <div>
                <dt>Связаться</dt>
                <dd>{order.customer.preferredContactTime}</dd>
              </div>
            )}
            <div>
              <dt>Итого</dt>
              <dd>
                <strong>{money(order.totals.final)} ₸</strong>
              </dd>
            </div>
          </dl>
        </section>

        <aside className="order-next-step">
          <h2>Что дальше</h2>
          {canPay ? (
            <>
              <p>Откройте Kaspi Pay или отсканируйте QR. После оплаты нажмите кнопку проверки.</p>
              <Image src="/kaspi_pay_qr.png" alt="QR для оплаты Kaspi Pay" width={220} height={220} unoptimized />
              <a className="store-primary-action" href={OFFICIAL_KASPI_PAY_LINK} target="_blank" rel="noopener noreferrer">
                Открыть Kaspi Pay
              </a>
              <button
                className="store-secondary-action"
                type="button"
                disabled={reporting}
                onClick={reportPayment}
              >
                {reporting ? "Отправляем…" : "Я оплатил — проверить"}
              </button>
            </>
          ) : (
            <>
              <p>Менеджер увидит заказ в MyStore Info и свяжется с вами по указанному телефону.</p>
              <button
                type="button"
                className={`store-secondary-action ${isRefreshing ? "is-refreshing" : ""}`}
                disabled={isRefreshing}
                onClick={() => void load(true)}
              >
                {isRefreshing ? "Обновляем…" : "🔄 Обновить статус"}
              </button>
              {refreshNotice && (
                <p style={{ color: "#35c67a", fontWeight: 700, margin: "2px 0 0", textAlign: "center", fontSize: "13px" }}>
                  {refreshNotice}
                </p>
              )}
            </>
          )}

          {error && <p className="checkout-error" role="alert">{error}</p>}

          <a
            href="https://wa.me/77782508349?text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5!%20%D0%AF%20%D0%BE%D1%84%D0%BE%D1%80%D0%BC%D0%B8%D0%BB%20%D0%B7%D0%B0%D0%BA%D0%B0%D0%B7%20%D0%B2%20Maestro%20%D0%BC%D0%B0%D0%B3%D0%B0%D0%B7%D0%B8%D0%BD%D0%B5"
            target="_blank"
            rel="noopener noreferrer"
            className="store-whatsapp-link"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              background: "rgba(37, 211, 102, 0.12)",
              color: "#25d366",
              border: "1px solid rgba(37, 211, 102, 0.35)",
              padding: "12px 16px",
              borderRadius: "10px",
              fontWeight: 800,
              fontSize: "13.5px",
              textDecoration: "none",
              marginTop: "4px",
              transition: "all 0.2s ease",
            }}
          >
            <span>💬 Написать менеджеру в WhatsApp</span>
          </a>

          <small style={{ display: "block", marginTop: "6px", color: "var(--store-muted)", fontSize: "12px", textAlign: "center" }}>
            Сохраните ссылку на эту страницу — по ней можно проверить статус.
          </small>
        </aside>
      </div>
    </div>
  );
}
