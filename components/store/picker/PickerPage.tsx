"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ProductReadModel } from "../../../lib/commerce/types";
import { recommendProducts, type PickerAnswers } from "../../../lib/storefront/picker";
import { ProductGrid } from "../catalog/ProductGrid";
import { whatsappHref, type StoreSettings } from "../../../lib/store-settings";

const STORAGE_KEY = "maestro-picker-v1";
const questions = [
  { key: "person", title: "Для кого выбираем?", options: [["self", "Для себя"], ["child", "Для ребёнка"]] },
  { key: "size", title: "Какой размер будет удобнее?", options: [["small", "Ребёнок до 10 лет / компактный"], ["teen", "Подросток"], ["adult", "Взрослый / полноразмерный"]] },
  { key: "use", title: "Что хочется играть?", options: [["electric", "Рок, риффы, соло"], ["acoustic", "Песни и аккомпанемент"], ["ukulele", "Лёгкий старт на укулеле"], ["flexible", "Пока не определились"]] },
  { key: "budget", title: "Комфортный бюджет", options: [["under_25000", "До 25 000 ₸"], ["under_40000", "До 40 000 ₸"], ["under_70000", "До 70 000 ₸"], ["any", "Главное — подходящая модель"]] },
  { key: "priority", title: "Что важнее всего?", options: [["comfort", "Комфорт и мягкий старт"], ["price", "Минимальная цена"], ["sound", "Звук и возможности"]] },
] as const;

export function PickerPage({ settings, products, onNotice }: { settings: StoreSettings; products: ProductReadModel[]; onNotice: (message: string) => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = Math.min(6, Math.max(1, Number(searchParams.get("step") || 1)));
  const [answers, setAnswers] = useState<PickerAnswers>({});
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try { setAnswers(JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}")); } catch { sessionStorage.removeItem(STORAGE_KEY); }
    });
    return () => { active = false; };
  }, []);
  const recommendations = useMemo(() => recommendProducts(products, answers, 3), [products, answers]);
  const answer = (key: string, value: string) => {
    const next = { ...answers, [key]: value } as PickerAnswers;
    setAnswers(next);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    router.push(`/picker?step=${Math.min(6, step + 1)}`);
  };
  const reset = () => { sessionStorage.removeItem(STORAGE_KEY); setAnswers({}); router.replace("/picker?step=1"); };

  if (step === 6) {
    return <div className="store-page store-picker-page"><header><p className="store-eyebrow">РЕЗУЛЬТАТ ПОДБОРА</p><h1>Подходящие модели</h1><p>Рекомендации рассчитаны только по товарам, которые реально есть в каталоге и наличии.</p></header><ProductGrid products={recommendations} emptyMessage="Сейчас нет подходящих моделей. Напишите консультанту — предложим ближайший доступный вариант." onNotice={onNotice} />{recommendations.length < 3 && <a className="store-secondary-action" href={whatsappHref(settings)} target="_blank" rel="noopener noreferrer">Уточнить у консультанта</a>}<button type="button" className="store-text-link" onClick={reset}>Пройти подбор заново</button></div>;
  }
  const question = questions[step - 1];
  return (
    <div className="store-page store-picker-page">
      <header><p className="store-eyebrow">ПОДБОР ДЛЯ НОВИЧКА</p><h1>{question.title}</h1><p>Шаг {step} из 5 · без имени, телефона и других личных данных</p></header>
      <div className="store-picker-progress" aria-label={`Шаг ${step} из 5`}><span style={{ width: `${step * 20}%` }} /></div>
      <div className="store-picker-options">{question.options.map(([value, label]) => <button key={value} type="button" onClick={() => answer(question.key, value)}>{label}<span>→</span></button>)}</div>
      {step > 1 && <button type="button" className="store-back-button" onClick={() => router.back()}>← Назад</button>}
    </div>
  );
}
