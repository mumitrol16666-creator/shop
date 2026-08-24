"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { installment, money } from "../../../lib/catalog-data";
import { productPriceSummary } from "../../../lib/product-variants";
import type { ProductReadModel } from "../../../lib/commerce/types";
import { saveCatalogReturn } from "../../../lib/storefront/scroll-restoration";

function resolveProductBadge(product: ProductReadModel): string | null {
  if (product.badge) return product.badge;
  const slug = product.categorySlug || "";
  if (slug.includes("acoustic") || slug.includes("classical")) return "🎁 Чехол в подарок";
  if (slug.includes("electric")) return "🔧 Отстроено мастером";
  if (slug.includes("ukulele") || slug.includes("equipment")) return "💳 Kaspi Red";
  return null;
}

export function ProductCard({
  product,
  onQuickView,
}: {
  product: ProductReadModel;
  onQuickView?: (product: ProductReadModel) => void;
}) {
  const [isFavorite, setIsFavorite] = useState(false);
  const priceSummary = productPriceSummary(product);
  const price = priceSummary.minimum;
  const usesBasePrice = price === product.defaultPrice.final;
  const original = usesBasePrice ? product.defaultPrice.subtotal : price;
  const discount = usesBasePrice ? product.defaultPrice.discount : 0;
  const open = () => saveCatalogReturn(product.id);
  const badge = resolveProductBadge(product);
  const cardImage = (product.variants && product.variants[0] && product.variants[0].image)
    ? product.variants[0].image
    : product.image;

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite((prev) => !prev);
  };

  const handleCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onQuickView) {
      onQuickView(product);
    } else {
      window.location.href = `/product/${product.slug}`;
    }
  };

  return (
    <article className="store-product-card modern-luxury-card" id={`product-${product.id}`} data-product-id={product.id}>
      <Link href={`/product/${product.slug}`} className="store-product-card__main" onClick={open} aria-label={`Открыть товар: ${product.name}`}>
        <div className="store-product-card__image-container">
          {badge && (
            <span className="store-product-card__badge-luxury">
              {badge}
            </span>
          )}
          {discount > 0 && <span className="store-sale-badge">−{Math.round((discount / original) * 100)}%</span>}
          
          <button
            type="button"
            className={`store-favorite-btn ${isFavorite ? "is-active" : ""}`}
            onClick={toggleFavorite}
            aria-label={isFavorite ? "Удалить из избранного" : "Добавить в избранное"}
          >
            {isFavorite ? "❤️" : "🤍"}
          </button>

          <div className="store-product-card__img-wrap">
            <Image
              src={cardImage}
              alt={product.name}
              fill
              unoptimized
              sizes="(max-width: 430px) 50vw, (max-width: 1199px) 33vw, 420px"
              className="store-product-card__img"
            />
          </div>
        </div>

        <div className="store-product-card__copy">
          <p className="store-product-card__cat">{product.categoryDisplayName}</p>
          <h3 className="store-product-card__title">{product.name}</h3>

          <div className="store-product-card__price-row">
            <div className="store-product-card__price-block">
              <span className="store-product-card__price">
                {priceSummary.hasRange ? "от " : ""}{money(price)} ₸
              </span>
              {discount > 0 && <del className="store-product-card__old-price">{money(original)} ₸</del>}
            </div>

            <button
              type="button"
              className="store-product-card__cart-btn"
              onClick={handleCartClick}
              title="Добавить в корзину"
              aria-label="Добавить в корзину"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </button>
          </div>

          <div className="store-product-card__stock-row">
            <span className={`store-stock-dot ${product.availability.status === "in_stock" ? "is-in-stock" : ""}`} />
            <span className="store-stock-label">
              {product.availability.status === "in_stock" ? "В наличии" : "Под заказ"}
            </span>
            <span className="store-installment-hint">· от {money(installment(price, 12))} ₸/мес</span>
          </div>
        </div>
      </Link>

      <div className="store-product-card__actions">
        <Link href={`/product/${product.slug}`} onClick={open}>Подробнее</Link>
        {onQuickView && (
          <button type="button" className="store-quick-view-action" onClick={() => onQuickView(product)}>
            Быстрый просмотр
          </button>
        )}
      </div>
    </article>
  );
}
