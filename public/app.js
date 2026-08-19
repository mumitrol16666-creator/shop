const { useState, useEffect, useMemo, useRef } = React;

// 1. Initial Products Catalog
const INITIAL_PRODUCTS = [
  {
    id: "st20",
    name: "Электрогитара ST-20 HSS",
    shortName: "ST-20 HSS",
    category: "Электрогитары",
    price: 107900,
    oldPrice: 125000,
    image: "/01_st20_electric.png",
    quantity: 16,
    sku: "ELEC-ST20-HSS",
    badge: "Хит продаж",
    description: "Универсальный стратокастер с хамбакером в бридже и двумя синглами. От прозрачного чистого фанка до плотного овердрайва для рока и соло.",
    features: [
      "Конфигурация датчиков H-S-S с 5-позиционным переключателем",
      "Корпус из массива липы, гриф из канадского клена",
      "22 лада Medium Jumbo, мензура 25.5\"",
      "В комплекте: чехол, шнур Jack 3м, медиаторы и ключи для отстройки"
    ],
    adminPricing: {
      purchaseCurrency: "CNY",
      purchasePrice: 420,
      currencyRate: 70,
      chinaDeliveryKzt: 2800,
      cargoKzt: 7500,
      customsKzt: 2000,
      packagingKzt: 1500,
      setupKzt: 3000,
      marketingKzt: 4000,
      otherCostsKzt: 1000,
      taxPercent: 3,
      bankInstallmentPercent: 14,
      installmentMonths: 12,
      sellerPercent: 5,
      targetProfitPercent: 25,
      pricingMode: "auto"
    },
    variantItems: [
      { id: "st20-sunburst", name: "Sunburst Gloss", color: "#b85d19", colorName: "Санбёрст", sku: "ST20-SB", stock: 6, image: "/01_st20_electric.png" },
      { id: "st20-black", name: "Solid Black Gloss", color: "#111111", colorName: "Глянцевый черный", sku: "ST20-BLK", stock: 5, image: "/01_st20_electric.png" },
      { id: "st20-white", name: "Vintage White", color: "#f3eedd", colorName: "Винтажный белый", sku: "ST20-VWH", stock: 5, image: "/01_st20_electric.png" }
    ]
  },
  {
    id: "grad-electric",
    name: "Электрогитара 39″ Flame Gradient",
    shortName: "Flame Gradient 39″",
    category: "Электрогитары",
    price: 119900,
    oldPrice: 139000,
    image: "/02_39_gradient_electric.png",
    quantity: 12,
    sku: "ELEC-39-GRAD",
    badge: "Премиум",
    description: "Электрогитара с топом из волнистого клена в градиентной отделке. Два мощных хамбакера для тяжелых риффов и певучего сустейна.",
    features: [
      "Том из волнистого клена с глубокой градиентной лакировкой",
      "2 хамбакера Alnico V с отсечкой катушек Push-Pull",
      "Накладка грифа из палисандра, радиус 12\"",
      "Проверенная экранировка темброблока графитом"
    ],
    adminPricing: {
      purchaseCurrency: "CNY",
      purchasePrice: 480,
      currencyRate: 70,
      chinaDeliveryKzt: 3000,
      cargoKzt: 8000,
      customsKzt: 2200,
      packagingKzt: 1500,
      setupKzt: 3500,
      marketingKzt: 4500,
      otherCostsKzt: 1200,
      taxPercent: 3,
      bankInstallmentPercent: 14,
      installmentMonths: 12,
      sellerPercent: 5,
      targetProfitPercent: 25,
      pricingMode: "auto"
    },
    variantItems: [
      { id: "grad-blue", name: "Aqua Burst", color: "#165b8c", secondary: "#0c1b33", colorName: "Морской градиент", sku: "ELEC-GRAD-BLU", stock: 4, image: "/02_39_gradient_electric.png" },
      { id: "grad-amber", name: "Tiger Amber", color: "#c87d20", secondary: "#401c00", colorName: "Янтарный градиент", sku: "ELEC-GRAD-AMB", stock: 4, image: "/02_39_gradient_electric.png" },
      { id: "grad-purple", name: "Purple Twilight", color: "#6c2b7d", secondary: "#180a22", colorName: "Фиолетовый закат", sku: "ELEC-GRAD-PRP", stock: 4, image: "/02_39_gradient_electric.png" }
    ]
  },
  {
    id: "ukulele23",
    name: "Укулеле концерт 23″ Sapele",
    shortName: "Укулеле 23″ Sapele",
    category: "Укулеле",
    price: 24900,
    oldPrice: 29000,
    image: "/03_23_ukulele.png",
    quantity: 30,
    sku: "UKU-23-SAP",
    badge: "Компактная",
    description: "Концертное укулеле 23 дюйма из благородного сапеле. Теплый объемный звук, мягкие нейлоновые струны Aquila, идеальный инструмент в дорогу.",
    features: [
      "Корпус из массива сапеле с матовой шелковистой отделкой",
      "Итальянские струны Aquila Supernylgut в базе",
      "Литые хромированные колки закрытого типа",
      "В комплекте: плотный чехол, медиаторы, ремешок и таблица аккордов"
    ],
    adminPricing: {
      purchaseCurrency: "CNY",
      purchasePrice: 95,
      currencyRate: 70,
      chinaDeliveryKzt: 1200,
      cargoKzt: 2400,
      customsKzt: 800,
      packagingKzt: 900,
      setupKzt: 1200,
      marketingKzt: 1500,
      otherCostsKzt: 500,
      taxPercent: 3,
      bankInstallmentPercent: 14,
      installmentMonths: 12,
      sellerPercent: 5,
      targetProfitPercent: 30,
      pricingMode: "auto"
    },
    variantItems: [
      { id: "uku-natural", name: "Natural Sapele", color: "#8c5638", colorName: "Натуральное сапеле", sku: "UKU-SAP-NAT", stock: 15, image: "/03_23_ukulele.png" },
      { id: "uku-dark", name: "Dark Walnut", color: "#472e1e", colorName: "Темный орех", sku: "UKU-SAP-DRK", stock: 15, image: "/03_23_ukulele.png" }
    ]
  },
  {
    id: "acoustic41",
    name: "Акустическая гитара 41″ Dreadnought",
    shortName: "Dreadnought 41″",
    category: "Акустические гитары",
    price: 64900,
    oldPrice: 75000,
    image: "/04_41_acoustic.png",
    quantity: 20,
    sku: "AC-41-DREAD",
    badge: "Глубокий бас",
    description: "Полноразмерный дредноут с мощным резонансом и богатыми обертонами. Верхняя дека из отборной ели, вырез Cutaway для удобного доступа к верхним ладам.",
    features: [
      "Верхняя дека: резонансная ель, обечайка и задняя дека: махагони",
      "Удобный вырез Cutaway для игры соло выше 12 лада",
      "Двусторонний анкерный стержень в грифе",
      "Полная предпродажная отстройка мензуры и высоты струн мастером"
    ],
    adminPricing: {
      purchaseCurrency: "CNY",
      purchasePrice: 260,
      currencyRate: 70,
      chinaDeliveryKzt: 2200,
      cargoKzt: 5800,
      customsKzt: 1600,
      packagingKzt: 1400,
      setupKzt: 2500,
      marketingKzt: 3000,
      otherCostsKzt: 800,
      taxPercent: 3,
      bankInstallmentPercent: 14,
      installmentMonths: 12,
      sellerPercent: 5,
      targetProfitPercent: 25,
      pricingMode: "auto"
    },
    variantItems: [
      { id: "ac41-natural", name: "Natural Spruce", color: "#d2a679", colorName: "Натуральная ель", sku: "AC41-NAT", stock: 8, image: "/04_41_acoustic.png" },
      { id: "ac41-black", name: "Midnight Black", color: "#181818", colorName: "Глубокий черный", sku: "AC41-BLK", stock: 6, image: "/04_41_acoustic.png" },
      { id: "ac41-sunburst", name: "Vintage Sunburst", color: "#8a4513", colorName: "Санбёрст винтаж", sku: "AC41-SB", stock: 6, image: "/04_41_acoustic.png" }
    ]
  },
  {
    id: "classic39",
    name: "Классическая гитара 39″ с нейлоновыми струнами",
    shortName: "Классика 39″",
    category: "Классические гитары",
    price: 49900,
    oldPrice: 58000,
    image: "/05_classical_38_39.png",
    quantity: 18,
    sku: "CLASSIC-39-NYL",
    badge: "Для обучения",
    description: "Академическая классическая гитара с мягким нейлоном и широким грифом 52мм. Идеальна для музыкальных школ и бережных занятий пальцевой техникой.",
    features: [
      "Широкий гриф 52 мм по классическому стандарту консерваторий",
      "Мягкие нейлоновые струны — пальцы не устают при долгих занятиях",
      "Традиционная веерная система связок деки для мягкого тембра",
      "Золоченая классическая колковая механика открытого типа"
    ],
    adminPricing: {
      purchaseCurrency: "CNY",
      purchasePrice: 200,
      currencyRate: 70,
      chinaDeliveryKzt: 2000,
      cargoKzt: 5000,
      customsKzt: 1400,
      packagingKzt: 1200,
      setupKzt: 2000,
      marketingKzt: 2500,
      otherCostsKzt: 700,
      taxPercent: 3,
      bankInstallmentPercent: 14,
      installmentMonths: 12,
      sellerPercent: 5,
      targetProfitPercent: 25,
      pricingMode: "auto"
    },
    variantItems: [
      { id: "cl39-amber", name: "Amber Natural", color: "#c68b59", colorName: "Янтарная классика", sku: "CL39-AMB", stock: 10, image: "/05_classical_38_39.png" },
      { id: "cl39-matte", name: "Matte Mahogany", color: "#6b3924", colorName: "Матовый махагони", sku: "CL39-MAH", stock: 8, image: "/05_classical_38_39.png" }
    ]
  },
  {
    id: "cube-baby",
    name: "Гитарный процессор эффектов Cube Baby",
    shortName: "Cube Baby",
    category: "Педали и процессоры",
    price: 32900,
    oldPrice: 38000,
    image: "/13_cube_baby.png",
    quantity: 25,
    sku: "FX-CUBE-BABY",
    badge: "Bluetooth & IR",
    description: "Портативный процессор со встроенным аккумулятором, 9 преампами, модуляцией, дилеем, реверберацией, загрузкой сторонних IR-кабинетов и Bluetooth.",
    features: [
      "Встроенный аккумулятор до 8 часов непрерывной работы",
      "9 моделей усилителей + поддержка 8 слотов загрузки IR-импульсов",
      "Bluetooth для воспроизведения минусовок со смартфона",
      "Выход на наушники 3.5мм и аудиоинтерфейс USB Type-C для записи"
    ],
    adminPricing: {
      purchaseCurrency: "CNY",
      purchasePrice: 135,
      currencyRate: 70,
      chinaDeliveryKzt: 800,
      cargoKzt: 1500,
      customsKzt: 900,
      packagingKzt: 600,
      setupKzt: 1000,
      marketingKzt: 2000,
      otherCostsKzt: 500,
      taxPercent: 3,
      bankInstallmentPercent: 14,
      installmentMonths: 12,
      sellerPercent: 5,
      targetProfitPercent: 30,
      pricingMode: "auto"
    },
    variantItems: [
      { id: "cube-electric", name: "Electric Black Edition", color: "#1f2421", colorName: "Для электрогитары", sku: "CUBE-BABY-EL", stock: 15, image: "/13_cube_baby.png" },
      { id: "cube-acoustic", name: "Acoustic Gold Edition", color: "#9c7a40", colorName: "Для акустики", sku: "CUBE-BABY-AC", stock: 10, image: "/13_cube_baby.png" }
    ]
  },
  {
    id: "ga20",
    name: "Комбоусилитель для электрогитары GA-20W",
    shortName: "Комбоусилитель GA-20W",
    category: "Усилители",
    price: 39900,
    oldPrice: 46000,
    image: "/14_ga20.png",
    quantity: 14,
    sku: "AMP-GA20-W",
    badge: "20 Ватт",
    description: "Двухканальный комбоусилитель для дома и репетиций с чистым звуком и драйвом, 3-полосным эквалайзером, входом AUX и выходом на наушники.",
    features: [
      "Мощность 20 Вт RMS с 6.5-дюймовым фирменным динамиком",
      "2 канала: Clean (кристальный чистый) и Overdrive (рок-драйв)",
      "3-полосный эквалайзер: Treble, Middle, Bass",
      "Вход AUX для подключения телефона и бесшумный выход для наушников"
    ],
    adminPricing: {
      purchaseCurrency: "CNY",
      purchasePrice: 160,
      currencyRate: 70,
      chinaDeliveryKzt: 1800,
      cargoKzt: 3800,
      customsKzt: 1200,
      packagingKzt: 1000,
      setupKzt: 1500,
      marketingKzt: 2500,
      otherCostsKzt: 600,
      taxPercent: 3,
      bankInstallmentPercent: 14,
      installmentMonths: 12,
      sellerPercent: 5,
      targetProfitPercent: 25,
      pricingMode: "auto"
    },
    variantItems: [
      { id: "ga20-standard", name: "Black Tolex", color: "#111111", colorName: "Классический черный толекс", sku: "GA20-BLK", stock: 14, image: "/14_ga20.png" }
    ]
  }
];

