import { useState } from "react";
import { buildWhatsAppOrderUrl, installment, money, type CartItem } from "../lib/catalog-data";

export const OFFICIAL_KASPI_PAY_LINK = "https://pay.kaspi.kz/pay/ku3aldre";

type KaspiQrModalProps = {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  totalPrice: number;
  customerName: string;
  customerPhone: string;
  customerCity?: string;
  customerComment?: string;
  onPaymentSuccess: () => void;
};

export function KaspiQrModal({
  isOpen,
  onClose,
  cartItems,
  totalPrice,
  customerName,
  customerPhone,
  customerCity = "Актобе",
  customerComment = "",
  onPaymentSuccess,
}: KaspiQrModalProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleConfirmPaid = () => {
    setIsConfirmed(true);

    // Send complete order details to WhatsApp manager
    const fullComment = [
      customerComment,
      `💳 [ОПЛАТА]: Клиент подтвердил оплату через Kaspi Pay (${OFFICIAL_KASPI_PAY_LINK}). Ожидает подтверждения и отправки.`,
    ]
      .filter(Boolean)
      .join("\n");

    const waUrl = buildWhatsAppOrderUrl({
      customerName,
      customerPhone,
      customerCity,
      customerComment: fullComment,
      cartItems,
      totalPrice,
    });

    window.open(waUrl, "_blank", "noopener,noreferrer");

    setTimeout(() => {
      onPaymentSuccess();
      setIsConfirmed(false);
      onClose();
    }, 2400);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <article
        className="kaspi-qr-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Оплата через Kaspi QR"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="kaspi-modal-head">
          <div className="kaspi-brand-logo">
            <span className="kaspi-red-badge">kaspi</span>
            <strong>Pay · QR</strong>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        {isConfirmed ? (
          <div className="kaspi-success-screen">
            <div className="kaspi-success-icon">✓</div>
            <h3>Заказ принят в обработку!</h3>
            <p>
              Спасибо за оплату, <strong>{customerName || "дорогой клиент"}</strong>! Заявка отправлена менеджеру в WhatsApp. Мы свяжемся с вами в течение 5 минут.
            </p>
            <div className="receipt-box">
              <span>Сумма: <strong>{money(totalPrice)} ₸</strong></span>
              <span>Товаров: <strong>{cartItems.reduce((a, b) => a + b.quantity, 0)} шт.</strong></span>
            </div>
          </div>
        ) : (
          <div className="kaspi-modal-body">
            <div className="kaspi-amount-box">
              <span className="kaspi-amount-label">Сумма к оплате</span>
              <strong className="kaspi-amount-val">{money(totalPrice)} ₸</strong>
              <div className="kaspi-pills-row" style={{ display: "flex", gap: "6px", justifyContent: "center", marginTop: "4px" }}>
                <span className="kaspi-installment-pill">Kaspi Red (3 мес)</span>
                <span className="kaspi-installment-pill">0-0-12: от {money(installment(totalPrice, 12))} ₸/мес</span>
              </div>
            </div>

            {/* Direct Mobile Link to Kaspi App */}
            <a
              href={OFFICIAL_KASPI_PAY_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="kaspi-mobile-app-button"
            >
              <span className="kaspi-btn-icon">📲</span>
              <span>Оплатить в приложении Kaspi.kz</span>
            </a>

            <div className="kaspi-divider-line">
              <span>или отсканируйте QR с экрана</span>
            </div>

            <div className="kaspi-qr-frame">
              <div className="kaspi-official-qr-wrap">
                <img
                  src="/kaspi_pay_qr.png"
                  alt="Официальный Kaspi QR Maestro"
                  className="kaspi-official-qr-img"
                />
              </div>
              <span className="kaspi-qr-scan-hint">Отсканируйте камерой в приложении Kaspi.kz</span>
            </div>

            <div className="kaspi-steps-list">
              <div className="kaspi-step">
                <span>1</span>
                <p>Оплатите по кнопке выше или отсканируйте QR-код</p>
              </div>
              <div className="kaspi-step">
                <span>2</span>
                <p>Выберите <strong>Kaspi Red</strong>, <strong>Gold</strong> или <strong>Рассрочку 0-0-12</strong></p>
              </div>
              <div className="kaspi-step">
                <span>3</span>
                <p>Нажмите кнопку ниже для отправки чека менеджеру в WhatsApp</p>
              </div>
            </div>

            <div className="kaspi-actions">
              <button
                type="button"
                className="kaspi-confirm-button"
                onClick={handleConfirmPaid}
              >
                ✓ Я оплатил через Kaspi → Подтвердить заказ
              </button>
            </div>

            <p className="kaspi-merchant-note">
              Получатель: <strong>MAESTRO MUSIC STORE</strong> · Ссылка: <a href={OFFICIAL_KASPI_PAY_LINK} target="_blank" rel="noopener noreferrer" style={{ color: "var(--kaspi)", textDecoration: "underline" }}>pay.kaspi.kz</a>
            </p>
          </div>
        )}
      </article>
    </div>
  );
}
