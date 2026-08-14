"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { calculateProductPricing } from "../lib/product-pricing";

type AdminPricing = {
  purchaseCurrency: "CNY" | "USD" | "KZT";
  purchasePrice: number;
  currencyRate: number;
  chinaDeliveryKzt: number;
  cargoKzt: number;
  customsKzt: number;
  packagingKzt: number;
  setupKzt: number;
  marketingKzt: number;
  otherCostsKzt: number;
  taxPercent: number;
  bankInstallmentPercent: number;
  installmentMonths: number;
  sellerPercent: number;
  targetProfitPercent: number;
  pricingMode: "auto" | "manual";
  manualPriceKzt?: number | null;
};

type Product = {
  id: number | string;
  databaseId?: string;
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
  price?: number;
  publicationStatus?: "draft" | "review" | "published" | "hidden" | "out_of_stock" | "archived";
  isStored?: boolean;
  variantItems?: Variant[];
  adminPricing?: AdminPricing;
};

type Variant = {
  id?: string;
  name: string;
  stock: number;
  color: string;
  sku: string;
  image: string;
  secondary?: string;
  note?: string;
  barcode?: string;
  colorName?: string;
  size?: string;
  price?: number;
  adminPricing?: AdminPricing;
};

type CartItem = {
  key: string;
  productId: number | string;
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
  "Струны",
  "Усилители",
];

