"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ProductReadModel } from "../../../lib/commerce/types";
import type { CatalogCategory } from "../../../lib/commerce/categories";
import { whatsappHref, type StoreSettings } from "../../../lib/store-settings";
import { ProductGrid } from "../catalog/ProductGrid";

const visualCategoryRail = [
  {
    slug: "acoustic-guitars",
    title: "Акустические гитары",
    image: "/products-harmonized/04_41_acoustic.webp",
  },
  {
    slug: "classical-guitars",
    title: "Классические гитары",
    image: "/products-harmonized/05_classical_38_39.webp",
  },
  {
    slug: "electric-guitars",
    title: "Электрогитары",
    image: "/products-harmonized/01_st20_electric.webp",
  },
  {
    slug: "ukuleles",
    title: "Укулеле",
    image: "/products-harmonized/03_23_ukulele.webp",
  },
  {
    slug: "strings",
    title: "Аксессуары",
    image: "/products-harmonized/10_capos.webp",
  },
];

const heroBenefits = [
  {
    id: "setup",
    icon: "⭐",
    title: "Настроено мастером",
    description: "Перед продажей мастер проверяет инструмент и настраивает его для комфортной игры.",
  },
  {
    id: "delivery",
    icon: "🚚",
    title: "Быстрая доставка",
    description: "Бережно доставим заказ по городу или подготовим его к удобному самовывозу.",
  },
  {
    id: "quality",
    icon: "🛡️",
    title: "Гарантия качества",
    description: "Проверяем состояние и комплектацию каждого инструмента перед передачей покупателю.",
  },
] as const;

