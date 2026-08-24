"use client";

import Image from "next/image";
import Link from "next/link";
import type { ProductReadModel } from "../../../lib/commerce/types";
import type { CatalogCategory } from "../../../lib/commerce/categories";
import { whatsappHref, type StoreSettings } from "../../../lib/store-settings";
import { ProductGrid } from "../catalog/ProductGrid";

const categoryThumbnails: Record<string, { image: string; tag: string; description: string }> = {
  "electric-guitars": {
    image: "/products/01_st20_electric.png",
    tag: "ST-20, Gradient",
    description: "Для рока, соло и современных стилей",
  },
  "acoustic-guitars": {
    image: "/products/04_41_acoustic.png",
    tag: "41″, Tiger, 38″",
    description: "Яркий акустический звук и сочные аккорды",
  },
  "classical-guitars": {
    image: "/products/05_classical_38_39.png",
    tag: "Нейлоновые струны",
    description: "Мягкие струны, идеальны для старта и обучения",
  },
  "ukuleles": {
    image: "/products/03_23_ukulele.png",
    tag: "23″ Концерт",
    description: "Компактный и душевный инструмент для всех",
  },
  "strings": {
    image: "/products/09_folk_strings.png",
    tag: "Комплекты и штучно",
    description: "Для акустики, классики и электрогитар",
  },
  "accessories": {
    image: "/products/10_capos.png",
    tag: "Чехлы, ремни, каподастры",
    description: "Всё для удобной игры, защиты и транспортировки",
  },
  "equipment": {
    image: "/products/14_ga20.png",
    tag: "Комбики и процессоры",
    description: "Усиление, эффекты и обработка звука",
  },
};

