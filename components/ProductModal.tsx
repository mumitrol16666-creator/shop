"use client";

import Image from "next/image";
import { type Dispatch, type SetStateAction, useState } from "react";
import { installment, money, type Product, type Variant, variantsFor } from "../lib/catalog-data";
import { resolveAttachedCourse } from "../lib/courses-data";
import { playInstrumentPreview, type SoundType } from "../lib/sound-synth";

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
  const [selectedBundle, setSelectedBundle] = useState<"base" | "gift_course" | "pro_pack">("gift_course");

  if (!selected) return null;

  const attachedCourse = resolveAttachedCourse(selected);
  const selectedImage = selectedVariant?.image || selected.image;
  const basePrice = selectedVariant?.price || selected.price || 0;
  const bundleDelta = selectedBundle === "pro_pack" ? 8900 : 0;
  const currentPrice = basePrice + bundleDelta;

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
    if (isPlayingSound) return;
    setIsPlayingSound(true);
    let soundType: SoundType = "acoustic-strum";
    if (selected.category.includes("Электро")) soundType = "electric-clean";
    else if (selected.category.includes("Укулеле")) soundType = "ukulele-chord";
    else if (selected.category.includes("Оборудование")) soundType = "electric-crunch";

    playInstrumentPreview(soundType, () => {
      setIsPlayingSound(false);
    });
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

          <button
            type="button"
            className={`sound-preview-btn ${isPlayingSound ? "playing" : ""}`}
            onClick={handlePlaySound}
            title="Послушать демонстрацию звучания инструмента"
          >
            <span className="sound-icon">{isPlayingSound ? "🎵" : "🔊"}</span>
            <span>{isPlayingSound ? "Звучит пример..." : "Послушать звучание"}</span>
            {isPlayingSound && (
              <span className="sound-wave-bars">
                <i /><i /><i /><i />
              </span>
            )}
          </button>
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
              <div className="bundle-selector-card">
                <span className="bundle-label">Выберите комплектацию:</span>
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

                  {attachedCourse ? (
                    <button
                      type="button"
                      className={selectedBundle === "gift_course" ? "bundle-btn active recommended" : "bundle-btn recommended"}
                      onClick={() => setSelectedBundle("gift_course")}
                    >
                      <span className="bundle-badge-pill">ПОДАРОК 0 ₸</span>
                      <span className="bundle-title">🎁 + Курс «{attachedCourse.title.length > 28 ? attachedCourse.title.slice(0, 28) + "..." : attachedCourse.title}»</span>
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
                  )}

                  <button
                    type="button"
                    className={selectedBundle === "pro_pack" ? "bundle-btn active" : "bundle-btn"}
                    onClick={() => setSelectedBundle("pro_pack")}
                  >
                    <span className="bundle-title">👑 PRO Комплект</span>
                    <small>Чехол + Ремень + VIP Доступ</small>
                    <strong>+8 900 ₸</strong>
                  </button>
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
                    <strong>
                      {currentPrice > 0
                        ? `${money(currentPrice)} ₸`
                        : "Уточняется"}
                    </strong>
                    {hasDiscount && originalPrice && (
                      <span className="modal-old-price">{money(originalPrice)} ₸</span>
                    )}
                  </div>
                  {savings > 0 && <span className="savings-badge">Экономия {money(savings)} ₸</span>}
                </div>
                <div className="quantity-picker" aria-label="Количество">
                  <button
                    onClick={() => setRequestedQuantity((value) => Math.max(1, value - 1))}
                    disabled={requestedQuantity <= 1}
                  >
                    −
                  </button>
                  <strong>{requestedQuantity}</strong>
                  <button
                    onClick={() =>
                      setRequestedQuantity((value) =>
                        Math.min(selectedVariant?.stock ?? 1, value + 1),
                      )
                    }
                    disabled={requestedQuantity >= (selectedVariant?.stock ?? 1)}
                  >
                    +
                  </button>
                </div>
                <button
                  className="primary-button"
                  onClick={() =>
                    onAddToCart(
                      selected,
                      selectedVariant,
                      selectedBundle,
                      currentPrice,
                      selectedBundle === "gift_course" ? attachedCourse?.title : undefined
                    )
                  }
                >
                  Добавить в заявку
                </button>
              </div>
            </>
          ) : (
            <div className="internal-note">
              <strong>Внутренняя карточка</strong>
              <span>Штрихкод и фактическая себестоимость будут добавлены после получения данных.</span>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