const variantsByProduct: Record<string, Variant[]> = {
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

const variantsFor = (product: Product) =>
  product.variantItems ?? variantsByProduct[String(product.id)] ?? [];

const mergeBySku = (base: Product[], stored: Product[]) => {
  const merged = new Map(base.map((product) => [product.sku, product]));
  stored.forEach((product) => merged.set(product.sku, product));
  return [...merged.values()];
};

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
  const [storedProducts, setStoredProducts] = useState<Product[]>([]);

  const [currency, setCurrency] = useState<"CNY" | "USD" | "KZT">("CNY");
  const [purchase, setPurchase] = useState(220);
  const [cnyRate, setCnyRate] = useState(70);
  const [usdRate, setUsdRate] = useState(540);
  const [delivery, setDelivery] = useState(1200);
  const [cargo, setCargo] = useState(2800);
  const [customs, setCustoms] = useState(0);
  const [other, setOther] = useState(300);
  const [packaging, setPackaging] = useState(700);
  const [setupCost, setSetupCost] = useState(2500);
  const [marketingCost, setMarketingCost] = useState(1200);
  const [taxPercent, setTaxPercent] = useState(3);
  const [bankPercent, setBankPercent] = useState(11);
  const [installmentMonths, setInstallmentMonths] = useState(12);
  const [sellerPercent, setSellerPercent] = useState(5);
  const [markup, setMarkup] = useState(35);
  const [manualPrice, setManualPrice] = useState(56000);
  const [manualPricing, setManualPricing] = useState(false);
  const [internalName, setInternalName] = useState("Электрогитара ST-20 Blue");
  const [internalSku, setInternalSku] = useState("EG-ST20-2026");
  const [internalCategory, setInternalCategory] = useState("Электрогитары");
  const [internalPhoto, setInternalPhoto] = useState("/product-variants/eg-st20-blu.jpg");
  const [internalDescription, setInternalDescription] = useState(
    "Электрогитара для начинающих: HSS-схема, чехол в подарок, 3 медиатора, базовая отстройка мастером.",
  );
  const [featuresText, setFeaturesText] = useState("HSS-схема, Чехол в подарок, 3 медиатора, Отстройка мастером");
  const [targetAudience, setTargetAudience] = useState("Для начинающих");
  const [variantName, setVariantName] = useState("Синяя");
  const [variantSku, setVariantSku] = useState("EG-ST20-2026-BLU");
  const [variantBarcode, setVariantBarcode] = useState("");
  const [variantColorName, setVariantColorName] = useState("Синий");
  const [variantColorHex, setVariantColorHex] = useState("#246bb3");
  const [variantSize, setVariantSize] = useState("38″");
  const [variantStock, setVariantStock] = useState(1);
  const [editingProductId, setEditingProductId] = useState<string | undefined>();
  const [editingVariantId, setEditingVariantId] = useState<string | undefined>();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/products?scope=all")
      .then(async (response) => {
        if (!response.ok) throw new Error("Не удалось загрузить сохранённые карточки");
        return response.json() as Promise<{ products: Product[] }>;
      })
      .then((data) => {
        if (!cancelled) setStoredProducts(data.products);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const buyerProducts = useMemo(
    () => mergeBySku(products, storedProducts.filter((product) => product.publicationStatus === "published")),
    [storedProducts],
  );
  const adminProducts = useMemo(
    () => mergeBySku(products, storedProducts),
    [storedProducts],
  );

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const source = mode === "buyer" ? buyerProducts : adminProducts;
    return source.filter((product) => {
      const matchesCategory = category === "Все" || product.category === category;
      const matchesSearch =
        !normalized ||
        product.name.toLowerCase().includes(normalized) ||
        product.sku.toLowerCase().includes(normalized);
      return matchesCategory && matchesSearch;
    });
  }, [adminProducts, buyerProducts, category, mode, query]);

  const rate = currency === "CNY" ? cnyRate : currency === "USD" ? usdRate : 1;
  const percentExpenses = taxPercent + bankPercent + sellerPercent;
  const pricingCalculation = useMemo(() => {
    const input = {
      purchasePrice: purchase,
      currencyRate: rate,
      chinaDeliveryKzt: delivery,
      cargoKzt: cargo,
      customsKzt: customs,
      packagingKzt: packaging,
      setupKzt: setupCost,
      marketingKzt: marketingCost,
      otherCostsKzt: other,
      taxPercent,
      bankInstallmentPercent: bankPercent,
      sellerPercent,
      targetProfitPercent: markup,
      pricingMode: manualPricing ? ("manual" as const) : ("auto" as const),
      manualPriceKzt: manualPrice,
    };
    try {
      return calculateProductPricing(input);
    } catch {
      return calculateProductPricing({
        ...input,
        taxPercent: 0,
        bankInstallmentPercent: 0,
        sellerPercent: 0,
      });
    }
  }, [bankPercent, cargo, customs, delivery, manualPrice, manualPricing, marketingCost, markup, other, packaging, purchase, rate, sellerPercent, setupCost, taxPercent]);
  const purchaseKzt = pricingCalculation.purchasePriceKzt;
  const fixedCost = pricingCalculation.fixedCostKzt;
  const recommendedPrice = pricingCalculation.recommendedPriceKzt;
  const retail = pricingCalculation.finalPriceKzt;
  const taxAmount = pricingCalculation.taxAmountKzt;
  const bankAmount = pricingCalculation.bankAmountKzt;
  const sellerAmount = pricingCalculation.sellerAmountKzt;
  const netRevenue = pricingCalculation.netRevenueKzt;
  const profit = pricingCalculation.profitKzt;
  const margin = pricingCalculation.marginPercent;
  const markupOnCost = pricingCalculation.markupOnCostPercent;
  const breakEvenPrice = pricingCalculation.breakEvenPriceKzt;
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const selectedImage = selectedVariant?.image ?? selected?.image ?? "";
  const editingProduct = storedProducts.find(
    (product) => product.databaseId === editingProductId,
  );

  const openProduct = (product: Product) => {
    const variants = variantsFor(product);
    setSelected(product);
    setSelectedVariant(variants[0] ?? null);
    setRequestedQuantity(1);
  };

  const chooseCategory = (item: string) => {
    setCategory(item);
    window.setTimeout(() => {
      document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  };

  const addToCart = (product: Product) => {
    const variant = selectedVariant ?? variantsFor(product)[0];
    if (!variant) {
      setNotice("Для товара пока не добавлен доступный вариант");
      window.setTimeout(() => setNotice(""), 2400);
      return;
    }
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

  const putPricingInForm = (pricing: AdminPricing, productPrice = 0) => {
    setCurrency(pricing.purchaseCurrency);
    setPurchase(pricing.purchasePrice);
    if (pricing.purchaseCurrency === "CNY") setCnyRate(pricing.currencyRate);
    if (pricing.purchaseCurrency === "USD") setUsdRate(pricing.currencyRate);
    setDelivery(pricing.chinaDeliveryKzt);
    setCargo(pricing.cargoKzt);
    setCustoms(pricing.customsKzt);
    setPackaging(pricing.packagingKzt);
    setSetupCost(pricing.setupKzt);
    setMarketingCost(pricing.marketingKzt);
    setOther(pricing.otherCostsKzt);
    setTaxPercent(pricing.taxPercent);
    setBankPercent(pricing.bankInstallmentPercent);
    setInstallmentMonths(pricing.installmentMonths);
    setSellerPercent(pricing.sellerPercent);
    setMarkup(pricing.targetProfitPercent);
    setManualPricing(pricing.pricingMode === "manual");
    setManualPrice(pricing.manualPriceKzt ?? productPrice);
  };

  const putVariantInForm = (variant: Variant, productPrice = 0) => {
    setEditingVariantId(variant.id);
    setVariantName(variant.name);
    setVariantSku(variant.sku);
    setVariantBarcode(variant.barcode ?? "");
    setVariantColorName(variant.colorName ?? "");
    setVariantColorHex(variant.color || "#8a8175");
    setVariantSize(variant.size ?? "");
    setVariantStock(variant.stock);
    setInternalPhoto(variant.image);
    if (variant.adminPricing) putPricingInForm(variant.adminPricing, productPrice);
  };

  const editStoredProduct = (product: Product) => {
    if (!product.isStored || !product.databaseId) {
      openProduct(product);
      return;
    }
    setEditingProductId(product.databaseId);
    setInternalName(product.name);
    setInternalSku(product.sku);
    setInternalCategory(product.category);
    setInternalPhoto(product.image);
    setInternalDescription(product.description);
    setFeaturesText(product.features.join(", "));
    setTargetAudience(product.badge ?? "");
    const firstVariant = variantsFor(product)[0];
    if (firstVariant) putVariantInForm(firstVariant, product.price ?? 0);
    const pricing = product.adminPricing;
    if (pricing && !firstVariant?.adminPricing) putPricingInForm(pricing, product.price ?? 0);
    setSaveState("idle");
    setSaveMessage(`Редактируется карточка ${product.sku}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prepareNewVariant = () => {
    setEditingVariantId(undefined);
    setVariantName("");
    setVariantSku(`${internalSku}-NEW`);
    setVariantBarcode("");
    setVariantColorName("");
    setVariantColorHex("#8a8175");
    setVariantSize("");
    setVariantStock(0);
    setSaveState("idle");
    setSaveMessage("Новый вариант будет добавлен к текущей карточке");
  };

  const saveProduct = async (publish: boolean) => {
    if (!internalName.trim() || !internalSku.trim() || !internalDescription.trim()) {
      setSaveState("error");
      setSaveMessage("Заполните название, SKU и описание товара.");
      return;
    }
    if (!variantName.trim() || !variantSku.trim()) {
      setSaveState("error");
      setSaveMessage("Заполните название и SKU варианта.");
      return;
    }
    if (percentExpenses >= 100) {
      setSaveState("error");
      setSaveMessage("Сумма налога, банка и продавца должна быть меньше 100%.");
      return;
    }

    setSaveState("saving");
    setSaveMessage(publish ? "Публикуем карточку…" : "Сохраняем черновик…");
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: editingProductId,
          variantId: editingVariantId,
          name: internalName,
          sku: internalSku,
          category: internalCategory,
          photoUrl: internalPhoto,
          description: internalDescription,
          features: featuresText
            .split(",")
            .map((feature) => feature.trim())
            .filter(Boolean),
          targetAudience,
          variant: {
            name: variantName,
            sku: variantSku,
            barcode: variantBarcode,
            colorName: variantColorName,
            colorHex: variantColorHex,
            size: variantSize,
            stockQuantity: variantStock,
          },
          pricing: {
            purchaseCurrency: currency,
            purchasePrice: purchase,
            currencyRate: rate,
            chinaDeliveryKzt: delivery,
            cargoKzt: cargo,
            customsKzt: customs,
            packagingKzt: packaging,
            setupKzt: setupCost,
            marketingKzt: marketingCost,
            otherCostsKzt: other,
            taxPercent,
            bankInstallmentPercent: bankPercent,
            installmentMonths,
            sellerPercent,
            targetProfitPercent: markup,
            pricingMode: manualPricing ? "manual" : "auto",
            manualPriceKzt: manualPricing ? manualPrice : null,
          },
          publish,
        }),
      });
      const data = (await response.json()) as { product?: Product; error?: string };
      if (!response.ok || !data.product) {
        throw new Error(data.error || "Карточка не сохранилась");
      }

      setStoredProducts((current) => {
        const withoutSaved = current.filter((product) => product.id !== data.product?.id);
        return [...withoutSaved, data.product as Product];
      });
      setEditingProductId(data.product.databaseId);
      const savedVariant = data.product.variantItems?.find(
        (variant) => variant.sku === variantSku.trim().toUpperCase(),
      );
      if (savedVariant) setEditingVariantId(savedVariant.id);
      setSaveState("saved");
      setSaveMessage(
        publish
          ? "Карточка опубликована и уже доступна на витрине."
          : "Черновик сохранён. Он пока не виден покупателям.",
      );
      setNotice(publish ? "Товар появился на витрине" : "Черновик сохранён");
      window.setTimeout(() => setNotice(""), 2800);
      if (publish) {
        setMode("buyer");
        setCategory("Все");
        window.setTimeout(
          () => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" }),
          80,
        );
      }
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "Карточка не сохранилась");
    }
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
              <strong>{buyerProducts.length}</strong>
              <span>товарных карточек</span>
            </div>
            <div>
              <strong>{buyerProducts.reduce((sum, product) => sum + variantsFor(product).length, 0)}</strong>
              <span>вариантов</span>
            </div>
            <div>
              <strong>{buyerProducts.reduce((sum, product) => sum + product.quantity, 0)}</strong>
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
                      <span>{variantsFor(product).length} вариантов</span>
                      <span className="mini-swatches">
                        {variantsFor(product).slice(0, 5).map((variant) => (
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
                      <span className="price-placeholder">
                        {product.price
                          ? `${variantsFor(product).length > 1 ? "от " : ""}${money(product.price)} ₸`
                          : "Цена уточняется"}
                      </span>
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
            <article><span>Товарных карточек</span><strong>{adminProducts.length}</strong><small>Вместе с черновиками</small></article>
            <article><span>Вариантов товара</span><strong>{adminProducts.reduce((sum, product) => sum + variantsFor(product).length, 0)}</strong><small>По цветам и моделям</small></article>
            <article><span>Всего в поставке</span><strong>{adminProducts.reduce((sum, product) => sum + product.quantity, 0)}</strong><small>Подтвержденных единиц</small></article>
            <article><span>Валюты</span><strong>3</strong><small>CNY · USD · KZT</small></article>
          </div>

          <div className="procurement-grid">
            <section className="calculator-card">
              <div className="card-heading">
                <div>
                  <p className="eyebrow">Экран заноса товара</p>
                  <h2>Цена продажи из полной себестоимости</h2>
                </div>
                <span className="demo-pill">{manualPricing ? "Ручная цена" : "Автоцена"}</span>
              </div>

              <div className="item-entry-grid">
                <label>
                  Название товара
                  <input value={internalName} onChange={(e) => setInternalName(e.target.value)} />
                </label>
                <label>
                  SKU карточки
                  <input value={internalSku} onChange={(e) => setInternalSku(e.target.value)} />
                </label>
                <label>
                  Категория
                  <select value={internalCategory} onChange={(e) => setInternalCategory(e.target.value)}>
                    {categories.filter((item) => item !== "Все").map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Фото товара
                  <select value={internalPhoto} onChange={(e) => setInternalPhoto(e.target.value)}>
                    <option value="/product-variants/eg-st20-blu.jpg">ST-20 · синяя</option>
                    <option value="/product-variants/eg-st20-red.jpg">ST-20 · красная</option>
                    <option value="/product-variants/ag-41gl-snb.jpg">Акустика 41″ · санбёрст</option>
                    <option value="/product-variants/uk-klh23-pnk.jpg">Укулеле · розовая</option>
                    <option value="/product-variants/fx-cb-ac-gld.jpg">Cube Baby · Acoustic</option>
                  </select>
                </label>
                <label className="wide-field">
                  Описание / офер
                  <textarea value={internalDescription} onChange={(e) => setInternalDescription(e.target.value)} />
                </label>
                <label className="wide-field">
                  Преимущества через запятую
                  <input value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} />
                </label>
                <label>
                  Метка для покупателя
                  <input value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="Для начинающих" />
                </label>
              </div>

              <div className="calc-group-title">
                <strong>Вариант и склад</strong>
                <span>Цвет, размер, штрихкод и фактический остаток конкретной позиции.</span>
              </div>

              {editingProduct && variantsFor(editingProduct).length > 0 && (
                <div className="variant-toolbar">
                  <label>
                    Редактируемый вариант
                    <select
                      value={editingVariantId ?? ""}
                      onChange={(event) => {
                        const variant = variantsFor(editingProduct).find(
                          (item) => item.id === event.target.value,
                        );
                        if (variant) putVariantInForm(variant, editingProduct.price ?? 0);
                      }}
                    >
                      {variantsFor(editingProduct).map((variant) => (
                        <option key={variant.id ?? variant.sku} value={variant.id}>
                          {variant.name} · {variant.sku}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className="outline-button" onClick={prepareNewVariant}>
                    Добавить вариант
                  </button>
                </div>
              )}

              <div className="form-grid variant-entry-grid">
                <label>
                  Название варианта
                  <input value={variantName} onChange={(e) => setVariantName(e.target.value)} placeholder="Синяя" />
                </label>
                <label>
                  SKU варианта
                  <input value={variantSku} onChange={(e) => setVariantSku(e.target.value)} />
                </label>
                <label>
                  Штрихкод
                  <input value={variantBarcode} onChange={(e) => setVariantBarcode(e.target.value)} placeholder="Можно добавить позже" />
                </label>
                <label>
                  Цвет
                  <input value={variantColorName} onChange={(e) => setVariantColorName(e.target.value)} placeholder="Синий" />
                </label>
                <label>
                  Образец цвета
                  <span className="color-input-wrap">
                    <input type="color" value={variantColorHex} onChange={(e) => setVariantColorHex(e.target.value)} aria-label="Цвет варианта" />
                    <input value={variantColorHex} onChange={(e) => setVariantColorHex(e.target.value)} />
                  </span>
                </label>
                <label>
                  Размер
                  <input value={variantSize} onChange={(e) => setVariantSize(e.target.value)} placeholder="38″" />
                </label>
                <label>
                  Остаток, шт.
                  <input type="number" min="0" value={variantStock} onChange={(e) => setVariantStock(Math.max(0, +e.target.value))} />
                </label>
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

              <div className="calc-group-title">
                <strong>Себестоимость на 1 единицу</strong>
                <span>Фиксированные расходы, которые уже должны быть покрыты ценой.</span>
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
                  Таможня / оформление, ₸
                  <input type="number" value={customs} onChange={(e) => setCustoms(+e.target.value)} />
                </label>
                <label>
                  Прочие расходы, ₸
                  <input type="number" value={other} onChange={(e) => setOther(+e.target.value)} />
                </label>
                <label>
                  Упаковка / выдача, ₸
                  <input type="number" value={packaging} onChange={(e) => setPackaging(+e.target.value)} />
                </label>
                <label>
                  Отстройка мастером, ₸
                  <input type="number" value={setupCost} onChange={(e) => setSetupCost(+e.target.value)} />
                </label>
                <label>
                  Реклама / карточка, ₸
                  <input type="number" value={marketingCost} onChange={(e) => setMarketingCost(+e.target.value)} />
                </label>
              </div>

              <div className="calc-group-title">
                <strong>Проценты от цены продажи</strong>
                <span>Налог, банк за рассрочку и продавец уменьшают выручку после продажи.</span>
              </div>

              <div className="form-grid compact">
                <label>
                  Налог, %
                  <input type="number" value={taxPercent} onChange={(e) => setTaxPercent(+e.target.value)} />
                </label>
                <label>
                  Банк / рассрочка, %
                  <input type="number" value={bankPercent} onChange={(e) => setBankPercent(+e.target.value)} />
                </label>
                <label>
                  Срок рассрочки, мес.
                  <input type="number" min="0" value={installmentMonths} onChange={(e) => setInstallmentMonths(Math.max(0, +e.target.value))} />
                </label>
                <label>
                  Продавец, %
                  <input type="number" value={sellerPercent} onChange={(e) => setSellerPercent(+e.target.value)} />
                </label>
                <label>
                  Желаемая прибыль от себестоимости, %
                  <input type="number" value={markup} onChange={(e) => setMarkup(+e.target.value)} />
                </label>
                <label>
                  Итоговая цена, ₸
                  <input
                    type="number"
                    value={Math.round(retail)}
                    onChange={(e) => {
                      setManualPricing(true);
                      setManualPrice(+e.target.value);
                    }}
                  />
                </label>
                <label className="toggle-label">
                  Режим цены
                  <button
                    type="button"
                    className={manualPricing ? "toggle-button active" : "toggle-button"}
                    onClick={() => {
                      setManualPricing((value) => !value);
                      setManualPrice(Math.round(recommendedPrice));
                    }}
                  >
                    {manualPricing ? "Ручная" : "Авто"}
                  </button>
                </label>
              </div>

              <div className="product-profit-card">
                <div className="profit-preview">
                  <span className="profit-image">
                    <Image src={internalPhoto} alt="" fill unoptimized sizes="140px" />
                  </span>
                  <div>
                    <small>{internalSku}</small>
                    <strong>{internalName}</strong>
                    <p>{internalDescription}</p>
                  </div>
                </div>
                <div className="price-hero">
                  <span>Цена продажи</span>
                  <strong>{money(retail)} ₸</strong>
                  <small>Авто-рекомендация: {money(recommendedPrice)} ₸</small>
                </div>
              </div>

              <div className="calculation-summary">
                <div><span>Закупка в тенге</span><strong>{money(purchaseKzt)} ₸</strong></div>
                <div><span>Фикс. себестоимость</span><strong>{money(fixedCost)} ₸</strong></div>
                <div><span>Точка безубыточности</span><strong>{money(breakEvenPrice)} ₸</strong></div>
                <div><span>Налог</span><strong>{money(taxAmount)} ₸</strong></div>
                <div><span>Банк / рассрочка</span><strong>{money(bankAmount)} ₸</strong></div>
                <div><span>Продавец</span><strong>{money(sellerAmount)} ₸</strong></div>
                <div><span>Чистая выручка</span><strong>{money(netRevenue)} ₸</strong></div>
                <div className="accent-result"><span>Прибыль с единицы</span><strong>{money(profit)} ₸</strong></div>
                <div><span>Маржа / прибыль к цене</span><strong>{margin.toFixed(1)}%</strong></div>
                <div><span>Наценка к себестоимости</span><strong>{markupOnCost.toFixed(1)}%</strong></div>
              </div>
              <p className="formula-note">
                Автоцена = (фиксированная себестоимость + желаемая прибыль) / (1 − налог − банк − продавец).
                Если изменить итоговую цену вручную, прибыль, маржа и фактическая наценка пересчитаются обратно.
              </p>
              <div className="save-actions">
                <div className={`save-feedback ${saveState}`} aria-live="polite">
                  <strong>{editingProductId ? "Карточка в базе" : "Новая карточка"}</strong>
                  <span>{saveMessage || "Можно сохранить черновик или сразу показать товар покупателям."}</span>
                </div>
                <button
                  type="button"
                  className="outline-button"
                  disabled={saveState === "saving"}
                  onClick={() => saveProduct(false)}
                >
                  Сохранить черновик
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={saveState === "saving"}
                  onClick={() => saveProduct(true)}
                >
                  Сохранить и показать на витрине
                </button>
              </div>
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
              <button
                className="primary-button"
                onClick={() => document.getElementById("inventory")?.scrollIntoView({ behavior: "smooth" })}
              >
                Перейти к товарам
              </button>
            </aside>
          </div>

          <section className="inventory-card" id="inventory">
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
                <button className="inventory-row" key={product.id} onClick={() => editStoredProduct(product)}>
                  <span className="inventory-product">
                    <span className="inventory-thumb">
                      <Image src={product.image} alt="" fill unoptimized sizes="56px" />
                    </span>
                    <span><strong>{product.name}</strong><small>{product.category}</small></span>
                  </span>
                  <span>{product.sku}</span>
                  <span>{product.variants}</span>
                  <span><strong>{product.quantity} шт.</strong></span>
                  <span className={`status-chip ${product.publicationStatus ?? "static"}`}>
                    {product.publicationStatus === "published"
                      ? "На витрине"
                      : product.publicationStatus === "draft"
                        ? "Черновик"
                        : "Карточка готова"}
                  </span>
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
                      {variantsFor(selected).map((variant) => (
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
                    <div className="price-block">
                      <small>Розничная цена</small>
                      <strong>
                        {selectedVariant?.price || selected.price
                          ? `${money(selectedVariant?.price ?? selected.price ?? 0)} ₸`
                          : "Уточняется"}
                      </strong>
                    </div>
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
