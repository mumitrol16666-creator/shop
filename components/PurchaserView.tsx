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
import { playProductAudio, stopProductAudio } from "../lib/sound-synth";

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
  const [internalAllowProPack, setInternalAllowProPack] = useState<boolean>(true);
  const [internalProPackTitle, setInternalProPackTitle] = useState<string>("Чехол + Ремень + VIP Доступ");
  const [internalProPackPrice, setInternalProPackPrice] = useState<number>(8900);
  const [internalAllowStrings, setInternalAllowStrings] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"general" | "bundle" | "matrix" | "pricing">("general");
  const [isPlayingAudioPreview, setIsPlayingAudioPreview] = useState<boolean>(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<{
    url: string;
    title: string;
    subtitle?: string;
    variantIndex?: number;
  } | null>(null);

  const compressImage = (file: File): Promise<{ dataUrl: string; filename: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawBase64 = e.target?.result as string;
        if (!file.type.startsWith("image/")) {
          return resolve({ dataUrl: rawBase64, filename: file.name });
        }
        // `Image` is also the imported Next.js component in this file.
        // Use a real browser image element for client-side compression.
        const img = document.createElement("img");
        img.onload = () => {
          const maxDim = 1800;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const sourceCanvas = document.createElement("canvas");
          sourceCanvas.width = width;
          sourceCanvas.height = height;
          const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
          if (!sourceCtx) {
            return resolve({ dataUrl: rawBase64, filename: file.name });
          }
          sourceCtx.drawImage(img, 0, 0, width, height);

          // Trim transparent and nearly-white margins. Product photos usually
          // arrive with a lot of empty canvas, which makes the instrument look
          // tiny even when CSS uses object-fit: contain.
          let cropX = 0;
          let cropY = 0;
          let cropWidth = width;
          let cropHeight = height;
          try {
            const pixels = sourceCtx.getImageData(0, 0, width, height).data;
            let minX = width;
            let minY = height;
            let maxX = -1;
            let maxY = -1;
            const scanStep = Math.max(1, Math.floor(Math.max(width, height) / 900));

            for (let y = 0; y < height; y += scanStep) {
              for (let x = 0; x < width; x += scanStep) {
                const offset = (y * width + x) * 4;
                const r = pixels[offset] ?? 255;
                const g = pixels[offset + 1] ?? 255;
                const b = pixels[offset + 2] ?? 255;
                const a = pixels[offset + 3] ?? 0;
                const isEmpty = a < 18 || (r > 246 && g > 246 && b > 246);
                if (!isEmpty) {
                  minX = Math.min(minX, x);
                  minY = Math.min(minY, y);
                  maxX = Math.max(maxX, x);
                  maxY = Math.max(maxY, y);
                }
              }
            }

            if (maxX >= minX && maxY >= minY) {
              const detectedWidth = maxX - minX + scanStep;
              const detectedHeight = maxY - minY + scanStep;
              const detectedArea = detectedWidth * detectedHeight;
              if (detectedArea > width * height * 0.015) {
                const padding = Math.round(Math.max(detectedWidth, detectedHeight) * 0.045);
                cropX = Math.max(0, minX - padding);
                cropY = Math.max(0, minY - padding);
                cropWidth = Math.min(width - cropX, detectedWidth + padding * 2);
                cropHeight = Math.min(height - cropY, detectedHeight + padding * 2);
              }
            }
          } catch {
            // If pixel inspection is unavailable, keep the complete photo.
          }

          // Every uploaded product gets the same square canvas and breathing
          // room, so cards and modals stay visually consistent.
          const outputSize = 1100;
          const normalizedCanvas = document.createElement("canvas");
          normalizedCanvas.width = outputSize;
          normalizedCanvas.height = outputSize;
          const normalizedCtx = normalizedCanvas.getContext("2d");
          if (!normalizedCtx) {
            return resolve({ dataUrl: rawBase64, filename: file.name });
          }
          const availableSize = outputSize * 0.88;
          const scale = Math.min(availableSize / cropWidth, availableSize / cropHeight);
          const drawWidth = Math.max(1, Math.round(cropWidth * scale));
          const drawHeight = Math.max(1, Math.round(cropHeight * scale));
          const drawX = Math.round((outputSize - drawWidth) / 2);
          const drawY = Math.round((outputSize - drawHeight) / 2);
          normalizedCtx.clearRect(0, 0, outputSize, outputSize);
          normalizedCtx.drawImage(
            sourceCanvas,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            drawX,
            drawY,
            drawWidth,
            drawHeight,
          );

          const maxUploadBytes = 280 * 1024;
          let quality = 0.82;
          let mime = "image/webp";
          let compressedDataUrl = normalizedCanvas.toDataURL(mime, quality);
          let formatSupported = compressedDataUrl.startsWith("data:image/webp");
          if (!formatSupported) {
            mime = "image/jpeg";
            compressedDataUrl = normalizedCanvas.toDataURL(mime, quality);
          }
          const approximateBytes = (dataUrl: string) => Math.ceil((dataUrl.length * 3) / 4);
          while (approximateBytes(compressedDataUrl) > maxUploadBytes && quality > 0.40) {
            quality -= 0.08;
            compressedDataUrl = normalizedCanvas.toDataURL(mime, quality);
          }
          // If still over budget, scale down resolution
          if (approximateBytes(compressedDataUrl) > maxUploadBytes) {
            const smallCanvas = document.createElement("canvas");
            smallCanvas.width = 850;
            smallCanvas.height = 850;
            const sCtx = smallCanvas.getContext("2d");
            if (sCtx) {
              sCtx.drawImage(normalizedCanvas, 0, 0, 850, 850);
              compressedDataUrl = smallCanvas.toDataURL(mime, 0.75);
            }
          }

          const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
          const fallbackExtension = file.type === "image/png" ? "png" : "jpg";
          resolve({
            dataUrl: compressedDataUrl,
            filename: `${baseName}.${formatSupported ? "webp" : "jpg"}`,
          });
        };
        img.onerror = () => resolve({ dataUrl: rawBase64, filename: file.name });
        img.src = rawBase64;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadImageFile = async (file: File, onSuccess: (url: string) => void) => {
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const processed = await compressImage(file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: processed.filename, base64: processed.dataUrl }),
      });
      const responseText = await res.text();
      let data: { url?: string; error?: string } = {};
      try {
        data = JSON.parse(responseText) as { url?: string; error?: string };
      } catch {
        data.error = res.status === 413
          ? "Фотография слишком большая для сервера"
          : `Сервер вернул ошибку ${res.status}`;
      }
      if (res.ok && data.url) {
        onSuccess(data.url);
        setIsDirty(true);
        setNotice(`✅ Фото успешно загружено: ${file.name}`);
        setTimeout(() => setNotice(""), 3000);
      } else {
        alert(`Ошибка загрузки: ${data.error || "Не удалось сохранить файл"}`);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(`Не удалось загрузить изображение: ${err?.message || "Ошибка соединения"}`);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

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

  
  const startNewProduct = () => {
    setEditingProductId(undefined);
    setCurrentPublicationStatus("draft");
    setInternalName("");
    setInternalSku(`MAESTRO-${Date.now().toString().slice(-4)}`);
    setInternalCategory("Электрогитары");
    setInternalPhoto("/placeholder.png");
    setInternalDescription("");
    setFeaturesText("");
    setTargetAudience("Для начинающих");
    setAttachedCourseId("auto");
    setInternalAudioUrl("");
    setInternalAllowProPack(true);
    setInternalProPackTitle("Чехол + Ремень + VIP Доступ");
    setInternalProPackPrice(8900);
    setInternalAllowStrings(true);
    setHasDiscount(false);
    setDiscountPercent(15);
    setOriginalPriceInput(0);
    setModelVariants([
      {
        id: `var-${Date.now()}-1`,
        name: "Основной цвет",
        color: "#181511",
        colorName: "Black",
        sku: `MAESTRO-${Date.now().toString().slice(-4)}-BLK`,
        barcode: "",
        size: "Full Size",
        stock: 1,
        image: "",
      },
    ]);
    setActiveTab("general");
    setIsDirty(true);
    setNotice("➕ Создание нового товара. Заполните поля и сохраните.");
    window.setTimeout(() => setNotice(""), 3000);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    setInternalAllowProPack(product.allowProPack !== false);
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
          attachedCourseId: attachedCourseId,
          allowProPack: internalAllowProPack,
          proPackTitle: internalProPackTitle.trim(),
          proPackPrice: internalProPackPrice,
          allowStringsUpsell: internalAllowStrings,
          audioUrl: internalAudioUrl.trim() || undefined,
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
        allowProPack: internalAllowProPack,
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
        const index = current.findIndex(
          (p) =>
            String(p.id) === String(updatedProduct.id) ||
            (p.sku && updatedProduct.sku && p.sku.toLowerCase() === updatedProduct.sku.toLowerCase()),
        );
        if (index >= 0) {
          const copy = [...current];
          copy[index] = updatedProduct;
          return copy;
        }
        return [updatedProduct, ...current];
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

      {/* Course Editor Modal */}
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

      {/* Price Tag Print Modal */}
      <PriceTagPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        products={selectedProductIds.size > 0 ? selectedForMerge : displayedInventoryProducts}
      />

      {/* Merge Products Modal */}
      <MergeProductsModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        selectedProducts={selectedForMerge}
        onConfirmMerge={handleConfirmMerge}
      />

      <div className="purchaser-grid">
        <section className="calculator-card modern-editor-card">
          {/* Top Modern Header */}
          <div className="modern-editor-header">
            <div className="editor-title-wrap">
              <div className="editor-thumb">
                <Image
                  src={internalPhoto || "/placeholder.png"}
                  alt=""
                  fill
                  unoptimized
                  sizes="64px"
                />
              </div>
              <div className="editor-titles">
                <div className="editor-status-row">
                  <span className={`status-pill ${currentPublicationStatus === "published" ? "published" : "draft"}`}>
                    <i className="status-dot" /> {currentPublicationStatus === "published" ? "Опубликовано на витрине" : "В черновиках"}
                  </span>
                  {isDirty && (
                    <span className="status-pill dirty">
                      ● Есть несохранённые правки
                    </span>
                  )}
                  {lastSavedTime && <small className="last-saved-hint">Сохранено: {lastSavedTime}</small>}
                </div>
                <h2>{internalName || "Новая модель инструмента"}</h2>
                <div className="editor-sku-row">
                  <span className="sku-badge">SKU: {internalSku}</span>
                  <span className="category-badge">{internalCategory}</span>
                  <span className="stock-badge">Остаток: {totalModelStock} шт.</span>
                </div>
              </div>
            </div>

            <div className="editor-header-actions">
              <div className="preset-quick-group">
                <span className="preset-label">Шаблон:</span>
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
                  className="icon-tool-btn"
                  onClick={() => setIsPresetModalOpen(true)}
                  title="Настройка шаблонов расходов"
                >
                  ⚙️
                </button>
              </div>

              <div className="util-btn-group">
                <button
                  type="button"
                  className="util-btn add-new-product-btn"
                  onClick={startNewProduct}
                  title="Создать новую карточку товара с нуля"
                >
                  ➕ Новый товар
                </button>
                <button
                  type="button"
                  className="util-btn analytics-highlight-btn"
                  onClick={() => window.open("/admin/analytics", "_blank")}
                  title="Открыть сводный финансовый отчет и аналитику склада в новом окне для печати"
                >
                  📊 Аналитика склада
                </button>
                <button
                  type="button"
                  className="util-btn"
                  onClick={() => setIsCourseModalOpen(true)}
                >
                  🎓 Курсы ({adminCourses.length})
                </button>
                <button
                  type="button"
                  className="util-btn"
                  onClick={() => setIsPrintModalOpen(true)}
                >
                  🖨 Ценники
                </button>
              </div>

              <div className="main-save-group">
                <button
                  type="button"
                  className="save-draft-btn"
                  disabled={saveState === "saving"}
                  onClick={() => saveProduct(false)}
                >
                  Черновик
                </button>
                <button
                  type="button"
                  className="save-publish-btn"
                  disabled={saveState === "saving"}
                  onClick={() => saveProduct(true)}
                >
                  {saveState === "saving" ? "Сохраняем..." : "💾 Опубликовать"}
                </button>
              </div>
            </div>
          </div>

          {/* Segmented Modern Navigation Tabs */}
          <div className="editor-tabs-bar">
            <button
              type="button"
              className={`editor-tab-btn ${activeTab === "general" ? "active" : ""}`}
              onClick={() => setActiveTab("general")}
            >
              <span>🏷️</span>
              <strong>1. Карточка и витрина</strong>
            </button>
            <button
              type="button"
              className={`editor-tab-btn ${activeTab === "bundle" ? "active" : ""}`}
              onClick={() => setActiveTab("bundle")}
            >
              <span>🎁</span>
              <strong>2. Комплектация и подарки</strong>
            </button>
            <button
              type="button"
              className={`editor-tab-btn ${activeTab === "matrix" ? "active" : ""}`}
              onClick={() => setActiveTab("matrix")}
            >
              <span>🎨</span>
              <strong>3. Цвета и склад ({modelVariants.length})</strong>
            </button>
            <button
              type="button"
              className={`editor-tab-btn ${activeTab === "pricing" ? "active" : ""}`}
              onClick={() => setActiveTab("pricing")}
            >
              <span>💰</span>
              <strong>4. Экономика и цены ({money(retail)} ₸)</strong>
            </button>
          </div>

          {/* TAB 1: GENERAL & STOREFRONT */}
          {activeTab === "general" && (
            <div className="tab-pane-content">
              <div className="tab-section-head">
                <strong>Основная информация о модели</strong>
                <p>Название, категория, фотографии, звукозапись и описание для покупателей на витрине.</p>
              </div>

              <div className="model-info-grid">
                <div className="editor-field-card">
                  <span className="field-label-text">Название модели</span>
                  <input
                    value={internalName}
                    onChange={(e) => {
                      setInternalName(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="например, Электрогитара ST-20 HSS"
                  />
                </div>

                <div className="editor-field-card">
                  <span className="field-label-text">Базовый артикул (SKU)</span>
                  <input
                    value={internalSku}
                    onChange={(e) => {
                      setInternalSku(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="EG-ST20"
                  />
                </div>

                <div className="editor-field-card">
                  <span className="field-label-text">Категория на сайте</span>
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
                </div>

                <div className="editor-field-card">
                  <span className="field-label-text">Маркетинговый бейдж</span>
                  <input
                    value={targetAudience}
                    onChange={(e) => {
                      setTargetAudience(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Для начинающих / Хит продаж / Sale"
                  />
                </div>

                <div className="editor-field-card full-width">
                  <span className="field-label-text">📸 Главное фото инструмента (PNG / JPG / WebP)</span>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "4px" }}>
                    <input
                      style={{ flex: 1 }}
                      value={internalPhoto}
                      onChange={(e) => {
                        setInternalPhoto(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="/products/01_st20_electric.png или вставьте ссылку"
                    />
                    <label
                      className="primary-button small"
                      style={{
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "10px 18px",
                        borderRadius: "10px",
                      }}
                    >
                      📁 {isUploadingPhoto ? "Загрузка..." : "Загрузить фото"}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadImageFile(file, (url) => setInternalPhoto(url));
                        }}
                      />
                    </label>
                  </div>
                  {internalPhoto && (
                    <div style={{
                      marginTop: "12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "14px",
                      background: "#faf8f5",
                      padding: "10px 16px",
                      borderRadius: "12px",
                      border: "1.5px solid var(--line)",
                    }}>
                      <div style={{ position: "relative", width: "52px", height: "52px", borderRadius: "10px", overflow: "hidden", background: "#fff", border: "1px solid var(--line)" }}>
                        <Image src={internalPhoto} alt="Превью" fill unoptimized sizes="52px" style={{ objectFit: "contain" }} />
                      </div>
                      <div>
                        <strong style={{ display: "block", fontSize: "13px", color: "var(--ink)", fontWeight: 800 }}>Превью изображения</strong>
                        <small style={{ color: "var(--muted)", fontSize: "11.5px" }}>Путь: {internalPhoto}</small>
                      </div>
                    </div>
                  )}
                </div>

                <div className="editor-field-card full-width">
                  <span className="field-label-text">🎵 Аудиозапись звучания инструмента (MP3 / Прямая ссылка)</span>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "4px" }}>
                    <input
                      style={{ flex: 1 }}
                      value={internalAudioUrl}
                      onChange={(e) => {
                        setInternalAudioUrl(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="например, /audio/st20_preview.mp3 или https://example.com/sound.mp3"
                    />
                    {internalAudioUrl.trim() && (
                      <button
                        type="button"
                        className="outline-button small"
                        style={{ whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "6px", height: "42px", padding: "0 16px" }}
                        onClick={() => {
                          if (isPlayingAudioPreview) {
                            stopProductAudio();
                            setIsPlayingAudioPreview(false);
                          } else {
                            setIsPlayingAudioPreview(true);
                            playProductAudio(internalAudioUrl, () => setIsPlayingAudioPreview(false));
                          }
                        }}
                      >
                        {isPlayingAudioPreview ? "⏹ Остановить" : "▶ Слушать"}
                      </button>
                    )}
                  </div>
                  <small style={{ color: "var(--muted)", fontSize: "12px", marginTop: "6px", display: "block" }}>
                    💡 Если поле пустое, кнопка «Послушать» на витрине скрыта. Воспроизводится только при наличии ссылки на реальный аудиофайл.
                  </small>
                </div>

                <div className="editor-field-card full-width">
                  <span className="field-label-text">Краткое описание инструмента</span>
                  <textarea
                    rows={3}
                    style={{ marginTop: "4px" }}
                    value={internalDescription}
                    onChange={(e) => {
                      setInternalDescription(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Универсальная электрогитара формы ST для первых занятий и домашней практики."
                  />
                </div>

                <div className="editor-field-card full-width">
                  <span className="field-label-text">Преимущества и характеристики (через запятую)</span>
                  <input
                    style={{ marginTop: "4px" }}
                    value={featuresText}
                    onChange={(e) => {
                      setFeaturesText(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Форма корпуса ST, Конфигурация HSS, 6 цветов, Стандартная мензура"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BUNDLES & UPSELLS */}
          {activeTab === "bundle" && (
            <div className="tab-pane-content">
              <div className="tab-section-head">
                <strong>Комплектация, подарки и допродажи</strong>
                <p>Включайте или отключайте подарочный онлайн-курс, состав PRO-комплекта и предложение струн со скидкой 50% с помощью переключателей справа.</p>
              </div>

              <div className="bundle-editor-grid">
                {/* 1. GIFT COURSE */}
                <div className={`bundle-config-card ${attachedCourseId !== "none" ? "enabled" : "disabled"}`}>
                  <div className="bundle-card-header-row">
                    <div className="bundle-card-top">
                      <span className="bundle-icon">🎁</span>
                      <div>
                        <strong>1. Подарочный онлайн-курс к инструменту</strong>
                        <span>Бесплатный видеокурс в подарок (ценность 19 900 ₸) при покупке</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`bundle-switch-btn ${attachedCourseId !== "none" ? "active" : ""}`}
                      onClick={() => {
                        setAttachedCourseId((prev) => (prev === "none" ? "auto" : "none"));
                        setIsDirty(true);
                      }}
                    >
                      <span className="switch-knob" />
                      <span className="switch-text">{attachedCourseId !== "none" ? "ВКЛЮЧЕН" : "ОТКЛЮЧЕН"}</span>
                    </button>
                  </div>

                  {attachedCourseId !== "none" ? (
                    <div className="bundle-card-body">
                      <label>
                        Привязанный курс из Академии Maestro:
                        <select
                          value={attachedCourseId}
                          onChange={(e) => {
                            setAttachedCourseId(e.target.value);
                            setIsDirty(true);
                          }}
                        >
                          <option value="auto">✨ Автоматически (по категории инструмента)</option>
                          {adminCourses.map((c) => (
                            <option key={c.id} value={c.id}>
                              🎓 {c.title} ({c.level}, {c.lessonsCount || 10} уроков)
                            </option>
                          ))}
                        </select>
                      </label>
                      <span className="bundle-status-tag green">✓ Отображается на карточке товара как бесплатный подарок (0 ₸)</span>
                    </div>
                  ) : (
                    <div className="bundle-card-disabled-hint">
                      <p>❌ <strong>Курс отключен</strong>. Товар продается только как инструмент в заводской коробке без онлайн-уроков.</p>
                    </div>
                  )}
                </div>

                {/* 2. PRO PACK */}
                <div className={`bundle-config-card ${internalAllowProPack ? "enabled" : "disabled"}`}>
                  <div className="bundle-card-header-row">
                    <div className="bundle-card-top">
                      <span className="bundle-icon">👑</span>
                      <div>
                        <strong>2. PRO Комплект (Чехол, аксессуары и VIP)</strong>
                        <span>Расширенный набор аксессуаров для увеличения среднего чека</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`bundle-switch-btn ${internalAllowProPack ? "active" : ""}`}
                      onClick={() => {
                        setInternalAllowProPack((prev) => !prev);
                        setIsDirty(true);
                      }}
                    >
                      <span className="switch-knob" />
                      <span className="switch-text">{internalAllowProPack ? "ВКЛЮЧЕН" : "ОТКЛЮЧЕН"}</span>
                    </button>
                  </div>

                  {internalAllowProPack ? (
                    <div className="bundle-card-body">
                      <div className="two-cols-input">
                        <label>
                          Название и состав аксессуаров в PRO-комплекте
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
                          Доплата за PRO-комплект (₸)
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
                      </div>
                      <span className="bundle-status-tag gold">✓ Покупатель сможет выбрать кнопку «👑 PRO Комплект (+{money(internalProPackPrice)} ₸)»</span>
                    </div>
                  ) : (
                    <div className="bundle-card-disabled-hint">
                      <p>❌ <strong>PRO-комплект отключен</strong>. Кнопка выбора PRO-комплекта скрыта на карточке этого товара.</p>
                    </div>
                  )}
                </div>

                {/* 3. STRINGS UPSELL (-50%) */}
                <div className={`bundle-config-card ${internalAllowStrings ? "enabled" : "disabled"}`}>
                  <div className="bundle-card-header-row">
                    <div className="bundle-card-top">
                      <span className="bundle-icon">⚡</span>
                      <div>
                        <strong>3. Допродажа струн со скидкой 50% (Order Bump)</strong>
                        <span>Выбор премиум-струн Elixir / D'Addario со скидкой 50%</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`bundle-switch-btn ${internalAllowStrings ? "active" : ""}`}
                      onClick={() => {
                        setInternalAllowStrings((prev) => !prev);
                        setIsDirty(true);
                      }}
                    >
                      <span className="switch-knob" />
                      <span className="switch-text">{internalAllowStrings ? "ВКЛЮЧЕН" : "ОТКЛЮЧЕН"}</span>
                    </button>
                  </div>

                  {internalAllowStrings ? (
                    <div className="bundle-card-body">
                      <div className="bump-preview-pills" style={{ display: "flex", gap: "10px", flexWrap: "wrap", margin: "4px 0" }}>
                        <span style={{ fontSize: "12px", background: "#fff", padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--line)", fontWeight: 700 }}>
                          👑 Струны Elixir Nanoweb (USA): <strong>+4 950 ₸</strong> <del style={{ color: "var(--muted)" }}>9 900 ₸</del>
                        </span>
                        <span style={{ fontSize: "12px", background: "#fff", padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--line)", fontWeight: 700 }}>
                          🎸 Струны D'Addario Pro: <strong>+2 450 ₸</strong> <del style={{ color: "var(--muted)" }}>4 900 ₸</del>
                        </span>
                      </div>
                      <span className="bundle-status-tag green">✓ Блок предложения запасных струн со скидкой -50% активен в карточке</span>
                    </div>
                  ) : (
                    <div className="bundle-card-disabled-hint">
                      <p>❌ <strong>Спецпредложение струн отключено</strong>. Блок допродажи струн скрыт в карточке этого товара.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MATRIX & STOCK */}
          {activeTab === "matrix" && (
            <div className="tab-pane-content">
              <div className="card-subhead between">
                <div>
                  <strong>Матрица цветов и модификаций модели ({modelVariants.length})</strong>
                  <span>Все расцветки и размеры гитары хранятся в одной карточке. Общий остаток: <strong>{totalModelStock} шт.</strong></span>
                </div>
                <button type="button" className="primary-button small" onClick={addVariantRow}>
                  + Добавить вариант / цвет
                </button>
              </div>

              <div className="variant-matrix-table">
                <div className="variant-matrix-head" style={{ gridTemplateColumns: "110px 100px 1.4fr 1.2fr 1.1fr 70px 85px 80px" }}>
                  <span>Цвет</span>
                  <span>Фото цвета</span>
                  <span>Название цвета</span>
                  <span>SKU варианта</span>
                  <span>Штрихкод</span>
                  <span>Размер</span>
                  <span>Остаток</span>
                  <span>Действия</span>
                </div>
                {modelVariants.map((variant, index) => (
                  <div className="variant-matrix-row" key={variant.id || `${variant.sku}-${index}`} style={{ gridTemplateColumns: "110px 100px 1.4fr 1.2fr 1.1fr 70px 85px 80px" }}>
                    <div className="variant-color-input-wrap">
                      <input
                        type="color"
                        value={variant.color || "#171717"}
                        onChange={(e) => updateVariantRow(index, { color: e.target.value })}
                        title="Выбрать цвет"
                      />
                      <input
                        type="text"
                        placeholder="#171717"
                        value={variant.color || ""}
                        onChange={(e) => updateVariantRow(index, { color: e.target.value })}
                        className="color-hex-text"
                      />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div
                        style={{
                          position: "relative",
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          overflow: "hidden",
                          background: "#faf8f5",
                          border: "1.5px solid var(--line)",
                          flexShrink: 0,
                          cursor: "zoom-in",
                          transition: "transform 0.2s ease, border-color 0.2s ease",
                        }}
                        className="variant-thumb-clickable"
                        onClick={() =>
                          setPreviewPhotoModal({
                            url: variant.image || internalPhoto || "/placeholder.png",
                            title: `${internalName} — ${variant.colorName || variant.name}`,
                            subtitle: `SKU: ${variant.sku || internalSku} · Цвет: ${variant.color}`,
                            variantIndex: index,
                          })
                        }
                        title="🔍 Нажмите, чтобы открыть фото в полном размере"
                      >
                        <Image
                          src={variant.image || internalPhoto || "/placeholder.png"}
                          alt=""
                          fill
                          unoptimized
                          sizes="36px"
                          style={{ objectFit: "contain" }}
                        />
                      </div>
                      <label style={{ cursor: "pointer", fontSize: "11px", padding: "5px 7px", background: "#f4efe9", border: "1px solid var(--line)", borderRadius: "6px", fontWeight: 700 }} title="Загрузить фото для этого цвета">
                        📷
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadImageFile(file, (url) => updateVariantRow(index, { image: url }));
                          }}
                        />
                      </label>
                    </div>

                    <input
                      type="text"
                      placeholder="Название цвета"
                      value={variant.colorName || variant.name}
                      onChange={(e) => {
                        updateVariantRow(index, { name: e.target.value, colorName: e.target.value });
                      }}
                    />
                    <input
                      type="text"
                      placeholder="SKU"
                      value={variant.sku}
                      onChange={(e) => updateVariantRow(index, { sku: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Штрихкод"
                      value={variant.barcode || ""}
                      onChange={(e) => updateVariantRow(index, { barcode: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="39″"
                      value={variant.size || "39″"}
                      onChange={(e) => updateVariantRow(index, { size: e.target.value })}
                      className="size-input"
                    />
                    <input
                      type="number"
                      min="0"
                      value={variant.stock === 0 ? "" : variant.stock}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => updateVariantRow(index, { stock: Math.max(0, +e.target.value) })}
                      className="stock-input"
                    />
                    <div className="variant-actions">
                      <button
                        type="button"
                        className="action-icon-btn"
                        onClick={() => duplicateVariantRow(index)}
                        title="Дублировать строку"
                      >
                        📋
                      </button>
                      <button
                        type="button"
                        className="action-icon-btn delete"
                        onClick={() => removeVariantRow(index)}
                        disabled={modelVariants.length <= 1}
                        title="Удалить вариант"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: PRICING & UNIT ECONOMICS */}
          {activeTab === "pricing" && (
            <div className="tab-pane-content pricing-pane">
              <div className="tab-section-head">
                <strong>Калькулятор себестоимости и Kaspi Рассрочки 0-0-12</strong>
                <p>Прямой расчет юнит-экономики из Китая с учетом комиссий, налогов и чистой маржи.</p>
              </div>

              {/* 1. Блок расходов и логистики */}
              <div className="pricing-section-block">
                <div className="pricing-section-header">
                  <span className="pricing-badge-step">1</span>
                  <div>
                    <strong>Закупка и логистика (Китай / Импорт)</strong>
                    <small>Базовые затраты на закупку товара и доставку в Казахстан</small>
                  </div>
                </div>

                <div className="pricing-grid-cards">
                  <div className="editor-field-card">
                    <span className="field-label-text">Валюта закупки</span>
                    <select
                      value={currency}
                      onChange={(e) => {
                        setCurrency(e.target.value as "CNY" | "USD" | "KZT");
                        setIsDirty(true);
                      }}
                    >
                      <option value="CNY">¥ Юань (CNY)</option>
                      <option value="USD">$ Доллар (USD)</option>
                      <option value="KZT">₸ Тенге (KZT)</option>
                    </select>
                  </div>

                  {currency === "CNY" && (
                    <div className="editor-field-card">
                      <span className="field-label-text">Курс юаня, ₸</span>
                      <input
                        type="number"
                        step="0.1"
                        value={cnyRate}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          setCnyRate(+e.target.value);
                          setIsDirty(true);
                        }}
                      />
                    </div>
                  )}

                  {currency === "USD" && (
                    <div className="editor-field-card">
                      <span className="field-label-text">Курс доллара, ₸</span>
                      <input
                        type="number"
                        step="1"
                        value={usdRate}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          setUsdRate(+e.target.value);
                          setIsDirty(true);
                        }}
                      />
                    </div>
                  )}

                  <div className="editor-field-card">
                    <span className="field-label-text">Закупка за единицу ({currency})</span>
                    <input
                      type="number"
                      value={purchase === 0 ? "" : purchase}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setPurchase(+e.target.value);
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  <div className="editor-field-card">
                    <span className="field-label-text">Доставка по Китаю, ₸</span>
                    <input
                      type="number"
                      value={delivery === 0 ? "" : delivery}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setDelivery(+e.target.value);
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  <div className="editor-field-card">
                    <span className="field-label-text">Карго / Доставка в РК, ₸</span>
                    <input
                      type="number"
                      value={cargo === 0 ? "" : cargo}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setCargo(+e.target.value);
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  <div className="editor-field-card">
                    <span className="field-label-text">Таможня / Оформление, ₸</span>
                    <input
                      type="number"
                      value={customs === 0 ? "" : customs}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setCustoms(+e.target.value);
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  <div className="editor-field-card">
                    <span className="field-label-text">Упаковка / Коробка, ₸</span>
                    <input
                      type="number"
                      value={packaging === 0 ? "" : packaging}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setPackaging(+e.target.value);
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  <div className="editor-field-card">
                    <span className="field-label-text">Доводка мастера, ₸</span>
                    <input
                      type="number"
                      value={setupCost === 0 ? "" : setupCost}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setSetupCost(+e.target.value);
                        setIsDirty(true);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Блок налогов и комиссий */}
              <div className="pricing-section-block">
                <div className="pricing-section-header">
                  <span className="pricing-badge-step">2</span>
                  <div>
                    <strong>Маркетинг, налоги и Kaspi Рассрочка</strong>
                    <small>Комиссии банков, продавца и маркетинговые издержки</small>
                  </div>
                </div>

                <div className="pricing-grid-cards">
                  <div className="editor-field-card">
                    <span className="field-label-text">Маркетинг / Лид, ₸</span>
                    <input
                      type="number"
                      value={marketingCost === 0 ? "" : marketingCost}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setMarketingCost(+e.target.value);
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  <div className="editor-field-card">
                    <span className="field-label-text">Прочие расходы, ₸</span>
                    <input
                      type="number"
                      value={other === 0 ? "" : other}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setOther(+e.target.value);
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  <div className="editor-field-card">
                    <span className="field-label-text">Налог (УСН), %</span>
                    <input
                      type="number"
                      value={taxPercent === 0 ? "" : taxPercent}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setTaxPercent(+e.target.value);
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  <div className="editor-field-card">
                    <span className="field-label-text">Kaspi Рассрочка, %</span>
                    <input
                      type="number"
                      value={bankPercent === 0 ? "" : bankPercent}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setBankPercent(+e.target.value);
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  <div className="editor-field-card">
                    <span className="field-label-text">Срок рассрочки, мес.</span>
                    <input
                      type="number"
                      value={installmentMonths === 0 ? "" : installmentMonths}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setInstallmentMonths(+e.target.value);
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  <div className="editor-field-card">
                    <span className="field-label-text">Комиссия продавца, %</span>
                    <input
                      type="number"
                      value={sellerPercent === 0 ? "" : sellerPercent}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setSellerPercent(+e.target.value);
                        setIsDirty(true);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Режим ценообразования */}
              <div className="pricing-section-block">
                <div className="pricing-section-header">
                  <span className="pricing-badge-step">3</span>
                  <div>
                    <strong>Режим расчета розничной цены</strong>
                    <small>Выберите автоматический расчёт по целевой марже или ручной фикс</small>
                  </div>
                </div>

                <div className="pricing-mode-toolbar">
                  <button
                    type="button"
                    className={`pricing-mode-btn ${!manualPricing ? "active" : ""}`}
                    onClick={() => {
                      setManualPricing(false);
                      setIsDirty(true);
                    }}
                  >
                    ⚡ Автоматически по марже ({markup}%)
                  </button>
                  <button
                    type="button"
                    className={`pricing-mode-btn ${manualPricing ? "active" : ""}`}
                    onClick={() => {
                      setManualPricing(true);
                      setManualPrice(Math.round(recommendedPrice));
                      setIsDirty(true);
                    }}
                  >
                    ✍️ Ручная фиксированная цена
                  </button>
                </div>

                <div className="pricing-grid-cards">
                  <div className="editor-field-card">
                    <span className="field-label-text">Желаемая прибыль (маржа), %</span>
                    <input
                      type="number"
                      value={markup === 0 ? "" : markup}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setMarkup(+e.target.value);
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  <div className={`editor-field-card ${manualPricing ? "highlight-manual" : ""}`}>
                    <span className="field-label-text">
                      Итоговая розничная цена, ₸ {manualPricing && <span className="manual-badge">Ручная</span>}
                    </span>
                    <input
                      type="number"
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
                  </div>
                </div>
              </div>

              {/* 4. Скидка и Sale */}
              <div className="pricing-section-block discount-block">
                <div className="discount-header-row">
                  <div className="discount-title-group">
                    <h4 className="discount-main-title">Скидка и старая зачёркнутая цена (Sale)</h4>
                    <p className="discount-subtitle">Привлечение внимания покупателей на витрине интернет-магазина</p>
                  </div>
                  <label className="discount-switch-label">
                    <input
                      type="checkbox"
                      checked={hasDiscount}
                      onChange={(e) => {
                        setHasDiscount(e.target.checked);
                        setIsDirty(true);
                      }}
                    />
                    <span className="discount-switch-text">Включить скидку на витрине</span>
                  </label>
                </div>

                {hasDiscount && (
                  <div className="pricing-grid-cards" style={{ marginTop: "16px" }}>
                    <div className="editor-field-card">
                      <span className="field-label-text">Размер скидки, %</span>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={discountPercent === 0 ? "" : discountPercent}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          setDiscountPercent(Math.min(90, Math.max(1, +e.target.value)));
                          setIsDirty(true);
                        }}
                      />
                    </div>
                    <div className="editor-field-card">
                      <span className="field-label-text">Старая зачёркнутая цена, ₸</span>
                      <input
                        type="number"
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
                    </div>
                    <div className="editor-field-card">
                      <span className="field-label-text">Итого к оплате покупателем</span>
                      <input type="text" disabled value={`${money(Math.round(retail))} ₸`} />
                    </div>
                    <div className="editor-field-card">
                      <span className="field-label-text">Выгода покупателя</span>
                      <input type="text" disabled value={`${money(savingsKzt)} ₸`} />
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Итоговая юнит-экономика */}
              <div className="pricing-section-block">
                <div className="pricing-section-header">
                  <span className="pricing-badge-step">5</span>
                  <div>
                    <strong>Итоговая юнит-экономика и прибыль</strong>
                    <small>Живой расчет прибыльности и маржинальности с одной продажи</small>
                  </div>
                </div>

                <div className="calculation-summary">
                  <div><span>Закупка в тенге</span><strong>{money(purchaseKzt)} ₸</strong></div>
                  <div><span>Фикс. себестоимость</span><strong>{money(fixedCost)} ₸</strong></div>
                  <div><span>Точка безубыточности</span><strong>{money(breakEvenPrice)} ₸</strong></div>
                  <div><span>Налог ({taxPercent}%)</span><strong>{money(taxAmount)} ₸</strong></div>
                  <div><span>Kaspi Рассрочка</span><strong>{money(bankAmount)} ₸</strong></div>
                  <div><span>Продавец ({sellerPercent}%)</span><strong>{money(sellerAmount)} ₸</strong></div>
                  <div><span>Чистая выручка</span><strong>{money(netRevenue)} ₸</strong></div>
                  <div className="accent-result"><span>Прибыль с 1 шт.</span><strong>{money(profit)} ₸</strong></div>
                  <div><span>Маржа</span><strong>{margin.toFixed(1)}%</strong></div>
                  <div><span>Наценка к себестоимости</span><strong>{markupOnCost.toFixed(1)}%</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* Sticky Bottom Save / Publish Bar */}
          <div className="save-actions">
            <div className={`save-feedback ${saveState}`} aria-live="polite">
              <strong>{editingProductId ? `Модель ${internalSku}` : "Новая карточка"}</strong>
              <span>{saveMessage || (isDirty ? "Есть несохранённые правки." : "Все изменения сохранены в базе.")}</span>
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
              💾 Сохранить и показать на витрине
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
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div>
              <p className="eyebrow">СКЛАД ПОСТАВКИ</p>
              <h2>Товары и партии ({displayedInventoryProducts.length})</h2>
            </div>
            <button
              type="button"
              onClick={startNewProduct}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 22px",
                background: "linear-gradient(135deg, #d6a43f, #b98322)",
                color: "#181511",
                border: "none",
                borderRadius: "10px",
                fontWeight: "800",
                fontSize: "14px",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(214, 164, 63, 0.4)",
              }}
            >
              <span>➕</span> Добавить новый товар
            </button>
          </div>

          <div className="inventory-heading-tools">
            <button
              type="button"
              className="primary-button small"
              onClick={startNewProduct}
              title="Создать новый товар"
            >
              + Добавить товар
            </button>
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

      {/* PHOTO PREVIEW LIGHTBOX MODAL */}
      {previewPhotoModal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setPreviewPhotoModal(null)}>
          <div
            className="photo-lightbox-card"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="photo-lightbox-header">
              <div>
                <strong>{previewPhotoModal.title}</strong>
                {previewPhotoModal.subtitle && <span style={{ display: "block", fontSize: "12px", color: "var(--muted)" }}>{previewPhotoModal.subtitle}</span>}
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setPreviewPhotoModal(null)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <div className="photo-lightbox-body">
              <img
                src={previewPhotoModal.url}
                alt={previewPhotoModal.title}
                className="photo-lightbox-img"
              />
            </div>

            <div className="photo-lightbox-footer">
              <span className="photo-lightbox-path">{previewPhotoModal.url}</span>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <label className="primary-button small" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  📁 Заменить фото
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        uploadImageFile(file, (url) => {
                          if (previewPhotoModal.variantIndex !== undefined) {
                            updateVariantRow(previewPhotoModal.variantIndex, { image: url });
                          } else {
                            setInternalPhoto(url);
                          }
                          setPreviewPhotoModal((prev) => (prev ? { ...prev, url } : null));
                        });
                      }
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="outline-button small"
                  onClick={() => setPreviewPhotoModal(null)}
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
