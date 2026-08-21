"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { ProductReadModel } from "../../../lib/commerce/types";
import { Dialog } from "../feedback/Overlay";
import { ProductConfigurator } from "./ProductConfigurator";

export function QuickViewDialog({
  product,
  onClose,
  onAdded,
}: {
  product: ProductReadModel | null;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [selectedVariantSku, setSelectedVariantSku] = useState<string>("");
  const selectedVariant = product?.variants.find((v) => v.sku === selectedVariantSku);
  const activeImage = selectedVariant?.image || product?.image || "";

  return (
    <Dialog
      open={Boolean(product)}
      onClose={onClose}
      label={product ? `Быстрый просмотр: ${product.name}` : "Быстрый просмотр"}
      className="store-quick-view"
    >
      {product && (
        <>
          <button
            type="button"
            className="store-dialog-close"
            onClick={onClose}
            aria-label="Закрыть быстрый просмотр"
          >
            ×
          </button>
          <div className="store-quick-view__media">
            <Image
              key={activeImage}
              src={activeImage}
              alt={selectedVariant ? `${product.name} — ${selectedVariant.title}` : product.name}
              fill
              unoptimized
              sizes="520px"
              style={{ objectFit: "contain" }}
            />
          </div>
          <div className="store-quick-view__content">
            <p className="store-eyebrow">{product.categoryDisplayName}</p>
            <h2>{product.name}</h2>
            <ProductConfigurator
              key={product.id}
              product={product}
              compact
              selectedVariantSku={selectedVariantSku || undefined}
              onVariantSelect={(sku) => setSelectedVariantSku(sku)}
              onAdded={onAdded}
            />
            <Link
              href={`/product/${product.slug}`}
              className="store-text-link"
              onClick={onClose}
            >
              Открыть полную страницу товара →
            </Link>
          </div>
        </>
      )}
    </Dialog>
  );
}
