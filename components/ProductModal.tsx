"use client";

import Image from "next/image";
import { type Dispatch, type SetStateAction, useState } from "react";
import { installment, money, type Product, type Variant, variantsFor } from "../lib/catalog-data";
import { resolveAttachedCourse } from "../lib/courses-data";
import { playProductAudio, stopProductAudio } from "../lib/sound-synth";

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
    variant?: Variant | null,
    bundle?: "base" | "gift_course" | "pro_pack",
    price?: number,
    giftCourseTitle?: string,
    bundleTitle?: string,
    stringsUpsell?: string,
    stringsUpsellPrice?: number,
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

  const showProPackOption = selected ? selected.allowProPack !== false : false;
  const showCourseOption = selected ? selected.attachedCourseId !== "none" : false;
  const showStringsUpsell = selected ? selected.allowStringsUpsell !== false : false;
  const proPackTitle = selected?.proPackTitle || "Чехол + Ремень + VIP Доступ";
  const proPackPrice = selected?.proPackPrice !== undefined ? selected.proPackPrice : 8900;

  const [selectedBundle, setSelectedBundle] = useState<"base" | "gift_course" | "pro_pack">(
    showCourseOption ? "gift_course" : showProPackOption ? "pro_pack" : "base"
  );

  if (!selected) return null;

  const attachedCourse = showCourseOption ? resolveAttachedCourse(selected) : null;
  const selectedImage = selectedVariant?.image || selected.image;
  const basePrice = selectedVariant?.price || selected.price || 0;
  const bundleDelta = selectedBundle === "pro_pack" ? proPackPrice : 0;
  const stringsDelta = selectedStrings === "elixir" ? 4950 : selectedStrings === "daddario" ? 2450 : 0;
  const currentPrice = basePrice + bundleDelta + stringsDelta;

  const hasDiscount = Boolean(
    (selected.originalPrice && currentPrice && selected.originalPrice > currentPrice) ||
    (selected.discountPercent && selected.discountPercent > 0)
  );
  const discountPercent =
    selected.discountPercent ||
    (selected.originalPrice && currentPrice
      ? Math.round(((selected.originalPrice - currentPrice) / selected.originalPrice) * 100)
      : 0);
  const originalPrice =
    selected.originalPrice ||
    (currentPrice && discountPercent > 0
      ? Math.round(currentPrice / (1 - discountPercent / 100))
      : null);
  const savings = hasDiscount && originalPrice ? originalPrice - currentPrice : 0;

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
    const giftCourseName = attachedCourse ? attachedCourse.title : undefined;
    const bundleName =
      selectedBundle === "pro_pack"
        ? `PRO: ${proPackTitle}`
        : selectedBundle === "gift_course"
        ? (giftCourseName ? `Подарок: Курс «${giftCourseName}»` : "Подарок: Онлайн-курс")
        : "Только инструмент";
    const stringsName =
      selectedStrings === "elixir"
        ? "Струны Elixir Nanoweb (-50%)"
        : selectedStrings === "daddario"
        ? "Струны D'Addario Pro (-50%)"
        : undefined;

    onAddToCart(
      selected,
      selectedVariant,
      selectedBundle,
      currentPrice,
      giftCourseName,
      bundleName,
      stringsName,
      stringsDelta
    );
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <article className="product-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Закрыть">×</button>
        <div className="modal-image">
          <Image
            key={selectedImage}
            src={selectedImage}
            alt={`${selected.name} — ${selectedVariant?.name ?? "вариант"}`}
            fill
            unoptimized
            sizes="(max-width: 800px) 90vw, 48vw"
          />
          {hasDiscount && <span className="modal-discount-pill">АКЦИЯ -{discountPercent}%</span>}

          {selected.audioUrl && (
            <button
              type="button"
              className={`sound-preview-btn ${isPlayingSound ? "playing" : ""}`}
              onClick={handlePlaySound}
              title={isPlayingSound ? "Остановить" : "Послушать звучание инструмента"}
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
        <div className="modal-copy">
          <p className="eyebrow">{selected.category}</p>
          <h2>{selected.name}</h2>
          <p className="modal-description">{selected.description}</p>
          <ul>
            {selected.features.map((feature) => <li key={feature}>✓ {feature}</li>)}
          </ul>
          <div className="modal-meta">
            <span>Артикул <strong>{selectedVariant?.sku ?? selected.sku}</strong></span>
            <span>Всего в наличии <strong>{selected.quantity} шт.</strong></span>
          </div>
          {mode === "buyer" ? (
            <>
              <div className="variant-selector">
                <div className="selector-title">
                  <span>Выберите вариант / цвет</span>
                  <strong>{selectedVariant?.name}</strong>
                </div>
                <div className="variant-options">
                  {variantsFor(selected).map((variant) => (
                    <button
                      type="button"
                      key={variant.name}
                      className={selectedVariant?.name === variant.name ? "active" : ""}
                      onClick={() => {
                        setSelectedVariant(variant);
                        setRequestedQuantity(1);
                      }}
                      title={variant.name}
                    >
                      <i
                        style={{
                          background: variant.secondary
                            ? `linear-gradient(135deg, ${variant.color} 0 50%, ${variant.secondary} 50%)`
                            : variant.color,
                        }}
                      />
                      <span>{variant.name}</span>
                      <small>{variant.stock} шт.</small>
                    </button>
                  ))}
                </div>
                {selectedVariant?.note && <p className="variant-note">{selectedVariant.note}</p>}
              </div>

              {/* Bundle & Course Selector */}
              {(showCourseOption || showProPackOption) && (
                <div className="bundle-selector-card">
                  <span className="bundle-label">ВЫБЕРИТЕ КОМПЛЕКТАЦИЮ:</span>
                  <div className="bundle-options-grid">
                    <button
                      type="button"
                      className={selectedBundle === "base" ? "bundle-btn active" : "bundle-btn"}
                      onClick={() => setSelectedBundle("base")}
                    >
                      <span className="bundle-title">🎸 Только инструмент</span>
                      <small>Заводская комплектация</small>
                      <strong>+0 ₸</strong>
                    </button>

                    {showCourseOption && (
                      attachedCourse ? (
                        <button
                          type="button"
                          className={selectedBundle === "gift_course" ? "bundle-btn active recommended" : "bundle-btn recommended"}
                          onClick={() => setSelectedBundle("gift_course")}
                        >
                          <span className="bundle-badge-pill">ПОДАРОК 0 ₸</span>
                          <span className="bundle-title">🎁 + Курс «{attachedCourse.title.length > 26 ? attachedCourse.title.slice(0, 26) + "..." : attachedCourse.title}»</span>
                          <small>{attachedCourse.lessonsCount || 10} уроков · Преп. {attachedCourse.instructor.name}</small>
                          <strong className="free-text">Бесплатно ({money(attachedCourse.price)} ₸)</strong>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={selectedBundle === "gift_course" ? "bundle-btn active recommended" : "bundle-btn recommended"}
                          onClick={() => setSelectedBundle("gift_course")}
                        >
                          <span className="bundle-badge-pill">ПОДАРОК 0 ₸</span>
                          <span className="bundle-title">🎁 Гитара + Онлайн-курс</span>
                          <small>12 видеоуроков от Maestro</small>
                          <strong className="free-text">Бесплатно</strong>
                        </button>
                      )
                    )}

                    {showProPackOption && (
                      <button
                        type="button"
                        className={selectedBundle === "pro_pack" ? "bundle-btn active" : "bundle-btn"}
                        onClick={() => setSelectedBundle("pro_pack")}
                      >
                        <span className="bundle-title">👑 PRO Комплект</span>
                        <small>{proPackTitle}</small>
                        <strong>+{money(proPackPrice)} ₸</strong>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Exclusive Strings Order Bump (-50%) */}
              {showStringsUpsell && (
                <div className="order-bump-box">
                  <div className="bump-box-header">
                    <span className="bump-tag-gold">⚡ СПЕЦПРЕДЛОЖЕНИЕ (-50%)</span>
                    <p>Запасной комплект премиум-струн со скидкой 50% к этой гитаре</p>
                  </div>

                  <div className="bump-options-list">
                    <div
                      className={`bump-option-row ${selectedStrings === "elixir" ? "active" : ""}`}
                      onClick={() => setSelectedStrings(selectedStrings === "elixir" ? null : "elixir")}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="bump-checkbox-visual">
                        {selectedStrings === "elixir" ? "✓" : ""}
                      </div>
                      <div className="bump-option-text">
                        <div className="bump-title-row">
                          <strong>👑 Струны Elixir Nanoweb (США)</strong>
                          <span className="bump-badge-usa">-50%</span>
                        </div>
                        <small>Служат до 6 месяцев · Полимерная нано-защита от коррозии · Звонкий тон</small>
                      </div>
                      <div className="bump-option-pricing">
                        <span className="bump-price-old">9 900 ₸</span>
                        <strong className="bump-price-new">+4 950 ₸</strong>
                      </div>
                    </div>

                    <div
                      className={`bump-option-row ${selectedStrings === "daddario" ? "active" : ""}`}
                      onClick={() => setSelectedStrings(selectedStrings === "daddario" ? null : "daddario")}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="bump-checkbox-visual">
                        {selectedStrings === "daddario" ? "✓" : ""}
                      </div>
                      <div className="bump-option-text">
                        <div className="bump-title-row">
                          <strong>🎸 Струны D'Addario / Alice Pro</strong>
                          <span className="bump-badge-usa">-50%</span>
                        </div>
                        <small>Мягкое натяжение для легких аккордов · Сбалансированный чистый звук</small>
                      </div>
                      <div className="bump-option-pricing">
                        <span className="bump-price-old">4 900 ₸</span>
                        <strong className="bump-price-new">+2 450 ₸</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Live Assembly Summary Card */}
              <div className="live-assembly-card">
                <div className="assembly-card-header">
                  <span className="assembly-tag">📦 СОСТАВ ВАШЕЙ КОМПЛЕКТАЦИИ:</span>
                  <span className="assembly-live-pill">● Собирается вживую</span>
                </div>
                <ul className="assembly-items-list">
                  <li>
                    <span className="assembly-icon">🎸</span>
                    <div className="assembly-item-content">
                      <strong>{selected.name}</strong>
                      <small>Цвет: {selectedVariant?.name || "Стандарт"}</small>
                    </div>
                    <span className="assembly-item-price">{money(basePrice)} ₸</span>
                  </li>

                  <li>
                    <span className="assembly-icon">
                      {selectedBundle === "base" ? "📦" : selectedBundle === "gift_course" ? "🎁" : "👑"}
                    </span>
                    <div className="assembly-item-content">
                      <strong>
                        {selectedBundle === "base"
                          ? "Заводская комплектация"
                          : selectedBundle === "gift_course"
                          ? `Подарочный курс «${attachedCourse ? attachedCourse.title : "Онлайн-курс"}»`
                          : `PRO Комплект: ${proPackTitle}`}
                      </strong>
                      <small>
                        {selectedBundle === "base"
                          ? "Гитара в коробке + ключи"
                          : selectedBundle === "gift_course"
                          ? "16 видеоуроков с доступом навсегда"
                          : "Чехол, ремень и расширенная комплектация"}
                      </small>
                    </div>
                    <span className={`assembly-item-price ${selectedBundle === "gift_course" ? "free" : ""}`}>
                      {selectedBundle === "base" ? "+0 ₸" : selectedBundle === "gift_course" ? "Бесплатно (0 ₸)" : `+${money(proPackPrice)} ₸`}
                    </span>
                  </li>

                  {selectedStrings && (
                    <li className="assembly-item-upsell">
                      <span className="assembly-icon">⚡</span>
                      <div className="assembly-item-content">
                        <strong>
                          {selectedStrings === "elixir" ? "Струны Elixir Nanoweb (USA)" : "Струны D'Addario Pro"}
                        </strong>
                        <small>Скидка 50% к заказу гитары</small>
                      </div>
                      <span className="assembly-item-price">+{money(stringsDelta)} ₸</span>
                    </li>
                  )}

                  <li className="assembly-item-bonus">
                    <span className="assembly-icon">🛠</span>
                    <div className="assembly-item-content">
                      <strong>Отстройка мастером и мягкие струны</strong>
                      <small>Регулировка анкера 1.5–2 мм + шлифовка ладов</small>
                    </div>
                    <span className="assembly-item-price free">Включено (0 ₸)</span>
                  </li>
                </ul>

                <div className="assembly-total-row">
                  <span>Итоговый комплект:</span>
                  <strong>{money(currentPrice * requestedQuantity)} ₸</strong>
                </div>
              </div>

              {currentPrice > 0 && (
                <div className="modal-installment-card">
                  <div className="installment-header">
                    <div>
                      <span className="installment-title">Рассрочка без переплат</span>
                      <strong className="installment-amount">
                        {money(installment(currentPrice, installmentMonths))} ₸ <small>/ мес</small>
                      </strong>
                    </div>
                    <span className="installment-badge-pill">0-0-{installmentMonths}</span>
                  </div>

                  <div className="installment-tabs">
                    {[3, 6, 12, 24].map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`installment-tab ${installmentMonths === m ? "active" : ""}`}
                        onClick={() => setInstallmentMonths(m)}
                      >
                        {m} мес
                      </button>
                    ))}
                  </div>

                  <div className="installment-partners">
                    <span>Kaspi Рассрочка / Red</span>
                    <span>•</span>
                    <span>Halyk Bank</span>
                    <span>•</span>
                    <span>0 ₸ первый взнос</span>
                  </div>
                </div>
              )}

              <div className="modal-action">
                <div className="price-block">
                  <div className="price-block-header">
                    <small>{hasDiscount ? "Акционная цена" : "Розничная цена"}</small>
                    {hasDiscount && <span className="modal-discount-tag">-{discountPercent}%</span>}
                  </div>
                  <div className="price-block-numbers">
                    <strong className="current-price">{money(currentPrice * requestedQuantity)} ₸</strong>
                    {hasDiscount && originalPrice && (
                      <span className="old-price">{money((originalPrice + bundleDelta + stringsDelta) * requestedQuantity)} ₸</span>
                    )}
                  </div>
                  {savings > 0 && (
                    <span className="savings-badge">Экономия {money(savings * requestedQuantity)} ₸</span>
                  )}
                </div>

                <div className="quantity-and-buy">
                  <div className="modal-qty">
                    <button
                      type="button"
                      onClick={() => setRequestedQuantity((q) => Math.max(1, q - 1))}
                      disabled={requestedQuantity <= 1}
                      aria-label="Уменьшить количество"
                    >
                      −
                    </button>
                    <span>{requestedQuantity}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setRequestedQuantity((q) =>
                          Math.min(selectedVariant?.stock ?? selected.quantity, q + 1)
                        )
                      }
                      disabled={requestedQuantity >= (selectedVariant?.stock ?? selected.quantity)}
                      aria-label="Увеличить количество"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleAddToCart}
                  >
                    🛒 В заявку · {money(currentPrice * requestedQuantity)} ₸
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="modal-action">
              <span className="purchaser-hint">Режим закупщика: редактирование через панель закупщика</span>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
