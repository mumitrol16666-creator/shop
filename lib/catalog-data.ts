export type AdminPricing = {
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
  discountPercent?: number;
  originalPriceKzt?: number;
  hasDiscount?: boolean;
};

export type Variant = {
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
  originalPrice?: number;
  discountPercent?: number;
  adminPricing?: AdminPricing;
};

export type Product = {
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
  attachedCourseId?: string;
  price?: number;
  originalPrice?: number;
  discountPercent?: number;
  isDiscountActive?: boolean;
  publicationStatus?: "draft" | "review" | "published" | "hidden" | "out_of_stock" | "archived";
  isStored?: boolean;
  variantItems?: Variant[];
  adminPricing?: AdminPricing;
};

export type CartItem = {
  key: string;
  productId: number | string;
  name: string;
  variantName: string;
  sku: string;
  image: string;
  price: number;
  quantity: number;
  maxQuantity: number;
  bundle?: "base" | "gift_course" | "pro_pack";
  giftCourseTitle?: string;
};

export const products: Product[] = [
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
    price: 42000,
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
    price: 49000,
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
    price: 18000,
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
    price: 36000,
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
    price: 34000,
    description:
      "Классическая гитара с нейлоновыми струнами. Идеальный выбор для музыкальной школы и комфортного старта.",
    features: ["Нейлоновые струны", "Размеры 38″ и 39″", "Широкий гриф", "4 расцветки"],
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
    badge: "Выбор магазина",
    price: 39000,
    description:
      "Эффектная акустическая гитара с выразительной текстурой верхней деки и сбалансированным громким звучанием.",
    features: ["Размер 40 дюймов", "Текстура Tiger Flame", "5 цветов", "Вырез корпуса"],
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
    price: 29000,
    description:
      "Компактная акустическая гитара для подростков, путешествий и комфортной ежедневной практики дома.",
    features: ["Размер 38 дюймов", "Легкий корпус", "3 цвета", "Удобный профиль грифа"],
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
    price: 39000,
    description:
      "Классический стратокастер в полностью черном исполнении с тремя сингловыми звукоснимателями для чистого и читаемого звука.",
    features: ["3 сингла (SSS)", "Черная глянцевая отделка", "Винтажное тремоло", "Кленовый гриф"],
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
    price: 3500,
    description:
      "Комплекты качественных металлических струн для акустических и фолк-гитар с ярким и звонким тембром.",
    features: ["Калибр 10-47 и 11-52", "Фосфорная бронза", "Антикоррозийное покрытие", "10 комплектов"],
  },
  {
    id: 10,
    name: "Каподастр для гитары",
    shortName: "Capo Metal",
    category: "Аксессуары",
    image: "/products/10_capos.png",
    quantity: 5,
    variants: 3,
    sku: "AC-CAPO",
    price: 2900,
    description:
      "Надежный металлический каподастр с мягкой силиконовой накладкой для быстрой смены тональности без расстройки.",
    features: ["Прочный сплав", "Силиконовая защита ладов", "Быстрый зажим", "3 цвета"],
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
    price: 3800,
    description:
      "Широкие текстильные ремни с яркими принтами и кожаными наконечниками для акустических и электрогитар.",
    features: ["Регулируемая длина", "Ширина 5 см", "Усиленные наконечники", "5 принтов"],
  },
  {
    id: 12,
    name: "Комплект струн в упаковке",
    shortName: "Packaged Strings",
    category: "Струны",
    image: "/products/12_packaged_strings.png",
    quantity: 6,
    variants: 5,
    sku: "ST-PKG",
    price: 4200,
    description:
      "Фирменные комплекты струн в индивидуальных герметичных упаковках для электро-, бас- и акустических гитар.",
    features: ["Разные калибры", "Герметичная упаковка", "Для гитары и баса", "5 вариантов"],
  },
  {
    id: 13,
    name: "Процессор M-VAVE Cube Baby",
    shortName: "Cube Baby",
    category: "Оборудование",
    image: "/products/13_cube_baby.png",
    quantity: 3,
    variants: 3,
    sku: "EQ-CBABY",
    badge: "Хит",
    price: 24000,
    description:
      "Компактный многофункциональный процессор эффектов со встроенным аккумулятором, IR-кабинетами и Bluetooth.",
    features: ["Встроенный аккумулятор", "Поддержка IR-импульсов", "Bluetooth-аудио", "Версии Guitar / AC / Bass"],
  },
  {
    id: 14,
    name: "Комбоусилитель GA-20",
    shortName: "Amp GA-20",
    category: "Оборудование",
    image: "/products/14_ga20.png",
    quantity: 5,
    variants: 5,
    sku: "EQ-GA20",
    price: 28000,
    description:
      "Домашний комбоусилитель мощностью 20 Вт с каналом перегруза, эквалайзером и выходом на наушники.",
    features: ["Мощность 20 Вт", "Встроенный Overdrive", "Выход на наушники", "5 расцветок корпуса"],
  },
];