export function HomePage({
  settings,
  categories,
  products,
  onNotice,
}: {
  settings: StoreSettings;
  categories: CatalogCategory[];
  products: ProductReadModel[];
  onNotice: (message: string) => void;
}) {
  const [openBenefit, setOpenBenefit] = useState<string | null>(null);
  const benefitsRef = useRef<HTMLDivElement>(null);
  const inStock = products.filter((product) => product.availability.status === "in_stock");
  const preview = inStock.slice(0, 8);
  const fulfilmentSummary = settings.pickupEnabled && settings.deliveryEnabled
    ? "самовывоз и доставка"
    : settings.deliveryEnabled ? "доставка по городу" : "самовывоз";

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!benefitsRef.current?.contains(event.target as Node)) setOpenBenefit(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenBenefit(null);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className="store-home-page-container">
      {/* 1. Cinematic Dark Studio Hero Banner */}
      <section className="store-hero-cinematic">
        <div className="store-hero-cinematic__bg-wrap">
          <Image
            src="/hero-banner-studio.webp"
            alt="Музыкальный магазин Maestro"
            fill
            priority
            unoptimized
            className="store-hero-cinematic__bg-img"
          />
          <div className="store-hero-cinematic__overlay" />
        </div>

        <div className="store-hero-cinematic__container">
          <div className="store-hero-cinematic__content">
            <h1 className="store-hero-cinematic__title">
              Музыкальный магазин <br />
              <span className="store-hero-cinematic__brand-gold">Maestro</span>
            </h1>

            <p className="store-hero-cinematic__subtitle">
              Гитары, укулеле и аксессуары с профессиональной настройкой и точным подбором
            </p>

            <div className="store-hero-cinematic__actions">
              <Link href="/catalog" className="store-hero-btn-primary">
                Смотреть каталог <span>→</span>
              </Link>
              <Link href="/picker" className="store-hero-btn-secondary">
                Подобрать инструмент
              </Link>
            </div>

            <div className="store-hero-cinematic__pills" ref={benefitsRef}>
              {heroBenefits.map((benefit) => {
                const isOpen = openBenefit === benefit.id;
                const popoverId = `hero-benefit-${benefit.id}`;

                return (
                  <div className="store-hero-pill-wrap" key={benefit.id}>
                    <button
                      type="button"
                      className={`store-hero-pill${isOpen ? " is-open" : ""}`}
                      aria-expanded={isOpen}
                      aria-controls={popoverId}
                      onClick={() => setOpenBenefit(isOpen ? null : benefit.id)}
                    >
                      <span className="store-hero-pill__icon" aria-hidden="true">{benefit.icon}</span>
                      <span>{benefit.title}</span>
                    </button>
                    {isOpen && (
                      <div className="store-hero-pill-popover" id={popoverId} role="status">
                        <strong>{benefit.title}</strong>
                        <span>{benefit.description}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Light Luxurious Store Body (Categories, Products, Trust, School) */}
      <div className="store-home-body-wrap">
        {/* Category Cards Rail */}
        <section className="store-category-rail-section">
          <div className="store-category-rail-grid">
            {visualCategoryRail.map((cat) => (
              <Link key={cat.slug} href={`/catalog/${cat.slug}`} className="store-category-rail-card">
                <div className="store-category-rail-card__text">
                  <h3>{cat.title}</h3>
                  <span className="store-category-rail-card__arrow">→</span>
                </div>
                <div className="store-category-rail-card__img-wrap">
                  <Image
                    src={cat.image}
                    alt={cat.title}
                    fill
                    unoptimized
                    sizes="180px"
                    className="store-category-rail-card__img"
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Popular Instruments Section */}
        <section className="store-popular-section store-section" aria-labelledby="home-popular-title">
          <div className="store-popular-header">
            <h2 id="home-popular-title" className="store-popular-heading">Популярные инструменты</h2>
            <Link href="/catalog" className="store-popular-view-all">
              Смотреть все <span>→</span>
            </Link>
          </div>
          <ProductGrid products={preview} onNotice={onNotice} />
        </section>

        {/* Four-Column Trust / Advantages Bar */}
        <section className="store-advantages-section" aria-label="Преимущества магазина Maestro">
          <div className="store-advantages-grid">
            <div className="store-advantage-item">
              <div className="store-advantage-icon">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#c59b4f" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 3v8a6 6 0 0 0 12 0V3M12 17v4m-3 0h6" />
                </svg>
              </div>
              <div className="store-advantage-text">
                <h4>Настройка перед продажей</h4>
                <p>Каждый инструмент проверен мастером</p>
              </div>
            </div>

            <div className="store-advantage-item">
              <div className="store-advantage-icon">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#c59b4f" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="1" y="3" width="15" height="13" rx="2" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <div className="store-advantage-text">
                <h4>Доставка и самовывоз</h4>
                <p>Быстро и бережно в городе {settings.city}</p>
              </div>
            </div>

            <div className="store-advantage-item">
              <div className="store-advantage-icon">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#c59b4f" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <div className="store-advantage-text">
                <h4>Рассрочка</h4>
                <p>Удобная рассрочка через Kaspi и банки</p>
              </div>
            </div>

            <div className="store-advantage-item">
              <div className="store-advantage-icon">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#c59b4f" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                </svg>
              </div>
              <div className="store-advantage-text">
                <h4>Поддержка после покупки</h4>
                <p>Консультации и помощь на всех этапах</p>
              </div>
            </div>
          </div>
        </section>

        {/* Music School Cross-Sell Luxury Banner */}
        <section className="store-school-banner-section">
          <div className="store-school-banner-card">
            <div className="store-school-banner-bg">
              <Image
                src="/school-banner-piano.webp"
                alt="Музыкальная школа Maestro"
                fill
                unoptimized
                className="store-school-banner-img"
              />
              <div className="store-school-banner-overlay" />
            </div>

            <div className="store-school-banner-content">
              <div className="store-school-banner-left">
                <div className="store-school-emblem">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#e0b872" strokeWidth="1.8">
                    <path d="M12 3v14M8 5a4 4 0 0 0-4 4v2a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V9a4 4 0 0 0-4-4M12 17v4m-3 0h6" />
                  </svg>
                </div>
                <div className="store-school-text">
                  <h3>
                    При магазине работает <br />
                    музыкальная школа <span className="store-school-gold">Maestro</span>
                  </h3>
                  <ul className="store-school-bullets">
                    <li><span>✓</span> Опытные преподаватели</li>
                    <li><span>✓</span> Индивидуальный подход</li>
                    <li><span>✓</span> Для детей и взрослых</li>
                  </ul>
                </div>
              </div>

              <div className="store-school-banner-right">
                <a
                  href={whatsappHref(settings, "Здравствуйте! Хочу записаться на пробный урок в музыкальную школу Maestro")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="store-school-btn"
                >
                  Записаться на пробный урок →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section className="store-reviews store-section">
          <p className="store-eyebrow">ОТЗЫВЫ</p>
          <h2>Покупатели ценят подготовку инструмента</h2>
          <div>
            <blockquote>
              «Гитару настроили, ребёнок смог начать заниматься сразу.»
              <cite>Айгерим, Актобе</cite>
            </blockquote>
            <blockquote>
              «ST-20 без фона, гриф удобный. Видно, что инструмент проверяли.»
              <cite>Данияр, Актобе</cite>
            </blockquote>
            <blockquote>
              «Помогли выбрать укулеле и подготовили к самовывозу в тот же день.»
              <cite>Нурлан, Актобе</cite>
            </blockquote>
          </div>
        </section>

        {/* FAQ */}
        <section className="store-faq store-section">
          <p className="store-eyebrow">ЧАСТЫЕ ВОПРОСЫ</p>
          <h2>Перед покупкой</h2>
          <details>
            <summary>Можно ли выбрать конкретный цвет?</summary>
            <p>Да. На странице товара показаны реальные доступные варианты и их остатки.</p>
          </details>
          <details>
            <summary>Инструмент действительно настраивают?</summary>
            <p>Да, каждый инструмент проходит проверку и базовую доводку мастером.</p>
          </details>
          <details>
            <summary>Как получить заказ?</summary>
            <p>Доступны: {fulfilmentSummary} в городе {settings.city}. Детали подтвердит менеджер.</p>
          </details>
        </section>
      </div>

      {/* Footer */}
      <footer className="store-footer">
        <div>
          <strong>MAESTRO MUSIC STORE</strong>
          <p>{settings.city} · {fulfilmentSummary}</p>
        </div>
        <nav>
          <Link href="/catalog">Каталог</Link>
          <Link href="/picker">Подбор</Link>
          <a href={whatsappHref(settings)}>WhatsApp</a>
        </nav>
      </footer>
    </div>
  );
}
