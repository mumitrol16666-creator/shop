"use client";

import { useMemo, useState } from "react";
import { installment, money, type CartItem } from "../lib/catalog-data";
import { generateQRCodeSVG } from "../lib/qrcode";

type KaspiQrModalProps = {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  totalPrice: number;
  customerName: string;
  customerPhone: string;
  onPaymentSuccess: () => void;
};

export function KaspiQrModal({
  isOpen,
  onClose,
  cartItems,
  totalPrice,
  customerName,
  customerPhone,
  onPaymentSuccess,
}: KaspiQrModalProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Deep link or payment URL for Kaspi
  const paymentUrl = useMemo(() => {
    return `https://kaspi.kz/pay/MaestroMusicStore?amount=${totalPrice}&order=${Date.now()}`;
  }, [totalPrice]);

  const qrSvg = useMemo(() => {
    return generateQRCodeSVG(paymentUrl, 220);
  }, [paymentUrl]);

  if (!isOpen) return null;

  const handleConfirmPaid = () => {
    setIsConfirmed(true);
    setTimeout(() => {
      onPaymentSuccess();
      setIsConfirmed(false);
      onClose();
    }, 2000);
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
            <h3>Заказ успешно оплачен!</h3>
            <p>
              Спасибо за покупку, <strong>{customerName || "дорогой клиент"}</strong>! Менеджер магазина уже подготавливает инструмент и свяжется с вами для согласования выдачи или доставки.
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
              <span className="kaspi-installment-pill">
                0-0-12: от {money(installment(totalPrice, 12))} ₸ / мес
              </span>
            </div>

            <div className="kaspi-qr-frame">
              <div
                className="kaspi-qr-svg-wrap"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <div className="kaspi-qr-center-logo">K</div>
              <span className="kaspi-qr-scan-hint">Отсканируйте камерой Kaspi.kz</span>
            </div>

            <div className="kaspi-steps-list">
              <div className="kaspi-step">
                <span>1</span>
                <p>Откройте приложение <strong>Kaspi.kz</strong> на телефоне</p>
              </div>
              <div className="kaspi-step">
                <span>2</span>
                <p>Нажмите <strong>Kaspi QR</strong> и отсканируйте код с экрана</p>
              </div>
              <div className="kaspi-step">
                <span>3</span>
                <p>Выберите <strong>Kaspi Gold</strong>, <strong>Red</strong> или <strong>Рассрочку 0-0-12</strong></p>
              </div>
            </div>

            <div className="kaspi-actions">
              <a
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="kaspi-mobile-button"
              >
                Открыть счет в приложении Kaspi.kz
              </a>

              <button
                type="button"
                className="kaspi-confirm-button"
                onClick={handleConfirmPaid}
              >
                Я оплатил счет
              </button>
            </div>

            <p className="kaspi-merchant-note">
              Получатель: <strong>ИП Maestro Music Store</strong> · БИН/ИИН подтвержден
            </p>
          </div>
        )}
      </article>
    </div>
  );
}
