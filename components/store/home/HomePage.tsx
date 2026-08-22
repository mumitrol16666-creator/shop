"use client";

import Image from "next/image";
import Link from "next/link";
import type { ProductReadModel } from "../../../lib/commerce/types";
import { CATALOG_CATEGORIES } from "../../../lib/commerce/categories";
import { ProductGrid } from "../catalog/ProductGrid";

export function HomePage({ products, onNotice }: { products: ProductReadModel[]; onNotice: (message: string) => void }) {
  const inStock = products.filter((product) => product.availability.status === "in_stock");
  const featured = inStock.find((product) => product.badge) || inStock[0];
  const preview = inStock.slice(0, 8);
  return (
    <>
      <div className="store-announcement">⚡ Бесплатная отстройка мастером · Доставка по Актобе · Kaspi Pay</div>
      <section className="store-home-hero">
        <div>
          <p className="store-eyebrow">MAESTRO MUSIC STORE · АКТОБЕ</p>
          <h1>Музыкальные инструменты, готовые к первой игре</h1>
          <p>Проверяем, настраиваем и доводим каждый инструмент перед выдачей. Вы выбираете модель и цвет — мы готовим её к занятиям.</p>
          <div className="store-hero-actions">
            <Link href="/catalog" className="store-primary-action">Смотреть каталог</Link>
            <Link href="/picker" className="store-secondary-action">Подобрать для новичка</Link>
          </div>
          <div className="store-home-stats"><span><strong>{inStock.length}</strong> моделей в наличии</span><span><strong>100%</strong> ручная проверка</span><span><strong>Актобе</strong> самовывоз и доставка</span></div>
        </div>
        {featured && (
          <Link href={`/product/${featured.slug}`} className="store-featured-card">
            <span className="store-product-badge">Выбор Maestro</span>
            <div><Image src={featured.image} alt={featured.name} fill unoptimized priority sizes="(max-width: 800px) 90vw, 560px" /></div>
            <p>{featured.categoryDisplayName}</p><h2>{featured.name}</h2>
          </Link>
        )}
      </section>

      <nav className="store-category-rail store-section" aria-label="Быстрые категории">
        {CATALOG_CATEGORIES.map((category) => (
          <Link key={category.slug} href={`/catalog/${category.slug}`}><strong>{category.displayName}</strong><span>Открыть →</span></Link>
        ))}
      </nav>

      <section className="store-assistant-entry store-section">
        <div><p className="store-eyebrow">ПОМОЩЬ С ВЫБОРОМ</p><h2>Не знаете, какая гитара подойдёт?</h2><p>Ответьте на пять коротких вопросов. Подбор покажет только реальные доступные модели.</p></div>
        <Link href="/picker" className="store-primary-action">Начать подбор</Link>
      </section>

      <section className="store-trust-grid store-section" aria-label="Почему Maestro">
        <article><b>01</b><h3>Проверяем каждый инструмент</h3><p>Осматриваем покрытие, фурнитуру, электронику и точность строя.</p></article>
        <article><b>02</b><h3>Настраиваем перед выдачей</h3><p>Регулируем гриф и высоту струн, чтобы начать было комфортнее.</p></article>
        <article><b>03</b><h3>Помогаем после покупки</h3><p>Даём материалы для старта и остаёмся на связи по вопросам инструмента.</p></article>
      </section>

      <section className="store-section" aria-labelledby="home-catalog-title">
        <div className="store-section-heading"><div><p className="store-eyebrow">В НАЛИЧИИ</p><h2 id="home-catalog-title">Популярные инструменты</h2></div><Link href="/catalog">Весь каталог →</Link></div>
        <ProductGrid products={preview} onNotice={onNotice} />
      </section>

      <section className="store-workshop-proof store-section">
        <div><p className="store-eyebrow">МАСТЕРСКАЯ MAESTRO</p><h2>Инструмент приезжает уже подготовленным</h2><p>Мы не отправляем фабричную коробку вслепую: мастер проверяет лады, гриф, высоту струн и электронику.</p></div>
        <ol><li><strong>Осмотр</strong><span>Корпус, покрытие, механика</span></li><li><strong>Настройка</strong><span>Гриф, струны, мензура</span></li><li><strong>Контроль</strong><span>Строй и звук перед упаковкой</span></li></ol>
      </section>

      <section className="store-reviews store-section"><p className="store-eyebrow">ОТЗЫВЫ</p><h2>Покупатели ценят подготовку инструмента</h2><div><blockquote>«Гитару настроили, ребёнок смог начать заниматься сразу.»<cite>Айгерим, Актобе</cite></blockquote><blockquote>«ST-20 без фона, гриф удобный. Видно, что инструмент проверяли.»<cite>Данияр, Актобе</cite></blockquote><blockquote>«Помогли выбрать укулеле и подготовили к самовывозу в тот же день.»<cite>Нурлан, Актобе</cite></blockquote></div></section>

      <section className="store-faq store-section"><p className="store-eyebrow">ЧАСТЫЕ ВОПРОСЫ</p><h2>Перед покупкой</h2><details><summary>Можно ли выбрать конкретный цвет?</summary><p>Да. На странице товара показаны реальные доступные варианты и их остатки.</p></details><details><summary>Инструмент действительно настраивают?</summary><p>Да, каждый инструмент проходит проверку и базовую доводку мастером.</p></details><details><summary>Как получить заказ?</summary><p>Доступны самовывоз из магазина и доставка по городу Актобе. Детали подтвердит менеджер.</p></details></section>

      <footer className="store-footer"><div><strong>MAESTRO MUSIC STORE</strong><p>Актобе · Самовывоз и доставка по городу</p></div><nav><Link href="/catalog">Каталог</Link><Link href="/picker">Подбор</Link><a href="https://wa.me/77775055788">WhatsApp</a></nav></footer>
    </>
  );
}
