"use client";

import Image from "next/image";
import { type Dispatch, type SetStateAction, useState } from "react";
import {
  installment,
  money,
  type Product,
  type Variant,
  variantsFor,
} from "../lib/catalog-data";
import { resolveAttachedCourse } from "../lib/courses-data";
import { playProductAudio, stopProductAudio } from "../lib/sound-synth";
import { quoteConfiguration } from "../lib/commerce/pricing";
import { BUNDLE_SKUS, COMPONENT_SKUS } from "../lib/commerce/types";

type ProductModalProps = {
  selected: Product | null;
  selectedVariant: Variant | null;
  setSelectedVariant: (variant: Variant) => void;
  requestedQuantity: number;
  setRequestedQuantity: Dispatch<SetStateAction<number>>;
  mode: "buyer" | "purchaser";
  onClose: () => void;
  onAddToCart: (
    product: Product,
    variant: Variant,
    bundle: "base" | "gift_course" | "pro_pack",
    componentSkus: string[],
  ) => void;
};

export function ProductModal({
  selected,
  selectedVariant,
  setSelectedVariant,
  requestedQuantity,
  setRequestedQuantity,
  mode,
  onClose,
  onAddToCart,
}: ProductModalProps) {
  const [installmentMonths, setInstallmentMonths] = useState<number>(12);
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const [selectedStrings, setSelectedStrings] = useState<"elixir" | "daddario" | null>(null);

  const commerceProduct = selected?.commerce;
  const proBundle = commerceProduct?.bundleDefinitions.find((bundle) => bundle.id === "pro_pack");
  const courseBundle = commerceProduct?.bundleDefinitions.find((bundle) => bundle.id === "gift_course");
  const elixirComponent = commerceProduct?.componentDefinitions.find((component) => component.sku === COMPONENT_SKUS.elixirStrings);
  const daddarioComponent = commerceProduct?.componentDefinitions.find((component) => component.sku === COMPONENT_SKUS.daddarioStrings);
  const showProPackOption = Boolean(proBundle);
  const showCourseOption = Boolean(courseBundle);
  const showStringsUpsell = Boolean(elixirComponent || daddarioComponent);
  const proPackTitle = proBundle?.description || "Чехол + Ремень + VIP Доступ";
  const proPackPrice = proBundle?.priceDelta || 0;

  const [selectedBundle, setSelectedBundle] = useState<"base" | "gift_course" | "pro_pack">(
    showCourseOption ? "gift_course" : showProPackOption ? "pro_pack" : "base"
  );

  if (!selected) return null;

  const availableVariants = variantsFor(selected);
  const attachedCourse = showCourseOption ? resolveAttachedCourse(selected) : null;
  const selectedImage = selectedVariant?.image || selected.image;
  const bundleSku = selectedBundle === "pro_pack"
    ? BUNDLE_SKUS.proPack
    : selectedBundle === "gift_course"
      ? BUNDLE_SKUS.giftCourse
      : BUNDLE_SKUS.base;
  const selectedComponentSkus = selectedStrings === "elixir"
    ? [COMPONENT_SKUS.elixirStrings]
    : selectedStrings === "daddario"
      ? [COMPONENT_SKUS.daddarioStrings]
      : [];
  const quote = commerceProduct && selectedVariant
    ? quoteConfiguration(commerceProduct, {
        variantSku: selectedVariant.sku,
        bundleSku,
        componentSkus: selectedComponentSkus,
      })
    : selected.commerce?.defaultPrice;
  const currentPrice = quote?.final || 0;
  const hasDiscount = Boolean(quote && quote.discount > 0);
  const discountPercent = quote?.subtotal
    ? Math.round(((quote.discount || 0) / quote.subtotal) * 100)
    : 0;
  const originalPrice = quote?.subtotal || currentPrice;

  const handlePlaySound = () => {
    if (!selected.audioUrl) return;
    if (isPlayingSound) {
      stopProductAudio();
      setIsPlayingSound(false);
      return;
    }
    setIsPlayingSound(true);
    playProductAudio(selected.audioUrl, () => {
      setIsPlayingSound(false);
    });
  };

  const handleAddToCart = () => {
    if (!selectedVariant || selectedVariant.stock <= 0) return;
    onAddToCart(
      selected,
      selectedVariant,
      selectedBundle,
      selectedComponentSkus,
    );
  };

  const currentVariantStock = selectedVariant?.stock ?? 0;
  const canAddToCart = Boolean(selectedVariant && currentVariantStock > 0);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <article className="product-modal modern-product-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Закрыть">×</button>

        {/* SCROLLABLE MAIN BODY */}
        <div className="modal-scrollable-content">
          {/* LEFT COLUMN: Gallery, Audio & Badges */}
          <div className="modal-image-col">
            <div className="modal-image-container">
              <Image
                key={selectedImage}
                src={selectedImage}
                alt={`${selected.name} — ${selectedVariant?.name ?? "вариант"}`}
                fill
                unoptimized
                sizes="(max-width: 800px) 90vw, 48vw"
                className="modal-main-img"
              />
              {hasDiscount && <span className="modal-discount-pill">АКЦИЯ -{discountPercent}%</span>}

              {selected.audioUrl && (
                <button
                  type="button"
                  className={`sound-preview-btn ${isPlayingSound ? "playing" : ""}`}
                  onClick={handlePlaySound}
                  title={isPlayingSound ? "Остановить" : "Послушать реальное звучание инструмента"}
                >
                  <span className="sound-icon">{isPlayingSound ? "🎵" : "🔊"}</span>
                  <span>{isPlayingSound ? "Звучит пример..." : "Послушать звучание"}</span>
                  {isPlayingSound && (
                    <span className="sound-wave-bars">
                      <i /><i /><i /><i />
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Master Setup Guarantee Pill */}
            <div className="master-setup-badge">
              <span className="badge-icon">🛠</span>
              <div>
                <strong>Бесплатная доводка мастером</strong>
                <small>Отстройка мензуры, мягкая посадка струн 1.5 мм</small>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Configuration, Bundles & Purchase */}
          <div className="modal-details-col">
            {/* Header Title Row */}
            <div className="modal-head-row">
              <div className="modal-cat-and-stock">
                <span className="modal-category-badge">{selected.category}</span>
                <span className={`modal-stock-pill ${currentVariantStock > 0 ? "in-stock" : "out"}`}>
                  {currentVariantStock > 0 ? `● В наличии ${currentVariantStock} шт.` : "Под заказ"}
                </span>
              </div>
              <h2 className="modal-product-title">{selected.name}</h2>
              <div className="modal-sku-bar">
                <span>Артикул: <code>{selectedVariant?.sku ?? selected.sku}</code></span>
                {selected.badge && <span className="modal-highlight-tag">{selected.badge}</span>}
              </div>
            </div>

            {mode === "buyer" ? (
              <div className="modal-interactive-body">
                {/* STEP 1: VARIANT / COLOR SELECTOR */}
                <div className="clean-section-block">
                  <div className="clean-section-title">
                    <span>1. Выберите вариант:</span>
                    <strong>{selectedVariant?.name || "Не выбран"}</strong>
                  </div>
                  <div className="clean-swatches-grid">
                    {availableVariants.map((variant) => {
                      const isSelected = (selectedVariant?.sku || selectedVariant?.name) === (variant.sku || variant.name);
                      return (
                        <button
                          type="button"
                          key={variant.sku || variant.name}
                          className={`clean-swatch-tile ${isSelected ? "active" : ""}`}
                          onClick={() => {
                            setSelectedVariant(variant);
                            setRequestedQuantity(1);
                          }}
                        >
                          <i
                            style={{
                              background: variant.secondary
                                ? `linear-gradient(135deg, ${variant.color} 0 50%, ${variant.secondary} 50%)`
                                : variant.color || "#181511",
                            }}
                          />
                          <span className="swatch-tile-name">{variant.name}</span>
                          <small className="swatch-tile-stock">{variant.stock} шт.</small>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* STEP 2: BUNDLE / COURSE SELECTOR */}
                {(showCourseOption || showProPackOption) && (
                  <div className="clean-section-block">
                    <div className="clean-section-title">
                      <span>2. Выберите комплектацию:</span>
                    </div>
                    <div className="clean-bundles-grid">
                      <button
                        type="button"
                        className={`clean-bundle-card ${selectedBundle === "base" ? "active" : ""}`}
                        onClick={() => setSelectedBundle("base")}
                      >
                        <div className="bundle-card-top-row">
                          <span className="bundle-card-icon">🎸</span>
                          <strong className="bundle-card-name">Только инструмент</strong>
                        </div>
                        <small className="bundle-card-desc">Заводская коробка + ключи</small>
                        <div className="bundle-card-price-row">
                          <strong>+0 ₸</strong>
                        </div>
                      </button>

                      {showCourseOption && (
                        <button
                          type="button"
                          className={`clean-bundle-card gift-highlight ${selectedBundle === "gift_course" ? "active" : ""}`}
                          onClick={() => setSelectedBundle("gift_course")}
                        >
                          <span className="bundle-badge-gift">ПОДАРОК 0 ₸</span>
                          <div className="bundle-card-top-row">
                            <span className="bundle-card-icon">🎁</span>
                            <strong className="bundle-card-name">Гитара + Курс</strong>
                          </div>
                          <small className="bundle-card-desc">
                            {attachedCourse ? `Курс «${attachedCourse.title}»` : "Онлайн-курс в подарок"}
                          </small>
                          <div className="bundle-card-price-row">
                            <strong className="free-tag">Бесплатно (0 ₸)</strong>
                          </div>
                        </button>
                      )}

                      {showProPackOption && (
                        <button
                          type="button"
                          className={`clean-bundle-card pro-highlight ${selectedBundle === "pro_pack" ? "active" : ""}`}
                          onClick={() => setSelectedBundle("pro_pack")}
                        >
                          <span className="bundle-badge-pro">PRO НАБОР</span>
                          <div className="bundle-card-top-row">
                            <span className="bundle-card-icon">👑</span>
                            <strong className="bundle-card-name">PRO Комплект</strong>
                          </div>
                          <small className="bundle-card-desc">{proPackTitle}</small>
                          <div className="bundle-card-price-row">
                            <strong>+{money(proPackPrice)} ₸</strong>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 3: OPTIONAL STRINGS ORDER BUMP (-50%) */}
                {showStringsUpsell && (
                  <div className="clean-section-block">
                    <div className="clean-section-title">
                      <span>3. Спецпредложение к заказу (-50%):</span>
                    </div>
                    <div className="clean-bump-list">
                      {elixirComponent && <div
                        className={`clean-bump-item ${selectedStrings === "elixir" ? "active" : ""}`}
                        onClick={() => setSelectedStrings(selectedStrings === "elixir" ? null : "elixir")}
                      >
                        <div className="bump-check-circle">
                          {selectedStrings === "elixir" ? "✓" : ""}
                        </div>
                        <div className="bump-text-wrap">
                          <strong>👑 Струны Elixir Nanoweb (США) <span className="discount-tag-red">-50%</span></strong>
                          <small>Служат до 6 месяцев · Звонкий премиальный тон</small>
                        </div>
                        <div className="bump-pricing-wrap">
                          <del>9 900 ₸</del>
                          <strong>+{money(elixirComponent.price)} ₸</strong>
                        </div>
                      </div>}

                      {daddarioComponent && <div
                        className={`clean-bump-item ${selectedStrings === "daddario" ? "active" : ""}`}
                        onClick={() => setSelectedStrings(selectedStrings === "daddario" ? null : "daddario")}
                      >
                        <div className="bump-check-circle">
                          {selectedStrings === "daddario" ? "✓" : ""}
                        </div>
                        <div className="bump-text-wrap">
                          <strong>🎸 Струны D&apos;Addario Pro <span className="discount-tag-red">-50%</span></strong>
                          <small>Мягкое натяжение для легких первых аккордов</small>
                        </div>
                        <div className="bump-pricing-wrap">
                          <del>4 900 ₸</del>
                          <strong>+{money(daddarioComponent.price)} ₸</strong>
                        </div>
                      </div>}
                    </div>
                  </div>
                )}

                {/* STEP 4: KASPI INSTALLMENT TRANSPARENT BREAKDOWN */}
                {currentPrice > 0 && (
                  <div className="clean-installment-box">
                    <div className="installment-box-top">
                      <div className="installment-brand">
                        <span className="kaspi-red-badge">kaspi</span>
                        <strong>Рассрочка без переплат</strong>
                      </div>
                      <strong className="monthly-figure">
                        {money(installment(currentPrice, installmentMonths))} ₸ <small>/ мес</small>
                      </strong>
                    </div>

                    <div className="installment-pills-selector">
                      {[3, 6, 12].map((m) => (
                        <button
                          key={m}
                          type="button"
                          className={`installment-pill-btn ${installmentMonths === m ? "active" : ""}`}
                          onClick={() => setInstallmentMonths(m)}
                        >
                          {m === 3 ? "3 мес (Kaspi Red)" : `${m} мес (0-0-${m})`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* COLLAPSIBLE DETAILS & FEATURES ACCORDION */}
                <details className="clean-details-accordion">
                  <summary>
                    <span>📋 Описание и характеристики инструмента</span>
                    <span className="accordion-chevron">▼</span>
                  </summary>
                  <div className="accordion-content">
                    <p className="product-modal-desc">{selected.description}</p>
                    <ul className="product-features-checklist">
                      {selected.features.map((feature) => (
                        <li key={feature}>✓ {feature}</li>
                      ))}
                    </ul>
                  </div>
                </details>
              </div>
            ) : (
              <div className="purchaser-mode-notice">
                <span>Режим управления: редактирование через панель закупщика</span>
              </div>
            )}
          </div>
        </div>

        {/* STICKY BOTTOM ACTION & CHECKOUT BAR */}
        {mode === "buyer" && (
          <div className="modal-sticky-bottom-bar">
            <div className="bottom-price-summary">
              <span className="bottom-price-label">ИТОГО К ОПЛАТЕ:</span>
              <div className="bottom-price-numbers">
                <strong className="bottom-current-price">
                  {money(currentPrice * requestedQuantity)} ₸
                </strong>
                {hasDiscount && originalPrice > currentPrice && (
                  <del className="bottom-old-price">
                    {money(originalPrice * requestedQuantity)} ₸
                  </del>
                )}
              </div>
            </div>

            <div className="bottom-actions-group">
              <div className="modal-qty-clean">
                <button
                  type="button"
                  onClick={() => setRequestedQuantity((q) => Math.max(1, q - 1))}
                  disabled={requestedQuantity <= 1}
                  aria-label="Уменьшить"
                >
                  −
                </button>
                <span>{requestedQuantity}</span>
                <button
                  type="button"
                  onClick={() =>
                    setRequestedQuantity((q) => Math.min(currentVariantStock, q + 1))
                  }
                  disabled={requestedQuantity >= currentVariantStock}
                  aria-label="Увеличить"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="modal-buy-button-primary"
                onClick={handleAddToCart}
                disabled={!canAddToCart}
              >
                {selectedVariant
                  ? currentVariantStock > 0
                    ? "🛒 Добавить в корзину"
                    : "Нет в наличии"
                  : "Выберите вариант"}
              </button>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
