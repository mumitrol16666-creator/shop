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
import { playProductAudio, stopProductAudio } from "../lib/sound-synth";

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
    if (!product.audioUrl) return;
    if (playingId === product.id) {
      stopProductAudio();
      setPlayingId(null);
      return;
    }
    setPlayingId(product.id);
    playProductAudio(product.audioUrl, () => {
      setPlayingId(null);
    });
  };

  const HERO_PREVIEWS = [
    {
      name: "Gradient Blue",
      color: "#243a5e",
      image: "/products/02_39_gradient_electric.png",
      title: "Электрогитара 39″ Gradient Blue",
      category: "ЭЛЕКТРОГИТАРЫ",
      monthly: 5825,
      sku: "EG-39GR",
    },
    {
      name: "Night Black",
      color: "#1c1b18",
      image: "/products/01_st20_electric.png",
      title: "Электрогитара ST-20 HSS Black",
      category: "ЭЛЕКТРОГИТАРЫ",
      monthly: 5825,
      sku: "EG-ST20",
    },
    {
      name: "Sunburst Folk",
      color: "#a85421",
      image: "/products/04_41_acoustic.png",
      title: "Акустическая гитара 41″ Sunburst",
      category: "АКУСТИЧЕСКИЕ ГИТАРЫ",
      monthly: 3575,
      sku: "AG-41GL",
    },
    {
      name: "Pastel Flamingo",
      color: "#e8829c",
      image: "/products/03_23_ukulele.png",
      title: "Укулеле Сопрано 21″ Pastel",
      category: "УКУЛЕЛЕ",
      monthly: 1575,
      sku: "UK-KLH23",
    },
    {
      name: "Classic Natural",
      color: "#d4a373",
      image: "/products/05_classical_38_39.png",
      title: "Классическая гитара 39″ Natural",
      category: "КЛАССИЧЕСКИЕ ГИТАРЫ",
      monthly: 3241,
      sku: "CG-39",
    },
  ];
  const [heroIndex, setHeroIndex] = useState(0);
  const currentHero = HERO_PREVIEWS[heroIndex];

  const matchingHeroProduct = useMemo(() => {
    return (
      filteredProducts.find(
        (p) =>
          p.sku?.toLowerCase().includes(currentHero.sku.toLowerCase()) ||
          p.name.toLowerCase().includes(currentHero.sku.toLowerCase()),
      ) ||
      featuredProduct ||
      filteredProducts[0]
    );
  }, [filteredProducts, currentHero, featuredProduct]);

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="announcement-bar">
        <div className="announcement-inner">
          <span>⚡ <strong>Поставка 2026:</strong> Бесплатная отстройка мастером + Онлайн-курс в подарок к каждому инструменту!</span>
          <span className="announcement-sep">•</span>
          <span>🚚 Доставка по Казахстану от 1 дня</span>
          <span className="announcement-sep">•</span>
          <span>📞 Консультация мастера: <strong>+7 (777) 505-57-88</strong></span>
        </div>
      </div>

      <section className="hero" id="new">
        <div className="hero-copy">
          <div className="hero-eyebrow-wrap">
            <span className="hero-live-dot" />
            <p className="eyebrow">ПОСТАВКА 2026 · ИНСТРУМЕНТЫ В НАЛИЧИИ</p>
          </div>
          <h1 className="hero-headline">Музыкальные инструменты и гитары Maestro</h1>
          <p className="hero-lead">
            Электрогитары, акустика, классика, укулеле и гитарное оборудование. Все инструменты проверяются и настраиваются вручную мастером перед выдачей, а заявка оформляется напрямую в WhatsApp без лишней суеты.
          </p>
          <div className="hero-actions">
            <a
              href="#catalog"
              className="hero-primary-btn"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Смотреть каталог
            </a>
            <a
              href="https://maestro-school.duckdns.org/login"
              target="_blank"
              rel="noopener noreferrer"
              className="hero-secondary-btn"
            >
              🎓 Обучение & Курсы
            </a>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <strong>{filteredProducts.length}</strong>
              <small>инструментов на складе</small>
            </div>
            <div className="stat">
              <strong>{categories.length}</strong>
              <small>основные категории</small>
            </div>
            <div className="stat">
              <strong>100%</strong>
              <small>ручная отстройка мастером</small>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div
            className="hero-card"
            style={{ cursor: "pointer" }}
            onClick={() => matchingHeroProduct && openProduct(matchingHeroProduct)}
          >
            <div className="hero-card-badges">
              <span className="badge">Выбор недели</span>
              <span className="hero-master-chip">✨ Мастерская отстройка</span>
            </div>
            
            <div className="hero-image-wrap">
              <Image
                key={currentHero.image}
                src={currentHero.image}
                alt={currentHero.title}
                fill
                unoptimized
                priority
                sizes="(max-width: 900px) 90vw, 420px"
              />
            </div>

            {/* Quick Hero Color Switcher */}
            <div className="hero-color-switcher" onClick={(e) => e.stopPropagation()}>
              <span className="hero-color-title">Оттенок:</span>
              <div className="hero-swatch-list">
                {HERO_PREVIEWS.map((hp, idx) => (
                  <button
                    key={hp.name}
                    type="button"
                    className={`hero-swatch-dot ${heroIndex === idx ? "active" : ""}`}
                    onClick={() => setHeroIndex(idx)}
                    title={hp.name}
                    aria-label={`Выбрать ${hp.name}`}
                  >
                    <span style={{ backgroundColor: hp.color }} />
                  </button>
                ))}
              </div>
              <span className="hero-color-current">{currentHero.name}</span>
            </div>

            <div className="hero-card-meta">
              <div>
                <p className="eyebrow">{currentHero.category}</p>
                <h3>{currentHero.title}</h3>
                <div className="hero-kaspi-installment">
                  <span className="kaspi-tag">Kaspi 0-0-12</span>
                  <span>от <strong>{money(currentHero.monthly)} ₸</strong> / мес</span>
                </div>
              </div>
              {matchingHeroProduct && (
                <button
                  className="hero-detail-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    openProduct(matchingHeroProduct);
                  }}
                >
                  Подробнее
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Buyer Scenarios */}
      <section className="scenarios-section" aria-label="Быстрый подбор инструмента">
        <div className="section-head">
          <p className="eyebrow">БЫСТРЫЙ ПОДБОР</p>
          <h2>Для кого вы выбираете инструмент?</h2>
          <p className="scenarios-lead">Нажмите подходящий сценарий — мы покажем лучшие модели с курсом в комплекте</p>
        </div>

        <div className="scenarios-grid">
          <div
            className="scenario-card"
            onClick={() => {
              chooseCategory("Акустические гитары");
              const el = document.getElementById("catalog");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            role="button"
            tabIndex={0}
          >
            <div className="scenario-icon-wrap" style={{ background: "rgba(245, 158, 11, 0.12)" }}>
              <span className="scenario-emoji">🎯</span>
            </div>
            <div className="scenario-badge">Хит для старта</div>
            <h3>Для новичка / С нуля</h3>
            <p>Мягкие струны, низкая посадка для легких аккордов + видеокурс «Первая песня за 7 дней» в подарок.</p>
            <span className="scenario-link">Смотреть варианты →</span>
          </div>

          <div
            className="scenario-card"
            onClick={() => {
              chooseCategory("Электрогитары");
              const el = document.getElementById("catalog");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            role="button"
            tabIndex={0}
          >
            <div className="scenario-icon-wrap" style={{ background: "rgba(59, 130, 246, 0.12)" }}>
              <span className="scenario-emoji">⚡</span>
            </div>
            <div className="scenario-badge blue">Драйв и соло</div>
            <h3>Хочу рок и драйв</h3>
            <p>Электрогитары ST-20 и Gradient с мощными звукоснимателями + онлайн-курс по соло и риффам.</p>
            <span className="scenario-link">Смотреть электрогитары →</span>
          </div>

          <div
            className="scenario-card"
            onClick={() => {
              chooseCategory("Укулеле");
              const el = document.getElementById("catalog");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            role="button"
            tabIndex={0}
          >
            <div className="scenario-icon-wrap" style={{ background: "rgba(236, 72, 153, 0.12)" }}>
              <span className="scenario-emoji">🎀</span>
            </div>
            <div className="scenario-badge pink">Для детей и семьи</div>
            <h3>В подарок ребенку</h3>
            <p>Яркие укулеле и классика с нейлоновыми струнами: пальцы не болят, учиться легко и весело.</p>
            <span className="scenario-link">Смотреть укулеле →</span>
          </div>

          <div
            className="scenario-card"
            onClick={() => {
              setQuickFilter("sale");
              const el = document.getElementById("catalog");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            role="button"
            tabIndex={0}
          >
            <div className="scenario-icon-wrap" style={{ background: "rgba(16, 185, 129, 0.12)" }}>
              <span className="scenario-emoji">🔥</span>
            </div>
            <div className="scenario-badge green">Выгода до 30%</div>
            <h3>По акции / Sale</h3>
            <p>Специальные предложения сезона: максимальные скидки на комплекты с подарками и чехлами.</p>
            <span className="scenario-link">Открыть акции →</span>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div className="trust-item">
          <strong>Проверка каждого инструмента</strong>
          <span>Отстройка грифа, визуальный контроль покрытия и проверка фурнитуры.</span>
        </div>
        <div className="trust-item">
          <strong>Kaspi Red и Рассрочка 0-0-12</strong>
          <span>Kaspi Red (3 мес) и Kaspi Рассрочка (до 12 мес) без процентов и переплат.</span>
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

                    {/* Quick Sound preview button with Soundwave equalizer (Only shown if audioUrl is set) */}
                    {product.audioUrl && (
                      <button
                        type="button"
                        className={`card-sound-pill ${isPlaying ? "playing" : ""}`}
                        onClick={(e) => handleCardSoundPlay(e, product)}
                        title={isPlaying ? "Остановить" : "Послушать звучание инструмента"}
                      >
                        {isPlaying ? (
                          <span className="soundwave-equalizer" aria-hidden="true">
                            <span className="sw-bar sw-1" />
                            <span className="sw-bar sw-2" />
                            <span className="sw-bar sw-3" />
                            <span className="sw-bar sw-4" />
                          </span>
                        ) : (
                          <span className="sound-icon">🔊</span>
                        )}
                        <small>{isPlaying ? "Звучит" : "Звук"}</small>
                      </button>
                    )}
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
                          {variants.slice(0, 6).map((v) => {
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
                          {variants.length > 6 && (
                            <span className="swatches-more-pill" title={`Ещё ${variants.length - 6} цветов`}>
                              +{variants.length - 6}
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
                      <div className="installment-chip" title="Kaspi Red и Рассрочка 0-0-12">
                        <span className="kaspi-badge">0-0-12</span>
                        <span>от {money(installment(productPrice, 12))} ₸/мес</span>
                      </div>
                    ) : null}
                  </div>
                  <button
                    className="card-action-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openProduct(product, currentVariant);
                    }}
                  >
                    Выбрать
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Workshop & Quality Assurance Section */}
      <section className="workshop-section" id="workshop">
        <div className="workshop-inner">
          <div className="workshop-header">
            <span className="eyebrow">МАСТЕРСКАЯ MAESTRO</span>
            <h2>Каждая гитара проходит 3 этапа доводки мастером</h2>
            <p className="workshop-subtitle">
              Мы не отправляем запечатанные фабричные коробки вслепую. Инструмент достается, проверяется и отстраивается вручную перед отправкой.
            </p>
          </div>

          <div className="workshop-steps-grid">
            <div className="workshop-step-card">
              <div className="workshop-step-num">01</div>
              <div className="workshop-step-icon">📐</div>
              <h3>Отстройка анкера и высоты струн</h3>
              <p>Выставляем минимальный зазор над ладами (1.5–2 мм), чтобы аккорды зажимались легко и пальцы не болели даже у новичка.</p>
            </div>

            <div className="workshop-step-card">
              <div className="workshop-step-num">02</div>
              <div className="workshop-step-icon">✨</div>
              <h3>Шлифовка и торцевание ладов</h3>
              <p>Обрабатываем края металлического ладового профиля. Рука скользит по грифу идеально гладко, без микроцарапин и зацепов.</p>
            </div>

            <div className="workshop-step-card">
              <div className="workshop-step-num">03</div>
              <div className="workshop-step-icon">🎛️</div>
              <h3>Калибровка мензуры и электроники</h3>
              <p>Проверяем точность строя по всем ладам от 1 до 24, тестируем колки, звукосниматели и потенциометры без фона и шумов.</p>
            </div>
          </div>

          <div className="workshop-cta-card">
            <div className="workshop-cta-copy">
              <span className="live-video-badge">🎥 Видео перед отправкой</span>
              <h3>Хотите услышать звук конкретного инструмента?</h3>
              <p>Напишите мастеру в WhatsApp — запишем персональное видео со звуком именно вашей гитары перед упаковкой!</p>
            </div>
            <a
              className="workshop-wa-button"
              href="https://wa.me/77775055788?text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5!%20%D0%A5%D0%BE%D1%87%D1%83%20%D0%BF%D0%BE%D1%81%D0%BC%D0%BE%D1%82%D1%80%D0%B5%D1%82%D1%8C%20%D0%B8%20%D0%BF%D0%BE%D1%81%D0%BB%D1%83%D1%88%D0%B0%D1%82%D1%8C%20%D0%B3%D0%B8%D1%82%D0%B0%D1%80%D1%83%20%D0%BF%D0%B5%D1%80%D0%B5%D0%B4%20%D0%BF%D0%BE%D0%BA%D1%83%D0%BF%D0%BA%D0%BE%D0%B9"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>💬 Написать мастеру в WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      {/* Customer Reviews & Social Proof */}
      <section className="reviews-section" id="reviews">
        <div className="section-head text-center">
          <p className="eyebrow">ОТЗЫВЫ ПОКУПАТЕЛЕЙ</p>
          <h2>Что говорят музыканты и родители</h2>
          <p className="reviews-subtitle">Более 1 400 довольных клиентов по всему Казахстану</p>
        </div>

        <div className="reviews-grid">
          <article className="review-card">
            <div className="review-rating">★★★★★ <span className="verified-badge">✓ Проверенный заказ</span></div>
            <p className="review-quote">
              «Заказывала гитару 41″ дочке в подарок. Пришла уже идеально настроенная, струны мягкие, пальцы не режет. По подарочному курсу за 4 дня выучили первую песню!»
            </p>
            <div className="reviewer-meta">
              <span className="reviewer-avatar">👩🏻‍💼</span>
              <div>
                <strong>Айгерим С.</strong>
                <small>г. Астана · Акустическая гитара 41″</small>
              </div>
            </div>
          </article>

          <article className="review-card">
            <div className="review-rating">★★★★★ <span className="verified-badge">✓ Проверенный заказ</span></div>
            <p className="review-quote">
              «Электрогитара ST-20 превзошла ожидания. Дерево плотное, звукосниматели без фона, гриф отстроен мастером на 10/10. Отдельное спасибо за комплект струн Elixir со скидкой 50%!»
            </p>
            <div className="reviewer-meta">
              <span className="reviewer-avatar">🎸</span>
              <div>
                <strong>Данияр К.</strong>
                <small>г. Алматы · ST-20 + Струны Elixir</small>
              </div>
            </div>
          </article>

          <article className="review-card">
            <div className="review-rating">★★★★★ <span className="verified-badge">✓ Проверенный заказ</span></div>
            <p className="review-quote">
              «Купил укулеле сыну. Доставили в Шымкент за 2 дня в бронебойной упаковке. Очень доволен сервисом, быстрой консультацией в WhatsApp и подарочными видеоуроками!»
            </p>
            <div className="reviewer-meta">
              <span className="reviewer-avatar">👨🏻‍💻</span>
              <div>
                <strong>Нурлан М.</strong>
                <small>г. Шымкент · Укулеле 21″ Pastel</small>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* Interactive FAQ Accordion */}
      <section className="faq-section" id="faq">
        <div className="section-head text-center">
          <p className="eyebrow">ЧАСТЫЕ ВОПРОСЫ</p>
          <h2>Ответы на популярные вопросы</h2>
          <p className="faq-subtitle">Всё о доставке, настройке, гарантии и подарочных курсах</p>
        </div>

        <div className="faq-accordion-list">
          {[
            {
              q: "Больно ли зажимать струны в начале обучения?",
              a: "Нет! В отличие от обычных магазинов, наш мастер вручную отстраивает высоту струн до 1.5–2 мм над ладами. Зажимать аккорды легко и комфортно даже детям и нежным рукам с первого дня."
            },
            {
              q: "Не разобьется ли гитара при доставке курьером по Казахстану?",
              a: "Мы упаковываем каждый инструмент в 3 слоя защитной воздушно-пузырчатой пленки и жесткий пятислойный картонный транспортировочный короб. Все отправления застрахованы на 100% стоимости."
            },
            {
              q: "Как получить обещанный онлайн-курс в подарок?",
              a: "Сразу после подтверждения заказа в WhatsApp менеджер отправит вам персональный доступ к кабинету ученика. Доступ бессрочный навсегда с любого телефона или компьютера."
            },
            {
              q: "Как работает Kaspi Red и рассрочка Kaspi 0-0-12?",
              a: "Вы оформляете покупку в приложении Kaspi QR за 1 минуту. Сумма делится ровно на выбранный срок (Kaspi Red на 3 мес или Рассрочка на 6-12 мес) без скрытых комиссий, процентов и переплат."
            },
            {
              q: "Почему струны Elixir со скидкой 50% выгоднее взять сразу?",
              a: "Струны Elixir Nanoweb имеют фирменное полимерное нано-покрытие и служат в 3–5 раз дольше обычных (до 6 месяцев). Добавить их к заказу по спеццене -50% — самая выгодная возможность для покупателя."
            }
          ].map((item, idx) => (
            <details className="faq-item" key={item.q} open={idx === 0}>
              <summary className="faq-summary">
                <span>{item.q}</span>
                <span className="faq-chevron">▼</span>
              </summary>
              <div className="faq-answer">
                <p>{item.a}</p>
              </div>
            </details>
          ))}
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
            <p>Доступна оплата Kaspi QR, Kaspi Red, а также онлайн-рассрочка Kaspi 0-0-12 без переплат.</p>
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
