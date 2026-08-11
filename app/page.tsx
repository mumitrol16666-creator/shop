"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type Product = {
  id: number;
  name: string;
  shortName: string;
  category: string;
  image: string;
  quantity: number;
  variants: number;
  sku: string;
  badge?: string;
  description: string;
  features: string[];
};

type Variant = {
  name: string;
  stock: number;
  color: string;
  sku: string;
  image: string;
  secondary?: string;
  note?: string;
};

type CartItem = {
  key: string;
  productId: number;
  name: string;
  variantName: string;
  sku: string;
  image: string;
  quantity: number;
  maxQuantity: number;
};

const products: Product[] = [
  {
    id: 1,
    name: "Электрогитара ST-20",
    shortName: "ST-20",
    category: "Электрогитары",
    image: "/products/01_st20_electric.png",
    quantity: 7,
    variants: 6,
    sku: "EG-ST20",
    badge: "Для начинающих",
    description:
      "Универсальная электрогитара формы ST для первых занятий, домашней практики и знакомства с разными стилями музыки.",
    features: ["Форма корпуса ST", "Конфигурация HSS", "6 цветов", "Стандартная мензура"],
  },
  {
    id: 2,
    name: "Электрогитара 39″ Gradient",
    shortName: "Gradient 39″",
    category: "Электрогитары",
    image: "/products/02_39_gradient_electric.png",
    quantity: 6,
    variants: 4,
    sku: "EG-GR39",
    badge: "Выбор магазина",
    description:
      "Полноразмерная электрогитара с эффектной металлической градиентной отделкой и универсальной схемой звукоснимателей.",
    features: ["Размер 39 дюймов", "Конфигурация HSS", "Градиентная отделка", "4 варианта цвета"],
  },
  {
    id: 3,
    name: "Укулеле KLH-23",
    shortName: "KLH-23",
    category: "Укулеле",
    image: "/products/03_23_ukulele.png",
    quantity: 10,
    variants: 5,
    sku: "UK-KLH23",
    badge: "Комплект",
    description:
      "Яркая укулеле концертного формата в комплекте с чехлом и полезными аксессуарами для начала занятий.",
    features: ["Размер 23 дюйма", "Чехол в комплекте", "Каподастр и ремень", "5 цветов"],
  },
  {
    id: 4,
    name: "Акустическая гитара 41″",
    shortName: "Acoustic 41″",
    category: "Акустические",
    image: "/products/04_41_acoustic.png",
    quantity: 6,
    variants: 5,
    sku: "AG-AC41",
    description:
      "Полноразмерная акустическая гитара с вырезом корпуса. Подходит для аккомпанемента, обучения и домашней игры.",
    features: ["Размер 41 дюйм", "Корпус с вырезом", "Стальные струны", "Глянцевая отделка"],
  },
  {
    id: 5,
    name: "Классическая гитара 38/39″",
    shortName: "Classic 38/39″",
    category: "Классические",
    image: "/products/05_classical_38_39.png",
    quantity: 6,
    variants: 4,
    sku: "CG-CL39",
    badge: "Мягкие струны",
    description:
      "Классическая гитара с нейлоновыми струнами и удобным грифом — спокойный старт для начинающего музыканта.",
    features: ["Размер 38 или 39 дюймов", "Нейлоновые струны", "Классический корпус", "4 варианта"],
  },
  {
    id: 6,
    name: "Акустическая гитара Tiger 40″",
    shortName: "Tiger 40″",
    category: "Акустические",
    image: "/products/06_40_tiger_acoustic.png",
    quantity: 8,
    variants: 5,
    sku: "AG-TG40",
    badge: "Яркий дизайн",
    description:
      "Акустическая гитара с вырезом и выразительным рисунком Tiger. Заметный инструмент для сцены и занятий.",
    features: ["Размер 40 дюймов", "Корпус с вырезом", "Рисунок Tiger", "5 цветов"],
  },
  {
    id: 7,
    name: "Акустическая гитара 38″",
    shortName: "Acoustic 38″",
    category: "Акустические",
    image: "/products/07_38_acoustic.png",
    quantity: 6,
    variants: 3,
    sku: "AG-AC38",
    description:
      "Компактная акустическая гитара с вырезом. Удобна для подростков, поездок и первых занятий.",
    features: ["Размер 38 дюймов", "Корпус с вырезом", "Стальные струны", "3 цвета"],
  },
  {
    id: 8,
    name: "Электрогитара ST-10 SSS",
    shortName: "ST-10 SSS",
    category: "Электрогитары",
    image: "/products/08_st10_sss.png",
    quantity: 1,
    variants: 1,
    sku: "EG-ST10-BK",
    description:
      "Черная электрогитара классической формы ST с тремя сингловыми звукоснимателями.",
    features: ["Конфигурация SSS", "Черный цвет", "Классическая форма ST", "1 экземпляр"],
  },
  {
    id: 9,
    name: "Струны для акустической гитары",
    shortName: "Folk Strings",
    category: "Струны",
    image: "/products/09_folk_strings.png",
    quantity: 10,
    variants: 2,
    sku: "ST-FOLK",
    description:
      "Комплекты струн для акустических и фолк-гитар. Два варианта исполнения для замены и обслуживания инструмента.",
    features: ["Для акустической гитары", "2 варианта", "Комплект из 6 струн", "Индивидуальная упаковка"],
  },
  {
    id: 10,
    name: "Каподастр для гитары",
    shortName: "Capo",
    category: "Аксессуары",
    image: "/products/10_capos.png",
    quantity: 5,
    variants: 3,
    sku: "AC-CAPO",
    description:
      "Пружинный каподастр из металлического сплава. Быстро меняет тональность без перенастройки гитары.",
    features: ["Металлический корпус", "Мягкие накладки", "3 цвета", "Для акустики и электрогитары"],
  },
  {
    id: 11,
    name: "Ремень для гитары 41″",
    shortName: "Guitar Strap",
    category: "Аксессуары",
    image: "/products/11_guitar_straps.png",
    quantity: 6,
    variants: 5,
    sku: "AC-STRAP",
    description:
      "Регулируемый гитарный ремень с ярким рисунком и надежными кожаными окончаниями.",
    features: ["Регулируемая длина", "5 дизайнов", "Усиленные окончания", "Для гитары и баса"],
  },
  {
    id: 12,
    name: "Струны в индивидуальной упаковке",
    shortName: "Packaged Strings",
    category: "Струны",
    image: "/products/12_packaged_strings.png",
    quantity: 6,
    variants: 5,
    sku: "ST-PACK",
    description:
      "Наборы струн разных калибров для электрогитары и бас-гитары в защитной фабричной упаковке.",
    features: ["5 вариантов", "Разные калибры", "Защитная упаковка", "Для электрогитары и баса"],
  },
  {
    id: 13,
    name: "Процессор эффектов M-VAVE Cube Baby",
    shortName: "Cube Baby",
    category: "Звук и эффекты",
    image: "/products/13_cube_baby.png",
    quantity: 3,
    variants: 3,
    sku: "FX-CUBEBABY",
    badge: "Многофункциональный",
    description:
      "Компактный процессор эффектов с моделированием усилителей, импульсами кабинетов, Bluetooth и записью на телефон.",
    features: ["9 моделей усилителей", "8 импульсов кабинетов", "Bluetooth", "Встроенный аккумулятор"],
  },
  {
    id: 14,
    name: "Гитарный комбоусилитель GA-20",
    shortName: "GA-20",
    category: "Усилители",
    image: "/products/14_ga20.png",
    quantity: 5,
    variants: 5,
    sku: "AM-GA20",
    badge: "Для практики",
    description:
      "Компактный комбоусилитель для занятий с регулировкой тембра, перегрузом, входом MP3 и выходом на наушники.",
    features: ["Модель GA-20", "Канал Drive", "3-полосный тембр", "Выход на наушники"],
  },
];

