"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { money, type Product, type AdminPricing } from "../lib/catalog-data";

export function AnalyticsReport() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [kaspiFeeSimPercent, setKaspiFeeSimPercent] = useState<number>(11);
  const [reportDate, setReportDate] = useState<string>("");

  useEffect(() => {
    setReportDate(
      new Date().toLocaleDateString("ru-RU", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );

    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.products) {
          setProducts(data.products);
        }
      })
      .catch((err) => console.error("Error fetching products for analytics:", err))
      .finally(() => setLoading(false));
  }, []);

  // Compute unit economics for a product
  const getProductEconomics = (product: Product, simKaspiFee: number) => {
    const pricing: AdminPricing | undefined = product.adminPricing;
    const rate = pricing?.purchaseCurrency === "CNY" ? (pricing?.currencyRate || 70) : pricing?.purchaseCurrency === "USD" ? (pricing?.currencyRate || 500) : 1;
    const purchaseKzt = (pricing?.purchasePrice || 0) * rate;

    const directCost = purchaseKzt +
      (pricing?.chinaDeliveryKzt || 0) +
      (pricing?.cargoKzt || 0) +
      (pricing?.customsKzt || 0) +
      (pricing?.packagingKzt || 0) +
      (pricing?.setupKzt || 0) +
      (pricing?.marketingKzt || 0) +
      (pricing?.otherCostsKzt || 0);

    const retailPrice = product.price || 0;
    const qty = product.quantity || 1;

    // Deductions from retail price
    const taxDeduction = retailPrice * ((pricing?.taxPercent || 3) / 100);
    const bankDeduction = retailPrice * (simKaspiFee / 100);
    const sellerDeduction = retailPrice * ((pricing?.sellerPercent || 5) / 100);
    const totalDeductions = taxDeduction + bankDeduction + sellerDeduction;

    const netProfitPerUnit = directCost > 0 && retailPrice > 0 ? (retailPrice - directCost - totalDeductions) : (retailPrice * 0.35);
    const totalStockCost = directCost * qty;
    const totalStockRevenue = retailPrice * qty;
    const totalStockNetProfit = netProfitPerUnit * qty;
    const marginPercent = retailPrice > 0 ? Math.round((netProfitPerUnit / retailPrice) * 100) : 0;
    const roiPercent = directCost > 0 ? Math.round((netProfitPerUnit / directCost) * 100) : 0;

    return {
      directCost: Math.round(directCost),
      retailPrice,
      qty,
      taxDeduction: Math.round(taxDeduction),
      bankDeduction: Math.round(bankDeduction),
      sellerDeduction: Math.round(sellerDeduction),
      netProfitPerUnit: Math.round(netProfitPerUnit),
      totalStockCost: Math.round(totalStockCost),
      totalStockRevenue: Math.round(totalStockRevenue),
      totalStockNetProfit: Math.round(totalStockNetProfit),
      marginPercent,
      roiPercent,
    };
  };

  // Aggregated analytics metrics
  const analytics = useMemo(() => {
    let totalStockQty = 0;
    let totalCostKzt = 0;
    let totalRevenueKzt = 0;
    let totalNetProfitKzt = 0;

    const categoryStats: Record<string, { count: number; qty: number; cost: number; revenue: number; profit: number }> = {};

    const items = products.map((p) => {
      const eco = getProductEconomics(p, kaspiFeeSimPercent);
      totalStockQty += eco.qty;
      totalCostKzt += eco.totalStockCost;
      totalRevenueKzt += eco.totalStockRevenue;
      totalNetProfitKzt += eco.totalStockNetProfit;

      const cat = p.category || "Другое";
      if (!categoryStats[cat]) {
        categoryStats[cat] = { count: 0, qty: 0, cost: 0, revenue: 0, profit: 0 };
      }
      categoryStats[cat].count += 1;
      categoryStats[cat].qty += eco.qty;
      categoryStats[cat].cost += eco.totalStockCost;
      categoryStats[cat].revenue += eco.totalStockRevenue;
      categoryStats[cat].profit += eco.totalStockNetProfit;

      return {
        product: p,
        eco,
      };
    });

    // Sort items by total batch profit descending (ABC Leaderboard)
    items.sort((a, b) => b.eco.totalStockNetProfit - a.eco.totalStockNetProfit);

    const overallMarginPercent = totalRevenueKzt > 0 ? Math.round((totalNetProfitKzt / totalRevenueKzt) * 100) : 0;
    const overallRoiPercent = totalCostKzt > 0 ? Math.round((totalNetProfitKzt / totalCostKzt) * 100) : 0;

    return {
      totalStockQty,
      totalCostKzt,
      totalRevenueKzt,
      totalNetProfitKzt,
      overallMarginPercent,
      overallRoiPercent,
      categoryStats,
      items,
    };
  }, [products, kaspiFeeSimPercent]);

  return (
    <div className="analytics-page-root">
      {/* Top Action Bar (hidden when printing) */}
      <header className="analytics-top-bar no-print">
        <div className="analytics-brand-area">
          <div className="analytics-logo-badge">MAESTRO</div>
          <div>
            <h1>Финансовая аналитика и Сводка склада</h1>
            <p>Управленческий отчет юнит-экономики и доходности ассортимента</p>
          </div>
        </div>

        <div className="analytics-actions">
          <button
            type="button"
            className="analytics-btn secondary"
            onClick={() => window.location.href = "/admin/pricing"}
          >
            ← В редактор цен
          </button>
          <button
            type="button"
            className="analytics-btn primary"
            onClick={() => window.print()}
          >
            🖨 Распечатать отчет (PDF / A4)
          </button>
        </div>
      </header>

      {/* Main Printable Document Sheet */}
      <main className="analytics-sheet">
        {/* Printable Header Banner */}
        <div className="sheet-header">
          <div className="sheet-header-left">
            <div className="sheet-title-group">
              <span className="sheet-watermark-tag">ОФИЦИАЛЬНЫЙ ОТЧЕТ СЕТИ MAESTRO</span>
              <h2>Сводная аналитика капитала и юнит-экономики</h2>
              <span className="sheet-meta-date">Сформировано: {reportDate || "20 августа 2026 г."} · Валюта: KZT (₸)</span>
            </div>
          </div>
          <div className="sheet-header-right">
            <div className="sheet-status-box">
              <span className="sheet-status-indicator">● АКТУАЛЬНО</span>
              <strong>База товаров: {products.length} моделей</strong>
              <small>Общий остаток: {analytics.totalStockQty} шт.</small>
            </div>
          </div>
        </div>

        {/* 5 KEY EXECUTIVE FINANCIAL METRICS */}
        <section className="analytics-kpi-grid">
          <div className="analytics-kpi-card gold-border">
            <span className="kpi-label">💰 Капитал в себестоимости</span>
            <strong className="kpi-value gold">{money(analytics.totalCostKzt)} ₸</strong>
            <span className="kpi-hint">Закупка + доставка + карго + доводка</span>
          </div>

          <div className="analytics-kpi-card">
            <span className="kpi-label">🏷️ Ожидаемая валовая выручка</span>
            <strong className="kpi-value">{money(analytics.totalRevenueKzt)} ₸</strong>
            <span className="kpi-hint">При 100% реализации остатков</span>
          </div>

          <div className="analytics-kpi-card green-border">
            <span className="kpi-label">🎯 Прогнозная чистая прибыль</span>
            <strong className="kpi-value green">+{money(analytics.totalNetProfitKzt)} ₸</strong>
            <span className="kpi-hint">За вычетом Kaspi ({kaspiFeeSimPercent}%), налогов и %</span>
          </div>

          <div className="analytics-kpi-card">
            <span className="kpi-label">📈 Средняя рентабельность (ROI)</span>
            <strong className="kpi-value">{analytics.overallRoiPercent}%</strong>
            <span className="kpi-hint">Маржинальность продаж: {analytics.overallMarginPercent}%</span>
          </div>

          <div className="analytics-kpi-card">
            <span className="kpi-label">📦 Всего товара на складе</span>
            <strong className="kpi-value">{analytics.totalStockQty} <small style={{ fontSize: "14px", fontWeight: 700 }}>шт.</small></strong>
            <span className="kpi-hint">{products.length} активных товарных позиций</span>
          </div>
        </section>

        {/* INTERACTIVE KASPI FEE SIMULATOR (hidden in print or shown compactly) */}
        <section className="analytics-section-box no-print">
          <div className="section-box-head between">
            <div>
              <h3>🎛 Симулятор акций и комиссий Kaspi Рассрочки</h3>
              <p>Оцените изменение чистой прибыли сети при смене тарифа Kaspi (стандарт 0-0-12 vs Kaspi Жұма)</p>
            </div>
            <div className="kaspi-sim-badge">
              Текущая комиссия в расчете: <strong>{kaspiFeeSimPercent}%</strong>
            </div>
          </div>

          <div className="kaspi-sim-controls">
            <div className="sim-presets-row">
              <button
                type="button"
                className={`sim-preset-btn ${kaspiFeeSimPercent === 0 ? "active" : ""}`}
                onClick={() => setKaspiFeeSimPercent(0)}
              >
                0% (Прямая оплата нал/карта)
              </button>
              <button
                type="button"
                className={`sim-preset-btn ${kaspiFeeSimPercent === 11 ? "active" : ""}`}
                onClick={() => setKaspiFeeSimPercent(11)}
              >
                11% (Kaspi Red / Рассрочка 0-0-12)
              </button>
              <button
                type="button"
                className={`sim-preset-btn ${kaspiFeeSimPercent === 18 ? "active" : ""}`}
                onClick={() => setKaspiFeeSimPercent(18)}
              >
                18% (Kaspi Жұма 0-0-24)
              </button>
              <button
                type="button"
                className={`sim-preset-btn ${kaspiFeeSimPercent === 22 ? "active" : ""}`}
                onClick={() => setKaspiFeeSimPercent(22)}
              >
                22% (Супер-акция Kaspi 0-0-24)
              </button>
            </div>

            <div className="sim-slider-row">
              <label>
                Точный выбор % комиссии Kaspi:
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="1"
                  value={kaspiFeeSimPercent}
                  onChange={(e) => setKaspiFeeSimPercent(Number(e.target.value))}
                />
              </label>
              <span className="sim-slider-val">{kaspiFeeSimPercent}%</span>
            </div>
          </div>
        </section>

        {/* CATEGORY CAPITAL STRUCTURE */}
        <section className="analytics-section-box">
          <div className="section-box-head">
            <h3>📊 Структура капитала и прибыли по категориям</h3>
            <p>Распределение запасов, инвестиций и ожидаемого дохода по товарным группам</p>
          </div>

          <div className="category-bars-list">
            {Object.entries(analytics.categoryStats).map(([categoryName, stats]) => {
              const sharePercent = analytics.totalCostKzt > 0 ? Math.round((stats.cost / analytics.totalCostKzt) * 100) : 0;
              const profitShare = analytics.totalNetProfitKzt > 0 ? Math.round((stats.profit / analytics.totalNetProfitKzt) * 100) : 0;

              return (
                <div className="category-bar-row" key={categoryName}>
                  <div className="category-bar-meta">
                    <div className="cat-title-group">
                      <strong>{categoryName}</strong>
                      <span>{stats.count} моделей · {stats.qty} шт. на складе</span>
                    </div>
                    <div className="cat-fin-group">
                      <span>Инвестировано: <strong>{money(stats.cost)} ₸</strong> ({sharePercent}%)</span>
                      <span className="cat-profit-pill">Прибыль: +{money(stats.profit)} ₸ ({profitShare}%)</span>
                    </div>
                  </div>
                  <div className="category-progress-track">
                    <div
                      className="category-progress-fill"
                      style={{ width: `${Math.max(5, sharePercent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ABC & PROFITABILITY LEADERBOARD TABLE */}
        <section className="analytics-section-box">
          <div className="section-box-head between">
            <div>
              <h3>👑 Рейтинг маржинальности товаров (ABC-анализ склада)</h3>
              <p>Сортировка по вкладу в совокупную чистую прибыль партии (от самых доходных к базовым)</p>
            </div>
            <span className="table-count-pill">{analytics.items.length} позиций</span>
          </div>

          <div className="analytics-table-wrap">
            <table className="analytics-data-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>#</th>
                  <th>Инструмент / Артикул</th>
                  <th>Категория</th>
                  <th>Остаток</th>
                  <th>Себестоимость</th>
                  <th>Розница (Витрина)</th>
                  <th>Чистыми с 1 шт.</th>
                  <th>Прибыль партии</th>
                  <th>Маржа %</th>
                  <th>Класс</th>
                </tr>
              </thead>
              <tbody>
                {analytics.items.map((item, idx) => {
                  const p = item.product;
                  const eco = item.eco;
                  const isTopA = idx < 3 || eco.marginPercent >= 35;
                  const isB = !isTopA && eco.marginPercent >= 25;

                  return (
                    <tr key={p.id || idx}>
                      <td className="center-cell muted">{idx + 1}</td>
                      <td>
                        <div className="table-product-cell">
                          <div className="table-thumb">
                            <Image src={p.image} alt="" fill unoptimized sizes="36px" style={{ objectFit: "contain" }} />
                          </div>
                          <div>
                            <strong>{p.name}</strong>
                            <span className="table-sku">{p.sku}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="table-cat-badge">{p.category}</span>
                      </td>
                      <td className="center-cell font-bold">{eco.qty} шт.</td>
                      <td className="num-cell">{eco.directCost > 0 ? `${money(eco.directCost)} ₸` : "—"}</td>
                      <td className="num-cell font-bold">{eco.retailPrice > 0 ? `${money(eco.retailPrice)} ₸` : "—"}</td>
                      <td className="num-cell profit-green">+{money(eco.netProfitPerUnit)} ₸</td>
                      <td className="num-cell batch-profit">+{money(eco.totalStockNetProfit)} ₸</td>
                      <td className="center-cell">
                        <span className={`margin-badge ${eco.marginPercent >= 35 ? "high" : eco.marginPercent >= 20 ? "mid" : "low"}`}>
                          {eco.marginPercent}%
                        </span>
                      </td>
                      <td className="center-cell">
                        <span className={`abc-badge ${isTopA ? "class-a" : isB ? "class-b" : "class-c"}`}>
                          {isTopA ? "Class A" : isB ? "Class B" : "Class C"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="table-total-row">
                  <td colSpan={3}><strong>ИТОГО ПО ВСЕМУ СКЛАДУ:</strong></td>
                  <td className="center-cell"><strong>{analytics.totalStockQty} шт.</strong></td>
                  <td className="num-cell"><strong>{money(analytics.totalCostKzt)} ₸</strong></td>
                  <td className="num-cell"><strong>{money(analytics.totalRevenueKzt)} ₸</strong></td>
                  <td className="num-cell muted">—</td>
                  <td className="num-cell total-profit"><strong>+{money(analytics.totalNetProfitKzt)} ₸</strong></td>
                  <td className="center-cell"><strong>{analytics.overallMarginPercent}%</strong></td>
                  <td className="center-cell">✓</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* PRINTABLE FOOTER & SIGNATURE BLOCK */}
        <footer className="sheet-footer">
          <div className="sheet-signature-box">
            <div>
              <strong>Руководитель магазина Maestro:</strong>
              <div className="sign-line" />
              <small>Подпись / Расшифровка</small>
            </div>
            <div>
              <strong>Главный товаровед и закупщик:</strong>
              <div className="sign-line" />
              <small>Подпись / Расшифровка</small>
            </div>
            <div className="stamp-box">
              <span>М.П.</span>
              <small>Штамп предприятия</small>
            </div>
          </div>

          <div className="sheet-legal-note">
            <span>MAESTRO MUSIC STORE & ACADEMY · г. Актобе, Казахстан · shop.maestro.com.kz</span>
            <span>Конфиденциально · Документ внутреннего управленческого учета</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
