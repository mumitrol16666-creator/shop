"use client";

import { useState } from "react";
import { type CostPreset, DEFAULT_PRESETS, savePresets } from "../lib/presets";

type PresetManagerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  presets: CostPreset[];
  setPresets: React.Dispatch<React.SetStateAction<CostPreset[]>>;
  onApplyPreset: (preset: CostPreset) => void;
  currentCalculatorValues?: Partial<CostPreset>;
};

export function PresetManagerModal({
  isOpen,
  onClose,
  presets,
  setPresets,
  onApplyPreset,
  currentCalculatorValues,
}: PresetManagerModalProps) {
  const [editingPreset, setEditingPreset] = useState<CostPreset | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const startCreate = () => {
    const newPreset: CostPreset = {
      id: `preset-${Date.now()}`,
      name: "Новый шаблон расходов",
      description: "",
      purchaseCurrency: currentCalculatorValues?.purchaseCurrency || "CNY",
      chinaDeliveryKzt: currentCalculatorValues?.chinaDeliveryKzt ?? 1200,
      cargoKzt: currentCalculatorValues?.cargoKzt ?? 2800,
      customsKzt: currentCalculatorValues?.customsKzt ?? 500,
      packagingKzt: currentCalculatorValues?.packagingKzt ?? 700,
      setupKzt: currentCalculatorValues?.setupKzt ?? 2500,
      marketingKzt: currentCalculatorValues?.marketingKzt ?? 1200,
      otherCostsKzt: currentCalculatorValues?.otherCostsKzt ?? 300,
      taxPercent: currentCalculatorValues?.taxPercent ?? 3,
      bankInstallmentPercent: currentCalculatorValues?.bankInstallmentPercent ?? 11,
      installmentMonths: currentCalculatorValues?.installmentMonths ?? 12,
      sellerPercent: currentCalculatorValues?.sellerPercent ?? 5,
      targetProfitPercent: currentCalculatorValues?.targetProfitPercent ?? 35,
    };
    setEditingPreset(newPreset);
    setIsCreating(true);
  };

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPreset) return;

    let updated: CostPreset[];
    if (isCreating) {
      updated = [...presets, editingPreset];
    } else {
      updated = presets.map((p) => (p.id === editingPreset.id ? editingPreset : p));
    }
    setPresets(updated);
    savePresets(updated);
    setEditingPreset(null);
    setIsCreating(false);
  };

  const handleDeletePreset = (id: string) => {
    if (presets.length <= 1) {
      alert("Нельзя удалить единственный шаблон");
      return;
    }
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    savePresets(updated);
    if (editingPreset?.id === id) {
      setEditingPreset(null);
    }
  };

  const handleResetDefaults = () => {
    if (confirm("Сбросить все шаблоны к исходным заводским настройкам?")) {
      setPresets(DEFAULT_PRESETS);
      savePresets(DEFAULT_PRESETS);
      setEditingPreset(null);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <article
        className="preset-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header-row">
          <div>
            <p className="eyebrow">ЮНИТ-ЭКОНОМИКА</p>
            <h2>Конструктор шаблонов расходов</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        {editingPreset ? (
          <form onSubmit={handleSavePreset} className="preset-edit-form">
            <div className="preset-form-head">
              <h3>{isCreating ? "➕ Создание нового шаблона" : `✏️ Редактирование: ${editingPreset.name}`}</h3>
              <button
                type="button"
                className="outline-button small"
                onClick={() => {
                  setEditingPreset(null);
                  setIsCreating(false);
                }}
              >
                ← К списку шаблонов
              </button>
            </div>

            <div className="calculator-form">
              <label className="full-width">
                Название шаблона
                <input
                  required
                  value={editingPreset.name}
                  onChange={(e) => setEditingPreset({ ...editingPreset, name: e.target.value })}
                  placeholder="Например: Электрогитары HSS с доводкой"
                />
              </label>
              <label className="full-width">
                Краткое описание / подсказка
                <input
                  value={editingPreset.description || ""}
                  onChange={(e) => setEditingPreset({ ...editingPreset, description: e.target.value })}
                  placeholder="Особенности упаковки, доводки мастера или карго"
                />
              </label>
              <label>
                Валюта закупки
                <select
                  value={editingPreset.purchaseCurrency}
                  onChange={(e) =>
                    setEditingPreset({
                      ...editingPreset,
                      purchaseCurrency: e.target.value as "CNY" | "USD" | "KZT",
                    })
                  }
                >
                  <option value="CNY">Юань (¥, CNY)</option>
                  <option value="USD">Доллар ($, USD)</option>
                  <option value="KZT">Тенге (₸, KZT)</option>
                </select>
              </label>
              <label>
                Доставка по Китаю, ₸
                <input
                  type="number"
                  placeholder="0"
                  value={editingPreset.chinaDeliveryKzt === 0 ? "" : editingPreset.chinaDeliveryKzt}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditingPreset({ ...editingPreset, chinaDeliveryKzt: +e.target.value })}
                />
              </label>
              <label>
                Карго до Актобе, ₸
                <input
                  type="number"
                  placeholder="0"
                  value={editingPreset.cargoKzt === 0 ? "" : editingPreset.cargoKzt}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditingPreset({ ...editingPreset, cargoKzt: +e.target.value })}
                />
              </label>
              <label>
                Таможня / сборы, ₸
                <input
                  type="number"
                  placeholder="0"
                  value={editingPreset.customsKzt === 0 ? "" : editingPreset.customsKzt}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditingPreset({ ...editingPreset, customsKzt: +e.target.value })}
                />
              </label>
              <label>
                Упаковка / коробка, ₸
                <input
                  type="number"
                  placeholder="0"
                  value={editingPreset.packagingKzt === 0 ? "" : editingPreset.packagingKzt}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditingPreset({ ...editingPreset, packagingKzt: +e.target.value })}
                />
              </label>
              <label>
                Доводка мастера / чек, ₸
                <input
                  type="number"
                  placeholder="0"
                  value={editingPreset.setupKzt === 0 ? "" : editingPreset.setupKzt}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditingPreset({ ...editingPreset, setupKzt: +e.target.value })}
                />
              </label>
              <label>
                Маркетинг на единицу, ₸
                <input
                  type="number"
                  placeholder="0"
                  value={editingPreset.marketingKzt === 0 ? "" : editingPreset.marketingKzt}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditingPreset({ ...editingPreset, marketingKzt: +e.target.value })}
                />
              </label>
              <label>
                Прочие расходы, ₸
                <input
                  type="number"
                  placeholder="0"
                  value={editingPreset.otherCostsKzt === 0 ? "" : editingPreset.otherCostsKzt}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditingPreset({ ...editingPreset, otherCostsKzt: +e.target.value })}
                />
              </label>
              <label>
                Налог, %
                <input
                  type="number"
                  placeholder="0"
                  value={editingPreset.taxPercent === 0 ? "" : editingPreset.taxPercent}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditingPreset({ ...editingPreset, taxPercent: +e.target.value })}
                />
              </label>
              <label>
                Банк / рассрочка, %
                <input
                  type="number"
                  placeholder="0"
                  value={editingPreset.bankInstallmentPercent === 0 ? "" : editingPreset.bankInstallmentPercent}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditingPreset({ ...editingPreset, bankInstallmentPercent: +e.target.value })}
                />
              </label>
              <label>
                Срок рассрочки, мес.
                <input
                  type="number"
                  placeholder="0"
                  value={editingPreset.installmentMonths === 0 ? "" : editingPreset.installmentMonths}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditingPreset({ ...editingPreset, installmentMonths: +e.target.value })}
                />
              </label>
              <label>
                Продавец, %
                <input
                  type="number"
                  placeholder="0"
                  value={editingPreset.sellerPercent === 0 ? "" : editingPreset.sellerPercent}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditingPreset({ ...editingPreset, sellerPercent: +e.target.value })}
                />
              </label>
              <label>
                Желаемая прибыль, %
                <input
                  type="number"
                  placeholder="0"
                  value={editingPreset.targetProfitPercent === 0 ? "" : editingPreset.targetProfitPercent}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditingPreset({ ...editingPreset, targetProfitPercent: +e.target.value })}
                />
              </label>
            </div>

            <div className="preset-form-actions">
              <button
                type="button"
                className="outline-button"
                onClick={() => {
                  setEditingPreset(null);
                  setIsCreating(false);
                }}
              >
                Отмена
              </button>
              <button type="submit" className="primary-button">
                {isCreating ? "➕ Создать шаблон" : "💾 Сохранить изменения"}
              </button>
            </div>
          </form>
        ) : (
          <div className="preset-list-view">
            <p className="preset-note">
              💡 <strong>Шаблоны расходов</strong> позволяют в один клик подставлять логистику, отстройку мастера, карго и наценку под разные категории инструментов.
            </p>

            <div className="preset-cards-grid">
              {presets.map((preset) => {
                const totalDirectExpenses =
                  preset.chinaDeliveryKzt +
                  preset.cargoKzt +
                  preset.customsKzt +
                  preset.packagingKzt +
                  preset.setupKzt +
                  preset.marketingKzt +
                  preset.otherCostsKzt;

                return (
                  <div className="preset-card-item" key={preset.id}>
                    <div className="preset-item-head">
                      <strong className="preset-title">{preset.name}</strong>
                      <span className="currency-pill">{preset.purchaseCurrency === "CNY" ? "¥ CNY" : preset.purchaseCurrency === "USD" ? "$ USD" : "₸ KZT"}</span>
                    </div>
                    {preset.description && <p className="preset-desc">{preset.description}</p>}

                    <div className="preset-breakdown-tags">
                      <span className="tag-pill overhead" title="Суммарные прямые накладные расходы">
                        📦 Накладные: <strong>{totalDirectExpenses.toLocaleString("ru-RU")} ₸</strong>
                      </span>
                      <span className="tag-pill setup" title="Стоимость предпродажной отстройки мастером">
                        🔧 Доводка: <strong>{preset.setupKzt.toLocaleString("ru-RU")} ₸</strong>
                      </span>
                      <span className="tag-pill margin" title="Целевая маржинальность">
                        📈 Маржа: <strong>{preset.targetProfitPercent}%</strong>
                      </span>
                      <span className="tag-pill bank" title="Комиссия банка за рассрочку Kaspi">
                        💳 Рассрочка: <strong>{preset.bankInstallmentPercent}%</strong>
                      </span>
                    </div>

                    <div className="preset-item-actions">
                      <button
                        type="button"
                        className="primary-button small apply-btn"
                        onClick={() => {
                          onApplyPreset(preset);
                          onClose();
                        }}
                      >
                        ⚡ Применить
                      </button>
                      <button
                        type="button"
                        className="outline-button small"
                        onClick={() => {
                          setEditingPreset(preset);
                          setIsCreating(false);
                        }}
                      >
                        ✏️ Изменить
                      </button>
                      <button
                        type="button"
                        className="delete-link-btn"
                        onClick={() => handleDeletePreset(preset.id)}
                        title="Удалить шаблон"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="preset-footer-actions">
              <button type="button" className="outline-button reset-btn" onClick={handleResetDefaults}>
                🔄 Сбросить к заводским
              </button>
              <button type="button" className="primary-button" onClick={startCreate}>
                ➕ Создать новый шаблон
              </button>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