const categories = [
  "Все",
  "Электрогитары",
  "Акустические",
  "Классические",
  "Укулеле",
  "Аксессуары",
  "Звук и эффекты",
];

const variantsByProduct: Record<number, Variant[]> = {
  1: [
    { name: "Черная", stock: 2, color: "#161616", sku: "EG-ST20-BLK", image: "/product-variants/eg-st20-blk.jpg" },
    { name: "Красная", stock: 1, color: "#c92e29", sku: "EG-ST20-RED", image: "/product-variants/eg-st20-red.jpg" },
    { name: "Санбёрст", stock: 1, color: "#e47a24", secondary: "#291811", sku: "EG-ST20-SNB", image: "/product-variants/eg-st20-snb.jpg" },
    { name: "Белая", stock: 1, color: "#f4f2e9", sku: "EG-ST20-WHT", image: "/product-variants/eg-st20-wht.jpg" },
    { name: "Синяя", stock: 1, color: "#246bb3", sku: "EG-ST20-BLU", image: "/product-variants/eg-st20-blu.jpg" },
    { name: "Черно-белая", stock: 1, color: "#f5f4ef", secondary: "#171717", sku: "EG-ST20-BW", image: "/product-variants/eg-st20-bw.jpg" },
  ],
  2: [
    { name: "Серебристо-фиолетовый градиент", stock: 1, color: "#bbb7c1", secondary: "#493665", sku: "EG-39GR-PUR", image: "/product-variants/eg-39gr-pur.jpg" },
    { name: "Серебристо-черный металлик", stock: 2, color: "#c8c9c7", secondary: "#222222", sku: "EG-39GR-BLK", image: "/product-variants/eg-39gr-blk.jpg" },
    { name: "Серо-серебристый градиент", stock: 1, color: "#6d6d70", secondary: "#d3d2ce", sku: "EG-39GR-GRY", image: "/product-variants/eg-39gr-gry.jpg" },
    { name: "Сине-черный градиент", stock: 2, color: "#2377a8", secondary: "#101820", sku: "EG-39GR-BLU", image: "/product-variants/eg-39gr-blu.jpg" },
  ],
  3: [
    { name: "Черная", stock: 4, color: "#171717", sku: "UK-KLH23-BLK", image: "/product-variants/uk-klh23-blk.jpg" },
    { name: "Розовая", stock: 2, color: "#e8a7bd", sku: "UK-KLH23-PNK", image: "/product-variants/uk-klh23-pnk.jpg" },
    { name: "Белая", stock: 2, color: "#f5f3eb", sku: "UK-KLH23-WHT", image: "/product-variants/uk-klh23-wht.jpg" },
    { name: "Голубая", stock: 1, color: "#9fd4e5", sku: "UK-KLH23-LBL", image: "/product-variants/uk-klh23-lbl.jpg" },
    { name: "Желтая", stock: 1, color: "#e8d66b", sku: "UK-KLH23-YEL", image: "/product-variants/uk-klh23-yel.jpg" },
  ],
  4: [
    { name: "Черная", stock: 2, color: "#171717", sku: "AG-41GL-BLK", image: "/product-variants/ag-41gl-blk.jpg" },
    { name: "Натуральное дерево", stock: 1, color: "#d4aa68", sku: "AG-41GL-NAT", image: "/product-variants/ag-41gl-nat.jpg" },
    { name: "Санбёрст", stock: 1, color: "#ec7921", secondary: "#211712", sku: "AG-41GL-SNB", image: "/product-variants/ag-41gl-snb.jpg" },
    { name: "Кофейная", stock: 1, color: "#8c5637", sku: "AG-41GL-CFE", image: "/product-variants/ag-41gl-cfe.jpg" },
    { name: "Синяя", stock: 1, color: "#236c90", secondary: "#17202a", sku: "AG-41GL-BLU", image: "/product-variants/ag-41gl-blu.jpg" },
  ],
  5: [
    { name: "Черная · 38″", stock: 1, color: "#171717", sku: "CG-38-BLK", image: "/product-variants/cg-38-blk.jpg" },
    { name: "Черная · 39″", stock: 3, color: "#171717", sku: "CG-39-BLK", image: "/product-variants/cg-39-blk.jpg" },
    { name: "Натуральная · 39″", stock: 1, color: "#d8b572", sku: "CG-39-NAT", image: "/product-variants/cg-39-nat.jpg" },
    { name: "Оранжевая · 39″", stock: 1, color: "#e0a23e", sku: "CG-39-ORG", image: "/product-variants/cg-39-org.jpg" },
  ],
  6: [
    { name: "Зеленая", stock: 1, color: "#18835e", secondary: "#151515", sku: "AG-40TG-GRN", image: "/product-variants/ag-40tg-grn.jpg" },
    { name: "Синяя", stock: 1, color: "#244c9a", secondary: "#10151d", sku: "AG-40TG-BLU", image: "/product-variants/ag-40tg-blu.jpg" },
    { name: "Фиолетовая", stock: 2, color: "#583a78", secondary: "#161318", sku: "AG-40TG-PUR", image: "/product-variants/ag-40tg-pur.jpg" },
    { name: "Красная", stock: 2, color: "#a31e28", secondary: "#171313", sku: "AG-40TG-RED", image: "/product-variants/ag-40tg-red.jpg" },
    { name: "Тигровый санбёрст", stock: 2, color: "#e07a26", secondary: "#21150f", sku: "AG-40TG-ORG", image: "/product-variants/ag-40tg-org.jpg" },
  ],
  7: [
    { name: "Черная", stock: 4, color: "#171717", sku: "AG-38VN-BLK", image: "/product-variants/ag-38vn-blk.jpg" },
    { name: "Натуральная", stock: 1, color: "#d8b577", sku: "AG-38VN-NAT", image: "/product-variants/ag-38vn-nat.jpg" },
    { name: "Санбёрст", stock: 1, color: "#e87623", secondary: "#381b13", sku: "AG-38VN-SNB", image: "/product-variants/ag-38vn-snb.jpg" },
  ],
  8: [
    { name: "Черная · 3 сингла", stock: 1, color: "#171717", sku: "EG-ST10-SSS-BLK", image: "/product-variants/eg-st10-sss-blk.jpg", note: "Конфигурация SSS" },
  ],
  9: [
    { name: "Цветная оплетка", stock: 5, color: "#c3564f", secondary: "#2f7693", sku: "STR-FOLK-COLOR", image: "/product-variants/str-folk-color.jpg" },
    { name: "Латунные", stock: 5, color: "#c7a653", sku: "STR-FOLK-BRASS", image: "/product-variants/str-folk-brass.jpg" },
  ],
  10: [
    { name: "Золотой", stock: 2, color: "#c7a053", sku: "CAPO-ALLOY-GOLD", image: "/product-variants/capo-alloy-gold.jpg" },
    { name: "Бронзовый", stock: 2, color: "#756f68", sku: "CAPO-ALLOY-BRZ", image: "/product-variants/capo-alloy-brz.jpg" },
    { name: "Розовое золото", stock: 1, color: "#c9877e", sku: "CAPO-ALLOY-RGD", image: "/product-variants/capo-alloy-rgd.jpg" },
  ],
  11: [
    { name: "Синяя молния", stock: 1, color: "#17479d", secondary: "#171717", sku: "STRAP-LIGHTNING", image: "/product-variants/strap-lightning.jpg" },
    { name: "Цветочный", stock: 1, color: "#9c526d", secondary: "#2b2526", sku: "STRAP-FLORAL", image: "/product-variants/strap-floral.jpg" },
    { name: "Черно-белая клетка", stock: 1, color: "#f2f2ef", secondary: "#171717", sku: "STRAP-CHECK", image: "/product-variants/strap-check.jpg" },
    { name: "Английский алфавит", stock: 2, color: "#d19a24", secondary: "#171717", sku: "STRAP-ALPHABET", image: "/product-variants/strap-alphabet.jpg" },
    { name: "Британский флаг", stock: 1, color: "#274d91", secondary: "#b92c32", sku: "STRAP-UK", image: "/product-variants/strap-uk.jpg" },
  ],
  12: [
    { name: "14777 · бас", stock: 1, color: "#3f765c", sku: "STR-PKG-BASS-14777", image: "/product-variants/str-pkg-bass-14777.jpg" },
    { name: "11002 · 010", stock: 2, color: "#6b3769", sku: "STR-PKG-11002-010", image: "/product-variants/str-pkg-11002-010.jpg" },
    { name: "11025 · 011", stock: 1, color: "#56366c", sku: "STR-PKG-11025-011", image: "/product-variants/str-pkg-11025-011.jpg" },
    { name: "16052 · 012", stock: 1, color: "#724168", sku: "STR-PKG-16052-012", image: "/product-variants/str-pkg-16052-012.jpg" },
    { name: "12002 · 009", stock: 1, color: "#28476e", sku: "STR-PKG-12002-09", image: "/product-variants/str-pkg-12002-09.jpg" },
  ],
  13: [
    { name: "Черный · Guitar", stock: 1, color: "#171717", sku: "FX-CB-GTR-BLK", image: "/product-variants/fx-cb-gtr-blk.jpg" },
    { name: "Золотой · Acoustic", stock: 1, color: "#d99b4f", sku: "FX-CB-AC-GLD", image: "/product-variants/fx-cb-ac-gld.jpg" },
    { name: "Синий · Bass", stock: 1, color: "#285a91", sku: "FX-CB-BASS-BLU", image: "/product-variants/fx-cb-bass-blu.jpg" },
  ],
  14: [
    { name: "Черный", stock: 1, color: "#171717", sku: "AMP-GA20-BLK", image: "/product-variants/amp-ga20-blk.jpg" },
    { name: "Серый", stock: 1, color: "#666a6c", sku: "AMP-GA20-PAT", image: "/product-variants/amp-ga20-pat.jpg" },
    { name: "Оранжевый", stock: 1, color: "#e56d24", sku: "AMP-GA20-ORG", image: "/product-variants/amp-ga20-org.jpg" },
    { name: "Фиолетовый", stock: 1, color: "#875194", sku: "AMP-GA20-PUR", image: "/product-variants/amp-ga20-pur.jpg" },
    { name: "Синий", stock: 1, color: "#285a91", sku: "AMP-GA20-BLU", image: "/product-variants/amp-ga20-blu.jpg" },
  ],
};