// 2. Default Cost Presets
const DEFAULT_PRESETS = [
  {
    id: "preset-electric",
    name: "Электрогитары (Standard)",
    category: "Электрогитары",
    description: "Стандартные расходы для тяжелой коробки электрогитары",
    chinaDeliveryKzt: 2800,
    cargoKzt: 7500,
    customsKzt: 2000,
    packagingKzt: 1500,
    setupKzt: 3000,
    marketingKzt: 4000,
    otherCostsKzt: 1000,
    taxPercent: 3,
    bankInstallmentPercent: 14,
    installmentMonths: 12,
    sellerPercent: 5,
    targetProfitPercent: 25
  },
  {
    id: "preset-acoustic",
    name: "Акустика 40-41″ (Объемный груз)",
    category: "Акустические гитары",
    description: "Рассчитано на габаритный объем акустической коробки",
    chinaDeliveryKzt: 2200,
    cargoKzt: 5800,
    customsKzt: 1600,
    packagingKzt: 1400,
    setupKzt: 2500,
    marketingKzt: 3000,
    otherCostsKzt: 800,
    taxPercent: 3,
    bankInstallmentPercent: 14,
    installmentMonths: 12,
    sellerPercent: 5,
    targetProfitPercent: 25
  },
  {
    id: "preset-ukulele",
    name: "Укулеле (Легкий груз)",
    category: "Укулеле",
    description: "Компактная упаковка, дешевая логистика и быстрая проверка",
    chinaDeliveryKzt: 1200,
    cargoKzt: 2400,
    customsKzt: 800,
    packagingKzt: 900,
    setupKzt: 1200,
    marketingKzt: 1500,
    otherCostsKzt: 500,
    taxPercent: 3,
    bankInstallmentPercent: 14,
    installmentMonths: 12,
    sellerPercent: 5,
    targetProfitPercent: 30
  }
];

