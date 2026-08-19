"use client";

import { useState } from "react";
import { installment, money, type Product } from "../lib/catalog-data";

type PriceTagPrintModalProps = {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
};

export function PriceTagPrintModal({ isOpen, onClose, products }: PriceTagPrintModalProps) {
  const [tagType, setTagType] = useState<"showroom" | "barcode" | "compact">("showroom");
  const [includeKaspi, setIncludeKaspi] = useState(true);
  const [includeBarcode, setIncludeBarcode] = useState(true);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="print-modal-content"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="print-modal-header no-print">
          <div>
            <h2>🖨 Генератор ценников и этикеток</h2>
            <p>Печать для торгового зала, витрин и складской маркировки ({products.length} позиций)</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>

        {/* Print Controls Toolbar (Hidden during actual print) */}
        <div className="print-controls-toolbar no-print">
          <div className="control-group">
            <span className="control-label">Формат ценника:</span>
            <div className="format-buttons">
              <button
                type="button"
                className={tagType === "showroom" ? "active" : ""}
                onClick={() => setTagType("showroom")}
              >
                Витринный (с рассрочкой Kaspi)
              </button>
              <button
                type="button"
                className={tagType === "barcode" ? "active" : ""}
                onClick={() => setTagType("barcode")}
              >
                Складской со штрихкодом (EAN-13)
              </button>
              <button
                type="button"
                className={tagType === "compact" ? "active" : ""}
                onClick={() => setTagType("compact")}
              >
                Компактный стикер
              </button>
            </div>
          </div>

          <div className="control-group checkboxes">
            <label>
              <input
                type="checkbox"
                checked={includeKaspi}
                onChange={(e) => setIncludeKaspi(e.target.checked)}
              />
              Блок Kaspi 0-0-12
            </label>
            <label>
              <input
                type="checkbox"
                checked={includeBarcode}
                onChange={(e) => setIncludeBarcode(e.target.checked)}
              />
              Штрихкод / EAN-13
            </label>
          </div>

          <button type="button" className="primary-button print-action-btn" onClick={handlePrint}>
            🖨 Отправить на печать
          </button>
        </div>

        {/* Printable Area */}
        <div className={`printable-sheet format-${tagType}`}>
          {products.map((product) => {
            const price = product.price || 0;
            const originalPrice = product.originalPrice;
            const hasDiscount = Boolean(originalPrice && originalPrice > price);
            const monthlyPayment = installment(price, 12);
            const primaryVariant = product.variantItems?.[0];

            if (tagType === "showroom") {
              return (
                <div className="price-tag-showroom" key={product.id}>
                  <div className="tag-brand-row">
                    <span className="tag-logo">MAESTRO</span>
                    <span className="tag-category">{product.category}</span>
                  </div>
                  <h3 className="tag-title">{product.name}</h3>
                  <div className="tag-sku-row">
                    <span>АРТИКУЛ: <strong>{product.sku}</strong></span>
                    {primaryVariant?.colorName && <span>ЦВЕТ: <strong>{primaryVariant.colorName}</strong></span>}
                  </div>

                  <div className="tag-features-list">
                    {product.features.slice(0, 3).map((f) => (
                      <span key={f}>• {f}</span>
                    ))}
                  </div>

                  <div className="tag-price-block">
                    {hasDiscount && <span className="tag-old-price">{money(originalPrice!)} ₸</span>}
                    <strong className="tag-main-price">{money(price)} ₸</strong>
                  </div>

                  {includeKaspi && price > 0 && (
                    <div className="tag-kaspi-pill">
                      <span className="tag-kaspi-badge">Kaspi 0-0-12</span>
                      <strong>{money(monthlyPayment)} ₸ / мес</strong>
                    </div>
                  )}

                  {includeBarcode && (
                    <div className="tag-barcode-visual">
                      <div className="mock-barcode-lines" />
                      <span className="barcode-number">{primaryVariant?.barcode || `2000${product.id}0001`}</span>
                    </div>
                  )}

                  <div className="tag-footer-info">
                    <span>Гарантия Maestro Store</span>
                    <span>г. Актобе</span>
                  </div>
                </div>
              );
            }

            if (tagType === "barcode") {
              return (
                <div className="barcode-sticker" key={product.id}>
                  <div className="sticker-header">
                    <strong>MAESTRO MUSIC</strong>
                    <span>{product.sku}</span>
                  </div>
                  <p className="sticker-name">{product.name}</p>
                  <div className="mock-barcode-lines tall" />
                  <span className="sticker-code">{primaryVariant?.barcode || `2000${product.id}0001`}</span>
                  <div className="sticker-price">
                    <span>РОЗНИЦА:</span>
                    <strong>{money(price)} ₸</strong>
                  </div>
                </div>
              );
            }

            // Compact
            return (
              <div className="compact-sticker" key={product.id}>
                <strong>{product.name}</strong>
                <small>{product.sku}</small>
                <div className="compact-price">{money(price)} ₸</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
