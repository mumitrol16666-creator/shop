"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminAccessGate, useAdminAccess } from "../../../components/AdminAccessGate";
import { DEFAULT_STORE_SETTINGS, type StoreSettings } from "../../../lib/store-settings";

export default function AdminStoreSettingsPage() {
  return <AdminAccessGate><StoreSettingsEditor /></AdminAccessGate>;
}

function StoreSettingsEditor() {
  const { logout } = useAdminAccess();
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/store-settings", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Настройки не загрузились")))
      .then((payload: { settings?: StoreSettings }) => payload.settings && setSettings(payload.settings))
      .catch((error) => setMessage(error instanceof Error ? error.message : "Настройки не загрузились"))
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setMessage("");
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/store-settings", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = await response.json();
      if (!response.ok || !payload.settings) throw new Error(payload.error || "Настройки не сохранились");
      setSettings(payload.settings);
      setMessage("✅ Настройки сохранены и применены к витрине.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Настройки не сохранились");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="site-shell">
      <header className="admin-topbar">
        <div className="admin-brand"><span className="brand-mark">M</span><div><strong>MAESTRO ADMIN</strong><small>Настройки магазина</small></div></div>
        <nav className="admin-nav">
          <Link href="/admin/orders">Заказы</Link>
          <Link href="/admin/pricing">Товары и цены</Link>
          <Link href="/admin/analytics">Аналитика</Link>
          <Link className="is-active" href="/admin/settings">Настройки магазина</Link>
          <Link href="/">Витрина</Link>
          <button type="button" className="admin-logout-btn" onClick={() => void logout()}>Выйти</button>
        </nav>
      </header>

      <section className="calculator-card modern-editor-card" style={{ marginTop: 24, padding: 28 }}>
        <div><span className="eyebrow">УПРАВЛЕНИЕ ВИТРИНОЙ</span><h1>Настройки магазина</h1><p>Контакты, оформление заказа и основные тексты меняются без публикации нового кода.</p></div>
      </section>

      {loading ? <section className="admin-catalog-loading">Загружаем настройки…</section> : (
        <section style={{ display: "block", marginTop: 20 }}>
          <div className="calculator-card modern-editor-card">
            <div className="tab-pane-content">
              <div className="tab-section-head"><strong>Контакты и город</strong><p>Номер вводится только цифрами, например 77775055788.</p></div>
              <div className="model-info-grid">
                <label className="editor-field-card"><span className="field-label-text">Город</span><input value={settings.city} onChange={(event) => update("city", event.target.value)} /></label>
                <label className="editor-field-card"><span className="field-label-text">WhatsApp</span><input inputMode="tel" value={settings.whatsappPhone} onChange={(event) => update("whatsappPhone", event.target.value)} /></label>
                <label className="editor-field-card full-width"><span className="field-label-text">Верхняя плашка</span><input value={settings.announcement} onChange={(event) => update("announcement", event.target.value)} /></label>
                <label className="editor-field-card full-width"><span className="field-label-text">Заголовок главной</span><input value={settings.heroTitle} onChange={(event) => update("heroTitle", event.target.value)} /></label>
                <label className="editor-field-card full-width"><span className="field-label-text">Описание на главной</span><textarea rows={3} value={settings.heroDescription} onChange={(event) => update("heroDescription", event.target.value)} /></label>
              </div>

              <div className="tab-section-head" style={{ marginTop: 24 }}><strong>Оформление заказа</strong><p>Хотя бы один способ получения и один способ оплаты всегда останутся включёнными.</p></div>
              <div className="model-info-grid">
                <label className="editor-field-card"><span className="field-label-text">Срок резерва, минут</span><input type="number" min="5" max="1440" value={settings.reservationMinutes} onChange={(event) => update("reservationMinutes", Number(event.target.value) || 30)} /></label>
                <div className="editor-field-card"><span className="field-label-text">Получение</span><label><input type="checkbox" checked={settings.pickupEnabled} onChange={(event) => update("pickupEnabled", event.target.checked)} /> Самовывоз</label><label><input type="checkbox" checked={settings.deliveryEnabled} onChange={(event) => update("deliveryEnabled", event.target.checked)} /> Доставка по городу</label></div>
                <div className="editor-field-card"><span className="field-label-text">Оплата</span><label><input type="checkbox" checked={settings.kaspiEnabled} onChange={(event) => update("kaspiEnabled", event.target.checked)} /> Kaspi Pay / QR</label><label><input type="checkbox" checked={settings.cashTransferEnabled} onChange={(event) => update("cashTransferEnabled", event.target.checked)} /> Наличные или перевод</label></div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 24 }}>
                <button type="button" className="save-publish-btn" disabled={saving} onClick={save}>{saving ? "Сохраняем…" : "💾 Сохранить настройки"}</button>
                {message && <strong>{message}</strong>}
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
