"use client";

import { useMemo, useState } from "react";
import { useCommerceCart } from "../../CommerceCartProvider";
import { money } from "../../../lib/catalog-data";
import { BUNDLE_SKUS, type ProductReadModel } from "../../../lib/commerce/types";
import { quoteConfiguration } from "../../../lib/commerce/pricing";

export function ProductConfigurator({
  product,
  compact = false,
  onAdded,
}: {
  product: ProductReadModel;
  compact?: boolean;
  onAdded?: () => void;
}) {
  const commerceCart = useCommerceCart();
  const selectableVariants = product.variants.filter((variant) => variant.status === "active");
  const [variantSku, setVariantSku] = useState<string>(() =>
    product.selectionRequired ? "" : selectableVariants[0]?.sku || "",
  );
  const [bundleSku, setBundleSku] = useState(BUNDLE_SKUS.base as string);
  const [componentSkus, setComponentSkus] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = product.variants.find((variant) => variant.sku === variantSku);
  const quote = useMemo(() => {
    if (!variantSku) return product.defaultPrice;
    try {
      return quoteConfiguration(product, { variantSku, bundleSku, componentSkus });
    } catch {
      return product.defaultPrice;
    }
  }, [product, variantSku, bundleSku, componentSkus]);
  const maxQuantity = selectedVariant?.availableQuantity || 1;

  const toggleComponent = (sku: string) => {
    setComponentSkus((current) => current.includes(sku)
      ? current.filter((item) => item !== sku)
      : [...current, sku]);
  };

  const add = () => {
    if (!variantSku) return;
    commerceCart.add({ product, variantSku, bundleSku, componentSkus, quantity });
    onAdded?.();
  };

  return (
    <div className={`store-configurator ${compact ? "store-configurator--compact" : ""}`}>
      <fieldset>
        <legend>1. Вариант</legend>
        <div className="store-option-grid">
          {product.variants.map((variant) => (
            <button
              key={variant.sku}
              type="button"
              className={variantSku === variant.sku ? "is-selected" : ""}
              disabled={variant.status !== "active"}
              onClick={() => {
                setVariantSku(variant.sku);
                setQuantity(1);
              }}
              aria-pressed={variantSku === variant.sku}
            >
              <span>{variant.title}</span>
              <small>{variant.availableQuantity > 0 ? `${variant.availableQuantity} шт.` : "Нет в наличии"}</small>
            </button>
          ))}
        </div>
        {!variantSku && <p className="store-field-hint">Выберите доступный вариант — цена пересчитается серверной моделью.</p>}
      </fieldset>

      <fieldset>
        <legend>2. Комплектация</legend>
        <div className="store-option-stack">
          {product.bundleDefinitions.filter((bundle) => bundle.eligible).map((bundle) => (
            <button
              key={bundle.sku}
              type="button"
              className={bundleSku === bundle.sku ? "is-selected" : ""}
              onClick={() => setBundleSku(bundle.sku)}
              aria-pressed={bundleSku === bundle.sku}
            >
              <span><strong>{bundle.title}</strong><small>{bundle.description}</small></span>
              <b>{bundle.priceDelta ? `+${money(bundle.priceDelta)} ₸` : "Без доплаты"}</b>
            </button>
          ))}
        </div>
      </fieldset>

      {product.componentDefinitions.some((component) => component.price > 0) && (
        <fieldset>
          <legend>3. Дополнительно</legend>
          <div className="store-option-stack">
            {product.componentDefinitions.filter((component) => component.price > 0).map((component) => (
              <label key={component.sku} className="store-component-option">
                <input
                  type="checkbox"
                  checked={componentSkus.includes(component.sku)}
                  onChange={() => toggleComponent(component.sku)}
                />
                <span>{component.title}</span>
                <b>+{money(component.price)} ₸</b>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="store-configurator-total">
        <div><small>Итого</small><strong>{money(quote.final * quantity)} ₸</strong></div>
        <div className="store-quantity" aria-label="Количество">
          <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity <= 1}>−</button>
          <span>{quantity}</span>
          <button type="button" onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))} disabled={!variantSku || quantity >= maxQuantity}>+</button>
        </div>
      </div>
      <button type="button" className="store-primary-action" onClick={add} disabled={!variantSku || !maxQuantity}>
        {variantSku ? "Добавить в корзину" : "Выберите вариант"}
      </button>
    </div>
  );
}
