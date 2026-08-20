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
  requestId: string;
  onPaymentReported: () => void;
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
  requestId,
  onPaymentReported,
}: KaspiQrModalProps) {
  const [isReported, setIsReported] = useState(false);

  if (!isOpen) return null;

  const handleReportPayment = () => {
    setIsReported(true);

    // Stage 0 fallback: report the payment for manual verification. This action
    // never marks an order as paid and never clears the buyer's cart.
    const fullComment = [
      customerComment,
      `💳 [СТАТУС ОПЛАТЫ]: payment_reported — клиент сообщил об оплате через Kaspi Pay (${OFFICIAL_KASPI_PAY_LINK}). Требуется ручная проверка.`,
    ]
      .filter(Boolean)
      .join("\n");

    const waUrl = buildWhatsAppOrderUrl({
      requestId,
      paymentStatus: "payment_reported",
      customerName,
      customerPhone,
      customerCity,
      customerComment: fullComment,
      cartItems,
      totalPrice,
    });

    window.open(waUrl, "_blank", "noopener,noreferrer");

    setTimeout(() => {
      onPaymentReported();
      setIsReported(false);
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

        {isReported ? (
          <div className="kaspi-success-screen">
            <div className="kaspi-success-icon">✓</div>
            <h3>Сообщение об оплате отправлено</h3>
            <p>
              <strong>{customerName || "Клиент"}</strong>, менеджер проверит поступление денег. До проверки статус заказа — «ожидает подтверждения».
            </p>
            <div className="receipt-box">
              <span>Заявка: <strong>{requestId}</strong></span>
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
                onClick={handleReportPayment}
              >
                Сообщить об оплате и отправить заявку
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