export function HomePage({ settings, categories, products, onNotice }: { settings: StoreSettings; categories: CatalogCategory[]; products: ProductReadModel[]; onNotice: (message: string) => void }) {
  const inStock = products.filter((product) => product.availability.status === "in_stock");
  const featured = inStock.find((product) => product.badge) || inStock[0];
  const preview = inStock.slice(0, 8);
  const fulfilmentSummary = settings.pickupEnabled && settings.deliveryEnabled
    ? "самовывоз и доставка"
    : settings.deliveryEnabled ? "доставка по городу" : "самовывоз";

  return (
    <>
      <div className="store-announcement">{settings.announcement}</div>

      {/* Hero Section */}
      <section className="store-home-hero">
        <div>
          <p className="store-eyebrow">MAESTRO MUSIC STORE · {settings.city.toUpperCase()}</p>
          <h1>{settings.heroTitle}</h1>
          <p>{settings.heroDescription}</p>
          <div className="store-hero-actions">
            <Link href="/catalog" className="store-primary-action">Смотреть каталог</Link>
            <Link href="/picker" className="store-secondary-action">Подобрать для новичка</Link>
          </div>
          <div className="store-home-stats">
            <span><strong>{inStock.length}</strong> моделей в наличии</span>
            <span><strong>100%</strong> ручная проверка</span>
            <span><strong>{settings.city}</strong> {fulfilmentSummary}</span>
          </div>
        </div>
        {featured && (
          <Link href={`/product/${featured.slug}`} className="store-featured-card">
            <span className="store-product-badge">Выбор Maestro</span>
            <div><Image src={featured.image} alt={featured.name} fill unoptimized priority sizes="(max-width: 800px) 90vw, 560px" /></div>
            <p>{featured.categoryDisplayName}</p>
            <h2>{featured.name}</h2>
          </Link>
        )}
      </section>

      {/* Visual Categories Showcase */}
      <section className="store-category-showcase store-section" aria-labelledby="home-categories-title">
        <div className="store-section-heading">
          <div>
            <p className="store-eyebrow">КАТАЛОГ ПО НАПРАВЛЕНИЯМ</p>
            <h2 id="home-categories-title">Выберите категорию</h2>
          </div>
          <Link href="/catalog">Все товары ({products.length}) →</Link>
        </div>

        <div className="store-category-grid">
          {categories.map((category) => {
            const catProducts = products.filter(
              (p) => p.categorySlug === category.slug || p.categoryId === category.id
            );
            const inStockCount = catProducts.filter((p) => p.availability.status === "in_stock").length;
            const minPrice = catProducts.reduce(
              (min, p) => (p.price < min ? p.price : min),
              Infinity
            );
            const priceText = Number.isFinite(minPrice)
              ? `от ${minPrice.toLocaleString("ru-RU")} ₸`
              : null;
            const meta = categoryThumbnails[category.slug] || {
              image: catProducts[0]?.image || "/products/01_st20_electric.png",
              tag: "В наличии",
              description: "Музыкальные инструменты и аксессуары",
            };

            return (
              <Link
                key={category.slug}
                href={`/catalog/${category.slug}`}
                className="store-category-card"
              >
                <div className="store-category-card__media">
                  <Image
                    src={meta.image}
                    alt={category.displayName}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="store-category-card__img"
                  />
                  <span className="store-category-card__badge">
                    {inStockCount > 0 ? `${inStockCount} в наличии` : "Под заказ"}
                  </span>
                </div>
                <div className="store-category-card__content">
                  <span className="store-category-card__tag">{meta.tag}</span>
                  <h3 className="store-category-card__title">{category.displayName}</h3>
                  <p className="store-category-card__desc">{meta.description}</p>
                  <div className="store-category-card__footer">
                    {priceText ? (
                      <span className="store-category-card__price">{priceText}</span>
                    ) : (
                      <span />
                    )}
                    <span className="store-category-card__link">Перейти →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Assistant Entry Banner */}
      <section className="store-assistant-entry store-section">
        <div>
          <p className="store-eyebrow">ПОМОЩЬ С ВЫБОРОМ</p>
          <h2>Не знаете, какая гитара подойдёт?</h2>
          <p>Ответьте на пять коротких вопросов. Подбор покажет только реальные доступные модели.</p>
        </div>
        <Link href="/picker" className="store-primary-action">Начать подбор</Link>
      </section>

      {/* Trust Grid */}
      <section className="store-trust-grid store-section" aria-label="Почему Maestro">
        <article>
          <b>01</b>
          <h3>Проверяем каждый инструмент</h3>
          <p>Осматриваем покрытие, фурнитуру, электронику и точность строя.</p>
        </article>
        <article>
          <b>02</b>
          <h3>Настраиваем перед выдачей</h3>
          <p>Регулируем гриф и высоту струн, чтобы начать было комфортнее.</p>
        </article>
        <article>
          <b>03</b>
          <h3>Помогаем после покупки</h3>
          <p>Даём материалы для старта и остаёмся на связи по вопросам инструмента.</p>
        </article>
      </section>

      {/* Popular Products in Stock */}
      <section className="store-section" aria-labelledby="home-catalog-title">
        <div className="store-section-heading">
          <div>
            <p className="store-eyebrow">В НАЛИЧИИ</p>
            <h2 id="home-catalog-title">Популярные инструменты</h2>
          </div>
          <Link href="/catalog">Весь каталог →</Link>
        </div>
        <ProductGrid products={preview} onNotice={onNotice} />
      </section>

      {/* Workshop Proof */}
      <section className="store-workshop-proof store-section">
        <div>
          <p className="store-eyebrow">МАСТЕРСКАЯ MAESTRO</p>
          <h2>Инструмент приезжает уже подготовленным</h2>
          <p>Мы не отправляем фабричную коробку вслепую: мастер проверяет лады, гриф, высоту струн и электронику.</p>
        </div>
        <ol>
          <li><strong>Осмотр</strong><span>Корпус, покрытие, механика</span></li>
          <li><strong>Настройка</strong><span>Гриф, струны, мензура</span></li>
          <li><strong>Контроль</strong><span>Строй и звук перед упаковкой</span></li>
        </ol>
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
    </>
  );
}
