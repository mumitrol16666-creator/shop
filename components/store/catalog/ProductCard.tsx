"use client";

import Image from "next/image";
import Link from "next/link";
import { installment, money } from "../../../lib/catalog-data";
import type { ProductReadModel } from "../../../lib/commerce/types";
import { saveCatalogReturn } from "../../../lib/storefront/scroll-restoration";

export function ProductCard({ product, onQuickView }: { product: ProductReadModel; onQuickView?: (product: ProductReadModel) => void }) {
  const price = product.defaultPrice.final;
  const original = product.defaultPrice.subtotal;
  const discount = product.defaultPrice.discount;
  const open = () => saveCatalogReturn(product.id);
  return (
    <article className="store-product-card" id={`product-${product.id}`} data-product-id={product.id}>
      <Link href={`/product/${product.slug}`} className="store-product-card__main" onClick={open} aria-label={`Открыть товар: ${product.name}`}>
        <div className="store-product-card__image">
          <Image src={product.image} alt={product.name} fill unoptimized sizes="(max-width: 430px) 50vw, (max-width: 1199px) 33vw, 420px" />
          {discount > 0 && <span className="store-sale-badge">−{Math.round((discount / original) * 100)}%</span>}
          {product.badge && <span className="store-product-badge">{product.badge}</span>}
        </div>
        <div className="store-product-card__copy">
          <p>{product.categoryDisplayName}</p>
          <h3>{product.name}</h3>
          <span className={`store-stock ${product.availability.status === "in_stock" ? "is-in-stock" : ""}`}>
            {product.availability.status === "in_stock" ? `В наличии · ${product.availability.totalAvailable}` : "Нет в наличии"}
          </span>
          <div className="store-card-price">
            <strong>{money(price)} ₸</strong>
            {discount > 0 && <del>{money(original)} ₸</del>}
          </div>
          <small>от {money(installment(price, 12))} ₸/мес · {product.variants.length} вариант(а)</small>
        </div>
      </Link>
      <div className="store-product-card__actions">
        <Link href={`/product/${product.slug}`} onClick={open}>Подробнее</Link>
        {onQuickView && <button type="button" className="store-quick-view-action" onClick={() => onQuickView(product)}>Быстрый просмотр</button>}
      </div>
    </article>
  );
}