export const variantsByProduct: Record<string, Variant[]> = {
  1: [
    { name: "Санбёрст", stock: 1, color: "#d97724", secondary: "#1e130c", sku: "EG-ST20-SNB", image: "/product-variants/eg-st20-snb.jpg", price: 42000 },
    { name: "Синий градиент", stock: 1, color: "#1f5f8b", secondary: "#0d151c", sku: "EG-ST20-BLU", image: "/product-variants/eg-st20-blu.jpg", price: 42000 },
    { name: "Красный металлик", stock: 1, color: "#a61c1c", secondary: "#1a0808", sku: "EG-ST20-RED", image: "/product-variants/eg-st20-red.jpg", price: 42000 },
    { name: "Белый глянец", stock: 1, color: "#f3f3f0", sku: "EG-ST20-WHT", image: "/product-variants/eg-st20-wht.jpg", price: 42000 },
    { name: "Черный глянец", stock: 1, color: "#171717", sku: "EG-ST20-BLK", image: "/product-variants/eg-st20-blk.jpg", price: 42000 },
    { name: "Черно-белая", stock: 2, color: "#171717", secondary: "#f3f3f0", sku: "EG-ST20-BW", image: "/product-variants/eg-st20-bw.jpg", price: 42000 },
  ],
  2: [
    { name: "Фиолетово-синий градиент", stock: 1, color: "#4c2882", secondary: "#13233a", sku: "EG-39GR-PUR", image: "/product-variants/eg-39gr-pur.jpg", price: 49000 },
    { name: "Серебристо-черный металлик", stock: 2, color: "#c8c9c7", secondary: "#222222", sku: "EG-39GR-BLK", image: "/product-variants/eg-39gr-blk.jpg", price: 49000 },
    { name: "Серо-серебристый градиент", stock: 1, color: "#6d6d70", secondary: "#d3d2ce", sku: "EG-39GR-GRY", image: "/product-variants/eg-39gr-gry.jpg", price: 49000 },
    { name: "Сине-черный градиент", stock: 2, color: "#2377a8", secondary: "#101820", sku: "EG-39GR-BLU", image: "/product-variants/eg-39gr-blu.jpg", price: 49000 },
  ],
  3: [
    { name: "Черная", stock: 4, color: "#171717", sku: "UK-KLH23-BLK", image: "/product-variants/uk-klh23-blk.jpg", price: 18000 },
    { name: "Розовая", stock: 2, color: "#e8a7bd", sku: "UK-KLH23-PNK", image: "/product-variants/uk-klh23-pnk.jpg", price: 18000 },
    { name: "Белая", stock: 2, color: "#f5f3eb", sku: "UK-KLH23-WHT", image: "/product-variants/uk-klh23-wht.jpg", price: 18000 },
    { name: "Голубая", stock: 1, color: "#9fd4e5", sku: "UK-KLH23-LBL", image: "/product-variants/uk-klh23-lbl.jpg", price: 18000 },
    { name: "Желтая", stock: 1, color: "#e8d66b", sku: "UK-KLH23-YEL", image: "/product-variants/uk-klh23-yel.jpg", price: 18000 },
  ],
  4: [
    { name: "Черная", stock: 2, color: "#171717", sku: "AG-41GL-BLK", image: "/product-variants/ag-41gl-blk.jpg", price: 36000 },
    { name: "Натуральное дерево", stock: 1, color: "#d4aa68", sku: "AG-41GL-NAT", image: "/product-variants/ag-41gl-nat.jpg", price: 36000 },
    { name: "Санбёрст", stock: 1, color: "#ec7921", secondary: "#211712", sku: "AG-41GL-SNB", image: "/product-variants/ag-41gl-snb.jpg", price: 36000 },
    { name: "Кофейная", stock: 1, color: "#8c5637", sku: "AG-41GL-CFE", image: "/product-variants/ag-41gl-cfe.jpg", price: 36000 },
    { name: "Синяя", stock: 1, color: "#236c90", secondary: "#17202a", sku: "AG-41GL-BLU", image: "/product-variants/ag-41gl-blu.jpg", price: 36000 },
  ],
  5: [
    { name: "Черная · 38″", stock: 1, color: "#171717", sku: "CG-38-BLK", image: "/product-variants/cg-38-blk.jpg", price: 34000 },
    { name: "Черная · 39″", stock: 3, color: "#171717", sku: "CG-39-BLK", image: "/product-variants/cg-39-blk.jpg", price: 34000 },
    { name: "Натуральная · 39″", stock: 1, color: "#d8b572", sku: "CG-39-NAT", image: "/product-variants/cg-39-nat.jpg", price: 34000 },
    { name: "Оранжевая · 39″", stock: 1, color: "#e0a23e", sku: "CG-39-ORG", image: "/product-variants/cg-39-org.jpg", price: 34000 },
  ],
  6: [
    { name: "Зеленая", stock: 1, color: "#18835e", secondary: "#151515", sku: "AG-40TG-GRN", image: "/product-variants/ag-40tg-grn.jpg", price: 39000 },
    { name: "Синяя", stock: 1, color: "#244c9a", secondary: "#10151d", sku: "AG-40TG-BLU", image: "/product-variants/ag-40tg-blu.jpg", price: 39000 },
    { name: "Фиолетовая", stock: 2, color: "#583a78", secondary: "#161318", sku: "AG-40TG-PUR", image: "/product-variants/ag-40tg-pur.jpg", price: 39000 },
    { name: "Красная", stock: 2, color: "#a31e28", secondary: "#171313", sku: "AG-40TG-RED", image: "/product-variants/ag-40tg-red.jpg", price: 39000 },
    { name: "Тигровый санбёрст", stock: 2, color: "#e07a26", secondary: "#21150f", sku: "AG-40TG-ORG", image: "/product-variants/ag-40tg-org.jpg", price: 39000 },
  ],
  7: [
    { name: "Черная", stock: 4, color: "#171717", sku: "AG-38VN-BLK", image: "/product-variants/ag-38vn-blk.jpg", price: 29000 },
    { name: "Натуральная", stock: 1, color: "#d8b577", sku: "AG-38VN-NAT", image: "/product-variants/ag-38vn-nat.jpg", price: 29000 },
    { name: "Санбёрст", stock: 1, color: "#e87623", secondary: "#381b13", sku: "AG-38VN-SNB", image: "/product-variants/ag-38vn-snb.jpg", price: 29000 },
  ],
  8: [
    { name: "Черная · 3 сингла", stock: 1, color: "#171717", sku: "EG-ST10-SSS-BLK", image: "/product-variants/eg-st10-sss-blk.jpg", note: "Конфигурация SSS", price: 39000 },
  ],
  9: [
    { name: "Цветная оплетка", stock: 5, color: "#c3564f", secondary: "#2f7693", sku: "STR-FOLK-COLOR", image: "/product-variants/str-folk-color.jpg", price: 3500 },
    { name: "Латунные", stock: 5, color: "#c7a653", sku: "STR-FOLK-BRASS", image: "/product-variants/str-folk-brass.jpg", price: 3500 },
  ],
  10: [
    { name: "Золотой", stock: 2, color: "#c7a053", sku: "CAPO-ALLOY-GOLD", image: "/product-variants/capo-alloy-gold.jpg", price: 2900 },
    { name: "Бронзовый", stock: 2, color: "#756f68", sku: "CAPO-ALLOY-BRZ", image: "/product-variants/capo-alloy-brz.jpg", price: 2900 },
    { name: "Розовое золото", stock: 1, color: "#c9877e", sku: "CAPO-ALLOY-RGD", image: "/product-variants/capo-alloy-rgd.jpg", price: 2900 },
  ],
  11: [
    { name: "Синяя молния", stock: 1, color: "#17479d", secondary: "#171717", sku: "STRAP-LIGHTNING", image: "/product-variants/strap-lightning.jpg", price: 3800 },
    { name: "Цветочный", stock: 1, color: "#9c526d", secondary: "#2b2526", sku: "STRAP-FLORAL", image: "/product-variants/strap-floral.jpg", price: 3800 },
    { name: "Черно-белая клетка", stock: 1, color: "#f2f2ef", secondary: "#171717", sku: "STRAP-CHECK", image: "/product-variants/strap-check.jpg", price: 3800 },
    { name: "Английский алфавит", stock: 2, color: "#d19a24", secondary: "#171717", sku: "STRAP-ALPHABET", image: "/product-variants/strap-alphabet.jpg", price: 3800 },
    { name: "Британский флаг", stock: 1, color: "#274d91", secondary: "#b92c32", sku: "STRAP-UK", image: "/product-variants/strap-uk.jpg", price: 3800 },
  ],
  12: [
    { name: "14777 · бас", stock: 1, color: "#3f765c", sku: "STR-PKG-BASS-14777", image: "/product-variants/str-pkg-bass-14777.jpg", price: 4200 },
    { name: "11002 · 010", stock: 2, color: "#6b3769", sku: "STR-PKG-11002-010", image: "/product-variants/str-pkg-11002-010.jpg", price: 4200 },
    { name: "11025 · 011", stock: 1, color: "#56366c", sku: "STR-PKG-11025-011", image: "/product-variants/str-pkg-11025-011.jpg", price: 4200 },
    { name: "16052 · 012", stock: 1, color: "#724168", sku: "STR-PKG-16052-012", image: "/product-variants/str-pkg-16052-012.jpg", price: 4200 },
    { name: "12002 · 009", stock: 1, color: "#28476e", sku: "STR-PKG-12002-09", image: "/product-variants/str-pkg-12002-09.jpg", price: 4200 },
  ],
  13: [
    { name: "Черный · Guitar", stock: 1, color: "#171717", sku: "FX-CB-GTR-BLK", image: "/product-variants/fx-cb-gtr-blk.jpg", price: 24000 },
    { name: "Золотой · Acoustic", stock: 1, color: "#d99b4f", sku: "FX-CB-AC-GLD", image: "/product-variants/fx-cb-ac-gld.jpg", price: 24000 },
    { name: "Синий · Bass", stock: 1, color: "#285a91", sku: "FX-CB-BASS-BLU", image: "/product-variants/fx-cb-bass-blu.jpg", price: 24000 },
  ],
  14: [
    { name: "Черный", stock: 1, color: "#171717", sku: "AMP-GA20-BLK", image: "/product-variants/amp-ga20-blk.jpg", price: 28000 },
    { name: "Серый", stock: 1, color: "#666a6c", sku: "AMP-GA20-PAT", image: "/product-variants/amp-ga20-pat.jpg", price: 28000 },
    { name: "Оранжевый", stock: 1, color: "#e56d24", sku: "AMP-GA20-ORG", image: "/product-variants/amp-ga20-org.jpg", price: 28000 },
    { name: "Фиолетовый", stock: 1, color: "#875194", sku: "AMP-GA20-PUR", image: "/product-variants/amp-ga20-pur.jpg", price: 28000 },
    { name: "Синий", stock: 1, color: "#285a91", sku: "AMP-GA20-BLU", image: "/product-variants/amp-ga20-blu.jpg", price: 28000 },
  ],
};