const instrumentChoices = [
  { title: "Электрогитары", caption: "От первых риффов до сцены", image: "/products/02_39_gradient_electric.png" },
  { title: "Акустические", caption: "Для песен и аккомпанемента", image: "/products/06_40_tiger_acoustic.png" },
  { title: "Классические", caption: "Мягкие струны для обучения", image: "/products/05_classical_38_39.png" },
  { title: "Укулеле", caption: "Компактный и легкий старт", image: "/products/03_23_ukulele.png" },
];

const money = (value: number) =>
  new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));

export default function Home() {
  const [mode, setMode] = useState<"buyer" | "purchaser">("buyer");
  const [category, setCategory] = useState("Все");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [requestedQuantity, setRequestedQuantity] = useState(1);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerComment, setCustomerComment] = useState("");

  const [currency, setCurrency] = useState<"CNY" | "USD" | "KZT">("CNY");
  const [purchase, setPurchase] = useState(220);
  const [cnyRate, setCnyRate] = useState(70);
  const [usdRate, setUsdRate] = useState(540);
  const [delivery, setDelivery] = useState(1200);
  const [cargo, setCargo] = useState(2800);
  const [other, setOther] = useState(300);
  const [markup, setMarkup] = useState(35);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "Все" || product.category === category;
      const matchesSearch =
        !normalized ||
        product.name.toLowerCase().includes(normalized) ||
        product.sku.toLowerCase().includes(normalized);
      return matchesCategory && matchesSearch;
    });
  }, [category, query]);

  const rate = currency === "CNY" ? cnyRate : currency === "USD" ? usdRate : 1;
  const purchaseKzt = purchase * rate;
  const landedCost = purchaseKzt + delivery + cargo + other;
  const retail = landedCost * (1 + markup / 100);
  const profit = retail - landedCost;
  const margin = retail ? (profit / retail) * 100 : 0;
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const selectedImage = selectedVariant?.image ?? selected?.image ?? "";

  const openProduct = (product: Product) => {
    setSelected(product);
    setSelectedVariant(variantsByProduct[product.id][0]);
    setRequestedQuantity(1);
  };

  const chooseCategory = (item: string) => {
    setCategory(item);
    window.setTimeout(() => {
      document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  };

  const addToCart = (product: Product) => {
    const variant = selectedVariant ?? variantsByProduct[product.id][0];
    const key = `${product.id}:${variant.name}`;
    setCartItems((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) {
        return current.map((item) =>
          item.key === key
            ? { ...item, quantity: Math.min(item.maxQuantity, item.quantity + requestedQuantity) }
            : item,
        );
      }
      return [
        ...current,
        {
          key,
          productId: product.id,
          name: product.name,
          variantName: variant.name,
          sku: variant.sku,
          image: variant.image,
          quantity: requestedQuantity,
          maxQuantity: variant.stock,
        },
      ];
    });
    setNotice(
      `${product.shortName} · ${variant.name} — ${requestedQuantity} шт. добавлено`,
    );
    setCartOpen(true);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const updateCartQuantity = (key: string, delta: number) => {
    setCartItems((current) =>
      current
        .map((item) =>
          item.key === key
            ? { ...item, quantity: Math.min(item.maxQuantity, Math.max(1, item.quantity + delta)) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeCartItem = (key: string) => {
    setCartItems((current) => current.filter((item) => item.key !== key));
  };

  const submitOrder = () => {
    if (!cartItems.length) {
      setNotice("Сначала добавьте товар в заявку");
      window.setTimeout(() => setNotice(""), 2400);
      return;
    }
    if (!customerPhone.trim()) {
      setNotice("Оставьте телефон или WhatsApp для связи");
      window.setTimeout(() => setNotice(""), 2400);
      return;
    }
    setNotice("Заявка собрана. Следующий шаг — подключить отправку в CRM или WhatsApp");
    setCartOpen(false);
    window.setTimeout(() => setNotice(""), 3600);
  };

  return (
    <main className="site-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setMode("buyer")} aria-label="На главную">
          <span className="brand-mark">M</span>
          <span>
            <strong>MAESTRO</strong>
            <small>music store</small>
          </span>
        </button>

        <nav className="main-nav" aria-label="Основная навигация">
          <a href="#catalog">Каталог</a>
          <a href="#new">Новинки</a>
          <a href="#delivery">Доставка</a>
        </nav>

        <div className="mode-switch" aria-label="Выбор режима">
          <button
            className={mode === "buyer" ? "active" : ""}
            onClick={() => setMode("buyer")}
          >
            Покупатель
          </button>
          <button
            className={mode === "purchaser" ? "active" : ""}
            onClick={() => setMode("purchaser")}
          >
            Закупщик
          </button>
        </div>

        {mode === "buyer" ? (
          <button className="cart-button" aria-label="Корзина" onClick={() => setCartOpen(true)}>
            Корзина <span>{cartCount}</span>
          </button>
        ) : (
          <span className="secure-label">● Внутренний режим</span>
        )}
      </header>

      {mode === "buyer" ? (
        <>
          <section className="hero" id="new">
            <div className="hero-copy">
              <p className="eyebrow">Музыка начинается здесь</p>
              <h1>Инструмент, который хочется взять в руки</h1>
              <p className="hero-text">
                Гитары, укулеле и оборудование для первых аккордов,
                ежедневной практики и собственного звучания.
              </p>
              <div className="hero-actions">
                <a className="primary-button" href="#catalog">
                  Смотреть каталог
                </a>
                <button className="text-button" onClick={() => openProduct(products[0])}>
                  Помочь с выбором →
                </button>
              </div>
              <div className="hero-notes">
                <span>✓ Проверка перед продажей</span>
                <span>✓ Доставка по Казахстану</span>
              </div>
            </div>
            <div className="hero-visual">
              <span className="hero-number">01</span>
              <div className="hero-halo" />
              <Image
                src="/products/02_39_gradient_electric.png"
                alt="Электрогитара Gradient 39 дюймов"
                fill
                unoptimized
                priority
                sizes="(max-width: 900px) 90vw, 48vw"
              />
              <div className="floating-card">
                <span>Новая поставка</span>
                <strong>Gradient 39″</strong>
                <small>6 инструментов в наличии</small>
              </div>
            </div>
          </section>

          <section className="trust-strip">
            <div>
              <strong>14</strong>
              <span>товарных карточек</span>
            </div>
            <div>
              <strong>56</strong>
              <span>вариантов</span>
            </div>
            <div>
              <strong>85</strong>
              <span>единиц в поставке</span>
            </div>
            <div>
              <strong>3</strong>
              <span>валюты расчета</span>
            </div>
          </section>

          <section className="store-flow" aria-label="Как оформить заказ">
            <article><span>01</span><strong>Выберите модель</strong><p>Откройте карточку, посмотрите цвета и остатки.</p></article>
            <article><span>02</span><strong>Добавьте в заявку</strong><p>Можно собрать несколько инструментов и аксессуаров.</p></article>
            <article><span>03</span><strong>Оставьте контакты</strong><p>Менеджер подтвердит цену, наличие и доставку.</p></article>
          </section>

          <section className="instrument-picker">
            <div className="picker-heading">
              <p className="eyebrow">С чего начнем?</p>
              <h2>Выберите инструмент</h2>
              <p>Сначала тип — затем модель, цвет и количество.</p>
            </div>
            <div className="instrument-grid">
              {instrumentChoices.map((item) => (
                <button key={item.title} className="instrument-tile" onClick={() => chooseCategory(item.title)}>
                  <Image src={item.image} alt="" fill unoptimized sizes="(max-width: 700px) 90vw, 25vw" />
                  <span className="tile-shade" />
                  <span className="tile-copy">
                    <small>{item.caption}</small>
                    <strong>{item.title}</strong>
                    <span>Выбрать →</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="catalog-section" id="catalog">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Каталог</p>
                <h2>Найдите свое звучание</h2>
              </div>
              <label className="search-box">
                <span>⌕</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Название или артикул"
                />
              </label>
            </div>

            <div className="category-row">
              {categories.map((item) => (
                <button
                  key={item}
                  className={category === item ? "active" : ""}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="product-grid">
              {filteredProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <button className="product-image" onClick={() => openProduct(product)}>
                    {product.badge && <span className="product-badge">{product.badge}</span>}
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      unoptimized
                      sizes="(max-width: 700px) 92vw, (max-width: 1100px) 45vw, 25vw"
                    />
                  </button>
                  <div className="product-info">
                    <p>{product.category}</p>
                    <h3>{product.name}</h3>
                    <div className="availability">
                      <span className="stock-dot" />
                      В наличии: {product.quantity} шт.
                    </div>
                    <div className="card-variants" aria-label={`Варианты ${product.name}`}>
                      <span>{variantsByProduct[product.id].length} вариантов</span>
                      <span className="mini-swatches">
                        {variantsByProduct[product.id].slice(0, 5).map((variant) => (
                          <i
                            key={variant.name}
                            title={variant.name}
                            style={{
                              background: variant.secondary
                                ? `linear-gradient(135deg, ${variant.color} 0 50%, ${variant.secondary} 50%)`
                                : variant.color,
                            }}
                          />
                        ))}
                      </span>
                    </div>
                    <div className="product-footer">
                      <span className="price-placeholder">Цена уточняется</span>
                      <button onClick={() => openProduct(product)} aria-label={`Открыть ${product.name}`}>
                        ↗
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="empty-state">По этому запросу пока ничего не найдено.</div>
            )}
          </section>

          <section className="delivery-section" id="delivery">
            <div>
              <p className="eyebrow">Сервис Maestro</p>
              <h2>Поможем выбрать первый инструмент</h2>
              <p>
                Расскажите, для кого нужен инструмент и какую музыку хочется играть.
                Мы подберем размер, тип струн и подходящий комплект.
              </p>
              <button className="primary-button" onClick={() => setNotice("Заявка на консультацию создана")}>
                Получить консультацию
              </button>
            </div>
            <div className="service-list">
              <div><span>01</span><strong>Подбор</strong><p>По росту, возрасту и музыкальным целям</p></div>
              <div><span>02</span><strong>Проверка</strong><p>Осмотр и базовая настройка перед выдачей</p></div>
              <div><span>03</span><strong>Доставка</strong><p>Надежная упаковка и отправка по Казахстану</p></div>
            </div>
          </section>

          <footer>
            <div className="brand footer-brand">
              <span className="brand-mark">M</span>
              <span><strong>MAESTRO</strong><small>music store</small></span>
            </div>
            <p>Музыкальные инструменты и оборудование</p>
            <span>Каталог формируется · 2026</span>
          </footer>
        </>
      ) : (
        <section className="purchaser-view">
          <div className="purchaser-heading">
            <div>
              <p className="eyebrow">Панель закупщика</p>
              <h1>Поставка и экономика товара</h1>
              <p>Закупочные данные видны только во внутреннем режиме.</p>
            </div>
            <button className="outline-button" onClick={() => setMode("buyer")}>
              Открыть витрину ↗
            </button>
          </div>

          <div className="kpi-grid">
            <article><span>Товарных карточек</span><strong>14</strong><small>Каталог собран</small></article>
            <article><span>Вариантов товара</span><strong>56</strong><small>По цветам и моделям</small></article>
            <article><span>Всего в поставке</span><strong>85</strong><small>Подтвержденных единиц</small></article>
            <article><span>Валюты</span><strong>3</strong><small>CNY · USD · KZT</small></article>
          </div>

          <div className="procurement-grid">
            <section className="calculator-card">
              <div className="card-heading">
                <div>
                  <p className="eyebrow">Внутренний калькулятор</p>
                  <h2>Себестоимость и маржа</h2>
                </div>
                <span className="demo-pill">Демо-расчет</span>
              </div>

              <div className="rate-row">
                <label>
                  Курс CNY → KZT
                  <input type="number" value={cnyRate} onChange={(e) => setCnyRate(+e.target.value)} />
                </label>
                <label>
                  Курс USD → KZT
                  <input type="number" value={usdRate} onChange={(e) => setUsdRate(+e.target.value)} />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Валюта закупки
                  <select value={currency} onChange={(e) => setCurrency(e.target.value as "CNY" | "USD" | "KZT")}>
                    <option value="CNY">Юань · CNY</option>
                    <option value="USD">Доллар · USD</option>
                    <option value="KZT">Тенге · KZT</option>
                  </select>
                </label>
                <label>
                  Цена закупки
                  <input type="number" value={purchase} onChange={(e) => setPurchase(+e.target.value)} />
                </label>
                <label>
                  Доставка по Китаю, ₸
                  <input type="number" value={delivery} onChange={(e) => setDelivery(+e.target.value)} />
                </label>
                <label>
                  Карго, ₸
                  <input type="number" value={cargo} onChange={(e) => setCargo(+e.target.value)} />
                </label>
                <label>
                  Прочие расходы, ₸
                  <input type="number" value={other} onChange={(e) => setOther(+e.target.value)} />
                </label>
                <label>
                  Наценка, %
                  <input type="number" value={markup} onChange={(e) => setMarkup(+e.target.value)} />
                </label>
              </div>

              <div className="calculation-summary">
                <div><span>Закупка в тенге</span><strong>{money(purchaseKzt)} ₸</strong></div>
                <div><span>Полная себестоимость</span><strong>{money(landedCost)} ₸</strong></div>
                <div className="accent-result"><span>Рекомендуемая цена</span><strong>{money(retail)} ₸</strong></div>
                <div><span>Прибыль с единицы</span><strong>{money(profit)} ₸</strong></div>
                <div><span>Маржинальность</span><strong>{margin.toFixed(1)}%</strong></div>
              </div>
              <p className="formula-note">
                Себестоимость = закупка по курсу + доставка + карго + прочие расходы.
                Расчет пока не сохраняется.
              </p>
            </section>

            <aside className="shipment-card">
              <p className="eyebrow">Текущая поставка</p>
              <h2>Готовность каталога</h2>
              <div className="progress-ring"><strong>85</strong><span>единиц</span></div>
              <ul>
                <li><span>Фотографии</span><strong>14 / 14</strong></li>
                <li><span>Количество</span><strong>85 шт.</strong></li>
                <li><span>Артикулы</span><strong>Черновые</strong></li>
                <li><span>Штрихкоды</span><strong>Ожидаются</strong></li>
                <li><span>Розничные цены</span><strong>Не заданы</strong></li>
              </ul>
              <button className="primary-button" onClick={() => setNotice("Следующий шаг: добавить штрихкоды")}>
                Продолжить заполнение
              </button>
            </aside>
          </div>

          <section className="inventory-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Склад</p>
                <h2>Товары в поставке</h2>
              </div>
              <label className="search-box small">
                <span>⌕</span>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск" />
              </label>
            </div>
            <div className="inventory-table">
              <div className="inventory-head">
                <span>Товар</span><span>Артикул</span><span>Варианты</span><span>Количество</span><span>Статус</span>
              </div>
              {filteredProducts.map((product) => (
                <button className="inventory-row" key={product.id} onClick={() => openProduct(product)}>
                  <span className="inventory-product">
                    <span className="inventory-thumb">
                      <Image src={product.image} alt="" fill unoptimized sizes="56px" />
                    </span>
                    <span><strong>{product.name}</strong><small>{product.category}</small></span>
                  </span>
                  <span>{product.sku}</span>
                  <span>{product.variants}</span>
                  <span><strong>{product.quantity} шт.</strong></span>
                  <span className="status-chip">Карточка готова</span>
                </button>
              ))}
            </div>
          </section>
        </section>
      )}

      {selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}>
          <article className="product-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)} aria-label="Закрыть">×</button>
            <div className="modal-image">
              <Image
                key={selectedImage}
                src={selectedImage}
                alt={`${selected.name} — ${selectedVariant?.name ?? "вариант"}`}
                fill
                unoptimized
                sizes="(max-width: 800px) 90vw, 48vw"
              />
            </div>
            <div className="modal-copy">
              <p className="eyebrow">{selected.category}</p>
              <h2>{selected.name}</h2>
              <p className="modal-description">{selected.description}</p>
              <ul>
                {selected.features.map((feature) => <li key={feature}>✓ {feature}</li>)}
              </ul>
              <div className="modal-meta">
                <span>Артикул <strong>{selectedVariant?.sku ?? selected.sku}</strong></span>
                <span>Всего в наличии <strong>{selected.quantity} шт.</strong></span>
              </div>
              {mode === "buyer" ? (
                <>
                  <div className="variant-selector">
                    <div className="selector-title">
                      <span>Выберите вариант</span>
                      <strong>{selectedVariant?.name}</strong>
                    </div>
                    <div className="variant-options">
                      {variantsByProduct[selected.id].map((variant) => (
                        <button
                          key={variant.name}
                          className={selectedVariant?.name === variant.name ? "active" : ""}
                          onClick={() => {
                            setSelectedVariant(variant);
                            setRequestedQuantity(1);
                          }}
                          title={variant.name}
                        >
                          <i
                            style={{
                              background: variant.secondary
                                ? `linear-gradient(135deg, ${variant.color} 0 50%, ${variant.secondary} 50%)`
                                : variant.color,
                            }}
                          />
                          <span>{variant.name}</span>
                          <small>{variant.stock} шт.</small>
                        </button>
                      ))}
                    </div>
                    {selectedVariant?.note && <p className="variant-note">{selectedVariant.note}</p>}
                  </div>

                  <div className="modal-action">
                    <div className="price-block"><small>Розничная цена</small><strong>Уточняется</strong></div>
                    <div className="quantity-picker" aria-label="Количество">
                      <button
                        onClick={() => setRequestedQuantity((value) => Math.max(1, value - 1))}
                        disabled={requestedQuantity <= 1}
                      >
                        −
                      </button>
                      <strong>{requestedQuantity}</strong>
                      <button
                        onClick={() =>
                          setRequestedQuantity((value) =>
                            Math.min(selectedVariant?.stock ?? 1, value + 1),
                          )
                        }
                        disabled={requestedQuantity >= (selectedVariant?.stock ?? 1)}
                      >
                        +
                      </button>
                    </div>
                    <button className="primary-button" onClick={() => addToCart(selected)}>Добавить в заявку</button>
                  </div>
                </>
              ) : (
                <div className="internal-note">
                  <strong>Внутренняя карточка</strong>
                  <span>Штрихкод и фактическая себестоимость будут добавлены после получения данных.</span>
                </div>
              )}
            </div>
          </article>
        </div>
      )}

      {cartOpen && (
        <div className="cart-drawer-backdrop" role="presentation" onMouseDown={() => setCartOpen(false)}>
          <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Корзина заявки" onMouseDown={(e) => e.stopPropagation()}>
            <div className="cart-head">
              <div>
                <p className="eyebrow">Заявка</p>
                <h2>Корзина магазина</h2>
              </div>
              <button onClick={() => setCartOpen(false)} aria-label="Закрыть корзину">×</button>
            </div>

            {cartItems.length ? (
              <div className="cart-lines">
                {cartItems.map((item) => (
                  <article className="cart-line" key={item.key}>
                    <span className="cart-thumb">
                      <Image src={item.image} alt="" fill unoptimized sizes="64px" />
                    </span>
                    <span className="cart-copy">
                      <strong>{item.name}</strong>
                      <small>{item.variantName} · {item.sku}</small>
                    </span>
                    <span className="cart-qty">
                      <button onClick={() => updateCartQuantity(item.key, -1)} disabled={item.quantity <= 1}>−</button>
                      <b>{item.quantity}</b>
                      <button onClick={() => updateCartQuantity(item.key, 1)} disabled={item.quantity >= item.maxQuantity}>+</button>
                    </span>
                    <button className="cart-remove" onClick={() => removeCartItem(item.key)} aria-label={`Удалить ${item.name}`}>×</button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="cart-empty">
                <strong>Корзина пока пустая</strong>
                <p>Добавьте инструмент или аксессуар из каталога.</p>
              </div>
            )}

            <div className="order-form">
              <label>
                Имя
                <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Как к вам обращаться" />
              </label>
              <label>
                Телефон / WhatsApp
                <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="+7 ..." />
              </label>
              <label>
                Город
                <input value={customerCity} onChange={(event) => setCustomerCity(event.target.value)} placeholder="Например, Актобе" />
              </label>
              <label>
                Комментарий
                <textarea value={customerComment} onChange={(event) => setCustomerComment(event.target.value)} placeholder="Для кого инструмент, нужна ли доставка или подбор" />
              </label>
            </div>

            <div className="cart-summary">
              <span>{cartCount} ед. в заявке</span>
              <strong>Цена подтверждается менеджером</strong>
              <button className="primary-button" onClick={submitOrder}>Отправить заявку</button>
            </div>
          </aside>
        </div>
      )}

      {notice && <div className="toast">{notice}</div>}
    </main>
  );
}
