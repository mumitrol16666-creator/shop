"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { installment, money } from "../../../lib/catalog-data";
import { productPriceSummary } from "../../../lib/product-variants";
import type { ProductReadModel } from "../../../lib/commerce/types";
import { ProductConfigurator } from "./ProductConfigurator";
import { whatsappHref, type StoreSettings } from "../../../lib/store-settings";

export function ProductPage({
  settings,
  product,
  onNotice,
}: {
  settings: StoreSettings;
  product: ProductReadModel;
  onNotice: (message: string) => void;
}) {
  const router = useRouter();
  const selectableVariants = product.variants.filter((variant) => variant.status === "active");
  const [selectedVariantSku, setSelectedVariantSku] = useState<string>(() =>
    product.selectionRequired ? "" : selectableVariants[0]?.sku || "",
  );

  const selectedVariant = product.variants.find((v) => v.sku === selectedVariantSku);
  const [activeImage, setActiveImage] = useState(product.image);
  useEffect(() => {
    setSelectedVariantSku(product.selectionRequired ? "" : selectableVariants[0]?.sku || "");
    setActiveImage(product.image);
  }, [product.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const priceSummary = productPriceSummary(product);
  const displayPrice = selectedVariant?.currentPrice ?? priceSummary.minimum;
  const requiresInstrumentSetup = [
    "electric-guitars",
    "acoustic-guitars",
    "classical-guitars",
    "ukuleles",
  ].includes(product.categorySlug);
  const consultationHref = `${whatsappHref(settings)}?text=${encodeURIComponent(
    `Здравствуйте! Нужна консультация по товару «${product.name}».`,
  )}`;

  // Build unique gallery items (master photo + variants photos)
  const galleryItems = useMemo(() => {
    const items: Array<{ image: string; title: string }> = [
      { image: product.image, title: "Главное фото" },
    ];
    for (const v of product.variants) {
      if (v.image && !items.some((item) => item.image === v.image)) {
        items.push({ image: v.image, title: v.title });
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
        <div className="store-product-visual-column">
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
            <div className="store-product-thumbs" aria-label="Фотографии товара">
              {galleryItems.map((item) => {
                const isSelected = item.image === activeImage;

                return (
                  <button
                    key={item.image}
                    type="button"
                    className={`store-thumb-btn ${isSelected ? "is-selected" : ""}`}
                    onClick={() => setActiveImage(item.image)}
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
            {selectedVariant ? (
              selectedVariant.status === "active" && selectedVariant.availableQuantity > 0 ? (
                <span>Выбран вариант: <strong>{selectedVariant.title}</strong> · в наличии {selectedVariant.availableQuantity} шт.</span>
              ) : (
                <span style={{ color: "#ff6b63", fontWeight: 700 }}>
                  Выбран вариант: {selectedVariant.title} · нет в наличии
                </span>
              )
            ) : (
              "Фото можно листать отдельно. Для покупки выберите вариант справа."
            )}
          </p>
        </section>

        <section className="store-product-details">
          <h2>Характеристики</h2>
          <ul>
            {product.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </section>
        </div>

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
            <strong className="store-main-price">{!selectedVariant && priceSummary.hasRange ? "от " : ""}{money(displayPrice)} ₸</strong>
            <span className="store-installment-badge">от {money(installment(displayPrice, 12))} ₸/мес</span>
          </div>
          <p className="store-product-desc">{product.description}</p>

          <ProductConfigurator
            key={product.id}
            product={product}
            selectedVariantSku={selectedVariantSku}
            onVariantSelect={(sku) => {
              setSelectedVariantSku(sku);
              const variant = product.variants.find((candidate) => candidate.sku === sku);
              if (variant?.image) setActiveImage(variant.image);
            }}
            onAdded={() => onNotice("Товар добавлен в корзину.")}
          />

          <a
            className="store-whatsapp-consultation"
            href={consultationHref}
            target="_blank"
            rel="noreferrer"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12 2a9.74 9.74 0 0 0-8.43 14.62L2.3 21.7l5.2-1.24A9.71 9.71 0 1 0 12 2Zm0 17.67a7.67 7.67 0 0 1-3.91-1.07l-.37-.22-3.08.74.76-3-.24-.39A7.72 7.72 0 1 1 12 19.67Zm4.24-5.78c-.23-.12-1.37-.68-1.58-.75-.21-.08-.36-.12-.52.11-.15.24-.59.75-.73.9-.13.16-.27.18-.5.06-.23-.11-.98-.36-1.86-1.15a6.9 6.9 0 0 1-1.29-1.6c-.13-.23-.01-.36.1-.47.1-.1.23-.27.35-.4.11-.14.15-.24.23-.4.08-.15.04-.29-.02-.4-.06-.12-.52-1.25-.71-1.71-.18-.45-.37-.39-.51-.4h-.44c-.15 0-.4.06-.61.29-.21.23-.81.79-.81 1.93s.83 2.24.94 2.4c.12.15 1.63 2.49 3.95 3.49.55.24.98.38 1.32.48.55.18 1.05.15 1.45.09.44-.07 1.37-.56 1.56-1.1.19-.55.19-1.02.13-1.11-.05-.1-.21-.16-.44-.28Z" />
            </svg>
            Получить консультацию
          </a>

          <div className="store-delivery-summary">
            <span>{requiresInstrumentSetup ? "✓ Бесплатная отстройка мастером перед выдачей" : "✓ Проверка товара и комплектации перед выдачей"}</span>
            <span>✓ {settings.pickupEnabled && settings.deliveryEnabled ? `Самовывоз и доставка по ${settings.city}` : settings.deliveryEnabled ? `Доставка по ${settings.city}` : `Самовывоз в ${settings.city}`}</span>
            <span>{product.attachedCourseId && product.attachedCourseId !== "none" ? "✓ Учебные материалы и поддержка школы" : "✓ Консультация по выбору и использованию"}</span>
          </div>
        </section>
      </div>

    </div>
  );
}
