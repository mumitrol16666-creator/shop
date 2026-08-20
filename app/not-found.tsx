import Link from "next/link";

export default function NotFound() {
  return <main className="store-main"><section className="store-page store-not-found"><p className="store-eyebrow">404</p><h1>Страница не найдена</h1><p>Такого товара или раздела нет.</p><Link className="store-primary-action" href="/catalog">Открыть каталог</Link></section></main>;
}