// Formatting Helpers
const formatKzt = (val) => (val || 0).toLocaleString("ru-RU") + " ₸";
const calcKaspi = (price, months = 12) => Math.round((price || 0) / months);

// 3. Main Master Application Component
function MaestroApp() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem("maestro_custom_products_v2");
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });
  const [presets, setPresets] = useState(() => {
    try {
      const saved = localStorage.getItem("maestro_cost_presets_v1");
      return saved ? JSON.parse(saved) : DEFAULT_PRESETS;
    } catch {
      return DEFAULT_PRESETS;
    }
  });

  // Cart State
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [kaspiQrData, setKaspiQrData] = useState(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("maestro_custom_products_v2", JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem("maestro_cost_presets_v1", JSON.stringify(presets));
  }, [presets]);

  // Handle URL change
  const navigate = (path) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const handlePop = () => setCurrentPath(window.location.pathname);
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  // Cart handlers
  const addToCart = (product, variant) => {
    setCart((prev) => {
      const key = `${product.id}-${variant ? variant.id : "default"}`;
      const existing = prev.find((item) => item.key === key);
      if (existing) {
        return prev.map((item) => item.key === key ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, {
        key,
        productId: product.id,
        variantId: variant?.id,
        name: product.name,
        variantName: variant?.name || variant?.colorName || "",
        color: variant?.color,
        price: product.price,
        image: variant?.image || product.image,
        quantity: 1
      }];
    });
    setIsCartOpen(true);
  };

  const updateCartQty = (key, delta) => {
    setCart((prev) => prev.map((item) => {
      if (item.key === key) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  // WhatsApp Order Handler (+7 775 055-78-88)
  const openWhatsAppOrder = () => {
    const phone = "7775055788";
    const itemsList = cart.map((item, i) => `${i + 1}. *${item.name}* ${item.variantName ? `(${item.variantName})` : ""} — ${item.quantity} шт. × ${formatKzt(item.price)}`).join("\n");
    const kaspi12 = formatKzt(calcKaspi(cartTotal, 12));
    const text = `Здравствуйте! Хочу оформить заказ в магазине *Maestro* 🎸:\n\n${itemsList}\n\n*Итого к оплате:* ${formatKzt(cartTotal)}\n*В рассрочку Kaspi 0-0-12:* от ${kaspi12}/мес.\n\nПодскажите, пожалуйста, по наличию и доставке!`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Kaspi QR Handler
  const openKaspiQr = () => {
    setKaspiQrData({
      amount: cartTotal,
      orderId: "MST-" + Math.floor(100000 + Math.random() * 900000)
    });
  };

  return (
    <div className="store-shell">
      {/* Top Header */}
      <header className="site-header">
        <div className="container header-inner">
          <div className="brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
            <span className="brand-badge">ALMATY</span>
            <h1 className="brand-logo">MAESTRO</h1>
            <span className="brand-sub">MUSIC STORE</span>
          </div>

          <nav className="header-nav">
            <a href="#catalog" onClick={() => navigate("/")} className={`nav-link ${currentPath === "/" ? "active" : ""}`}>Каталог</a>
            <a href="#about" onClick={() => navigate("/")} className="nav-link">О нас</a>
            <a href="#delivery" onClick={() => navigate("/")} className="nav-link">Доставка</a>
            <button onClick={() => navigate("/admin/pricing")} className={`admin-badge-btn ${currentPath.startsWith("/admin") ? "active" : ""}`}>
              🔒 Панель цен
            </button>
          </nav>

          <button className="cart-trigger-btn" onClick={() => setIsCartOpen(true)}>
            🛒 Корзина
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
        </div>
      </header>

      {/* Main View Router */}
      <main className="main-content">
        {currentPath.startsWith("/admin") ? (
          <AdminPricingView 
            products={products} 
            setProducts={setProducts} 
            presets={presets} 
            setPresets={setPresets}
            onBackToStore={() => navigate("/")} 
          />
        ) : (
          <StorefrontView 
            products={products} 
            onSelectProduct={(p) => setSelectedProduct(p)} 
            onAddToCart={addToCart}
          />
        )}
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          onAddToCart={addToCart} 
          onBuyNow={(p, v) => {
            addToCart(p, v);
            setSelectedProduct(null);
            setIsCartOpen(true);
          }}
        />
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <CartDrawer 
          cart={cart} 
          total={cartTotal} 
          onClose={() => setIsCartOpen(false)} 
          onUpdateQty={updateCartQty} 
          onWhatsAppOrder={openWhatsAppOrder}
          onKaspiQr={openKaspiQr}
        />
      )}

      {/* Kaspi QR Modal */}
      {kaspiQrData && (
        <KaspiQrModal 
          data={kaspiQrData} 
          onClose={() => setKaspiQrData(null)} 
        />
      )}

      {/* Footer */}
      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-col">
            <h3 className="footer-title">MAESTRO MUSIC</h3>
            <p className="footer-text">Музыкальные инструменты с профессиональной отстройкой мастера и быстрой доставкой по всему Казахстану.</p>
          </div>
          <div className="footer-col">
            <h4 className="footer-subtitle">Контакты</h4>
            <p className="footer-text">WhatsApp: <a href="https://wa.me/7775055788" target="_blank" className="gold-link">+7 (775) 055-78-88</a></p>
            <p className="footer-text">г. Алматы, Казахстан</p>
          </div>
          <div className="footer-col">
            <h4 className="footer-subtitle">Управление</h4>
            <button onClick={() => navigate("/admin/pricing")} className="footer-admin-link">
              Вход для администратора →
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

// 4. Storefront View Component
function StorefrontView({ products, onSelectProduct, onAddToCart }) {
  const [activeCategory, setActiveCategory] = useState("Все");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => {
    const cats = ["Все", ...new Set(products.map((p) => p.category))];
    return cats;
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = activeCategory === "Все" || p.category === activeCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, activeCategory, searchQuery]);

  return (
    <div>
      {/* Hero Banner */}
      <section className="hero-section">
        <div className="container hero-inner">
          <div className="hero-badge">НОВОЕ ПОСТУПЛЕНИЕ 2026</div>
          <h2 className="hero-heading">ЗВУК, КОТОРЫЙ ВДОХНОВЛЯЕТ</h2>
          <p className="hero-subtext">
            Электрогитары, акустика, укулеле и процессоры эффектов с предпродажной отстройкой мастера. Рассрочка Kaspi 0-0-12 и моментальный заказ.
          </p>
          <div className="hero-actions">
            <a href="#catalog" className="btn-gold">Смотреть каталог</a>
            <a href="https://wa.me/7775055788" target="_blank" className="btn-outline">Написать в WhatsApp</a>
          </div>
        </div>
      </section>

      {/* Catalog Section */}
      <section className="catalog-section" id="catalog">
        <div className="container">
          <div className="catalog-header">
            <div>
              <span className="section-eyebrow">АССОРТИМЕНТ МАГАЗИНА</span>
              <h2 className="section-title">Каталог инструментов</h2>
            </div>
            <div className="search-box">
              <input 
                type="text" 
                placeholder="Поиск по названию или артикулу..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="category-tabs">
            {categories.map((cat) => (
              <button 
                key={cat} 
                onClick={() => setActiveCategory(cat)}
                className={`tab-btn ${activeCategory === cat ? "active" : ""}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          <div className="products-grid">
            {filteredProducts.map((product) => {
              const kaspiMonthly = calcKaspi(product.price, 12);
              return (
                <div key={product.id} className="product-card" onClick={() => onSelectProduct(product)}>
                  <div className="card-image-wrap">
                    {product.badge && <span className="card-badge">{product.badge}</span>}
                    <span className="kaspi-tag">Kaspi 0-0-12</span>
                    <img src={product.image} alt={product.name} className="card-img" />
                  </div>

                  <div className="card-content">
                    <span className="card-cat">{product.category}</span>
                    <h3 className="card-title">{product.name}</h3>

                    {/* Variant Colors Preview */}
                    {product.variantItems && product.variantItems.length > 1 && (
                      <div className="swatches-preview">
                        {product.variantItems.map((v) => (
                          <span 
                            key={v.id} 
                            className="swatch-dot" 
                            style={{ backgroundColor: v.color }} 
                            title={v.colorName || v.name} 
                          />
                        ))}
                        <span className="swatches-count">+{product.variantItems.length} цветов</span>
                      </div>
                    )}

                    <div className="card-footer">
                      <div className="price-block">
                        <div className="main-price">{formatKzt(product.price)}</div>
                        <div className="kaspi-installment">
                          от <strong className="kaspi-red">{formatKzt(kaspiMonthly)}</strong>/мес
                        </div>
                      </div>

                      <button 
                        className="card-add-btn" 
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(product, product.variantItems ? product.variantItems[0] : null);
                        }}
                      >
                        В корзину
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

// 5. Product Modal Component
function ProductModal({ product, onClose, onAddToCart, onBuyNow }) {
  const [selectedVariant, setSelectedVariant] = useState(
    product.variantItems && product.variantItems.length > 0 ? product.variantItems[0] : null
  );
  const [installmentMonths, setInstallmentMonths] = useState(12);

  const displayImage = selectedVariant?.image || product.image;
  const monthlyPay = calcKaspi(product.price, installmentMonths);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog product-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>✕</button>

        <div className="modal-grid">
          <div className="modal-media">
            <img src={displayImage} alt={product.name} className="modal-big-img" />
          </div>

          <div className="modal-info">
            <span className="modal-cat">{product.category}</span>
            <h2 className="modal-title">{product.name}</h2>
            <div className="modal-sku">Артикул: {selectedVariant?.sku || product.sku}</div>

            <div className="modal-price-row">
              <div className="modal-main-price">{formatKzt(product.price)}</div>
              {product.oldPrice && <div className="modal-old-price">{formatKzt(product.oldPrice)}</div>}
            </div>

            {/* Kaspi Installment Selector */}
            <div className="installment-card">
              <div className="installment-header">
                <span className="kaspi-logo">Kaspi Рассрочка</span>
                <span className="installment-monthly">{formatKzt(monthlyPay)} / мес.</span>
              </div>
              <div className="installment-pills">
                {[3, 6, 12, 24].map((m) => (
                  <button 
                    key={m} 
                    className={`pill-btn ${installmentMonths === m ? "active" : ""}`}
                    onClick={() => setInstallmentMonths(m)}
                  >
                    0-0-{m}
                  </button>
                ))}
              </div>
            </div>

            {/* Variants Selector */}
            {product.variantItems && product.variantItems.length > 0 && (
              <div className="variants-section">
                <div className="variants-label">
                  Цвет: <strong>{selectedVariant?.colorName || selectedVariant?.name}</strong>
                </div>
                <div className="variants-swatches">
                  {product.variantItems.map((v) => (
                    <button 
                      key={v.id} 
                      className={`color-btn ${selectedVariant?.id === v.id ? "selected" : ""}`}
                      onClick={() => setSelectedVariant(v)}
                    >
                      <span className="color-circle" style={{ backgroundColor: v.color }} />
                      <span className="color-name">{v.colorName || v.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="modal-desc">{product.description}</p>

            {product.features && (
              <ul className="features-list">
                {product.features.map((feat, idx) => (
                  <li key={idx}>✓ {feat}</li>
                ))}
              </ul>
            )}

            <div className="modal-actions">
              <button 
                className="btn-gold modal-buy-btn"
                onClick={() => onBuyNow(product, selectedVariant)}
              >
                Купить сейчас
              </button>
              <button 
                className="btn-outline"
                onClick={() => onAddToCart(product, selectedVariant)}
              >
                В корзину
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 6. Cart Drawer Component
function CartDrawer({ cart, total, onClose, onUpdateQty, onWhatsAppOrder, onKaspiQr }) {
  const kaspi12 = calcKaspi(total, 12);

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>Корзина покупок ({cart.length})</h3>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <span className="empty-icon">🛒</span>
              <p>Ваша корзина пока пуста</p>
            </div>
          ) : (
            <div className="cart-items-list">
              {cart.map((item) => (
                <div key={item.key} className="cart-item">
                  <img src={item.image} alt={item.name} className="cart-item-img" />
                  <div className="cart-item-info">
                    <div className="cart-item-title">{item.name}</div>
                    {item.variantName && <div className="cart-item-var">{item.variantName}</div>}
                    <div className="cart-item-price">{formatKzt(item.price)}</div>
                  </div>
                  <div className="cart-qty-controls">
                    <button onClick={() => onUpdateQty(item.key, -1)} className="qty-btn">−</button>
                    <span className="qty-val">{item.quantity}</span>
                    <button onClick={() => onUpdateQty(item.key, 1)} className="qty-btn">+</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="drawer-footer">
            <div className="cart-summary-row">
              <span>Итого:</span>
              <span className="cart-total-price">{formatKzt(total)}</span>
            </div>
            <div className="cart-installment-row">
              <span>Kaspi 0-0-12:</span>
              <span className="kaspi-red">от {formatKzt(kaspi12)}/мес</span>
            </div>

            <div className="cart-checkout-actions">
              <button className="btn-whatsapp" onClick={onWhatsAppOrder}>
                💬 Заказать через WhatsApp
              </button>
              <button className="btn-kaspi-qr" onClick={onKaspiQr}>
                📱 Оплатить через Kaspi QR
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 7. Kaspi QR Modal Component
function KaspiQrModal({ data, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog kaspi-qr-dialog" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>✕</button>
        <div className="kaspi-qr-header">
          <div className="kaspi-qr-badge">KASPI PAY</div>
          <h3>Оплата заказа {data.orderId}</h3>
          <div className="kaspi-qr-amount">{formatKzt(data.amount)}</div>
        </div>

        <div className="qr-box">
          <svg viewBox="0 0 200 200" className="qr-svg">
            <rect width="200" height="200" fill="#ffffff" rx="12" />
            {/* Standard Decorative SVG QR Matrix */}
            <rect x="20" y="20" width="50" height="50" fill="#f14635" rx="4" />
            <rect x="30" y="30" width="30" height="30" fill="#ffffff" rx="2" />
            <rect x="38" y="38" width="14" height="14" fill="#f14635" rx="1" />

            <rect x="130" y="20" width="50" height="50" fill="#f14635" rx="4" />
            <rect x="140" y="30" width="30" height="30" fill="#ffffff" rx="2" />
            <rect x="148" y="38" width="14" height="14" fill="#f14635" rx="1" />

            <rect x="20" y="130" width="50" height="50" fill="#f14635" rx="4" />
            <rect x="30" y="140" width="30" height="30" fill="#ffffff" rx="2" />
            <rect x="38" y="148" width="14" height="14" fill="#f14635" rx="1" />

            {/* Matrix dots */}
            <rect x="80" y="25" width="12" height="12" fill="#1a1a1a" />
            <rect x="100" y="25" width="12" height="12" fill="#1a1a1a" />
            <rect x="80" y="45" width="12" height="12" fill="#1a1a1a" />
            <rect x="100" y="55" width="12" height="12" fill="#1a1a1a" />
            <rect x="25" y="80" width="12" height="12" fill="#1a1a1a" />
            <rect x="45" y="80" width="12" height="12" fill="#1a1a1a" />
            <rect x="65" y="80" width="12" height="12" fill="#1a1a1a" />
            <rect x="85" y="80" width="12" height="12" fill="#f14635" />
            <rect x="105" y="80" width="12" height="12" fill="#1a1a1a" />
            <rect x="125" y="80" width="12" height="12" fill="#1a1a1a" />
            <rect x="145" y="80" width="12" height="12" fill="#1a1a1a" />
            <rect x="165" y="80" width="12" height="12" fill="#1a1a1a" />
            <rect x="80" y="105" width="12" height="12" fill="#1a1a1a" />
            <rect x="100" y="105" width="12" height="12" fill="#1a1a1a" />
            <rect x="130" y="105" width="12" height="12" fill="#1a1a1a" />
            <rect x="150" y="105" width="12" height="12" fill="#1a1a1a" />
            <rect x="80" y="135" width="12" height="12" fill="#1a1a1a" />
            <rect x="105" y="135" width="12" height="12" fill="#1a1a1a" />
            <rect x="135" y="135" width="12" height="12" fill="#1a1a1a" />
            <rect x="155" y="135" width="12" height="12" fill="#1a1a1a" />
            <rect x="85" y="160" width="12" height="12" fill="#1a1a1a" />
            <rect x="110" y="160" width="12" height="12" fill="#1a1a1a" />
            <rect x="140" y="160" width="12" height="12" fill="#1a1a1a" />
          </svg>
        </div>

        <p className="kaspi-instructions">Откройте приложение <strong>Kaspi.kz</strong> → нажмите <strong>Kaspi QR</strong> и отсканируйте код для оплаты.</p>
        <button className="btn-gold" onClick={onClose}>Я оплатил / Закрыть</button>
      </div>
    </div>
  );
}

// 8. Admin Pricing Panel Component
function AdminPricingView({ products, setProducts, presets, setPresets, onBackToStore }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem("maestro_admin_auth") === "true";
  });
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || "");
  const [isSavedBanner, setIsSavedBanner] = useState(false);

  // Form State for Active Product Pricing
  const activeProduct = useMemo(() => products.find((p) => p.id === selectedProductId) || products[0], [products, selectedProductId]);

  const [formPricing, setFormPricing] = useState(() => {
    return activeProduct?.adminPricing || {
      purchaseCurrency: "CNY",
      purchasePrice: 420,
      currencyRate: 70,
      chinaDeliveryKzt: 2800,
      cargoKzt: 7500,
      customsKzt: 2000,
      packagingKzt: 1500,
      setupKzt: 3000,
      marketingKzt: 4000,
      otherCostsKzt: 1000,
      taxPercent: 3,
      bankInstallmentPercent: 14,
      installmentMonths: 12,
      sellerPercent: 5,
      targetProfitPercent: 25,
      pricingMode: "auto"
    };
  });

  const [manualPrice, setManualPrice] = useState(activeProduct?.price || 100000);

  useEffect(() => {
    if (activeProduct) {
      setFormPricing(activeProduct.adminPricing || formPricing);
      setManualPrice(activeProduct.price || 100000);
    }
  }, [activeProduct]);

  // Unit Economics Calculation
  const calculation = useMemo(() => {
    const purchaseKzt = (formPricing.purchasePrice || 0) * (formPricing.currencyRate || 1);
    const fixedCosts = (formPricing.chinaDeliveryKzt || 0) +
                       (formPricing.cargoKzt || 0) +
                       (formPricing.customsKzt || 0) +
                       (formPricing.packagingKzt || 0) +
                       (formPricing.setupKzt || 0) +
                       (formPricing.marketingKzt || 0) +
                       (formPricing.otherCostsKzt || 0);
    const costPrice = purchaseKzt + fixedCosts;

    const rateSum = ((formPricing.taxPercent || 0) + (formPricing.bankInstallmentPercent || 0) + (formPricing.sellerPercent || 0)) / 100;
    const profitTargetRate = (formPricing.targetProfitPercent || 0) / 100;

    // Recommended Price formula
    let recommended = 0;
    const denominator = 1 - rateSum - profitTargetRate;
    if (denominator > 0) {
      recommended = Math.round(costPrice / denominator);
    }

    const finalPrice = formPricing.pricingMode === "manual" ? manualPrice : recommended;

    const taxAmount = Math.round(finalPrice * ((formPricing.taxPercent || 0) / 100));
    const bankAmount = Math.round(finalPrice * ((formPricing.bankInstallmentPercent || 0) / 100));
    const sellerAmount = Math.round(finalPrice * ((formPricing.sellerPercent || 0) / 100));
    const netRevenue = finalPrice - taxAmount - bankAmount - sellerAmount;
    const profit = netRevenue - costPrice;
    const margin = finalPrice > 0 ? ((profit / finalPrice) * 100).toFixed(1) : 0;

    return {
      purchaseKzt,
      fixedCosts,
      costPrice,
      recommended,
      finalPrice,
      taxAmount,
      bankAmount,
      sellerAmount,
      profit,
      margin
    };
  }, [formPricing, manualPrice]);

  // Auth Handler
  const handleLogin = (e) => {
    e.preventDefault();
    if (["Anastacia123!", "maestro2026", "admin", "1234"].includes(passwordInput.trim())) {
      setIsAuthenticated(true);
      sessionStorage.setItem("maestro_admin_auth", "true");
      setAuthError("");
    } else {
      setAuthError("Неверный пароль. Попробуйте Anastacia123! или maestro2026");
    }
  };

  // Apply Cost Preset
  const applyPreset = (preset) => {
    setFormPricing((prev) => ({
      ...prev,
      chinaDeliveryKzt: preset.chinaDeliveryKzt,
      cargoKzt: preset.cargoKzt,
      customsKzt: preset.customsKzt,
      packagingKzt: preset.packagingKzt,
      setupKzt: preset.setupKzt,
      marketingKzt: preset.marketingKzt,
      otherCostsKzt: preset.otherCostsKzt,
      taxPercent: preset.taxPercent,
      bankInstallmentPercent: preset.bankInstallmentPercent,
      installmentMonths: preset.installmentMonths,
      sellerPercent: preset.sellerPercent,
      targetProfitPercent: preset.targetProfitPercent
    }));
  };

  // Save changes to current product
  const saveProductPricing = () => {
    setProducts((prev) => prev.map((p) => {
      if (p.id === activeProduct.id) {
        return {
          ...p,
          price: calculation.finalPrice,
          adminPricing: formPricing
        };
      }
      return p;
    }));
    setIsSavedBanner(true);
    setTimeout(() => setIsSavedBanner(false), 3000);
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-icon">🔒</div>
          <h2>Вход в панель закупщика</h2>
          <p className="auth-subtitle">Управление себестоимостью, наценками и ценами на витрине</p>

          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              placeholder="Введите пароль..." 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="auth-input"
              autoFocus
            />
            {authError && <div className="auth-error">{authError}</div>}
            <button type="submit" className="btn-gold auth-btn">Войти в админку</button>
          </form>

          <button onClick={onBackToStore} className="back-store-btn">← Вернуться на витрину</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-topbar">
        <div>
          <span className="admin-tag">МАСТЕР ЦЕНООБРАЗОВАНИЯ</span>
          <h2 className="admin-title">Управление ценами и себестоимостью</h2>
        </div>

        <div className="admin-topbar-actions">
          <button onClick={onBackToStore} className="btn-outline">На витрину ↗</button>
          <button onClick={saveProductPricing} className="btn-gold">💾 Сохранить и обновить витрину</button>
        </div>
      </div>

      {isSavedBanner && (
        <div className="saved-banner">
          ✅ Новая цена <strong>{formatKzt(calculation.finalPrice)}</strong> успешно сохранена и опубликована на витрине!
        </div>
      )}

      {/* Product Selector Ribbon */}
      <div className="product-selector-ribbon">
        {products.map((p) => (
          <button 
            key={p.id} 
            className={`ribbon-item ${selectedProductId === p.id ? "active" : ""}`}
            onClick={() => setSelectedProductId(p.id)}
          >
            <img src={p.image} alt={p.name} className="ribbon-img" />
            <div className="ribbon-text">
              <div className="ribbon-name">{p.shortName || p.name}</div>
              <div className="ribbon-price">{formatKzt(p.price)}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Preset Bar */}
      <div className="presets-ribbon">
        <span className="preset-label">⚡ Шаблоны расходов:</span>
        {presets.map((preset) => (
          <button 
            key={preset.id} 
            onClick={() => applyPreset(preset)}
            className="preset-btn"
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Calculator Grid */}
      <div className="admin-grid">
        {/* Left Column: Cost Inputs */}
        <div className="admin-card">
          <h3 className="card-sec-title">1. Закупка и доставка из Китая</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Валюта закупки</label>
              <select 
                value={formPricing.purchaseCurrency} 
                onChange={(e) => setFormPricing({ ...formPricing, purchaseCurrency: e.target.value })}
                className="form-select"
              >
                <option value="CNY">CNY (Юань ¥)</option>
                <option value="USD">USD (Доллар $)</option>
                <option value="KZT">KZT (Тенге ₸)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Цена закупки ({formPricing.purchaseCurrency})</label>
              <input 
                type="number" 
                value={formPricing.purchasePrice}
                onChange={(e) => setFormPricing({ ...formPricing, purchasePrice: Number(e.target.value) })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Курс к тенге (₸)</label>
              <input 
                type="number" 
                value={formPricing.currencyRate}
                onChange={(e) => setFormPricing({ ...formPricing, currencyRate: Number(e.target.value) })}
                className="form-input"
              />
            </div>
          </div>

          <h3 className="card-sec-title" style={{ marginTop: "24px" }}>2. Логистика, таможня и подготовка (₸)</h3>
          <div className="form-row-2">
            <div className="form-group">
              <label>Доставка по Китаю</label>
              <input 
                type="number" 
                value={formPricing.chinaDeliveryKzt}
                onChange={(e) => setFormPricing({ ...formPricing, chinaDeliveryKzt: Number(e.target.value) })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Карго в Казахстан</label>
              <input 
                type="number" 
                value={formPricing.cargoKzt}
                onChange={(e) => setFormPricing({ ...formPricing, cargoKzt: Number(e.target.value) })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Таможенная очистка</label>
              <input 
                type="number" 
                value={formPricing.customsKzt}
                onChange={(e) => setFormPricing({ ...formPricing, customsKzt: Number(e.target.value) })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Упаковка и коробка</label>
              <input 
                type="number" 
                value={formPricing.packagingKzt}
                onChange={(e) => setFormPricing({ ...formPricing, packagingKzt: Number(e.target.value) })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Отстройка мастером</label>
              <input 
                type="number" 
                value={formPricing.setupKzt}
                onChange={(e) => setFormPricing({ ...formPricing, setupKzt: Number(e.target.value) })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Маркетинг на ед.</label>
              <input 
                type="number" 
                value={formPricing.marketingKzt}
                onChange={(e) => setFormPricing({ ...formPricing, marketingKzt: Number(e.target.value) })}
                className="form-input"
              />
            </div>
          </div>

          <h3 className="card-sec-title" style={{ marginTop: "24px" }}>3. Проценты комиссий и маржи (%)</h3>
          <div className="form-row-3">
            <div className="form-group">
              <label>Налог ИП (%)</label>
              <input 
                type="number" 
                value={formPricing.taxPercent}
                onChange={(e) => setFormPricing({ ...formPricing, taxPercent: Number(e.target.value) })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Комиссия Kaspi (%)</label>
              <input 
                type="number" 
                value={formPricing.bankInstallmentPercent}
                onChange={(e) => setFormPricing({ ...formPricing, bankInstallmentPercent: Number(e.target.value) })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Бонус продавца (%)</label>
              <input 
                type="number" 
                value={formPricing.sellerPercent}
                onChange={(e) => setFormPricing({ ...formPricing, sellerPercent: Number(e.target.value) })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Желаемая прибыль (%)</label>
              <input 
                type="number" 
                value={formPricing.targetProfitPercent}
                onChange={(e) => setFormPricing({ ...formPricing, targetProfitPercent: Number(e.target.value) })}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Economics Summary & Price Setting */}
        <div className="admin-card summary-card">
          <h3 className="card-sec-title">Экономика единицы товара</h3>

          <div className="summary-breakdown">
            <div className="breakdown-row">
              <span>Себестоимость закупки:</span>
              <strong>{formatKzt(calculation.purchaseKzt)}</strong>
            </div>
            <div className="breakdown-row">
              <span>Расходы доставки и подготовки:</span>
              <strong>{formatKzt(calculation.fixedCosts)}</strong>
            </div>
            <div className="breakdown-row highlight-row">
              <span>Полная себестоимость (Cost):</span>
              <strong className="gold-text">{formatKzt(calculation.costPrice)}</strong>
            </div>
          </div>

          <div className="pricing-mode-switch">
            <label className={`mode-label ${formPricing.pricingMode === "auto" ? "active" : ""}`}>
              <input 
                type="radio" 
                name="pricingMode" 
                value="auto"
                checked={formPricing.pricingMode === "auto"}
                onChange={() => setFormPricing({ ...formPricing, pricingMode: "auto" })}
              />
              Авто-расчет (с учетом {formPricing.targetProfitPercent}% маржи)
            </label>
            <label className={`mode-label ${formPricing.pricingMode === "manual" ? "active" : ""}`}>
              <input 
                type="radio" 
                name="pricingMode" 
                value="manual"
                checked={formPricing.pricingMode === "manual"}
                onChange={() => setFormPricing({ ...formPricing, pricingMode: "manual" })}
              />
              Ручная установка цены на витрине
            </label>
          </div>

          {formPricing.pricingMode === "manual" ? (
            <div className="manual-price-input-box">
              <label>Укажите цену для покупателей (₸):</label>
              <input 
                type="number" 
                value={manualPrice}
                onChange={(e) => setManualPrice(Number(e.target.value))}
                className="big-price-input"
              />
            </div>
          ) : (
            <div className="recommended-box">
              <span className="rec-label">Рекомендованная розничная цена:</span>
              <div className="rec-price">{formatKzt(calculation.recommended)}</div>
            </div>
          )}

          {/* Profit Outcome Box */}
          <div className="profit-outcome-box">
            <div className="outcome-row">
              <span>Итоговая цена на сайте:</span>
              <strong className="big-final-price">{formatKzt(calculation.finalPrice)}</strong>
            </div>
            <div className="outcome-row">
              <span>Комиссия Kaspi ({formPricing.bankInstallmentPercent}%):</span>
              <span>−{formatKzt(calculation.bankAmount)}</span>
            </div>
            <div className="outcome-row">
              <span>Налог ИП ({formPricing.taxPercent}%):</span>
              <span>−{formatKzt(calculation.taxAmount)}</span>
            </div>
            <div className="outcome-row">
              <span>Продавец ({formPricing.sellerPercent}%):</span>
              <span>−{formatKzt(calculation.sellerAmount)}</span>
            </div>
            <div className="outcome-row final-profit-row">
              <span>Чистая прибыль с 1 шт:</span>
              <strong className="profit-green">+{formatKzt(calculation.profit)} ({calculation.margin}%)</strong>
            </div>
          </div>

          <button onClick={saveProductPricing} className="btn-gold save-full-btn">
            💾 Применить цену {formatKzt(calculation.finalPrice)} к товару
          </button>
        </div>
      </div>
    </div>
  );
}

// 9. Mount React App
const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<MaestroApp />);
}
