"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminAccessGate, useAdminAccess } from "../AdminAccessGate";
import {
  fulfilmentLabels,
  paymentLabels,
  type CheckoutPaymentMethod,
  type FulfilmentMethod,
} from "../../lib/commerce/checkout";
import type { AdminOrder, OrderStatus } from "../../lib/commerce/types";

const money = (value: number) => new Intl.NumberFormat("ru-RU").format(value);
const dateTime = (value?: string) => value
  ? new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Asia/Aqtobe",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  : "—";

const statusMeta: Record<OrderStatus, { label: string; tone: string }> = {
  draft: { label: "Черновик", tone: "muted" },
  pending_contact: { label: "Новый — связаться", tone: "new" },
  awaiting_payment: { label: "Ждём оплату", tone: "waiting" },
  payment_reported: { label: "Проверить оплату", tone: "danger" },
  paid: { label: "Оплачен", tone: "success" },
  processing: { label: "В работе", tone: "progress" },
  completed: { label: "Завершён", tone: "complete" },
  cancelled: { label: "Отменён", tone: "muted" },
  expired: { label: "Резерв истёк", tone: "muted" },
};

const tabs = [
  { id: "new", label: "Новые", statuses: ["pending_contact", "awaiting_payment"] as OrderStatus[] },
  { id: "review", label: "Оплата на проверке", statuses: ["payment_reported"] as OrderStatus[] },
  { id: "paid", label: "Оплачены", statuses: ["paid", "processing"] as OrderStatus[] },
  { id: "finished", label: "Завершены", statuses: ["completed", "cancelled", "expired"] as OrderStatus[] },
  { id: "all", label: "Все", statuses: [] as OrderStatus[] },
] as const;

const phoneForWhatsApp = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("8") && digits.length === 11 ? `7${digits.slice(1)}` : digits;
};

export default function AdminOrdersPage() {
  return (
    <AdminAccessGate>
      <AdminOrdersContent />
    </AdminAccessGate>
  );
}

