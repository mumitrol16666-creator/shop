"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { installment, money } from "../../../lib/catalog-data";
import type { ProductReadModel } from "../../../lib/commerce/types";
import { ProductConfigurator } from "./ProductConfigurator";

export function ProductPage({ product, onNotice }: { product: ProductReadModel; onNotice: (message: string) => void }) {
  const router = useRouter();
  return (
    <div className="store-page store-product-page">
      <nav className="store-breadcrumbs" aria-label="Хлебные крошки"><Link href="/">Главная</Link><span>/</span><Link href={`/catalog/${product.categorySlug}`}>{product.categoryDisplayName}</Link><span>/</span><span>{product.shortName}</span></nav>
      <button type="button" className="store-back-button" onClick={() => router.back()}>← Назад</button>
      <div className="store-product-layout">
        <section className="store-product-gallery" aria-label={`Изображения: ${product.name}`}>
          <div><Image src={product.image} alt={product.name} fill unoptimized priority sizes="(max-width: 800px) 100vw, 55vw" /></div>
          <p>Фотография товара · доступные цвета выбираются в панели комплектации</p>
        </section>
        <section className="store-purchase-panel">
          <p className="store-eyebrow">{product.categoryDisplayName}</p>
          <h1>{product.name}</h1>
          <p className={`store-stock ${product.availability.status === "in_stock" ? "is-in-stock" : ""}`}>{product.availability.status === "in_stock" ? `В наличии: ${product.availability.totalAvailable}` : "Нет в наличии"}</p>
          <div className="store-product-price"><strong>{money(product.defaultPrice.final)} ₸</strong><span>от {money(installment(product.defaultPrice.final, 12))} ₸/мес</span></div>
          <p>{product.description}</p>
          <ProductConfigurator key={product.id} product={product} onAdded={() => onNotice("Товар добавлен в корзину.")} />
          <div className="store-delivery-summary"><span>✓ Проверка и настройка мастером</span><span>✓ Доставка по Казахстану</span><span>✓ Помощь с первым запуском</span></div>
        </section>
      </div>
      <section className="store-product-details"><h2>Характеристики</h2><ul>{product.features.map((feature) => <li key={feature}>{feature}</li>)}</ul></section>
    </div>
  );
}
