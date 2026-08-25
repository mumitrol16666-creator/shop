"use client";

import { useEffect, useMemo, useState } from "react";
import Barcode from "react-barcode";
import {
  installment,
  money,
  productUnitPrice,
  type Product,
  type Variant,
  variantsFor,
} from "../lib/catalog-data";

type PriceTagPrintModalProps = {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
};

type TagType = "showroom" | "shelf" | "compact";

type PrintItem = {
  key: string;
  product: Product;
  variant: Variant | null;
  price: number;
  originalPrice: number | null;
  code: string;
};

const formatOptions: Array<{ id: TagType; title: string; size: string; description: string }> = [
  { id: "showroom", title: "Витринный", size: "96 × 68 мм", description: "Цена, выгоды и рассрочка" },
  { id: "shelf", title: "Полочный", size: "88 × 50 мм", description: "Крупная цена и штрихкод" },
  { id: "compact", title: "Компактный", size: "58 × 36 мм", description: "Для аксессуаров" },
];

const pageCapacity: Record<TagType, number> = {
  showroom: 6,
  shelf: 8,
  compact: 18,
};

function paginate<T>(items: T[], pageSize: number): T[][] {
  if (!items.length) return [];
  return Array.from({ length: Math.ceil(items.length / pageSize) }, (_, index) =>
    items.slice(index * pageSize, (index + 1) * pageSize),
  );
}

const cleanCode = (value: string) => value.trim().replace(/[^\x20-\x7E]/g, "").slice(0, 48);

function itemCode(product: Product, variant: Variant | null) {
  return cleanCode(variant?.barcode || variant?.sku || product.sku || "") || `MAESTRO-${product.id}`;
}

function itemOriginalPrice(product: Product, variant: Variant | null, price: number) {
  const candidate = variant?.originalPrice || product.originalPrice || 0;
  return candidate > price ? candidate : null;
}

function ProductBarcode({ value, compact = false }: { value: string; compact?: boolean }) {
  return (
    <div className={`tag-barcode${compact ? " is-compact" : ""}`} aria-label={`Штрихкод ${value}`}>
      <Barcode
        value={value}
        format="CODE128"
        width={compact ? 0.8 : 1.1}
        height={compact ? 18 : 26}
        margin={0}
        displayValue={false}
        background="transparent"
        lineColor="#111111"
      />
      <span>{value}</span>
    </div>
  );
}