function AdminOrdersContent() {
  const { logout } = useAdminAccess();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("new");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  const loadOrders = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const response = await fetch("/api/admin/orders", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (response.status === 401) {
        await logout();
        return;
      }
      const payload = (await response.json().catch(() => ({}))) as {
        orders?: AdminOrder[];
        error?: string | { message?: string };
      };
      if (!response.ok || !Array.isArray(payload.orders)) {
        const message = typeof payload.error === "string" ? payload.error : payload.error?.message;
        throw new Error(message || "Не удалось загрузить заказы");
      }
      setOrders(payload.orders);
      setUpdatedAt(new Date().toISOString());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить заказы");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [logout]);

  useEffect(() => {
    const requestedOrder = new URLSearchParams(window.location.search).get("order") || "";
    if (requestedOrder) {
      setSelectedId(requestedOrder);
      setActiveTab("all");
    }
    void loadOrders(true);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadOrders(false);
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const tab = tabs.find((candidate) => candidate.id === activeTab)!;
    const term = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (tab.statuses.length && !tab.statuses.includes(order.status)) return false;
      if (!term) return true;
      const haystack = [
        order.displayId,
        order.customer.name,
        order.customer.phone,
        order.customer.deliveryAddress,
        ...order.items.flatMap((item) => [item.title, item.variant, item.variantSku]),
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(term);
    });
  }, [activeTab, orders, query]);

  const selectedOrder = filteredOrders.find((order) => order.orderId === selectedId)
    || orders.find((order) => order.orderId === selectedId)
    || filteredOrders[0]
    || null;

  const chooseOrder = (orderId: string) => {
    setSelectedId(orderId);
    const url = new URL(window.location.href);
    url.searchParams.set("order", orderId);
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  };

  const mutateOrder = async (
    order: AdminOrder,
    endpoint: string,
    body: Record<string, unknown>,
    successMessage: string,
  ) => {
    setActionId(order.orderId);
    setError("");
    setNotice("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string | { message?: string };
      };
      if (!response.ok) {
        const message = typeof payload.error === "string" ? payload.error : payload.error?.message;
        throw new Error(message || "Не удалось изменить заказ");
      }
      setNotice(successMessage);
      await loadOrders(false);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Не удалось изменить заказ");
    } finally {
      setActionId("");
    }
  };

  const changeStatus = (order: AdminOrder, status: "awaiting_payment" | "processing" | "completed", message: string) =>
    mutateOrder(order, `/api/admin/orders/${encodeURIComponent(order.orderId)}/status`, { status }, message);

  const confirmPayment = (order: AdminOrder) => {
    if (!window.confirm(`Подтвердить получение ${money(order.totals.final)} ₸ по заказу ${order.displayId}?`)) return;
    void mutateOrder(
      order,
      `/api/admin/orders/${encodeURIComponent(order.orderId)}/confirm-payment`,
      {},
      `Оплата ${order.displayId} подтверждена`,
    );
  };

  const cancelOrder = (order: AdminOrder) => {
    if (!window.confirm(`Отменить заказ ${order.displayId}? Резерв товара будет освобождён.`)) return;
    void mutateOrder(
      order,
      `/api/admin/orders/${encodeURIComponent(order.orderId)}/cancel`,
      { reason: "Отменён администратором" },
      `Заказ ${order.displayId} отменён`,
    );
  };

  const tabCount = (statuses: readonly OrderStatus[]) => statuses.length
    ? orders.filter((order) => statuses.includes(order.status)).length
    : orders.length;

  return (
    <main className="site-shell admin-orders-root">
      <header className="admin-topbar admin-orders-topbar">
        <div className="admin-brand">
          <span className="brand-mark">M</span>
          <div><strong>MAESTRO ADMIN</strong><small>Заказы магазина</small></div>
        </div>
        <nav className="admin-nav">
          <Link className="is-active" href="/admin/orders">Заказы</Link>
          <Link href="/admin/pricing">Товары и цены</Link>
          <Link href="/admin/analytics">Аналитика</Link>
          <Link href="/">Витрина</Link>
          <button type="button" className="admin-logout-btn" onClick={() => void logout()}>Выйти</button>
        </nav>
      </header>

      <section className="admin-orders-page">
        <header className="admin-orders-heading">
          <div><p className="admin-orders-eyebrow">ПРОДАЖИ</p><h1>Заказы</h1><p>Новые заявки, проверка оплаты и выдача — в одном месте.</p></div>
          <button type="button" className="admin-orders-refresh" disabled={refreshing} onClick={() => void loadOrders(false)}>
            {refreshing ? "Обновляем…" : "↻ Обновить"}
          </button>
        </header>

        <div className="admin-order-tabs" role="tablist" aria-label="Статусы заказов">
          {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? "is-active" : ""} onClick={() => setActiveTab(tab.id)}><span>{tab.label}</span><b>{tabCount(tab.statuses)}</b></button>)}
        </div>

        <div className="admin-orders-toolbar">
          <label><span>Поиск</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Номер, клиент, телефон или товар" /></label>
          <small>{updatedAt ? `Автообновление · проверено ${dateTime(updatedAt)}` : "Автообновление каждые 20 секунд"}</small>
        </div>

        {error && <div className="admin-orders-alert is-error" role="alert">{error}</div>}
        {notice && <div className="admin-orders-alert is-success" role="status">{notice}</div>}

        {loading ? <div className="admin-orders-empty">Загружаем заказы…</div> : (
          <div className="admin-orders-workspace">
            <section className="admin-order-list" aria-label="Список заказов">
              {!filteredOrders.length && <div className="admin-orders-empty"><strong>Заказов здесь нет</strong><span>Новые заявки появятся автоматически.</span></div>}
              {filteredOrders.map((order) => {
                const status = statusMeta[order.status];
                const qty = order.items.reduce((sum, item) => sum + item.quantity, 0);
                return <button key={order.orderId} type="button" className={`admin-order-list-card ${selectedOrder?.orderId === order.orderId ? "is-selected" : ""}`} onClick={() => chooseOrder(order.orderId)}>
                  <span className={`admin-order-status tone-${status.tone}`}>{status.label}</span>
                  <span className="admin-order-list-head"><strong>{order.displayId}</strong><time>{dateTime(order.createdAt)}</time></span>
                  <span className="admin-order-customer">{order.customer.name}<small>{order.customer.phone}</small></span>
                  <span className="admin-order-list-total"><b>{money(order.totals.final)} ₸</b><small>{qty} ед.</small></span>
                </button>;
              })}
            </section>

            <section className="admin-order-detail" aria-live="polite">
              {selectedOrder ? <OrderDetail
                order={selectedOrder}
                busy={actionId === selectedOrder.orderId}
                confirmPayment={confirmPayment}
                cancelOrder={cancelOrder}
                changeStatus={changeStatus}
              /> : <div className="admin-orders-empty"><strong>Выберите заказ</strong><span>Здесь появятся состав и действия.</span></div>}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

function OrderDetail({
  order,
  busy,
  confirmPayment,
  cancelOrder,
  changeStatus,
}: {
  order: AdminOrder;
  busy: boolean;
  confirmPayment: (order: AdminOrder) => void;
  cancelOrder: (order: AdminOrder) => void;
  changeStatus: (order: AdminOrder, status: "awaiting_payment" | "processing" | "completed", message: string) => Promise<void>;
}) {
  const status = statusMeta[order.status];
  const whatsapp = phoneForWhatsApp(order.customer.phone);
  const fulfilment = fulfilmentLabels[order.fulfilmentMethod as FulfilmentMethod] || order.fulfilmentMethod;
  const payment = paymentLabels[order.paymentMethod as CheckoutPaymentMethod] || order.paymentMethod;
  const canConfirm = ["pending_contact", "awaiting_payment", "payment_reported"].includes(order.status);
  const canCancel = ["pending_contact", "awaiting_payment", "payment_reported"].includes(order.status);

  return <>
    <header className="admin-order-detail-head">
      <div><span className={`admin-order-status tone-${status.tone}`}>{status.label}</span><h2>{order.displayId}</h2><p>Создан {dateTime(order.createdAt)}</p></div>
      <Link href={`/order/${order.publicToken}`} target="_blank">Страница клиента ↗</Link>
    </header>

    <div className="admin-order-contact-card">
      <div><small>Клиент</small><strong>{order.customer.name}</strong><a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a></div>
      <div className="admin-order-contact-actions"><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a><a href={`tel:${order.customer.phone}`}>Позвонить</a></div>
    </div>

    <dl className="admin-order-facts">
      <div><dt>Получение</dt><dd>{fulfilment}</dd></div>
      {order.customer.deliveryAddress && <div><dt>Адрес</dt><dd>{order.customer.deliveryAddress}</dd></div>}
      <div><dt>Оплата</dt><dd>{payment}</dd></div>
      {order.customer.preferredContactTime && <div><dt>Связаться</dt><dd>{order.customer.preferredContactTime}</dd></div>}
      {order.reservationExpiresAt && canConfirm && <div><dt>Резерв до</dt><dd>{dateTime(order.reservationExpiresAt)}</dd></div>}
      {order.customer.comment && <div><dt>Комментарий</dt><dd>{order.customer.comment}</dd></div>}
    </dl>

    <section className="admin-order-items"><h3>Состав заказа</h3>{order.items.map((item) => <article key={`${item.variantSku}-${item.bundleSku}`}><div><strong>{item.title}</strong><small>{item.variant} · {item.variantSku}</small>{item.components.map((component) => <small key={component.sku}>+ {component.title}</small>)}</div><span>{item.quantity} шт.</span><b>{money(item.lineTotal)} ₸</b></article>)}<div className="admin-order-total"><span>Итого</span><strong>{money(order.totals.final)} ₸</strong></div></section>

    <section className="admin-order-timeline"><h3>История</h3>{[...order.history].reverse().map((entry) => <div key={entry.id}><i /><span><strong>{statusMeta[entry.toStatus].label}</strong><small>{dateTime(entry.createdAt)}</small></span></div>)}</section>

    <footer className="admin-order-actions">
      {order.status === "pending_contact" && <button type="button" className="admin-action-secondary" disabled={busy} onClick={() => void changeStatus(order, "awaiting_payment", `${order.displayId}: ожидаем оплату`)}>Связались — ждём оплату</button>}
      {canConfirm && <button type="button" className="admin-action-primary" disabled={busy} onClick={() => confirmPayment(order)}>{order.status === "payment_reported" ? "✓ Подтвердить поступление" : "✓ Подтвердить оплату"}</button>}
      {order.status === "paid" && <button type="button" className="admin-action-primary" disabled={busy} onClick={() => void changeStatus(order, "processing", `${order.displayId} передан в работу`)}>Передать в работу</button>}
      {order.status === "processing" && <button type="button" className="admin-action-primary" disabled={busy} onClick={() => void changeStatus(order, "completed", `${order.displayId} завершён`)}>Завершить заказ</button>}
      {canCancel && <button type="button" className="admin-action-danger" disabled={busy} onClick={() => cancelOrder(order)}>Отменить</button>}
      {busy && <span>Сохраняем…</span>}
    </footer>
  </>;
}
