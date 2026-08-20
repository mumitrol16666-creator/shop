"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { money, type Product, type Variant, variantsFor } from "../lib/catalog-data";
import { type CostPreset, loadPresets, savePresets } from "../lib/presets";
import { calculateProductPricing } from "../lib/product-pricing";
import { MergeProductsModal } from "./MergeProductsModal";
import { PresetManagerModal } from "./PresetManagerModal";
import { PriceTagPrintModal } from "./PriceTagPrintModal";
import { CourseEditorModal } from "./CourseEditorModal";
import { COURSES, type Course } from "../lib/courses-data";

type PurchaserViewProps = {
  categories: string[];
  filteredProducts: Product[];
  storedProducts: Product[];
  setStoredProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  openProduct: (product: Product) => void;
  setMode: (mode: "buyer" | "purchaser") => void;
  setCategory: (category: string) => void;
  query: string;
  setQuery: (query: string) => void;
  setNotice: (notice: string) => void;
};

export function PurchaserView({
  categories,
  filteredProducts,
  storedProducts,
  setStoredProducts,
  openProduct,
  setMode,
  setCategory,
  query,
  setQuery,
  setNotice,
}: PurchaserViewProps) {
  // Presets
  const [presets, setPresets] = useState<CostPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);

  // Bulk actions & Merge modal
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string | number>>(new Set());
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [adminCourses, setAdminCourses] = useState<Course[]>(COURSES);
  const [bulkPresetId, setBulkPresetId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");

  // Pricing inputs
  const [currency, setCurrency] = useState<"CNY" | "USD" | "KZT">("CNY");
  const [cnyRate, setCnyRate] = useState(70);
  const [usdRate, setUsdRate] = useState(500);
  const [purchase, setPurchase] = useState(220);
  const [delivery, setDelivery] = useState(1200);
  const [cargo, setCargo] = useState(2800);
  const [customs, setCustoms] = useState(500);
  const [packaging, setPackaging] = useState(700);
  const [setupCost, setSetupCost] = useState(2500);
  const [marketingCost, setMarketingCost] = useState(1200);
  const [other, setOther] = useState(300);
  const [taxPercent, setTaxPercent] = useState(3);
  const [bankPercent, setBankPercent] = useState(11);
  const [installmentMonths, setInstallmentMonths] = useState(12);
  const [sellerPercent, setSellerPercent] = useState(5);
  const [markup, setMarkup] = useState(35);
  const [manualPricing, setManualPricing] = useState(false);
  const [manualPrice, setManualPrice] = useState(41000);

  // Discount & Promotion state
  const [hasDiscount, setHasDiscount] = useState<boolean>(false);
  const [discountPercent, setDiscountPercent] = useState<number>(15);
  const [originalPriceInput, setOriginalPriceInput] = useState<number>(0);

  // Master product data
  const [editingProductId, setEditingProductId] = useState<string | undefined>();
  const [currentPublicationStatus, setCurrentPublicationStatus] = useState<"published" | "draft">("draft");
  const [internalName, setInternalName] = useState("Электрогитара ST-20 HSS");
  const [internalSku, setInternalSku] = useState("EG-ST20");
  const [internalCategory, setInternalCategory] = useState("Электрогитары");
  const [internalPhoto, setInternalPhoto] = useState("/products/01_st20_electric.png");
  const [internalDescription, setInternalDescription] = useState(
    "Универсальная электрогитара формы ST для первых занятий и домашней практики.",
  );
  const [featuresText, setFeaturesText] = useState(
    "Форма корпуса ST, Конфигурация HSS, 6 цветов, Стандартная мензура",
  );
  const [targetAudience, setTargetAudience] = useState("Для начинающих");
  const [attachedCourseId, setAttachedCourseId] = useState<string>("auto");
  const [internalAudioUrl, setInternalAudioUrl] = useState<string>("");
  const [internalProPackTitle, setInternalProPackTitle] = useState<string>("Чехол + Ремень + VIP Доступ");
  const [internalProPackPrice, setInternalProPackPrice] = useState<number>(8900);
  const [internalAllowStrings, setInternalAllowStrings] = useState<boolean>(true);

  // Model variants list (Color & Variant Matrix)
  const [modelVariants, setModelVariants] = useState<Variant[]>([
    {
      id: "var-1",
      name: "Санбёрст",
      sku: "EG-ST20-SNB",
      color: "#d97724",
      colorName: "Санбёрст",
      stock: 1,
      size: "39″",
      image: "/product-variants/eg-st20-snb.jpg",
    },
    {
      id: "var-2",
      name: "Черный глянец",
      sku: "EG-ST20-BLK",
      color: "#171717",
      colorName: "Черный",
      stock: 2,
      size: "39″",
      image: "/product-variants/eg-st20-blk.jpg",
    },
    {
      id: "var-3",
      name: "Белый глянец",
      sku: "EG-ST20-WHT",
      color: "#f3f3f0",
      colorName: "Белый",
      stock: 1,
      size: "39″",
      image: "/product-variants/eg-st20-wht.jpg",
    },
  ]);

  // Dirty tracking & save status
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");

  // Load presets on mount
  useEffect(() => {
    const loaded = loadPresets();
    setPresets(loaded);
    if (loaded[0]) {
      setSelectedPresetId(loaded[0].id);
      setBulkPresetId(loaded[0].id);
    }
  }, []);

  const rate = currency === "CNY" ? cnyRate : currency === "USD" ? usdRate : 1;
  const percentExpenses = taxPercent + bankPercent + sellerPercent;

  const calculation = useMemo(() => {
    try {
      return calculateProductPricing({
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
        pricingMode: manualPricing ? "manual" : "auto",
        manualPriceKzt: manualPrice,
        hasDiscount,
        discountPercent,
        originalPriceKzt: originalPriceInput > 0 ? originalPriceInput : null,
      });
    } catch {
      return null;
    }
  }, [
    purchase,
    rate,
    delivery,
    cargo,
    customs,
    packaging,
    setupCost,
    marketingCost,
    other,
    taxPercent,
    bankPercent,
    sellerPercent,
    markup,
    manualPricing,
    manualPrice,
    hasDiscount,
    discountPercent,
    originalPriceInput,
  ]);

  const purchaseKzt = calculation?.purchasePriceKzt ?? purchase * rate;
  const fixedCost = calculation?.fixedCostKzt ?? purchaseKzt;
  const recommendedPrice = calculation?.recommendedPriceKzt ?? 0;
  const retail = calculation?.finalPriceKzt ?? (manualPricing ? manualPrice : recommendedPrice);
  const originalPriceDisplay = calculation?.originalPriceKzt ?? retail;
  const savingsKzt = calculation?.discountAmountKzt ?? 0;
  const breakEvenPrice = calculation?.breakEvenPriceKzt ?? 0;
  const taxAmount = calculation?.taxAmountKzt ?? 0;
  const bankAmount = calculation?.bankAmountKzt ?? 0;
  const sellerAmount = calculation?.sellerAmountKzt ?? 0;
  const netRevenue = calculation?.netRevenueKzt ?? 0;
  const profit = calculation?.profitKzt ?? 0;
  const margin = calculation?.marginPercent ?? 0;
  const markupOnCost = calculation?.markupOnCostPercent ?? 0;

  const applyPreset = (preset: CostPreset) => {
    setSelectedPresetId(preset.id);
    setCurrency(preset.purchaseCurrency);
    setDelivery(preset.chinaDeliveryKzt);
    setCargo(preset.cargoKzt);
    setCustoms(preset.customsKzt);
    setPackaging(preset.packagingKzt);
    setSetupCost(preset.setupKzt);
    setMarketingCost(preset.marketingKzt);
    setOther(preset.otherCostsKzt);
    setTaxPercent(preset.taxPercent);
    setBankPercent(preset.bankInstallmentPercent);
    setInstallmentMonths(preset.installmentMonths);
    setSellerPercent(preset.sellerPercent);
    setMarkup(preset.targetProfitPercent);
    setIsDirty(true);
    setNotice(`Применен шаблон: ${preset.name}`);
    window.setTimeout(() => setNotice(""), 2400);
  };

  const handleSelectPresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = presets.find((p) => p.id === presetId);
    if (found) applyPreset(found);
  };

  const editStoredProduct = (product: Product) => {
    setEditingProductId(product.databaseId || String(product.id));
    setCurrentPublicationStatus(product.publicationStatus === "published" ? "published" : "draft");
    setInternalName(product.name);
    setInternalSku(product.sku);
    setInternalCategory(product.category);
    setInternalPhoto(product.image);
    setInternalDescription(product.description);
    setFeaturesText(product.features.join(", "));
    setTargetAudience(product.badge ?? "");
    setAttachedCourseId(product.attachedCourseId || "auto");
    setInternalAudioUrl(product.audioUrl || "");
    setInternalProPackTitle(product.proPackTitle || "Чехол + Ремень + VIP Доступ");
    setInternalProPackPrice(product.proPackPrice !== undefined ? product.proPackPrice : 8900);
    setInternalAllowStrings(product.allowStringsUpsell !== false);

    // Discount
    const prodHasDiscount = Boolean(
      product.isDiscountActive ||
      (product.discountPercent && product.discountPercent > 0) ||
      (product.originalPrice && product.price && product.originalPrice > product.price)
    );
    setHasDiscount(prodHasDiscount);
    setDiscountPercent(
      product.discountPercent ||
      (product.originalPrice && product.price
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 15)
    );
    setOriginalPriceInput(product.originalPrice || 0);

    const variants = variantsFor(product);
    setModelVariants(
      variants.length > 0
        ? variants
        : [
            {
              id: `var-${Date.now()}`,
              name: "Стандарт",
              sku: product.sku,
              color: "#8a8175",
              colorName: "Стандарт",
              stock: product.quantity || 1,
              image: product.image,
            },
          ],
    );

    if (product.adminPricing) {
      const p = product.adminPricing;
      setCurrency(p.purchaseCurrency);
      setPurchase(p.purchasePrice);
      if (p.purchaseCurrency === "CNY") setCnyRate(p.currencyRate);
      if (p.purchaseCurrency === "USD") setUsdRate(p.currencyRate);
      setDelivery(p.chinaDeliveryKzt);
      setCargo(p.cargoKzt);
      setCustoms(p.customsKzt);
      setPackaging(p.packagingKzt);
      setSetupCost(p.setupKzt);
      setMarketingCost(p.marketingKzt);
      setOther(p.otherCostsKzt);
      setTaxPercent(p.taxPercent);
      setBankPercent(p.bankInstallmentPercent);
      setInstallmentMonths(p.installmentMonths);
      setSellerPercent(p.sellerPercent);
      setMarkup(p.targetProfitPercent);
      setManualPricing(p.pricingMode === "manual");
      setManualPrice(p.manualPriceKzt ?? product.price ?? 41000);
    } else {
      setManualPricing(true);
      setManualPrice(product.price || 41000);
    }

    setIsDirty(false);
    setSaveState("idle");
    setSaveMessage(`Загружен для редактирования: ${product.name} (${product.sku})`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addVariantRow = () => {
    const nextIndex = modelVariants.length + 1;
    const newVariant: Variant = {
      id: `var-new-${Date.now()}`,
      name: `Цвет / Вариант ${nextIndex}`,
      sku: `${internalSku}-${nextIndex}`,
      color: "#8a8175",
      colorName: "",
      barcode: "",
      size: "39″",
      stock: 1,
      image: internalPhoto,
    };
    setModelVariants([...modelVariants, newVariant]);
    setIsDirty(true);
  };

  const updateVariantRow = (index: number, patch: Partial<Variant>) => {
    setModelVariants((current) => {
      const copy = [...current];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
    setIsDirty(true);
  };

  const removeVariantRow = (index: number) => {
    if (modelVariants.length <= 1) {
      alert("У модели должен оставаться хотя бы один вариант (цвет).");
      return;
    }
    setModelVariants((current) => current.filter((_, idx) => idx !== index));
    setIsDirty(true);
  };

  const duplicateVariantRow = (index: number) => {
    const source = modelVariants[index];
    if (!source) return;
    const duplicated: Variant = {
      ...source,
      id: `var-dup-${Date.now()}`,
      name: `${source.name} (копия)`,
      sku: `${source.sku}-COPY`,
    };
    setModelVariants([...modelVariants, duplicated]);
    setIsDirty(true);
  };

  const totalModelStock = useMemo(() => {
    return modelVariants.reduce((acc, v) => acc + (v.stock || 0), 0);
  }, [modelVariants]);

  const saveProduct = async (publish: boolean) => {
    if (!internalName.trim() || !internalSku.trim() || !internalDescription.trim()) {
      setSaveState("error");
      setSaveMessage("Заполните название, SKU и описание товара.");
      return;
    }
    if (!modelVariants.length || !modelVariants[0]?.name.trim()) {
      setSaveState("error");
      setSaveMessage("Добавьте хотя бы один вариант (цвет).");
      return;
    }
    if (percentExpenses >= 100) {
      setSaveState("error");
      setSaveMessage("Сумма налога, банка и продавца должна быть меньше 100%.");
      return;
    }

    setSaveState("saving");
    setSaveMessage(publish ? "Публикуем карточку на витрине..." : "Сохраняем черновик...");
    try {
      const primaryVariant = modelVariants[0];
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: editingProductId,
          variantId: primaryVariant?.id,
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
          attachedCourseId: attachedCourseId === "none" ? "" : attachedCourseId,
          audioUrl: internalAudioUrl.trim(),
          proPackTitle: internalProPackTitle.trim(),
          proPackPrice: internalProPackPrice,
          allowStringsUpsell: internalAllowStrings,
          variant: {
            name: primaryVariant.name,
            sku: primaryVariant.sku,
            barcode: primaryVariant.barcode,
            colorName: primaryVariant.colorName || primaryVariant.name,
            colorHex: primaryVariant.color,
            size: primaryVariant.size,
            stockQuantity: totalModelStock,
          },
          variants: modelVariants,
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
            hasDiscount,
            discountPercent: hasDiscount ? discountPercent : 0,
            originalPriceKzt: hasDiscount && calculation ? calculation.originalPriceKzt : null,
          },
          publish,
        }),
      });

      const data = (await response.json()) as { product?: Product; error?: string };
      if (!response.ok || !data.product) {
        throw new Error(data.error || "Карточка не сохранилась");
      }

      const updatedProduct: Product = {
        ...data.product,
        quantity: totalModelStock,
        variants: modelVariants.length,
        variantItems: modelVariants,
        price: Math.round(retail),
        attachedCourseId: attachedCourseId === "none" ? undefined : attachedCourseId,
        audioUrl: internalAudioUrl.trim() || undefined,
        proPackTitle: internalProPackTitle.trim(),
        proPackPrice: internalProPackPrice,
        allowStringsUpsell: internalAllowStrings,
        originalPrice: hasDiscount && calculation ? Math.round(calculation.originalPriceKzt) : undefined,
        discountPercent: hasDiscount ? discountPercent : undefined,
        isDiscountActive: hasDiscount,
        publicationStatus: publish ? "published" : "draft",
        isStored: true,
      };

      setStoredProducts((current) => {
        const withoutSaved = current.filter(
          (p) =>
            String(p.id) !== String(updatedProduct.id) &&
            (p.sku && updatedProduct.sku ? p.sku.toLowerCase() !== updatedProduct.sku.toLowerCase() : true),
        );
        return [...withoutSaved, updatedProduct];
      });

      setEditingProductId(data.product.databaseId || String(data.product.id));
      setCurrentPublicationStatus(publish ? "published" : "draft");
      setIsDirty(false);
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLastSavedTime(timeStr);
      setSaveState("saved");
      setSaveMessage(
        publish
          ? `✅ Опубликовано на витрине в ${timeStr}. Цена: ${money(retail)} ₸${hasDiscount ? ` (Скидка -${discountPercent}%)` : ""}.`
          : `✅ Черновик сохранён в ${timeStr}.`,
      );
      setNotice(publish ? `Опубликовано: ${internalName} (${money(retail)} ₸)` : `Черновик сохранён`);
      window.setTimeout(() => setNotice(""), 3000);
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "Карточка не сохранилась");
    }
  };

  // Bulk actions handlers
  const toggleSelectProduct = (id: string | number) => {
    setSelectedProductIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.size === displayedInventoryProducts.length && displayedInventoryProducts.length > 0) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(displayedInventoryProducts.map((p) => p.id)));
    }
  };

  const handleBulkStatusChange = async (publish: boolean) => {
    if (selectedProductIds.size === 0) return;
    const count = selectedProductIds.size;
    const targetStatus = publish ? "published" : "draft";

    const updated = storedProducts.map((p) => {
      if (selectedProductIds.has(p.id)) {
        return { ...p, publicationStatus: targetStatus as "published" | "draft" };
      }
      return p;
    });

    setStoredProducts(updated);
    setSelectedProductIds(new Set());
    setNotice(publish ? `🚀 Опубликовано на витрине: ${count} шт.` : `📦 Переведено в черновики: ${count} шт.`);
    window.setTimeout(() => setNotice(""), 3000);
  };

  const handleBulkApplyPreset = () => {
    if (selectedProductIds.size === 0 || !bulkPresetId) return;
    const preset = presets.find((p) => p.id === bulkPresetId);
    if (!preset) return;

    const count = selectedProductIds.size;
    const updated = storedProducts.map((p) => {
      if (selectedProductIds.has(p.id)) {
        const rate = preset.purchaseCurrency === "CNY" ? cnyRate : preset.purchaseCurrency === "USD" ? usdRate : 1;
        const newPricing = {
          purchaseCurrency: preset.purchaseCurrency,
          purchasePrice: p.adminPricing?.purchasePrice || 200,
          currencyRate: rate,
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
          targetProfitPercent: preset.targetProfitPercent,
          pricingMode: "auto" as const,
          manualPriceKzt: null,
          hasDiscount: false,
        };
        const calc = calculateProductPricing({
          ...newPricing,
          manualPriceKzt: 0,
        });
        return {
          ...p,
          adminPricing: newPricing,
          price: Math.round(calc.finalPriceKzt),
        };
      }
      return p;
    });

    setStoredProducts(updated);
    setSelectedProductIds(new Set());
    setNotice(`🏷 Шаблон «${preset.name}» применен к ${count} товарам`);
    window.setTimeout(() => setNotice(""), 3000);
  };

  // Filter warehouse items by tab
  const displayedInventoryProducts = useMemo(() => {
    return filteredProducts.filter((p) => {
      if (statusFilter === "published") return p.publicationStatus === "published";
      if (statusFilter === "draft") return p.publicationStatus === "draft";
      return true;
    });
  }, [filteredProducts, statusFilter]);

  const selectedForMerge = useMemo(() => {
    return filteredProducts.filter((p) => selectedProductIds.has(p.id));
  }, [filteredProducts, selectedProductIds]);

  const handleConfirmMerge = (mergedMaster: Product, obsoleteIds: (string | number)[]) => {
    const obsoleteSet = new Set(obsoleteIds);
    setStoredProducts((current) => {
      const kept = current.filter((p) => !obsoleteSet.has(p.id) && p.id !== mergedMaster.id);
      return [...kept, mergedMaster];
    });
    setSelectedProductIds(new Set());
    setNotice(`Объединено в одну модель: ${mergedMaster.name} (${mergedMaster.variants} вар.)`);
    window.setTimeout(() => setNotice(""), 3200);
  };

  const isAllSelected =
    displayedInventoryProducts.length > 0 && selectedProductIds.size === displayedInventoryProducts.length;

  return (
    <section className="purchaser-view">
      {/* Preset Modal */}
      <PresetManagerModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        presets={presets}
        setPresets={setPresets}
        onApplyPreset={applyPreset}
        currentCalculatorValues={{
          purchaseCurrency: currency,
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
        }}
      />

      {/* Merge Modal */}
      <CourseEditorModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        courses={adminCourses}
        setCourses={setAdminCourses}
        onSavedNotice={(msg) => {
          setNotice(msg);
          setTimeout(() => setNotice(""), 3000);
        }}
      />
      <PriceTagPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        products={selectedProductIds.size > 0 ? selectedForMerge : displayedInventoryProducts}
      />
      <MergeProductsModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        selectedProducts={selectedForMerge}
        onConfirmMerge={handleConfirmMerge}
      />

      <div className="purchaser-grid">
        <section className="calculator-card">
          {/* Top Live Status Ribbon */}
          <div className="calculator-status-ribbon">
            <div className="status-indicator-group">
              {isDirty ? (
                <span className="live-status-badge dirty" title="Изменения еще не сохранены в базу">
                  <i className="status-dot blink" /> Есть несохранённые правки
                </span>
              ) : currentPublicationStatus === "published" ? (
                <span className="live-status-badge published" title="Карточка активна на главной витрине">
                  <i className="status-dot green" /> Опубликовано на витрине {lastSavedTime && `(${lastSavedTime})`}
                </span>
              ) : (
                <span className="live-status-badge draft" title="Карточка сохранена в черновиках">
                  <i className="status-dot yellow" /> Черновик {lastSavedTime && `(${lastSavedTime})`}
                </span>
              )}
              <span className="current-model-tag">
                Текущая модель: <strong>{internalSku}</strong> · {internalName}
              </span>
            </div>

            <div className="preset-quick-select">
              <span className="preset-label">Шаблон расходов:</span>
              <select
                value={selectedPresetId}
                onChange={(e) => handleSelectPresetChange(e.target.value)}
                aria-label="Выбрать шаблон расходов"
              >
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name} ({preset.purchaseCurrency})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="preset-manage-btn"
                onClick={() => setIsPresetModalOpen(true)}
                title="Редактировать и создавать свои шаблоны"
              >
                ⚙️ Шаблоны
              </button>
              <button
                type="button"
                className="preset-manage-btn course-btn"
                onClick={() => setIsCourseModalOpen(true)}
                title="Настройка и добавление онлайн-курсов"
                style={{ background: "#2a221a", borderColor: "#c87531", color: "#f3e7d8", fontWeight: 600 }}
              >
                🎓 Курсы
              </button>
              <button
                type="button"
                className="preset-manage-btn"
                onClick={() => setIsPrintModalOpen(true)}
                title="Печать ценников со штрихкодами"
              >
                🖨 Ценники
              </button>
            </div>
          </div>

          {/* 1. Model Info */}
          <div className="card-subhead">
            <strong>1. Данные модели</strong>
            <span>Основная информация, фотографии и характеристики инструмента.</span>
          </div>

          <div className="model-info-grid">
            <label>
              Название модели
              <input
                value={internalName}
                onChange={(e) => {
                  setInternalName(e.target.value);
                  setIsDirty(true);
                }}
              />
            </label>
            <label>
              Базовый SKU
              <input
                value={internalSku}
                onChange={(e) => {
                  setInternalSku(e.target.value);
                  setIsDirty(true);
                }}
              />
            </label>
            <label>
              Категория
              <select
                value={internalCategory}
                onChange={(e) => {
                  setInternalCategory(e.target.value);
                  setIsDirty(true);
                }}
              >
                {categories
                  .filter((cat) => cat !== "Все")
                  .map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
              </select>
            </label>
            <label>
              Основное фото
              <input
                value={internalPhoto}
                onChange={(e) => {
                  setInternalPhoto(e.target.value);
                  setIsDirty(true);
                }}
              />
            </label>
            <label className="full-width">
              Описание инструмента
              <textarea
                value={internalDescription}
                onChange={(e) => {
                  setInternalDescription(e.target.value);
                  setIsDirty(true);
                }}
                rows={2}
              />
            </label>
            <label className="full-width">
              Характеристики (через запятую)
              <input
                value={featuresText}
                onChange={(e) => {
                  setFeaturesText(e.target.value);
                  setIsDirty(true);
                }}
              />
            </label>
            <label>
              Бейдж / Сегмент
              <input
                value={targetAudience}
                onChange={(e) => {
                  setTargetAudience(e.target.value);
                  setIsDirty(true);
                }}
              />
            </label>

            <label className="full-width">
              🎓 Подарочный онлайн-курс (в комплекте к инструменту)
              <select
                value={attachedCourseId}
                onChange={(e) => {
                  setAttachedCourseId(e.target.value);
                  setIsDirty(true);
                }}
              >
                <option value="auto">✨ Автоматически (по типу: Акустика → с нуля / Электро → риффы / Укулеле → экспресс)</option>
                <option value="none">❌ Без курса (только гитара)</option>
                {adminCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    🎓 {c.title} ({c.level}, {c.lessonsCount || 10} уроков)
                  </option>
                ))}
              </select>
            </label>

            <label className="full-width">
              🎵 Аудиозапись звучания инструмента (MP3 / Прямая ссылка)
              <input
                value={internalAudioUrl}
                onChange={(e) => {
                  setInternalAudioUrl(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="например, /audio/st20_preview.mp3 или https://example.com/sound.mp3"
              />
              <small style={{ color: "var(--muted)", fontSize: "11.5px", marginTop: "4px", display: "block" }}>
                💡 Если поле пустое, кнопка «Послушать» на витрине скрыта. Звук воспроизводится только если вы укажете ссылку на реальную запись.
              </small>
            </label>

            <div className="bundle-admin-settings-row full-width" style={{
              background: "#faf7f2",
              padding: "16px",
              borderRadius: "14px",
              border: "1px solid var(--line)",
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr",
              gap: "14px",
              marginTop: "6px"
            }}>
              <label>
                👑 Состав PRO Комплекта (аксессуары)
                <input
                  value={internalProPackTitle}
                  onChange={(e) => {
                    setInternalProPackTitle(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Чехол + Ремень + VIP Доступ"
                />
              </label>

              <label>
                💰 Доплата за PRO Комплект (₸)
                <input
                  type="number"
                  value={internalProPackPrice}
                  onChange={(e) => {
                    setInternalProPackPrice(Number(e.target.value) || 0);
                    setIsDirty(true);
                  }}
                  placeholder="8900"
                />
              </label>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={internalAllowStrings}
                    onChange={(e) => {
                      setInternalAllowStrings(e.target.checked);
                      setIsDirty(true);
                    }}
                  />
                  <span>⚡ Предлагать комплект струн Elixir/D'Addario со скидкой -50% к этой гитаре</span>
                </label>
              </div>
            </div>
          </div>

          {/* 2. Color & Variant Matrix */}
          <div className="card-subhead between">
            <div>
              <strong>2. Матрица цветов и модификаций модели ({modelVariants.length})</strong>
              <span>Все расцветки гитары хранятся в одной карточке с единой юнит-экономикой.</span>
            </div>
            <button type="button" className="primary-button small" onClick={addVariantRow}>
              + Добавить вариант / цвет
            </button>
          </div>

          <div className="variant-matrix-table">
            <div className="variant-matrix-head">
              <span>Цвет / Образец</span>
              <span>Название цвета</span>
              <span>SKU варианта</span>
              <span>Штрихкод</span>
              <span>Размер</span>
              <span>Остаток</span>
              <span>Действия</span>
            </div>

            {modelVariants.map((variant, idx) => (
              <div className="variant-matrix-row" key={variant.id || idx}>
                <span className="color-cell">
                  <input
                    type="color"
                    value={variant.color || "#8a8175"}
                    onChange={(e) => updateVariantRow(idx, { color: e.target.value })}
                    title="Выбрать HEX цвет"
                  />
                  <input
                    type="text"
                    className="hex-input"
                    value={variant.color || "#8a8175"}
                    onChange={(e) => updateVariantRow(idx, { color: e.target.value })}
                  />
                </span>
                <span>
                  <input
                    type="text"
                    value={variant.name}
                    onChange={(e) =>
                      updateVariantRow(idx, { name: e.target.value, colorName: e.target.value })
                    }
                    placeholder="Например: Санбёрст"
                  />
                </span>
                <span>
                  <input
                    type="text"
                    value={variant.sku}
                    onChange={(e) => updateVariantRow(idx, { sku: e.target.value })}
                  />
                </span>
                <span>
                  <input
                    type="text"
                    value={variant.barcode || ""}
                    onChange={(e) => updateVariantRow(idx, { barcode: e.target.value })}
                    placeholder="EAN-13"
                  />
                </span>
                <span>
                  <input
                    type="text"
                    value={variant.size || "39″"}
                    onChange={(e) => updateVariantRow(idx, { size: e.target.value })}
                  />
                </span>
                <span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={variant.stock === 0 ? "" : variant.stock}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      updateVariantRow(idx, { stock: Math.max(0, +e.target.value) })
                    }
                  />
                </span>
                <span className="matrix-actions">
                  <button
                    type="button"
                    className="action-icon-btn"
                    onClick={() => duplicateVariantRow(idx)}
                    title="Дублировать строку"
                  >
                    📋
                  </button>
                  <button
                    type="button"
                    className="action-icon-btn delete"
                    onClick={() => removeVariantRow(idx)}
                    title="Удалить вариант"
                  >
                    ✕
                  </button>
                </span>
              </div>
            ))}
          </div>

          <div className="matrix-summary-bar">
            <span>Суммарный остаток по всем цветам модели: <strong>{totalModelStock} шт.</strong></span>
          </div>

          {/* 3. Direct Costs */}
          <div className="card-subhead">
            <strong>3. Прямые расходы на единицу</strong>
            <span>Себестоимость формируется из цены закупки, логистики и предпродажной подготовки мастера.</span>
          </div>

          <div className="calculator-form">
            <label>
              Валюта закупки
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value as "CNY" | "USD" | "KZT");
                  setIsDirty(true);
                }}
              >
                <option value="CNY">Юань (¥, CNY)</option>
                <option value="USD">Доллар ($, USD)</option>
                <option value="KZT">Тенге (₸, KZT)</option>
              </select>
            </label>
            <label>
              Цена закупки
              <input
                type="number"
                placeholder="0"
                value={purchase === 0 ? "" : purchase}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  setPurchase(+e.target.value);
                  setIsDirty(true);
                }}
              />
            </label>
            {currency === "CNY" && (
              <label>
                Курс CNY → KZT
                <input
                  type="number"
                  placeholder="0"
                  value={cnyRate === 0 ? "" : cnyRate}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setCnyRate(+e.target.value);
                    setIsDirty(true);
                  }}
                />
              </label>
            )}
            {currency === "USD" && (
              <label>
                Курс USD → KZT
                <input
                  type="number"
                  placeholder="0"
                  value={usdRate === 0 ? "" : usdRate}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setUsdRate(+e.target.value);
                    setIsDirty(true);
                  }}
                />
              </label>
            )}
            <label>
              Доставка по Китаю, ₸
              <input
                type="number"
                placeholder="0"
                value={delivery === 0 ? "" : delivery}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  setDelivery(+e.target.value);
                  setIsDirty(true);
                }}
              />
            </label>
            <label>
              Карго до Актобе, ₸
              <input
                type="number"
                placeholder="0"
                value={cargo === 0 ? "" : cargo}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  setCargo(+e.target.value);
                  setIsDirty(true);
                }}
              />
            </label>
            <label>
              Таможня / сборы, ₸
              <input
                type="number"
                placeholder="0"
                value={customs === 0 ? "" : customs}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  setCustoms(+e.target.value);
                  setIsDirty(true);
                }}
              />
            </label>
            <label>
              Упаковка / коробка, ₸
              <input
                type="number"
                placeholder="0"
                value={packaging === 0 ? "" : packaging}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  setPackaging(+e.target.value);
                  setIsDirty(true);
                }}
              />
            </label>
            <label>
              Доводка мастера / чек, ₸
              <input
                type="number"
                placeholder="0"
                value={setupCost === 0 ? "" : setupCost}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  setSetupCost(+e.target.value);
                  setIsDirty(true);
                }}
              />
            </label>
            <label>
              Маркетинг на единицу, ₸
              <input
                type="number"
                placeholder="0"
                value={marketingCost === 0 ? "" : marketingCost}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  setMarketingCost(+e.target.value);
                  setIsDirty(true);
                }}
              />
            </label>
            <label>
              Прочие расходы, ₸
              <input
                type="number"
                placeholder="0"
                value={other === 0 ? "" : other}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  setOther(+e.target.value);
                  setIsDirty(true);
                }}
              />
            </label>
          </div>

          {/* 4. Percent Expenses */}
          <div className="card-subhead">
            <strong>4. Процентные расходы и маржинальность</strong>
            <span>Учитывается налог, комиссия банка за рассрочку, комиссия продавца и желаемая наценка.</span>
          </div>

          <div className="calculator-form">
            <label>
              Налог, %
              <input
                type="number"
                placeholder="0"
                value={taxPercent === 0 ? "" : taxPercent}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  setTaxPercent(+e.target.value);
                  setIsDirty(true);
                }}
              />
            </label>
            <label>
              Банк / рассрочка, %
              <input
                type="number"
                placeholder="0"
                value={bankPercent === 0 ? "" : bankPercent}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  setBankPercent(+e.target.value);
                  setIsDirty(true);
                }}
              />
            </label>
            <label>
              Срок рассрочки, мес.
              <input
                type="number"
                min="0"
                placeholder="0"
                value={installmentMonths === 0 ? "" : installmentMonths}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  setInstallmentMonths(Math.max(0, +e.target.value));
                  setIsDirty(true);
                }}
              />
            </label>
            <label>
              Продавец, %
              <input
                type="number"
                placeholder="0"
                value={sellerPercent === 0 ? "" : sellerPercent}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  setSellerPercent(+e.target.value);
                  setIsDirty(true);
                }}
              />
            </label>
            <label>
              Желаемая прибыль, %
              <input
                type="number"
                placeholder="0"
                value={markup === 0 ? "" : markup}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  setMarkup(+e.target.value);
                  setIsDirty(true);
                }}
              />
            </label>
            <label>
              Итоговая базовая цена, ₸
              <input
                type="number"
                placeholder="0"
                value={
                  Math.round(manualPricing ? manualPrice : recommendedPrice) === 0
                    ? ""
                    : Math.round(manualPricing ? manualPrice : recommendedPrice)
                }
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  setManualPricing(true);
                  setManualPrice(+e.target.value);
                  setIsDirty(true);
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
                  setIsDirty(true);
                }}
              >
                {manualPricing ? "Ручная" : "Авто"}
              </button>
            </label>
          </div>

          {/* 5. Discount & Promotion */}
          <div className="card-subhead between">
            <div>
              <strong>5. Скидки и промо-акции (Sale)</strong>
              <span>Установите скидку в процентах или старую зачёркнутую цену для привлечения покупателей.</span>
            </div>
            <label className="discount-toggle-label">
              <input
                type="checkbox"
                checked={hasDiscount}
                onChange={(e) => {
                  setHasDiscount(e.target.checked);
                  setIsDirty(true);
                }}
              />
              <span>Включить скидку / акцию</span>
            </label>
          </div>

          {hasDiscount && (
            <div className="calculator-form discount-form">
              <label>
                Размер скидки, %
                <input
                  type="number"
                  min="1"
                  max="90"
                  placeholder="0"
                  value={discountPercent === 0 ? "" : discountPercent}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setDiscountPercent(Math.min(90, Math.max(1, +e.target.value)));
                    setIsDirty(true);
                  }}
                />
              </label>
              <label>
                Старая зачёркнутая цена, ₸
                <input
                  type="number"
                  placeholder="0"
                  value={
                    (originalPriceInput || Math.round(originalPriceDisplay)) === 0
                      ? ""
                      : (originalPriceInput || Math.round(originalPriceDisplay))
                  }
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setOriginalPriceInput(+e.target.value);
                    setIsDirty(true);
                  }}
                />
              </label>
              <label>
                Итоговая цена со скидкой, ₸
                <input
                  type="number"
                  disabled
                  value={Math.round(retail)}
                />
              </label>
              <label>
                Выгода покупателя, ₸
                <input
                  type="text"
                  disabled
                  value={`${money(savingsKzt)} ₸`}
                />
              </label>
            </div>
          )}

          {/* Model Live Result Card */}
          <div className="product-profit-card">
            <div className="profit-preview">
              <span className="profit-image">
                <Image src={internalPhoto} alt="" fill unoptimized sizes="140px" />
              </span>
              <div>
                <small>{internalSku}</small>
                <strong>{internalName}</strong>
                <p>{internalDescription}</p>
                <div className="profit-swatches">
                  {modelVariants.map((v) => (
                    <span key={v.sku} className="matrix-swatch-mini" title={`${v.name} (${v.stock} шт.)`}>
                      <i style={{ background: v.color || "#8a8175" }} />
                      <small>{v.name}</small>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="price-hero">
              <span>{hasDiscount ? "Цена со скидкой" : "Цена продажи"}</span>
              <div className="hero-price-row">
                <strong>{money(retail)} ₸</strong>
                {hasDiscount && originalPriceDisplay > retail && (
                  <span className="hero-old-price">{money(originalPriceDisplay)} ₸</span>
                )}
              </div>
              <small>
                {hasDiscount
                  ? `Скидка -${discountPercent}% · Экономия: ${money(savingsKzt)} ₸`
                  : `Авто-рекомендация: ${money(recommendedPrice)} ₸`}
              </small>
            </div>
          </div>

          {/* 10 Unit Economics Metrics */}
          <div className="calculation-summary">
            <div><span>Закупка в тенге</span><strong>{money(purchaseKzt)} ₸</strong></div>
            <div><span>Фикс. себестоимость</span><strong>{money(fixedCost)} ₸</strong></div>
            <div><span>Точка безубыточности</span><strong>{money(breakEvenPrice)} ₸</strong></div>
            <div><span>Налог (3%)</span><strong>{money(taxAmount)} ₸</strong></div>
            <div><span>Банк / рассрочка</span><strong>{money(bankAmount)} ₸</strong></div>
            <div><span>Продавец (5%)</span><strong>{money(sellerAmount)} ₸</strong></div>
            <div><span>Чистая выручка</span><strong>{money(netRevenue)} ₸</strong></div>
            <div className="accent-result"><span>Прибыль с единицы</span><strong>{money(profit)} ₸</strong></div>
            <div><span>Маржа / прибыль</span><strong>{margin.toFixed(1)}%</strong></div>
            <div><span>Наценка к себестоимости</span><strong>{markupOnCost.toFixed(1)}%</strong></div>
          </div>

          <p className="formula-note">
            Автоцена = (фиксированная себестоимость + желаемая прибыль) / (1 − налог − банк − продавец).
            Все цвета модели наследуют рассчитанную экономику.
          </p>

          {/* Save / Publish Action Footer */}
          <div className="save-actions">
            <div className={`save-feedback ${saveState}`} aria-live="polite">
              <strong>{editingProductId ? `Карточка модели ${internalSku}` : "Новая карточка"}</strong>
              <span>{saveMessage || (isDirty ? "Есть несохранённые правки. Нажмите кнопку справа для сохранения." : "Все изменения сохранены в базе.")}</span>
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

        {/* Right Readiness Card */}
        <aside className="shipment-card">
          <p className="eyebrow">ТЕКУЩАЯ ПОСТАВКА</p>
          <h2>Готовность каталога</h2>
          <div className="progress-ring">
            <strong>{filteredProducts.reduce((acc, p) => acc + (p.quantity || 0), 0)}</strong>
            <span>инструментов на складе</span>
          </div>
          <ul>
            <li><span>Всего моделей</span><strong>{filteredProducts.length}</strong></li>
            <li><span>На витрине</span><strong style={{ color: "#128c7e" }}>{filteredProducts.filter(p => p.publicationStatus === "published").length} шт.</strong></li>
            <li><span>В черновиках</span><strong style={{ color: "#c87531" }}>{filteredProducts.filter(p => p.publicationStatus !== "published").length} шт.</strong></li>
            <li><span>Шаблоны расходов</span><strong>{presets.length} шаблонов</strong></li>
            <li><span>Онлайн-курсы</span><button type="button" className="inline-print-link" onClick={() => setIsCourseModalOpen(true)}>Настроить курсы 🎓</button></li>
            <li><span>Штрихкоды</span><button type="button" className="inline-print-link" onClick={() => setIsPrintModalOpen(true)}>Печать ценников 🖨</button></li>
          </ul>
          <button
            className="primary-button"
            onClick={() => document.getElementById("inventory")?.scrollIntoView({ behavior: "smooth" })}
          >
            Перейти к складу ↓
          </button>
        </aside>
      </div>

      {/* =========================================================================
         WAREHOUSE INVENTORY & BULK ACTIONS
         ========================================================================= */}
      <section className="inventory-card" id="inventory">
        <div className="card-heading">
          <div>
            <p className="eyebrow">СКЛАД ПОСТАВКИ</p>
            <h2>Товары и партии ({displayedInventoryProducts.length})</h2>
          </div>

          <div className="inventory-heading-tools">
            <div className="inventory-status-tabs">
              <button
                type="button"
                className={statusFilter === "all" ? "active" : ""}
                onClick={() => setStatusFilter("all")}
              >
                Все ({filteredProducts.length})
              </button>
              <button
                type="button"
                className={statusFilter === "published" ? "active" : ""}
                onClick={() => setStatusFilter("published")}
              >
                🟢 На витрине ({filteredProducts.filter(p => p.publicationStatus === "published").length})
              </button>
              <button
                type="button"
                className={statusFilter === "draft" ? "active" : ""}
                onClick={() => setStatusFilter("draft")}
              >
                🟡 Черновики ({filteredProducts.filter(p => p.publicationStatus !== "published").length})
              </button>
            </div>

            <label className="search-box small">
              <span>🔍</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по складу..." />
            </label>
          </div>
        </div>

        {/* Bulk Action Ribbon (Appears when >= 1 product is checked) */}
        {selectedProductIds.size > 0 && (
          <div className="bulk-actions-ribbon">
            <div className="bulk-count">
              <span>Выбрано товаров: <strong>{selectedProductIds.size}</strong></span>
              <button type="button" className="bulk-clear-btn" onClick={() => setSelectedProductIds(new Set())}>
                Снять выделение
              </button>
            </div>

            <div className="bulk-buttons">
              <button
                type="button"
                className="bulk-action-btn publish"
                onClick={() => handleBulkStatusChange(true)}
                title="Опубликовать все выбранные позиции на витрине"
              >
                🚀 Опубликовать на витрине ({selectedProductIds.size})
              </button>

              <button
                type="button"
                className="bulk-action-btn draft"
                onClick={() => handleBulkStatusChange(false)}
                title="Снять с витрины в черновики"
              >
                📦 В черновик ({selectedProductIds.size})
              </button>

              <div className="bulk-preset-group">
                <select
                  value={bulkPresetId}
                  onChange={(e) => setBulkPresetId(e.target.value)}
                  title="Выбрать шаблон для применения"
                >
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="bulk-action-btn preset"
                  onClick={handleBulkApplyPreset}
                  title="Пересчитать цены выбранных по формуле шаблона"
                >
                  🏷 Применить шаблон
                </button>
              </div>

              <button
                type="button"
                className="bulk-action-btn print"
                onClick={() => setIsPrintModalOpen(true)}
                title="Распечатать ценники и этикетки со штрихкодами для выбранных товаров"
              >
                🖨 Ценники ({selectedProductIds.size})
              </button>
              {selectedProductIds.size >= 2 && (
                <button
                  type="button"
                  className="bulk-action-btn merge"
                  onClick={() => setIsMergeModalOpen(true)}
                  title="Объединить несколько отдельных записей в одну карточку с матрицей цветов"
                >
                  🔗 Объединить в 1 модель ({selectedProductIds.size})
                </button>
              )}
            </div>
          </div>
        )}

        {/* Inventory Data Table */}
        <div className="inventory-table">
          <div className="inventory-head">
            <span className="inventory-checkbox-cell" style={{ width: 36 }}>
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleSelectAll}
                title={isAllSelected ? "Снять выделение со всех" : "Выбрать все в списке"}
              />
            </span>
            <span>Товар / Модель</span>
            <span>Артикул (SKU)</span>
            <span>Цена розницы</span>
            <span>Варианты</span>
            <span>Остаток</span>
            <span>Статус публикации</span>
            <span>Действие</span>
          </div>

          {displayedInventoryProducts.map((product) => {
            const isSelected = selectedProductIds.has(product.id);
            const isPublished = product.publicationStatus === "published";
            const prodHasDiscount = Boolean(
              product.isDiscountActive ||
              (product.discountPercent && product.discountPercent > 0) ||
              (product.originalPrice && product.price && product.originalPrice > product.price)
            );
            return (
              <div
                className={`inventory-row ${isSelected ? "selected-row" : ""}`}
                key={product.id}
              >
                <span className="inventory-checkbox-cell" style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectProduct(product.id)}
                    aria-label={`Выбрать ${product.name}`}
                  />
                </span>
                <span className="inventory-product" onClick={() => editStoredProduct(product)}>
                  <span className="inventory-thumb">
                    <Image src={product.image} alt="" fill unoptimized sizes="56px" />
                  </span>
                  <span>
                    <strong>{product.name}</strong>
                    <small>{product.category}</small>
                  </span>
                </span>
                <span className="mono-sku" onClick={() => editStoredProduct(product)}>{product.sku}</span>
                <span className="price-cell" onClick={() => editStoredProduct(product)}>
                  <strong>{product.price ? `${money(product.price)} ₸` : "—"}</strong>
                  {prodHasDiscount && product.originalPrice && (
                    <small className="inventory-old-price">{money(product.originalPrice)} ₸</small>
                  )}
                </span>
                <span onClick={() => editStoredProduct(product)}>{product.variants} {product.variants === 1 ? "вар." : "вар."}</span>
                <span onClick={() => editStoredProduct(product)}>
                  <strong>{product.quantity} шт.</strong>
                </span>
                <span>
                  <span
                    className={`status-chip ${isPublished ? "published" : "draft"}`}
                    onClick={() => editStoredProduct(product)}
                  >
                    {isPublished ? "🟢 На витрине" : "🟡 Черновик"}
                  </span>
                </span>
                <span>
                  <button
                    type="button"
                    className="row-edit-btn"
                    onClick={() => editStoredProduct(product)}
                  >
                    Настроить ⚙️
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </section>
  );
}