export function PriceTagPrintModal({ isOpen, onClose, products }: PriceTagPrintModalProps) {
  const [tagType, setTagType] = useState<TagType>("showroom");
  const [includeKaspi, setIncludeKaspi] = useState(true);
  const [includeBarcode, setIncludeBarcode] = useState(true);
  const [separateVariants, setSeparateVariants] = useState(true);

  const printItems = useMemo<PrintItem[]>(() => products.flatMap((product) => {
    const stockedVariants = variantsFor(product).filter((variant) => variant.stock > 0);
    const variants: Array<Variant | null> = separateVariants && stockedVariants.length
      ? stockedVariants
      : [null];

    return variants.map((variant) => {
      const price = productUnitPrice(product, variant);
      return {
        key: `${product.id}:${variant?.sku || "base"}`,
        product,
        variant,
        price,
        originalPrice: itemOriginalPrice(product, variant, price),
        code: itemCode(product, variant),
      };
    });
  }), [products, separateVariants]);
  const printPages = useMemo(
    () => paginate(printItems, pageCapacity[tagType]),
    [printItems, tagType],
  );

  useEffect(() => () => {
    document.body.classList.remove("price-tag-printing");
  }, []);

  if (!isOpen) return null;

  const handlePrint = () => {
    document.body.classList.add("price-tag-printing");
    const pageStyle = document.createElement("style");
    pageStyle.dataset.maestroPriceTagPage = "true";
    pageStyle.textContent = "@page { size: A4 portrait; margin: 6mm; }";
    document.head.appendChild(pageStyle);
    const cleanup = () => {
      document.body.classList.remove("price-tag-printing");
      pageStyle.remove();
    };
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
  };

  return (
    <div className="modal-backdrop price-tag-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="print-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-tag-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="print-modal-header no-print">
          <div>
            <p className="print-modal-eyebrow">MAESTRO MUSIC STORE</p>
            <h2 id="price-tag-title">Печать ценников</h2>
            <p>{printItems.length} ценников · {printPages.length} стр. A4 · {products.length} выбранных товаров</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>

        <div className="print-controls-toolbar no-print">
          <div className="price-tag-format-picker" aria-label="Формат ценника">
            {formatOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={tagType === option.id ? "active" : ""}
                onClick={() => setTagType(option.id)}
                aria-pressed={tagType === option.id}
              >
                <strong>{option.title}</strong>
                <span>{option.size}</span>
                <small>{option.description}</small>
              </button>
            ))}
          </div>

          <div className="price-tag-print-options">
            <label>
              <input type="checkbox" checked={includeKaspi} onChange={(event) => setIncludeKaspi(event.target.checked)} />
              <span>Рассрочка 0-0-12</span>
            </label>
            <label>
              <input type="checkbox" checked={includeBarcode} onChange={(event) => setIncludeBarcode(event.target.checked)} />
              <span>Сканируемый штрихкод</span>
            </label>
            <label>
              <input type="checkbox" checked={separateVariants} onChange={(event) => setSeparateVariants(event.target.checked)} />
              <span>Отдельно по вариантам в наличии</span>
            </label>
          </div>

          <div className="price-tag-print-summary">
            <span>К печати</span>
            <strong>{printItems.length}</strong>
            <small>ценников</small>
          </div>

          <button type="button" className="primary-button print-action-btn" onClick={handlePrint} disabled={!printItems.length}>
            <span aria-hidden="true">🖨</span> Печатать
          </button>
        </div>

        <div className={`price-tag-pages format-${tagType}`}>
          {printPages.map((page, pageIndex) => (
            <section className={`price-tag-page format-${tagType}`} key={`${tagType}-page-${pageIndex}`}>
              <div className="price-tag-page__meta no-print">
                Лист {pageIndex + 1} из {printPages.length} · {page.length} ценников
              </div>
              <div className={`printable-sheet format-${tagType}`}>
          {page.map(({ key, product, variant, price, originalPrice, code }) => {
            const monthlyPayment = installment(price, 12);
            const discountPercent = originalPrice
              ? Math.round(((originalPrice - price) / originalPrice) * 100)
              : 0;
            const variantLabel = variant?.colorName || variant?.name || "";
            const sku = variant?.sku || product.sku;

            if (tagType === "showroom") {
              return (
                <article className="price-tag-showroom" key={key}>
                  <header className="tag-brand-row">
                    <span className="tag-brand-mark">M</span>
                    <span className="tag-logo">MAESTRO <small>MUSIC STORE</small></span>
                    <span className="tag-category">{product.category}</span>
                  </header>

                  <div className="tag-product-copy">
                    <h3 className="tag-title">{product.name}</h3>
                    {variantLabel && <span className="tag-variant-pill">{variantLabel}</span>}
                  </div>

                  <div className="tag-features-list">
                    {product.features.slice(0, 3).map((feature) => <span key={feature}>✓ {feature}</span>)}
                  </div>

                  <div className="tag-price-area">
                    <div className="tag-price-meta">
                      <span className="tag-price-label">{originalPrice ? "Цена по акции" : "Цена магазина"}</span>
                      {originalPrice ? (
                        <div className="tag-price-promo">
                          <span className="tag-old-price">{money(originalPrice)} ₸</span>
                          <span className="tag-discount-badge">−{discountPercent}%</span>
                        </div>
                      ) : (
                        <span className="tag-price-note">за 1 шт. · с гарантией</span>
                      )}
                    </div>
                    <strong className="tag-main-price">{money(price)} <small>₸</small></strong>
                  </div>

                  {includeKaspi && price > 0 && (
                    <div className="tag-kaspi-pill">
                      <span className="tag-kaspi-badge">Kaspi 0-0-12</span>
                      <span>от <strong>{money(monthlyPayment)} ₸</strong> / мес.</span>
                    </div>
                  )}

                  <footer className="tag-showroom-footer">
                    <div className="tag-sku-row"><span>SKU</span><strong>{sku}</strong></div>
                    {includeBarcode && <ProductBarcode value={code} compact />}
                    <span className="tag-city">Актобе</span>
                  </footer>
                </article>
              );
            }

            if (tagType === "shelf") {
              return (
                <article className="price-tag-shelf" key={key}>
                  <header>
                    <span className="tag-brand-mark">M</span>
                    <span className="tag-logo">MAESTRO <small>MUSIC STORE</small></span>
                    {discountPercent > 0 && <span className="tag-discount-badge">−{discountPercent}%</span>}
                  </header>
                  <div className="shelf-product-row">
                    <div>
                      <h3>{product.name}</h3>
                      {variantLabel && <span>{variantLabel}</span>}
                    </div>
                    <small>{sku}</small>
                  </div>
                  <div className="shelf-price-row">
                    <strong>{money(price)} <small>₸</small></strong>
                    {originalPrice && <del>{money(originalPrice)} ₸</del>}
                    {includeKaspi && price > 0 && <span><b>0-0-12</b> {money(monthlyPayment)} ₸/мес.</span>}
                  </div>
                  {includeBarcode && <ProductBarcode value={code} compact />}
                </article>
              );
            }

            return (
              <article className="price-tag-compact" key={key}>
                <header><span className="tag-brand-mark">M</span><b>MAESTRO</b></header>
                <h3>{product.shortName || product.name}</h3>
                {variantLabel && <span className="compact-variant">{variantLabel}</span>}
                <strong>{money(price)} <small>₸</small></strong>
                <footer>
                  <span>{sku}</span>
                  {includeBarcode && <ProductBarcode value={code} compact />}
                </footer>
              </article>
            );
          })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
