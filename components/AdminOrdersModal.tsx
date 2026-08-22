"use client";

import { useEffect, useState } from "react";
import { money } from "../lib/catalog-data";
import type { AdminOrder } from "../lib/commerce/types";

type AdminOrdersModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onNotice?: (msg: string) => void;
};

export function AdminOrdersModal({ isOpen, onClose, onNotice }: AdminOrdersModalProps) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "paid" | "cancelled">("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders?include_test=1", { cache: "no-store" });
      if (!res.ok) throw new Error("Не удалось загрузить заказы");
      const data = (await res.json()) as { orders?: AdminOrder[] };
      if (Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error(err);
      if (onNotice) onNotice("Ошибка загрузки заказов");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void fetchOrders();
    }
  }, [isOpen]);

  const handleConfirmPayment = async (orderId: string) => {
    setActionLoadingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/confirm-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: "admin_manual_confirm" }),
      });
      if (!res.ok) throw new Error("Не удалось подтвердить оплату");
      if (onNotice) onNotice("✅ Оплата подтверждена!");
      await fetchOrders();
    } catch (err) {
      console.error(err);
      if (onNotice) onNotice("Ошибка подтверждения оплаты");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setActionLoadingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "admin_cancelled_return_to_shelf" }),
      });
      if (!res.ok) throw new Error("Не удалось отменить заказ");
      if (onNotice) onNotice("📦 Заказ отменён, товар возвращён на полку!");
      await fetchOrders();
    } catch (err) {
      console.error(err);
      if (onNotice) onNotice("Ошибка при отмене заказа");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelAllPending = async () => {
    const pendingOrders = orders.filter(
      (o) => o.status === "payment_reported" || o.status === "awaiting_payment",
    );
    if (pendingOrders.length === 0) {
      if (onNotice) onNotice("Нет активных заказов для отмены");
      return;
    }
    if (!confirm(`Отменить все активные заказы (${pendingOrders.length} шт.) и вернуть товары на полку?`)) {
      return;
    }
    setLoading(true);
    try {
      for (const order of pendingOrders) {
        await fetch(`/api/admin/orders/${order.orderId}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "admin_bulk_cancelled" }),
        });
      }
      if (onNotice) onNotice(`🎉 Отменено заказов: ${pendingOrders.length}. Все товары возвращены на склад!`);
      await fetchOrders();
    } catch (err) {
      console.error(err);
      if (onNotice) onNotice("Ошибка при массовой отмене");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredOrders = orders.filter((o) => {
    if (filter === "pending") return o.status === "payment_reported" || o.status === "awaiting_payment";
    if (filter === "paid") return o.status === "paid";
    if (filter === "cancelled") return o.status === "cancelled" || o.status === "expired";
    return true;
  });

  const pendingCount = orders.filter(
    (o) => o.status === "payment_reported" || o.status === "awaiting_payment",
  ).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "payment_reported":
        return <span className="order-badge warning">💳 Проверка оплаты</span>;
      case "awaiting_payment":
        return <span className="order-badge info">⏳ Ожидает оплаты</span>;
      case "paid":
        return <span className="order-badge success">✅ Оплачен</span>;
      case "cancelled":
        return <span className="order-badge neutral">✕ Отменён</span>;
      case "expired":
        return <span className="order-badge neutral">⏰ Истёк</span>;
      default:
        return <span className="order-badge neutral">{status}</span>;
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="orders-modal-card"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="orders-modal-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h3 style={{ margin: 0 }}>📦 Управление заказами и бронью</h3>
              {pendingCount > 0 && (
                <span className="order-badge-counter">{pendingCount} активных</span>
              )}
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--muted)" }}>
              Просмотр входящих покупок, подтверждение оплат и возврат товаров на полку
            </p>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        {/* Toolbar */}
        <div className="orders-modal-toolbar">
          <div className="orders-tabs">
            <button
              type="button"
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              Все ({orders.length})
            </button>
            <button
              type="button"
              className={filter === "pending" ? "active" : ""}
              onClick={() => setFilter("pending")}
            >
              🔔 На подтверждении ({pendingCount})
            </button>
            <button
              type="button"
              className={filter === "paid" ? "active" : ""}
              onClick={() => setFilter("paid")}
            >
              ✅ Оплаченные ({orders.filter((o) => o.status === "paid").length})
            </button>
            <button
              type="button"
              className={filter === "cancelled" ? "active" : ""}
              onClick={() => setFilter("cancelled")}
            >
              ✕ Отменённые ({orders.filter((o) => o.status === "cancelled" || o.status === "expired").length})
            </button>
          </div>

          <div className="orders-actions-group">
            {pendingCount > 0 && (
              <button
                type="button"
                className="cancel-all-orders-btn"
                onClick={handleCancelAllPending}
                disabled={loading}
              >
                Вернуть все {pendingCount} на полку ↩️
              </button>
            )}
            <button
              type="button"
              className="refresh-orders-btn"
              onClick={fetchOrders}
              disabled={loading}
            >
              {loading ? "Загрузка..." : "🔄 Обновить"}
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div className="orders-modal-body">
          {filteredOrders.length === 0 ? (
            <div className="orders-empty-state">
              <span style={{ fontSize: "36px" }}>📭</span>
              <strong>Заказов в этой категории нет</strong>
              <p>Все товары находятся на складе и готовы к покупке.</p>
            </div>
          ) : (
            <div className="orders-list">
              {filteredOrders.map((order) => {
                const isPending =
                  order.status === "payment_reported" || order.status === "awaiting_payment";
                const isProcessing = actionLoadingId === order.orderId;
                const formattedDate = new Date(order.createdAt).toLocaleString("ru-RU", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const cleanPhone = order.customer.phone.replace(/[^\d+]/g, "");

                return (
                  <div key={order.orderId} className={`order-card-item ${order.status}`}>
                    <div className="order-card-top">
                      <div className="order-card-id-block">
                        <strong>Заказ #{order.displayId}</strong>
                        <span className="order-date">{formattedDate}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="order-total-block">
                        <span>Итого:</span>
                        <strong>{money(order.totals.final)} ₸</strong>
                      </div>
                    </div>

                    <div className="order-card-details">
                      <div className="order-customer-info">
                        <div>
                          <strong>{order.customer.name}</strong>
                          <a
                            href={`tel:${cleanPhone}`}
                            className="order-phone-link"
                          >
                            📞 {order.customer.phone}
                          </a>
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone.replace("+", "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="order-wa-link"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                        <div className="order-address-text">
                          📍 {order.customer.city}
                          {order.customer.address ? `, ${order.customer.address}` : ""}
                        </div>
                        {order.customer.comment && (
                          <div className="order-comment-box">
                            💬 «{order.customer.comment}»
                          </div>
                        )}
                      </div>

                      <div className="order-items-snapshot">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="order-item-row">
                            <span className="order-item-title">
                              <strong>{item.title}</strong>
                              <small>({item.variant})</small>
                            </span>
                            <span className="order-item-qty">{item.quantity} шт.</span>
                            <span className="order-item-price">{money(item.lineTotal)} ₸</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {isPending && (
                      <div className="order-card-footer-actions">
                        <button
                          type="button"
                          className="order-confirm-btn"
                          disabled={isProcessing}
                          onClick={() => handleConfirmPayment(order.orderId)}
                        >
                          {isProcessing ? "Обработка..." : "✓ Подтвердить оплату"}
                        </button>
                        <button
                          type="button"
                          className="order-cancel-btn"
                          disabled={isProcessing}
                          onClick={() => handleCancelOrder(order.orderId)}
                        >
                          {isProcessing ? "Обработка..." : "✕ Отменить заказ (вернуть на полку)"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
