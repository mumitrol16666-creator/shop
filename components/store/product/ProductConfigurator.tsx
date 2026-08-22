"use client";

import { useMemo, useState } from "react";
import { useCommerceCart } from "../../CommerceCartProvider";
import { money } from "../../../lib/catalog-data";
import { BUNDLE_SKUS, type ProductReadModel } from "../../../lib/commerce/types";
import { quoteConfiguration } from "../../../lib/commerce/pricing";

export function ProductConfigurator({
  product,
  compact = false,
  selectedVariantSku: externalVariantSku,
  onVariantSelect,
  onAdded,
}: {
  product: ProductReadModel;
  compact?: boolean;
  selectedVariantSku?: string;
  onVariantSelect?: (sku: string) => void;
  onAdded?: () => void;
}) {
  const commerceCart = useCommerceCart();
  const selectableVariants = product.variants.filter((variant) => variant.status === "active");
  const [internalVariantSku, setInternalVariantSku] = useState<string>(() =>
    product.selectionRequired ? "" : selectableVariants[0]?.sku || "",
  );

  const variantSku = externalVariantSku !== undefined ? externalVariantSku : internalVariantSku;
  const handleVariantClick = (sku: string) => {
    setInternalVariantSku(sku);
    onVariantSelect?.(sku);
  };

  const [bundleSku, setBundleSku] = useState(BUNDLE_SKUS.base as string);
  const [componentSkus, setComponentSkus] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const selectedVariant = product.variants.find((variant) => variant.sku === variantSku);
  const isVariantAvailable = Boolean(
    selectedVariant &&
    selectedVariant.status === "active" &&
    selectedVariant.availableQuantity > 0
  );
  const maxQuantity = isVariantAvailable ? selectedVariant.availableQuantity : 0;

  const quote = useMemo(() => {
    if (!variantSku) return product.defaultPrice;
    try {
      return quoteConfiguration(product, { variantSku, bundleSku, componentSkus });
    } catch {
      return product.defaultPrice;
    }
  }, [product, variantSku, bundleSku, componentSkus]);

  const toggleComponent = (sku: string) => {
    setComponentSkus((current) =>
      current.includes(sku) ? current.filter((item) => item !== sku) : [...current, sku],
    );
  };

  const add = () => {
    if (!variantSku || !isVariantAvailable || maxQuantity < 1) return;
    commerceCart.add({
      product,
      variantSku,
      bundleSku,
      componentSkus,
      quantity: Math.min(quantity, maxQuantity),
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
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
                  handleVariantClick(variant.sku);
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
            disabled={!isVariantAvailable || quantity <= 1}
            aria-label="Уменьшить количество"
          >
            −
          </button>
          <span>{isVariantAvailable ? quantity : 0}</span>
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
            disabled={!variantSku || !isVariantAvailable || quantity >= maxQuantity}
            aria-label="Увеличить количество"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        className={`store-primary-action store-add-to-cart-btn ${justAdded ? "is-added-celebrate" : ""} ${!maxQuantity ? "is-out-of-stock-btn" : ""}`}
        onClick={add}
        disabled={!variantSku || !maxQuantity}
      >
        {justAdded ? (
          <span className="store-btn-added-state">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Добавлено в корзину!
          </span>
        ) : !variantSku ? (
          "Выберите вариант"
        ) : !maxQuantity ? (
          "Нет в наличии"
        ) : (
          "Добавить в корзину"
        )}
      </button>
    </div>
  );
}
