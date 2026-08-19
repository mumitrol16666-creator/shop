"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  installment,
  instrumentChoices,
  money,
  type Product,
  type Variant,
  variantsFor,
} from "../lib/catalog-data";
import { resolveAttachedCourse } from "../lib/courses-data";
import { playInstrumentPreview, type SoundType } from "../lib/sound-synth";

type StorefrontProps = {
  category: string;
  setCategory: (category: string) => void;
  categories: string[];
  filteredProducts: Product[];
  openProduct: (product: Product, variantOverride?: Variant | null) => void;
  chooseCategory: (category: string) => void;
  featuredProduct?: Product;
};

export function Storefront({
  category,
  setCategory,
  categories,
  filteredProducts,
  openProduct,
  chooseCategory,
  featuredProduct,
}: StorefrontProps) {
  const [quickFilter, setQuickFilter] = useState<"all" | "sale" | "in_stock">("all");
  const [sortBy, setSortBy] = useState<"popular" | "price_asc" | "price_desc" | "discount">("popular");
  const [playingId, setPlayingId] = useState<string | number | null>(null);
  const [selectedVariantsByProduct, setSelectedVariantsByProduct] = useState<Record<string | number, Variant>>({});

  const displayedProducts = useMemo(() => {
    let list = [...filteredProducts];

    // Quick filters
    if (quickFilter === "sale") {
      list = list.filter((p) =>
        Boolean(
          p.isDiscountActive ||
          (p.discountPercent && p.discountPercent > 0) ||
          (p.originalPrice && p.price && p.originalPrice > p.price),
        ),
      );
    } else if (quickFilter === "in_stock") {
      list = list.filter((p) => (p.quantity || 0) > 0);
    }

    // Sorting
    if (sortBy === "price_asc") {
      list.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === "discount") {
      list.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
    }

    return list;
  }, [filteredProducts, quickFilter, sortBy]);

  const handleCardSoundPlay = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (playingId === product.id) return;
    setPlayingId(product.id);
    let soundType: SoundType = "acoustic-strum";
    if (product.category.includes("Электро")) soundType = "electric-clean";
    else if (product.category.includes("Укулеле")) soundType = "ukulele-chord";
    else if (product.category.includes("Оборудование")) soundType = "electric-crunch";

    playInstrumentPreview(soundType, () => {
      setPlayingId(null);
    });
  };

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="announcement-bar">
        <div className="announcement-inner">
          <span>⚡ <strong>Поставка 2026:</strong> Бесплатная отстройка гитары мастером + Онлайн-курс в подарок к каждому инструменту!</span>
          <span className="announcement-sep">•</span>
          <span>🚚 Доставка по Казахстану от 1 дня</span>
          <span className="announcement-sep">•</span>
          <span>📞 Консультация мастера: <strong>+7 (777) 505-57-88</strong></span>
        </div>
      </div>

      <section className="hero" id="new">
        <div className="hero-copy">
          <p className="eyebrow">ПОСТАВКА 2026 · ИНСТРУМЕНТЫ В НАЛИЧИИ</p>
          <h1 className="hero-headline">Музыкальные инструменты и гитары Maestro</h1>
          <p className="hero-lead">
            Электрогитары, акустика, классика, укулеле и гитарное оборудование. Все инструменты проверяются перед выдачей,
            а заявка оформляется напрямую через менеджера без лишней суеты.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#catalog">Открыть каталог</a>
            <a className="secondary-button" href="#delivery">Условия доставки</a>
          </div>
          <div className="hero-stats">
            <div className="stat-box">
              <strong>14</strong>
              <span>моделей в поставке</span>
            </div>
            <div className="stat-box">
              <strong>85</strong>
              <span>инструментов на складе</span>
            </div>
            <div className="stat-box">
              <strong>4</strong>
              <span>основные категории</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-card">
            <span className="badge">Выбор недели</span>
            <div className="hero-image-wrap">
              <Image
                src="/products/02_39_gradient_electric.png"
                alt="Электрогитара 39″ Gradient"
                fill
                unoptimized
                priority
                sizes="(max-width: 900px) 90vw, 420px"
              />
            </div>
            <div className="hero-card-meta">
              <div>
                <p className="eyebrow">ЭЛЕКТРОГИТАРЫ</p>
                <h3>Электрогитара 39″ Gradient</h3>
              </div>
              {featuredProduct && (
                <button className="hero-detail-btn" onClick={() => openProduct(featuredProduct)}>
                  Подробнее
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div className="trust-item">
          <strong>Проверка каждого инструмента</strong>
          <span>Отстройка грифа, визуальный контроль покрытия и проверка фурнитуры.</span>
        </div>
        <div className="trust-item">
          <strong>Рассрочка 0-0-12 и 0-0-24</strong>
          <span>Kaspi Red, Kaspi Рассрочка и Halyk Bank без скрытых комиссий и переплат.</span>
        </div>
        <div className="trust-item">
          <strong>Доставка по Казахстану</strong>
          <span>Бережная упаковка и отправка проверенными курьерскими службами.</span>
        </div>
      </section>

      <section className="store-flow" aria-label="Как оформить заказ">
        <div className="flow-step">
          <span className="step-num">01</span>
          <strong>Выберите инструмент</strong>
          <p>Подберите модель, цвет и комплектацию в каталоге.</p>
        </div>
        <div className="flow-step">
          <span className="step-num">02</span>
          <strong>Соберите заявку</strong>
          <p>Добавьте нужные позиции в корзину и оставьте контактные данные.</p>
        </div>
        <div className="flow-step">
          <span className="step-num">03</span>
          <strong>Подтвердите с менеджером</strong>
          <p>Свяжемся, уточним детали, забронируем инструмент и согласуем отправку.</p>
        </div>
      </section>

      <section className="instrument-picker" id="picker">
        <div className="section-head">
          <div>
            <p className="eyebrow">ПОДБОР</p>
            <h2>С чего начать выбор?</h2>
          </div>
        </div>
        <div className="picker-grid">
          {instrumentChoices.map((choice) => (
            <button
              key={choice.title}
              className="picker-card"
              onClick={() => chooseCategory(choice.title)}
            >
              <span className="picker-thumb">
                <Image src={choice.image} alt={choice.title} fill unoptimized sizes="120px" />
              </span>
              <div className="picker-text">
                <strong>{choice.title}</strong>
                <p>{choice.caption}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="catalog-section" id="catalog">
        <div className="section-head">
          <div>
            <p className="eyebrow">КАТАЛОГ</p>
            <h2>Инструменты и аксессуары ({displayedProducts.length})</h2>
          </div>
          <div className="category-filter" role="tablist" aria-label="Категории">
            {categories.map((item) => (
              <button
                key={item}
                role="tab"
                aria-selected={category === item}
                className={category === item ? "active" : ""}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Control Bar (Quick Filters & Sorting) */}
        <div className="catalog-control-bar">
          <div className="quick-filter-pills">
            <button
              type="button"
              className={quickFilter === "all" ? "active" : ""}
              onClick={() => setQuickFilter("all")}
            >
              Все товары
            </button>
            <button
              type="button"
              className={quickFilter === "sale" ? "active" : ""}
              onClick={() => setQuickFilter("sale")}
            >
              🔥 Только по акции (Sale)
            </button>
            <button
              type="button"
              className={quickFilter === "in_stock" ? "active" : ""}
              onClick={() => setQuickFilter("in_stock")}
            >
              📦 В наличии ({filteredProducts.filter((p) => (p.quantity || 0) > 0).length})
            </button>
          </div>

          <div className="catalog-sort-group">
            <span className="sort-label">Сортировка:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label="Сортировка каталога"
            >
              <option value="popular">По популярности</option>
              <option value="price_asc">Сначала недорогие</option>
              <option value="price_desc">Сначала премиум</option>
              <option value="discount">По размеру скидки</option>
            </select>
          </div>
        </div>

        <div className="products-grid">
          {displayedProducts.map((product) => {
            const productPrice = product.price ?? 0;
            const hasDiscount = Boolean(
              (product.originalPrice && product.price && product.originalPrice > product.price) ||
              (product.discountPercent && product.discountPercent > 0)
            );
            const discountPercent =
              product.discountPercent ||
              (product.originalPrice && product.price
                ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                : 0);
            const originalPrice =
              product.originalPrice ||
              (product.price && discountPercent > 0
                ? Math.round(product.price / (1 - discountPercent / 100))
                : null);
            const isPlaying = playingId === product.id;

            const variants = variantsFor(product);
            const currentVariant = selectedVariantsByProduct[product.id] || variants[0] || null;
            const displayImage = currentVariant?.image || product.image;
            const attachedCourse = resolveAttachedCourse(product);

            return (
              <article className="product-card" key={product.id}>
                <div
                  className="product-card-body"
                  onClick={() => openProduct(product, currentVariant)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Открыть карточку: ${product.name}`}
                >
                  <div className="card-image-wrap">
                    <Image
                      key={displayImage}
                      src={displayImage}
                      alt={`${product.name} — ${currentVariant?.name || ""}`}
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    {hasDiscount && <span className="discount-tag">-{discountPercent}%</span>}
                    {product.badge && <span className="product-badge">{product.badge}</span>}
                    {attachedCourse && <span className="card-gift-tag">🎁 Курс в подарок</span>}

                    {/* Quick Sound preview button */}
                    <button
                      type="button"
                      className={`card-sound-pill ${isPlaying ? "playing" : ""}`}
                      onClick={(e) => handleCardSoundPlay(e, product)}
                      title="Послушать звучание"
                    >
                      <span>{isPlaying ? "🎵" : "🔊"}</span>
                      <small>{isPlaying ? "Звучит" : "Звук"}</small>
                    </button>
                  </div>

                  <div className="product-card-meta">
                    {/* Interactive Swatches Strip on Card */}
                    {variants.length > 1 && (
                      <div
                        className="card-swatches-strip"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Выбрать цвет инструмента"
                      >
                        <div className="swatch-dots-row">
                          {variants.slice(0, 5).map((v) => {
                            const isSelected =
                              (currentVariant?.id || currentVariant?.sku) === (v.id || v.sku);
                            return (
                              <button
                                key={v.sku || v.name}
                                type="button"
                                className={`swatch-dot-btn ${isSelected ? "active" : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVariantsByProduct((prev) => ({
                                    ...prev,
                                    [product.id]: v,
                                  }));
                                }}
                                onMouseEnter={() => {
                                  setSelectedVariantsByProduct((prev) => ({
                                    ...prev,
                                    [product.id]: v,
                                  }));
                                }}
                                title={`${v.name} (${v.stock} шт.)`}
                              >
                                <i
                                  style={{
                                    background: v.secondary
                                      ? `linear-gradient(135deg, ${v.color} 0 50%, ${v.secondary} 50%)`
                                      : v.color || "#8a8175",
                                  }}
                                />
                              </button>
                            );
                          })}
                          {variants.length > 5 && (
                            <span className="swatches-more-pill" title={`Ещё ${variants.length - 5} цветов`}>
                              +{variants.length - 5}
                            </span>
                          )}
                        </div>
                        {currentVariant?.name && (
                          <span className="current-color-label">{currentVariant.name}</span>
                        )}
                      </div>
                    )}

                    <p className="eyebrow">{product.category}</p>
                    <h3>{product.name}</h3>
                    <p className="product-description">{product.description}</p>
                    <div className="product-specs">
                      <span>{product.variants} {product.variants === 1 ? "вариант" : "вариантов"}</span>
                      <span>•</span>
                      <span>{product.quantity} шт. на складе</span>
                    </div>
                  </div>
                </div>

                <div className="product-card-actions">
                  <div className="price-tag">
                    <small>{hasDiscount ? "Акция" : "Цена"}</small>
                    <div className="price-row">
                      <strong className="current-price">
                        {productPrice ? `${money(productPrice)} ₸` : "По запросу"}
                      </strong>
                      {hasDiscount && originalPrice && (
                        <span className="old-price">{money(originalPrice)} ₸</span>
                      )}
                    </div>
                    {productPrice > 0 ? (
                      <div className="installment-chip" title="Рассрочка 0-0-12 Kaspi / Halyk">
                        <span className="kaspi-badge">0-0-12</span>
                        <span>от {money(installment(productPrice, 12))} ₸/мес</span>
                      </div>
                    ) : null}
                  </div>
                  <button
                    className="card-action-button"
                    onClick={() => openProduct(product, currentVariant)}
                  >
                    Выбрать
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="delivery-section" id="delivery">
        <div className="section-head">
          <div>
            <p className="eyebrow">СЕРВИС</p>
            <h2>Доставка и оформление</h2>
          </div>
        </div>
        <div className="delivery-grid">
          <article className="delivery-card">
            <h3>Самовывоз и примерка</h3>
            <p>Можно осмотреть инструмент, оценить удобство грифа и звучание перед покупкой в шоуруме.</p>
          </article>
          <article className="delivery-card">
            <h3>Курьерская доставка</h3>
            <p>Отправляем по городам Казахстана надежными курьерскими службами с жесткой упаковкой.</p>
          </article>
          <article className="delivery-card">
            <h3>Оплата и рассрочка</h3>
            <p>Доступна оплата картой, Kaspi Pay, а также онлайн-рассрочка 0-0-12 и 0-0-24 без переплат.</p>
          </article>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-left">
          <strong>MAESTRO MUSIC STORE & ACADEMY</strong>
          <p>Музыкальные инструменты, оборудование, онлайн-курсы и аксессуары поставки 2026 года.</p>
        </div>
        <div className="footer-right">
          <span>Город: Актобе / Доставка по всему Казахстану</span>
          <span>Связь: <a href="https://wa.me/77775055788" target="_blank" rel="noopener noreferrer" className="footer-wa-link">WhatsApp +7 (777) 505-57-88</a></span>
          <a href="/admin/pricing" className="footer-admin-link">🔒 Панель закупщика и склад</a>
        </div>
      </footer>
    </>
  );
}