export const instrumentChoices = [
  { title: "Электрогитары", caption: "От первых риффов до сцены", image: "/products/02_39_gradient_electric.png" },
  { title: "Акустические", caption: "Для песен и аккомпанемента", image: "/products/06_40_tiger_acoustic.png" },
  { title: "Классические", caption: "Мягкие струны для обучения", image: "/products/05_classical_38_39.png" },
  { title: "Укулеле", caption: "Компактный и легкий старт", image: "/products/03_23_ukulele.png" },
];

export const money = (value: number) =>
  new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));

export const installment = (price: number, months: number = 12) => {
  if (!price || months <= 0) return 0;
  return Math.round(price / months);
};

export const variantsFor = (product: Product) =>
  product.variantItems ?? variantsByProduct[String(product.id)] ?? [];

export const mergeBySku = (base: Product[], stored: Product[]) => {
  const merged = new Map(base.map((product) => [product.sku, product]));
  stored.forEach((product) => merged.set(product.sku, product));
  return [...merged.values()];
};

export const DEFAULT_WHATSAPP_PHONE = "77775055788";
export const DISPLAY_WHATSAPP_PHONE = "+7 (777) 505-57-88";

export function buildWhatsAppOrderUrl(params: {
  phone?: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerComment: string;
  cartItems: CartItem[];
  totalPrice: number;
}): string {
  const rawPhone = params.phone || DEFAULT_WHATSAPP_PHONE;
  let cleanPhone = rawPhone.replace(/[^0-9]/g, "");
  if (cleanPhone.startsWith("8") && cleanPhone.length === 11) {
    cleanPhone = "7" + cleanPhone.slice(1);
  }

  const itemsText = params.cartItems
    .map((item, idx) => {
      const itemPriceText =
        item.price > 0
          ? ` × ${money(item.price)} ₸ = ${money(item.price * item.quantity)} ₸`
          : "";
      const bundleSuffix =
        item.bundle === "pro_pack"
          ? " [👑 PRO Комплект: чехол + ремень + годовой курс]"
          : item.giftCourseTitle
            ? ` [🎁 + Онлайн-курс «${item.giftCourseTitle}»]`
            : item.bundle === "gift_course"
              ? " [🎁 + Онлайн-курс в подарок]"
              : "";
      return `${idx + 1}. ${item.name} (${item.variantName}, ${item.sku})${bundleSuffix} — ${item.quantity} шт.${itemPriceText}`;
    })
    .join("\n");

  const totalQty = params.cartItems.reduce((acc, i) => acc + i.quantity, 0);
  const installmentText =
    params.totalPrice > 0
      ? `\n💳 *Рассрочка 0-0-12:* от ${money(installment(params.totalPrice, 12))} ₸ / мес.`
      : "";

  const lines = [
    "🎸 *Новая заявка с сайта Maestro Music Store*",
    "",
    `👤 *Покупатель:* ${params.customerName.trim() || "Не указано"}`,
    `📱 *Телефон:* ${params.customerPhone.trim() || "Не указан"}`,
    `📍 *Город:* ${params.customerCity.trim() || "Актобе"}`,
    params.customerComment.trim()
      ? `💬 *Комментарий:* ${params.customerComment.trim()}`
      : "",
    "",
    `📦 *Состав заказа (${totalQty} ед.):*`,
    itemsText,
    "",
    `💰 *Сумма заявки:* ${
      params.totalPrice > 0 ? `${money(params.totalPrice)} ₸` : "Уточняется менеджером"
    }${installmentText}`,
  ].filter(Boolean);

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${cleanPhone}?text=${text}`;
}
