"use client";

import { useState } from "react";
import type { ProductReadModel } from "../../../lib/commerce/types";
import { ProductCard } from "./ProductCard";
import { QuickViewDialog } from "../product/QuickViewDialog";

export function ProductGrid({ products, emptyMessage = "По этим условиям товары не найдены.", onNotice }: { products: ProductReadModel[]; emptyMessage?: string; onNotice?: (message: string) => void }) {
  const [quickView, setQuickView] = useState<ProductReadModel | null>(null);
  if (!products.length) {
    return <div className="store-empty-state" role="status"><strong>Ничего не найдено</strong><p>{emptyMessage}</p></div>;
  }
  return (
    <>
      <div className="store-product-grid">
        {products.map((product) => <ProductCard key={product.id} product={product} onQuickView={setQuickView} />)}
      </div>
      <QuickViewDialog
        product={quickView}
        onClose={() => setQuickView(null)}
        onAdded={() => {
          setQuickView(null);
          onNotice?.("Товар добавлен в корзину.");
        }}
      />
    </>
  );
}
