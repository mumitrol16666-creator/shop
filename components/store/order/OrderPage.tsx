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
  const [remaining, setRemaining] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(token)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.order) throw new Error(payload?.error?.message || "Заказ не найден.");
      setOrder(payload.order as PublicOrder);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Заказ не найден."); }
  }, [token]);
  useEffect(() => { void load(); const poll = window.setInterval(() => void load(), 15_000); return () => window.clearInterval(poll); }, [load]);
  useEffect(() => {
    const update = () => {
      if (!order?.reservationExpiresAt) return setRemaining("");
      const seconds = Math.max(0, Math.ceil((new Date(order.reservationExpiresAt).getTime() - Date.now()) / 1000));
      setRemaining(seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "истёк");
    };
    update(); const timer = window.setInterval(update, 1_000); return () => window.clearInterval(timer);
  }, [order?.reservationExpiresAt]);
  const reportPayment = async () => {
    if (!order) return;
    setReporting(true); setError("");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(order.orderId)}/payment-report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference: "customer_kaspi_report" }) });
      const payload = await response.json();
      if (!response.ok || !payload.order) throw new Error(payload?.error?.message || "Не удалось отправить отметку.");
      setOrder(payload.order as PublicOrder);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось отправить отметку."); } finally { setReporting(false); }
  };
  if (error && !order) return <section className="store-page store-order-page"><div className="store-empty-state"><strong>Не удалось открыть заказ</strong><p>{error}</p><Link className="store-primary-action" href="/catalog">В каталог</Link></div></section>;
  if (!order) return <section className="store-page store-order-page" role="status">Загружаем заказ…</section>;
  const state = statusText[order.status] || statusText.pending_contact;
  const canPay = order.paymentMethod === "kaspi_pay" && order.status === "awaiting_payment";
  return (
    <div className="store-page store-order-page">
      <section className={`order-success is-${order.status}`}><span>✓</span><div><p className="store-eyebrow">ЗАКАЗ {order.displayId}</p><h1>{state.title}</h1><p>{state.text}</p></div></section>
      <div className="store-order-layout"><section className="order-details"><div className="order-heading"><h2>Состав заказа</h2>{remaining && <span>Резерв: {remaining}</span>}</div>{order.items.map((item) => <article key={`${item.variantSku}-${item.bundleSku}`}><div><Image src="/favicon.svg" alt="" fill unoptimized sizes="64px" /></div><p><strong>{item.title}</strong><small>{item.variant} · {item.quantity} шт.</small></p><b>{money(item.lineTotal)} ₸</b></article>)}<dl><div><dt>Получение</dt><dd>{fulfilmentLabels[order.fulfilmentMethod as FulfilmentMethod] || order.fulfilmentMethod}</dd></div>{order.customer.deliveryAddress && <div><dt>Адрес</dt><dd>{order.customer.deliveryAddress}</dd></div>}<div><dt>Оплата</dt><dd>{paymentLabels[order.paymentMethod as CheckoutPaymentMethod] || order.paymentMethod}</dd></div>{order.customer.preferredContactTime && <div><dt>Связаться</dt><dd>{order.customer.preferredContactTime}</dd></div>}<div><dt>Итого</dt><dd><strong>{money(order.totals.final)} ₸</strong></dd></div></dl></section><aside className="order-next-step"><h2>Что дальше</h2>{canPay ? <><p>Откройте Kaspi Pay или отсканируйте QR. После оплаты нажмите кнопку проверки.</p><Image src="/kaspi_pay_qr.png" alt="QR для оплаты Kaspi Pay" width={220} height={220} unoptimized /><a className="store-primary-action" href={OFFICIAL_KASPI_PAY_LINK} target="_blank" rel="noopener noreferrer">Открыть Kaspi Pay</a><button className="store-secondary-action" type="button" disabled={reporting} onClick={reportPayment}>{reporting ? "Отправляем…" : "Я оплатил — проверить"}</button></> : <><p>Менеджер увидит заказ в MyStore Info и свяжется с вами по указанному телефону.</p><button type="button" className="store-secondary-action" onClick={() => void load()}>Обновить статус</button></>}{error && <p className="checkout-error" role="alert">{error}</p>}<small>Сохраните ссылку на эту страницу — по ней можно проверить статус.</small></aside></div>
    </div>
  );
}
