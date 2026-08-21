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
    setComponentSkus((current) =>
      current.includes(sku) ? current.filter((item) => item !== sku) : [...current, sku],
    );
  };

  const add = () => {
    if (!variantSku) return;
    commerceCart.add({ product, variantSku, bundleSku, componentSkus, quantity });
    onAdded?.();
  };

  return (
    <div className={`store-configurator ${compact ? "store-configurator--compact" : ""}`}>
      {/* 1. VARIANT SELECTION */}
      <div className="store-config-section">
        <div className="store-config-section__header">
          <span className="store-config-step">1</span>
          <h3>Вариант расцветки</h3>
        </div>
        <div className="store-option-grid">
          {product.variants.map((variant) => {
            const isSelected = variantSku === variant.sku;
            const isAvailable = variant.status === "active" && variant.availableQuantity > 0;
            return (
              <button
                key={variant.sku}
                type="button"
                className={`store-variant-btn ${isSelected ? "is-selected" : ""}`}
                disabled={!isAvailable}
                onClick={() => {
                  setVariantSku(variant.sku);
                  setQuantity(1);
                }}
                aria-pressed={isSelected}
              >
                <span className="store-variant-title">{variant.title}</span>
                <span className={`store-variant-stock ${isAvailable ? "in-stock" : "out-of-stock"}`}>
                  {isAvailable ? `${variant.availableQuantity} шт.` : "Нет"}
                </span>
              </button>
            );
          })}
        </div>
        {!variantSku && (
          <p className="store-field-hint">⚠️ Пожалуйста, выберите нужный цвет для оформления заказа.</p>
        )}
      </div>

      {/* 2. BUNDLE SELECTION */}
      <div className="store-config-section">
        <div className="store-config-section__header">
          <span className="store-config-step">2</span>
          <h3>Комплектация</h3>
        </div>
        <div className="store-option-stack">
          {product.bundleDefinitions
            .filter((bundle) => bundle.eligible)
            .map((bundle) => {
              const isSelected = bundleSku === bundle.sku;
              return (
                <button
                  key={bundle.sku}
                  type="button"
                  className={`store-bundle-btn ${isSelected ? "is-selected" : ""}`}
                  onClick={() => setBundleSku(bundle.sku)}
                  aria-pressed={isSelected}
                >
                  <div className="store-bundle-radio">
                    <span className={`store-radio-dot ${isSelected ? "is-active" : ""}`} />
                  </div>
                  <div className="store-bundle-copy">
                    <strong>{bundle.title}</strong>
                    {bundle.description && <small>{bundle.description}</small>}
                  </div>
                  <div className="store-bundle-price">
                    {bundle.priceDelta ? (
                      <span className="store-bundle-delta">+{money(bundle.priceDelta)} ₸</span>
                    ) : (
                      <span className="store-bundle-free">Без доплаты</span>
                    )}
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      {/* 3. OPTIONAL UPSELLS */}
      {product.componentDefinitions.some((component) => component.price > 0) && (
        <div className="store-config-section">
          <div className="store-config-section__header">
            <span className="store-config-step">3</span>
            <h3>Дополнительно со скидкой</h3>
          </div>
          <div className="store-option-stack">
            {product.componentDefinitions
              .filter((component) => component.price > 0)
              .map((component) => {
                const isChecked = componentSkus.includes(component.sku);
                return (
                  <label
                    key={component.sku}
                    className={`store-component-option ${isChecked ? "is-checked" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleComponent(component.sku)}
                    />
                    <span className="store-component-title">{component.title}</span>
                    <span className="store-component-price">+{money(component.price)} ₸</span>
                  </label>
                );
              })}
          </div>
        </div>
      )}

      {/* TOTAL & ACTIONS */}
      <div className="store-configurator-total">
        <div>
          <small>Итоговая стоимость:</small>
          <strong>{money(quote.final * quantity)} ₸</strong>
        </div>
        <div className="store-quantity" aria-label="Количество">
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            disabled={quantity <= 1}
            aria-label="Уменьшить количество"
          >
            −
          </button>
          <span>{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
            disabled={!variantSku || quantity >= maxQuantity}
            aria-label="Увеличить количество"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        className="store-primary-action"
        onClick={add}
        disabled={!variantSku || !maxQuantity}
      >
        {variantSku ? "Добавить в корзину" : "Выберите вариант"}
      </button>
    </div>
  );
}
