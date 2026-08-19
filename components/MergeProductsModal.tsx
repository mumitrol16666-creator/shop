"use client";

import Image from "next/image";
import { useState } from "react";
import { type Product, type Variant, variantsFor } from "../lib/catalog-data";

type MergeProductsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedProducts: Product[];
  onConfirmMerge: (masterProduct: Product, obsoleteProductIds: (string | number)[]) => void;
};

export function MergeProductsModal({
  isOpen,
  onClose,
  selectedProducts,
  onConfirmMerge,
}: MergeProductsModalProps) {
  const [masterIndex, setMasterIndex] = useState<number>(0);

  if (!isOpen || selectedProducts.length < 2) return null;

  const masterProduct = selectedProducts[masterIndex] || selectedProducts[0];

  // Collect all variants from all selected products
  const combinedVariants: Variant[] = selectedProducts.flatMap((p) => variantsFor(p));
  const totalStock = selectedProducts.reduce((acc, p) => acc + (p.quantity || 0), 0);

  const handleExecuteMerge = () => {
    if (!masterProduct) return;

    const merged: Product = {
      ...masterProduct,
      quantity: totalStock,
      variants: combinedVariants.length,
      variantItems: combinedVariants,
      isStored: true,
    };

    const obsoleteIds = selectedProducts
      .filter((p) => p.id !== masterProduct.id)
      .map((p) => p.id);

    onConfirmMerge(merged, obsoleteIds);
    onClose();
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <article
        className="merge-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header-row">
          <div>
            <p className="eyebrow">Оптимизация каталога</p>
            <h2>Объединение товаров в одну модель</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <p className="merge-intro">
          Вы выбрали <strong>{selectedProducts.length} позиций</strong>. Все их цветовые модификации и остатки (суммарно <strong>{totalStock} шт.</strong>) будут объединены в единую карточку товара с переключателем цветов.
        </p>

        <div className="merge-master-picker">
          <label>
            <strong>Выберите основную модель (мастер-карточку):</strong>
            <select
              value={masterIndex}
              onChange={(e) => setMasterIndex(+e.target.value)}
              className="merge-select"
            >
              {selectedProducts.map((p, idx) => (
                <option key={p.id} value={idx}>
                  {p.name} ({p.sku}) · {p.variants} вар. · {p.quantity} шт.
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="merge-preview-card">
          <div className="merge-master-preview">
            <span className="merge-thumb">
              <Image src={masterProduct.image} alt="" fill unoptimized sizes="72px" />
            </span>
            <div>
              <small>{masterProduct.category} · {masterProduct.sku}</small>
              <strong>{masterProduct.name}</strong>
              <p>{masterProduct.description}</p>
            </div>
          </div>

          <div className="merge-variants-list">
            <strong>Итоговый список вариантов ({combinedVariants.length}):</strong>
            <div className="merge-variants-chips">
              {combinedVariants.map((v, i) => (
                <div className="merge-var-chip" key={`${v.sku}-${i}`}>
                  <i style={{ background: v.color || "#8a8175" }} />
                  <span>{v.name}</span>
                  <small>({v.sku}, {v.stock} шт.)</small>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-actions-row">
          <button type="button" className="outline-button" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="primary-button" onClick={handleExecuteMerge}>
            🔗 Подтвердить и объединить
          </button>
        </div>
      </article>
    </div>
  );
}
