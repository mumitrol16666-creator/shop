"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { installment, money } from "../../../lib/catalog-data";
import type { ProductReadModel } from "../../../lib/commerce/types";
import { ProductConfigurator } from "./ProductConfigurator";

export function ProductPage({
  product,
  onNotice,
}: {
  product: ProductReadModel;
  onNotice: (message: string) => void;
}) {
  const router = useRouter();
  const selectableVariants = product.variants.filter((variant) => variant.status === "active");
  const [selectedVariantSku, setSelectedVariantSku] = useState<string>(() =>
    product.selectionRequired ? "" : selectableVariants[0]?.sku || "",
  );

  const selectedVariant = product.variants.find((v) => v.sku === selectedVariantSku);
  const activeImage = selectedVariant?.image || product.image;

  // Build unique gallery items (master photo + variants photos)
  const galleryItems = useMemo(() => {
    const items: Array<{ image: string; title: string; sku?: string }> = [
      { image: product.image, title: "Все цвета" },
    ];
    for (const v of product.variants) {
      if (v.image && !items.some((item) => item.image === v.image)) {
        items.push({ image: v.image, title: v.title, sku: v.sku });
      }
    }
    return items;
  }, [product]);

  return (
    <div className="store-page store-product-page">
      <nav className="store-breadcrumbs" aria-label="Хлебные крошки">
        <Link href="/">Главная</Link>
        <span>/</span>
        <Link href={`/catalog/${product.categorySlug}`}>{product.categoryDisplayName}</Link>
        <span>/</span>
        <span>{product.shortName}</span>
      </nav>
      <button type="button" className="store-back-button" onClick={() => router.back()}>
        ← Назад
      </button>

      <div className="store-product-layout">
        {/* DYNAMIC INTERACTIVE GALLERY */}
        <section className="store-product-gallery" aria-label={`Изображения: ${product.name}`}>
          <div className="store-product-main-image">
            <Image
              key={activeImage}
              src={activeImage}
              alt={selectedVariant ? `${product.name} — ${selectedVariant.title}` : product.name}
              fill
              unoptimized
              priority
              sizes="(max-width: 800px) 100vw, 55vw"
              style={{ objectFit: "contain" }}
            />
          </div>

          {/* Interactive Color Thumbnails */}
          {galleryItems.length > 1 && (
            <div className="store-product-thumbs" aria-label="Галерея цветов">
              {galleryItems.map((item) => {
                const isSelected = item.image === activeImage;
                return (
                  <button
                    key={item.image}
                    type="button"
                    className={`store-thumb-btn ${isSelected ? "is-selected" : ""}`}
                    onClick={() => {
                      if (item.sku) setSelectedVariantSku(item.sku);
                    }}
                    title={item.title}
                  >
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      unoptimized
                      sizes="72px"
                      style={{ objectFit: "contain" }}
                    />
                    
                  </button>
                );
              })}
            </div>
          )}

          <p className="store-gallery-caption">
            {selectedVariant
              ? `Выбран цвет: ${selectedVariant.title} (${selectedVariant.availableQuantity > 0 ? `в наличии ${selectedVariant.availableQuantity} шт.` : "нет в наличии"})`
              : "Фотография товара · выберите цвет в панели справа для переключения фото"}
          </p>
        </section>

        {/* PURCHASE & CONFIGURATION PANEL */}
        <section className="store-purchase-panel">
          <p className="store-eyebrow">{product.categoryDisplayName}</p>
          <h1>{product.name}</h1>
          <p className={`store-stock ${product.availability.status === "in_stock" ? "is-in-stock" : ""}`}>
            {product.availability.status === "in_stock"
              ? `В наличии: ${product.availability.totalAvailable} шт.`
              : "Нет в наличии"}
          </p>
          <div className="store-product-price">
            <strong className="store-main-price">{money(product.defaultPrice.final)} ₸</strong>
            <span className="store-installment-badge">от {money(installment(product.defaultPrice.final, 12))} ₸/мес</span>
          </div>
          <p className="store-product-desc">{product.description}</p>

          <ProductConfigurator
            key={product.id}
            product={product}
            selectedVariantSku={selectedVariantSku}
            onVariantSelect={(sku) => setSelectedVariantSku(sku)}
            onAdded={() => onNotice("Товар добавлен в корзину.")}
          />

          <div className="store-delivery-summary">
            <span>✓ Бесплатная отстройка мастером перед отправкой</span>
            <span>✓ Экспресс-доставка до двери по Казахстану</span>
            <span>✓ Подарочный видеокурс и поддержка школы</span>
          </div>
        </section>
      </div>

      <section className="store-product-details">
        <h2>Характеристики</h2>
        <ul>
          {product.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
