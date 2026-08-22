"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "../feedback/Overlay";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "maestro-store-install-dismissed-at";
const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000;

function installedAsApp() {
  const iosStandalone = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

export function PwaLifecycle({ allowInstallPrompt = true }: { allowInstallPrompt?: boolean }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [iosEligible, setIosEligible] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [updateReady, setUpdateReady] = useState<ServiceWorker | null>(null);
  const [applyingUpdate, setApplyingUpdate] = useState(false);
  const applyingUpdateRef = useRef(false);

  useEffect(() => {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    setDismissed(Date.now() - dismissedAt < DISMISS_TTL);
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIosEligible(isIos && !installedAsApp());

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (!installedAsApp()) setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setIosEligible(false);
      setDismissed(true);
    };
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (!("serviceWorker" in navigator)) return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };

    let registration: ServiceWorkerRegistration | null = null;
    let reloading = false;
    const onControllerChange = () => {
      if (reloading || !applyingUpdateRef.current) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((next) => {
      registration = next;
      if (next.waiting) setUpdateReady(next.waiting);
      next.addEventListener("updatefound", () => {
        const worker = next.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(worker);
        });
      });
    }).catch((error) => console.warn("pwa_registration_failed", error));
    const update = () => void registration?.update();
    window.addEventListener("online", update);
    window.addEventListener("focus", update);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", update);
      window.removeEventListener("focus", update);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };
  const install = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstallPrompt(null);
      else dismiss();
      return;
    }
    setShowIosHelp(true);
  };
  const applyUpdate = () => {
    if (!updateReady) return;
    applyingUpdateRef.current = true;
    setApplyingUpdate(true);
    updateReady.postMessage({ type: "SKIP_WAITING" });
  };
  const showInstall = allowInstallPrompt && !dismissed && (Boolean(installPrompt) || iosEligible);

  return (
    <>
      {showInstall && (
        <aside className="store-pwa-prompt" aria-label="Установка приложения Maestro">
          <Image src="/pwa-icon-192.png" width={44} height={44} alt="" unoptimized />
          <div><strong>Maestro на телефоне</strong><small>Открывайте магазин с главного экрана</small></div>
          <button type="button" className="store-pwa-install" onClick={() => void install()}>Установить</button>
          <button type="button" className="store-pwa-dismiss" onClick={dismiss} aria-label="Скрыть предложение установки">×</button>
        </aside>
      )}
      {allowInstallPrompt && updateReady && (
        <aside className="store-pwa-update" role="status">
          <div><strong>Доступна новая версия</strong><small>Обновите магазин без потери корзины</small></div>
          <button type="button" onClick={applyUpdate} disabled={applyingUpdate}>{applyingUpdate ? "Обновляем…" : "Обновить"}</button>
        </aside>
      )}
      <Dialog open={allowInstallPrompt && showIosHelp} onClose={() => setShowIosHelp(false)} label="Как установить Maestro">
        <div className="store-pwa-ios-help">
          <button type="button" className="store-dialog-close" onClick={() => setShowIosHelp(false)} aria-label="Закрыть">×</button>
          <Image src="/pwa-icon-192.png" width={72} height={72} alt="" unoptimized />
          <p className="store-eyebrow">IPHONE И IPAD</p>
          <h2>Добавьте Maestro на экран «Домой»</h2>
          <ol><li>Нажмите кнопку «Поделиться» в Safari.</li><li>Выберите «На экран Домой».</li><li>Подтвердите кнопкой «Добавить».</li></ol>
        </div>
      </Dialog>
    </>
  );
}
