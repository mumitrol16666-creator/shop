"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "../../../lib/catalog-data";
import type { CheckoutPaymentMethod, FulfilmentMethod } from "../../../lib/commerce/checkout";
import { useCommerceCart } from "../../CommerceCartProvider";

export function CheckoutPage() {
  const cart = useCommerceCart();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [contactTime, setContactTime] = useState("");
  const [comment, setComment] = useState("");
  const [fulfilment, setFulfilment] = useState<FulfilmentMethod>("pickup");
  const [payment, setPayment] = useState<CheckoutPaymentMethod>("kaspi_pay");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const lines = cart.reconciliation.lines;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const order = await cart.createOrder({
        customer: {
          name,
          phone,
          city: "Актобе",
          comment,
          deliveryAddress: fulfilment === "aktobe_delivery" ? address : "",
          preferredContactTime: contactTime,
        },
        fulfilment: { method: fulfilment },
        payment: { method: payment },
      });
      cart.clear();
      router.push(`/order/${order.publicToken}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать заказ.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!lines.length) return <section className="store-page store-checkout-page"><div className="store-empty-state"><strong>Корзина пуста</strong><p>Для оформления сначала добавьте товар.</p><Link className="store-primary-action" href="/catalog">Перейти в каталог</Link></div></section>;

  return (
    <div className="store-page store-checkout-page">
      <header><p className="store-eyebrow">ОФОРМЛЕНИЕ</p><h1>Как получить заказ?</h1><p>Товар будет зарезервирован на 30 минут. Менеджер подтвердит детали.</p></header>
      <form className="store-checkout-layout" onSubmit={submit}>
        <div className="store-checkout-form">
          <section className="checkout-section"><span className="checkout-step">1</span><h2>Контакты</h2><div className="checkout-grid"><label>Имя<input name="customerName" required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Как к вам обращаться" /></label><label>Телефон<input name="customerPhone" required pattern="(?:\D*\d){10,}\D*" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+7 700 000-00-00" /></label></div><label>Удобное время связи <small>необязательно</small><select value={contactTime} onChange={(event) => setContactTime(event.target.value)}><option value="">Как можно скорее</option><option>Сегодня до 18:00</option><option>Сегодня после 18:00</option><option>Завтра утром</option><option>Завтра днём</option></select></label></section>
          <section className="checkout-section"><span className="checkout-step">2</span><h2>Получение</h2><div className="checkout-options"><label className={fulfilment === "pickup" ? "is-selected" : ""}><input type="radio" name="fulfilment" checked={fulfilment === "pickup"} onChange={() => setFulfilment("pickup")} /><strong>Самовывоз</strong><small>Из магазина Maestro в Актобе</small></label><label className={fulfilment === "aktobe_delivery" ? "is-selected" : ""}><input type="radio" name="fulfilment" checked={fulfilment === "aktobe_delivery"} onChange={() => setFulfilment("aktobe_delivery")} /><strong>Доставка по Актобе</strong><small>Стоимость и время подтвердит менеджер</small></label></div>{fulfilment === "aktobe_delivery" && <label>Адрес доставки<input required value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Улица, дом, квартира" /></label>}</section>
          <section className="checkout-section"><span className="checkout-step">3</span><h2>Оплата</h2><div className="checkout-options"><label className={payment === "kaspi_pay" ? "is-selected" : ""}><input type="radio" name="payment" checked={payment === "kaspi_pay"} onChange={() => setPayment("kaspi_pay")} /><strong>Kaspi Pay / QR</strong><small>Оплата после создания заказа</small></label><label className={payment === "cash_transfer" ? "is-selected" : ""}><input type="radio" name="payment" checked={payment === "cash_transfer"} onChange={() => setPayment("cash_transfer")} /><strong>Наличные или перевод</strong><small>Согласуете с менеджером</small></label></div><label>Комментарий <small>необязательно</small><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Цвет, вопрос или пожелание" rows={3} /></label></section>
        </div>
        <aside className="store-checkout-summary"><h2>Ваш заказ</h2>{lines.map((line) => <article key={line.lineId}><div><Image src={line.variantImage || line.productImage} alt="" fill unoptimized sizes="72px" /></div><p><strong>{line.productTitle}</strong><small>{line.variantTitle} · {line.quantity} шт.</small></p><b>{money(line.pricing.final * line.quantity)} ₸</b></article>)}<div className="checkout-total"><span>Итого</span><strong>{money(cart.reconciliation.totals.final)} ₸</strong></div>{error && <p className="checkout-error" role="alert">{error}</p>}<button className="store-primary-action" type="submit" disabled={submitting || cart.isReconciling || cart.reconciliation.state !== "ready"}>{submitting ? "Создаём заказ…" : "Подтвердить заказ"}</button><small className="checkout-consent">Нажимая кнопку, вы соглашаетесь на обработку данных для выполнения заказа.</small></aside>
      </form>
    </div>
  );
}
