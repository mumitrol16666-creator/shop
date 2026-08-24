"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { money, type Product, type Variant, variantsFor } from "../lib/catalog-data";
import { type CostPreset, loadPresets, loadPresetsRemote } from "../lib/presets";
import { calculateProductPricing } from "../lib/product-pricing";
import {
  attributeSuggestionsForCategory,
  normalizeVariantAttributes,
} from "../lib/product-variants";
import { MergeProductsModal } from "./MergeProductsModal";
import { PresetManagerModal } from "./PresetManagerModal";
import { PriceTagPrintModal } from "./PriceTagPrintModal";
import { CourseEditorModal } from "./CourseEditorModal";
import { AdminOrdersModal } from "./AdminOrdersModal";
import { COURSES, type Course } from "../lib/courses-data";
import { playProductAudio, stopProductAudio } from "../lib/sound-synth";
import {
  BUNDLE_SKUS,
  type BundleDefinition,
  type ComponentDefinition,
} from "../lib/commerce/types";

const legacyStringComponents = (): ComponentDefinition[] => [
  {
    sku: "COMP-STRINGS-ELIXIR",
    title: "Струны Elixir Nanoweb",
    price: 4950,
    kind: "physical",
    inventoryTracked: false,
    quantity: 1,
    placement: "optional",
  },
  {
    sku: "COMP-STRINGS-DADDARIO",
    title: "Струны D'Addario Pro",
    price: 2450,
    kind: "physical",
    inventoryTracked: false,
    quantity: 1,
    placement: "optional",
  },
];

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
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
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
  const [internalName, setInternalName] = useState("Новый товар");
  const [internalSku, setInternalSku] = useState("MAESTRO-001");
  const [internalCategory, setInternalCategory] = useState("Аксессуары");
  const [internalPhoto, setInternalPhoto] = useState("/placeholder.png");
  const [internalDescription, setInternalDescription] = useState("");
  const [featuresText, setFeaturesText] = useState("");
  const [targetAudience, setTargetAudience] = useState("Для начинающих");
  const [attachedCourseId, setAttachedCourseId] = useState<string>("none");
  const [internalAudioUrl, setInternalAudioUrl] = useState<string>("");
  const [internalAllowProPack, setInternalAllowProPack] = useState<boolean>(false);
  const [internalProPackTitle, setInternalProPackTitle] = useState<string>("Чехол + Ремень + VIP Доступ");
  const [internalProPackPrice, setInternalProPackPrice] = useState<number>(8900);
  const [internalAllowStrings, setInternalAllowStrings] = useState<boolean>(false);
  const [internalComponents, setInternalComponents] = useState<ComponentDefinition[]>([]);
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
        credentials: "same-origin",
        headers: getAdminHeaders(),
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
      attributes: [
        { name: "Цвет", value: "Санбёрст" },
        { name: "Размер", value: "39″" },
      ],
      priceMode: "inherit",
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
      attributes: [
        { name: "Цвет", value: "Черный" },
        { name: "Размер", value: "39″" },
      ],
      priceMode: "inherit",
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
      attributes: [
        { name: "Цвет", value: "Белый" },
        { name: "Размер", value: "39″" },
      ],
      priceMode: "inherit",
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
      setBulkPresetId(loaded[0].id);
    }
    void loadPresetsRemote().then((remote) => {
      setPresets(remote);
      if (remote[0]) setBulkPresetId(remote[0].id);
    }).catch(() => {});
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

  
  const hasAutoSelectedFirst = useRef(false);
  useEffect(() => {
    if (!hasAutoSelectedFirst.current && filteredProducts.length > 0) {
      hasAutoSelectedFirst.current = true;
      editStoredProduct(filteredProducts[0]);
    }
  }, [filteredProducts]);

  const startNewProduct = () => {
    const defaultCategory = categories.includes("Аксессуары")
      ? "Аксессуары"
      : categories.find((category) => category !== "Все") || "Другое";
    const nextSku = `MAESTRO-${Date.now().toString().slice(-4)}`;
    setEditingProductId(undefined);
    setCurrentPublicationStatus("draft");
    setInternalName("");
    setInternalSku(nextSku);
    setInternalCategory(defaultCategory);
    setInternalPhoto("/placeholder.png");
    setInternalDescription("");
    setFeaturesText("");
    setTargetAudience("");
    setAttachedCourseId("none");
    setInternalAudioUrl("");
    setInternalAllowProPack(false);
    setInternalProPackTitle("Чехол + Ремень + VIP Доступ");
    setInternalProPackPrice(8900);
    setInternalAllowStrings(false);
    setInternalComponents([]);
    setHasDiscount(false);
    setDiscountPercent(15);
    setOriginalPriceInput(0);
    setModelVariants([
      {
        id: `var-${Date.now()}-1`,
        name: "Стандарт",
        color: "#181511",
        colorName: "",
        sku: `${nextSku}-01`,
        barcode: "",
        stock: 1,
        image: "",
        attributes: [],
        priceMode: "inherit",
      },
    ]);
    setSelectedPresetId("");
    setCurrency("CNY");
    setCnyRate(70);
    setUsdRate(500);
    setPurchase(0);
    setDelivery(0);
    setCargo(0);
    setCustoms(0);
    setPackaging(0);
    setSetupCost(0);
    setMarketingCost(0);
    setOther(0);
    setTaxPercent(3);
    setBankPercent(14);
    setInstallmentMonths(12);
    setSellerPercent(5);
    setMarkup(35);
    setManualPricing(false);
    setManualPrice(0);
    setActiveTab("general");
    setIsDirty(true);
    setNotice("➕ Создание нового товара. Заполните поля и сохраните.");
    window.setTimeout(() => setNotice(""), 3000);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const editStoredProduct = (product: Product) => {
    setEditingProductId(product.databaseId || String(product.id));
    setCurrentPublicationStatus(product.publicationStatus === "published" ? "published" : "draft");
    setInternalName(product.name || "");
    setInternalSku(product.sku || "");
    setInternalCategory(product.category || categories.find((category) => category !== "Все") || "Другое");
    setInternalPhoto(product.image || "");
    setInternalDescription(product.description || "");
    setFeaturesText(Array.isArray(product.features) ? product.features.join(", ") : "");
    setTargetAudience(product.badge ?? "");
    setAttachedCourseId(product.attachedCourseId || "none");
    setInternalAudioUrl(product.audioUrl || "");
    setInternalAllowProPack(product.allowProPack === true);
    setInternalProPackTitle(product.proPackTitle || "Чехол + Ремень + VIP Доступ");
    setInternalProPackPrice(product.proPackPrice !== undefined ? product.proPackPrice : 8900);
    setInternalAllowStrings(product.allowStringsUpsell === true);
    setInternalComponents(
      product.componentDefinitions?.filter((component) => component.kind !== "digital")
        .map((component) => ({ ...component })) ??
      (product.allowStringsUpsell === true ? legacyStringComponents() : []),
    );

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

    const rawVariants = variantsFor(product);
    const variants: Variant[] = Array.isArray(rawVariants) && rawVariants.length > 0
      ? JSON.parse(JSON.stringify(rawVariants)).map((variant: Variant) => ({
          ...variant,
          attributes: normalizeVariantAttributes(variant),
          priceMode: variant.priceMode === "override" ? "override" : "inherit",
        }))
      : [
          {
            id: `var-${Date.now()}`,
            name: "Стандарт",
            sku: product.sku || "SKU-1",
            color: "#8a8175",
            colorName: "Стандарт",
            stock: product.quantity || 1,
            image: product.image || "",
            attributes: [],
            priceMode: "inherit",
          },
        ];
    setModelVariants(variants);

    // Reset preset
    setSelectedPresetId("");

    if (product.adminPricing) {
      const p = product.adminPricing;
      setCurrency(p.purchaseCurrency || "CNY");
      setPurchase(p.purchasePrice || 0);
      if (p.purchaseCurrency === "CNY") setCnyRate(p.currencyRate || 70);
      if (p.purchaseCurrency === "USD") setUsdRate(p.currencyRate || 500);
      setDelivery(p.chinaDeliveryKzt || 0);
      setCargo(p.cargoKzt || 0);
      setCustoms(p.customsKzt || 0);
      setPackaging(p.packagingKzt || 0);
      setSetupCost(p.setupKzt || 0);
      setMarketingCost(p.marketingKzt || 0);
      setOther(p.otherCostsKzt || 0);
      setTaxPercent(p.taxPercent !== undefined ? p.taxPercent : 3);
      setBankPercent(p.bankInstallmentPercent !== undefined ? p.bankInstallmentPercent : 14);
      setInstallmentMonths(p.installmentMonths || 12);
      setSellerPercent(p.sellerPercent !== undefined ? p.sellerPercent : 5);
      setMarkup(p.targetProfitPercent !== undefined ? p.targetProfitPercent : 35);
      setManualPricing(p.pricingMode === "manual");
      setManualPrice(p.manualPriceKzt ?? product.price ?? 0);
    } else {
      // Complete reset for products without custom admin pricing - ZERO state leakage!
      setCurrency("CNY");
      setPurchase(0);
      setCnyRate(70);
      setUsdRate(500);
      setDelivery(0);
      setCargo(0);
      setCustoms(0);
      setPackaging(0);
      setSetupCost(0);
      setMarketingCost(0);
      setOther(0);
      setTaxPercent(3);
      setBankPercent(14);
      setInstallmentMonths(12);
      setSellerPercent(5);
      setMarkup(35);
      setManualPricing(true);
      setManualPrice(product.price || 0);
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
      name: `Вариант ${nextIndex}`,
      sku: `${internalSku}-${nextIndex}`,
      color: "#8a8175",
      colorName: "",
      barcode: "",
      stock: 1,
      image: internalPhoto,
      attributes: [],
      priceMode: "inherit",
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

  const addVariantAttribute = (variantIndex: number, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setModelVariants((current) => current.map((variant, index) => {
      if (index !== variantIndex) return variant;
      const attributes = Array.isArray(variant.attributes)
        ? variant.attributes
        : normalizeVariantAttributes(variant);
      if (attributes.some((attribute) => attribute.name.toLocaleLowerCase("ru-RU") === trimmedName.toLocaleLowerCase("ru-RU"))) {
        return variant;
      }
      return { ...variant, attributes: [...attributes, { name: trimmedName, value: "" }] };
    }));
    setIsDirty(true);
  };

  const updateVariantAttribute = (
    variantIndex: number,
    attributeIndex: number,
    patch: Partial<{ name: string; value: string }>,
  ) => {
    setModelVariants((current) => current.map((variant, index) => {
      if (index !== variantIndex) return variant;
      const attributes = Array.isArray(variant.attributes) ? [...variant.attributes] : [];
      const currentAttribute = attributes[attributeIndex] || { name: "", value: "" };
      attributes[attributeIndex] = { ...currentAttribute, ...patch };
      const updated = { ...variant, attributes };
      const colorAttribute = attributes.find((attribute) => /цвет/i.test(attribute.name));
      const sizeAttribute = attributes.find((attribute) => /размер/i.test(attribute.name));
      return {
        ...updated,
        colorName: colorAttribute?.value || undefined,
        size: sizeAttribute?.value || undefined,
      };
    }));
    setIsDirty(true);
  };

  const removeVariantAttribute = (variantIndex: number, attributeIndex: number) => {
    setModelVariants((current) => current.map((variant, index) => {
      if (index !== variantIndex) return variant;
      const attributes = (variant.attributes || []).filter((_, index) => index !== attributeIndex);
      return {
        ...variant,
        attributes,
        colorName: attributes.find((attribute) => /цвет/i.test(attribute.name))?.value,
        size: attributes.find((attribute) => /размер/i.test(attribute.name))?.value,
      };
    }));
    setIsDirty(true);
  };

  const removeVariantRow = (index: number) => {
    if (modelVariants.length <= 1) {
      alert("У товара должен оставаться хотя бы один вариант.");
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
      attributes: (source.attributes || []).map((attribute) => ({ ...attribute })),
    };
    setModelVariants([...modelVariants, duplicated]);
    setIsDirty(true);
  };

  const totalModelStock = useMemo(() => {
    return modelVariants.reduce((acc, v) => acc + (v.stock || 0), 0);
  }, [modelVariants]);

  const inventoryOptions = useMemo(() => storedProducts.flatMap((product) =>
    variantsFor(product).map((variant) => ({
      key: `${product.sku}::${variant.sku}`,
      productSku: product.sku,
      variantSku: variant.sku,
      title: `${product.name} — ${variant.name}`,
      stock: Math.max(0, variant.stock || 0),
    })),
  ), [storedProducts]);

  const updateComponent = (index: number, patch: Partial<ComponentDefinition>) => {
    setInternalComponents((current) => current.map((component, componentIndex) =>
      componentIndex === index ? { ...component, ...patch } : component,
    ));
    setIsDirty(true);
  };

  const addComponent = (placement: "optional" | "pro_pack") => {
    const suffix = `${Date.now().toString(36)}-${internalComponents.length + 1}`.toUpperCase();
    setInternalComponents((current) => [...current, {
      sku: `COMP-${suffix}`,
      title: placement === "pro_pack" ? "Новая позиция комплекта" : "Новая допродажа",
      price: 0,
      kind: "physical",
      inventoryTracked: false,
      quantity: 1,
      placement,
    }]);
    if (placement === "optional") setInternalAllowStrings(true);
    if (placement === "pro_pack") setInternalAllowProPack(true);
    setIsDirty(true);
  };

  const removeComponent = (index: number) => {
    setInternalComponents((current) => current.filter((_, componentIndex) => componentIndex !== index));
    setIsDirty(true);
  };

  const linkComponentToInventory = (index: number, value: string) => {
    const option = inventoryOptions.find((candidate) => candidate.key === value);
    if (!option) {
      updateComponent(index, {
        linkedProductSku: undefined,
        linkedVariantSku: undefined,
        inventoryTracked: false,
      });
      return;
    }
    updateComponent(index, {
      linkedProductSku: option.productSku,
      linkedVariantSku: option.variantSku,
      inventoryTracked: true,
      title: option.title,
      sku: `COMP-${option.variantSku}`.toUpperCase(),
    });
  };
  const variantAttributeSuggestions = useMemo(
    () => attributeSuggestionsForCategory(internalCategory),
    [internalCategory],
  );

  const saveProduct = async (publish: boolean) => {
    if (!internalName.trim() || !internalSku.trim() || !internalDescription.trim()) {
      setSaveState("error");
      setSaveMessage("Заполните название, SKU и описание товара.");
      return;
    }
    if (!modelVariants.length || modelVariants.some((variant) => !variant.name.trim() || !variant.sku.trim())) {
      setSaveState("error");
      setSaveMessage("У каждого варианта должны быть название и SKU.");
      return;
    }
    const normalizedSkus = modelVariants.map((variant) => variant.sku.trim().toLocaleUpperCase("ru-RU"));
    if (new Set(normalizedSkus).size !== normalizedSkus.length) {
      setSaveState("error");
      setSaveMessage("SKU вариантов не должны повторяться.");
      return;
    }
    if (modelVariants.some((variant) => variant.priceMode === "override" && (!variant.price || variant.price <= 0))) {
      setSaveState("error");
      setSaveMessage("Заполните собственную цену у вариантов с отдельной ценой.");
      return;
    }
    const enabledComponents = internalComponents.filter((component) =>
      component.placement === "pro_pack" ? internalAllowProPack : internalAllowStrings,
    );
    const componentSkus = enabledComponents.map((component) => component.sku.trim().toUpperCase());
    if (new Set(componentSkus).size !== componentSkus.length || componentSkus.some((sku) => !sku)) {
      setSaveState("error");
      setSaveMessage("У каждой позиции комплекта должен быть уникальный SKU.");
      setActiveTab("bundle");
      return;
    }

    const persistedComponents: ComponentDefinition[] = enabledComponents.map((component) => ({
      ...component,
      sku: component.sku.trim().toUpperCase(),
      title: component.title.trim(),
      price: Math.max(0, Math.round(component.price || 0)),
      quantity: Math.max(1, Math.floor(component.quantity || 1)),
      inventoryTracked: component.kind === "physical" && component.inventoryTracked === true,
    }));
    const persistedBundles: BundleDefinition[] = [{
      id: "base",
      sku: BUNDLE_SKUS.base,
      title: "Базовая комплектация",
      description: "Заводская комплектация",
      componentSkus: [],
      priceDelta: 0,
      eligible: true,
    }];
    if (attachedCourseId !== "none") {
      const courseSku = `COURSE-${attachedCourseId.toUpperCase()}`;
      persistedComponents.push({
        sku: courseSku,
        title: adminCourses.find((course) => course.id === attachedCourseId)?.title || "Онлайн-курс Maestro",
        price: 0,
        kind: "digital",
        inventoryTracked: false,
        quantity: 1,
      });
      persistedBundles.push({
        id: "gift_course",
        sku: BUNDLE_SKUS.giftCourse,
        title: "Товар + курс",
        description: adminCourses.find((course) => course.id === attachedCourseId)?.title || "Онлайн-курс в подарок",
        componentSkus: [courseSku],
        priceDelta: 0,
        eligible: true,
      });
    }
    if (internalAllowProPack) {
      persistedBundles.push({
        id: "pro_pack",
        sku: BUNDLE_SKUS.proPack,
        title: "PRO комплект",
        description: internalProPackTitle.trim() || "Расширенная комплектация",
        componentSkus: persistedComponents
          .filter((component) => component.placement === "pro_pack")
          .map((component) => component.sku),
        priceDelta: Math.max(0, Math.round(internalProPackPrice || 0)),
        eligible: true,
      });
    }
    if (percentExpenses >= 100) {
      setSaveState("error");
      setSaveMessage("Сумма налога, банка и продавца должна быть меньше 100%.");
      return;
    }

    setSaveState("saving");
    setSaveMessage(publish ? "Публикуем карточку на витрине..." : "Сохраняем черновик...");
    try {
      const variantsToSave = modelVariants.map((variant) => ({
        ...variant,
        name: variant.name.trim(),
        sku: variant.sku.trim().toUpperCase(),
        barcode: variant.barcode?.trim() || undefined,
        image: variant.image || internalPhoto,
        attributes: (variant.attributes || [])
          .map((attribute) => ({ name: attribute.name.trim(), value: attribute.value.trim() }))
          .filter((attribute) => attribute.name && attribute.value),
        priceMode: variant.priceMode === "override" ? "override" as const : "inherit" as const,
        price: variant.priceMode === "override" ? variant.price : undefined,
      }));
      const primaryVariant = variantsToSave[0];
      const response = await fetch("/api/products", {
        method: "POST",
        credentials: "same-origin",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          productId: editingProductId,
          variantId: primaryVariant?.id,
          name: internalName,
          sku: internalSku,
          category: internalCategory,
          photoUrl: internalPhoto,
          description: internalDescription,
          targetAudience,
          features: featuresText
            .split(",")
            .map((feature) => feature.trim())
            .filter(Boolean),
          attachedCourseId: attachedCourseId,
          allowProPack: internalAllowProPack,
          proPackTitle: internalProPackTitle.trim(),
          proPackPrice: internalProPackPrice,
          allowStringsUpsell: internalAllowStrings,
          bundleDefinitions: persistedBundles,
          componentDefinitions: persistedComponents,
          audioUrl: internalAudioUrl.trim() || undefined,
          variant: {
            name: primaryVariant.name,
            sku: primaryVariant.sku,
            barcode: primaryVariant.barcode,
            colorName: primaryVariant.colorName,
            colorHex: primaryVariant.color,
            size: primaryVariant.size,
            stockQuantity: totalModelStock,
          },
          variants: variantsToSave,
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
        variants: variantsToSave.length,
        variantItems: variantsToSave,
        price: Math.round(retail),
        attachedCourseId: attachedCourseId === "none" ? undefined : attachedCourseId,
        audioUrl: internalAudioUrl.trim() || undefined,
        allowProPack: internalAllowProPack,
        proPackTitle: internalProPackTitle.trim(),
        proPackPrice: internalProPackPrice,
        allowStringsUpsell: internalAllowStrings,
        bundleDefinitions: persistedBundles,
        componentDefinitions: persistedComponents,
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
    setNotice(`Объединено в одну карточку: ${mergedMaster.name} (${mergedMaster.variants} вар.)`);
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
      <AdminOrdersModal
        isOpen={isOrdersModalOpen}
        onClose={() => setIsOrdersModalOpen(false)}
        onNotice={(msg) => {
          setNotice(msg);
          window.setTimeout(() => setNotice(""), 3500);
        }}
      />
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
                <h2>{internalName || "Новый товар"}</h2>
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
                  <option value="">Индивидуальные настройки</option>
                  {presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} ({preset.purchaseCurrency})
                      {preset.categoryHint === internalCategory ? " — подходит категории" : ""}
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
                  className="util-btn orders-highlight-btn"
                  onClick={() => setIsOrdersModalOpen(true)}
                  title="Просмотр заказов, подтверждение оплат и возврат забронированных товаров на полку"
                >
                  📦 Заказы и брони
                </button>
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
              <span>▦</span>
              <strong>3. Варианты и склад ({modelVariants.length})</strong>
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
                <strong>Основная информация о товаре</strong>
                <p>Название, категория, фотографии, необязательное медиа и описание для покупателей.</p>
              </div>

              <div className="model-info-grid">
                <div className="editor-field-card">
                  <span className="field-label-text">Название товара</span>
                  <input
                    value={internalName}
                    onChange={(e) => {
                      setInternalName(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="например, Каподастр алюминиевый"
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
                  <input
                    list="maestro-product-categories"
                    value={internalCategory}
                    onChange={(e) => {
                      setInternalCategory(e.target.value);
                      setSelectedPresetId("");
                      setIsDirty(true);
                    }}
                    placeholder="Выберите или введите новую категорию"
                  />
                  <datalist id="maestro-product-categories">
                    {categories.filter((cat) => cat !== "Все").map((cat) => <option key={cat} value={cat} />)}
                  </datalist>
                  <small>Новую категорию можно написать вручную — после публикации она появится в меню магазина.</small>
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
                  <span className="field-label-text">Главное фото товара (PNG / JPG / WebP)</span>
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
                  <span className="field-label-text">Аудио или демонстрация товара (необязательно)</span>
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
                  <span className="field-label-text">Краткое описание товара</span>
                  <textarea
                    rows={3}
                    style={{ marginTop: "4px" }}
                    value={internalDescription}
                    onChange={(e) => {
                      setInternalDescription(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Что это за товар, кому подходит и чем полезен."
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
                    placeholder="Алюминиевый корпус, мягкая накладка, быстрый зажим"
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
                <p>Курс, PRO-набор и дополнительные позиции сохраняются вместе с товаром. Физические позиции можно связать с реальным вариантом на складе.</p>
              </div>

              <div className="bundle-editor-grid">
                {/* 1. GIFT COURSE */}
                <div className={`bundle-config-card ${attachedCourseId !== "none" ? "enabled" : "disabled"}`}>
                  <div className="bundle-card-header-row">
                    <div className="bundle-card-top">
                      <span className="bundle-icon">🎁</span>
                      <div>
                        <strong>1. Подарочный онлайн-курс к товару</strong>
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
                          <option value="auto">Автоматически по категории товара</option>
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
                      <p><strong>Курс отключен.</strong> В карточке будет только обычная комплектация товара.</p>
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
                      <div className="card-subhead between" style={{ marginTop: 14 }}>
                        <div>
                          <strong>Состав PRO-комплекта</strong>
                          <span>Добавьте чехол, ремень, струны или услугу. Связанные товары будут резервироваться на складе.</span>
                        </div>
                        <button type="button" className="primary-button small" onClick={() => addComponent("pro_pack")}>+ Позиция</button>
                      </div>
                      {internalComponents.filter((component) => component.placement === "pro_pack").map((component) => {
                        const index = internalComponents.indexOf(component);
                        const linkedKey = component.linkedVariantSku
                          ? `${component.linkedProductSku || ""}::${component.linkedVariantSku}`
                          : "";
                        return (
                          <div key={`${component.sku}-${index}`} className="editor-field-card full-width" style={{ marginTop: 10 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "minmax(190px, 1.5fr) minmax(160px, 1fr) 110px 90px auto", gap: 10, alignItems: "end" }}>
                              <label>Товар со склада
                                <select value={linkedKey} onChange={(event) => linkComponentToInventory(index, event.target.value)}>
                                  <option value="">Без связи со складом</option>
                                  {inventoryOptions.map((option) => <option key={option.key} value={option.key}>{option.title} · {option.stock} шт.</option>)}
                                </select>
                              </label>
                              <label>Название<input value={component.title} onChange={(event) => updateComponent(index, { title: event.target.value })} /></label>
                              <label>Количество<input type="number" min="1" value={component.quantity || 1} onChange={(event) => updateComponent(index, { quantity: Math.max(1, Number(event.target.value) || 1) })} /></label>
                              <label>Тип<select value={component.kind} onChange={(event) => updateComponent(index, { kind: event.target.value as ComponentDefinition["kind"], inventoryTracked: event.target.value === "physical" && Boolean(component.linkedVariantSku) })}><option value="physical">Товар</option><option value="service">Услуга</option></select></label>
                              <button type="button" className="outline-button small" onClick={() => removeComponent(index)}>Удалить</button>
                            </div>
                            <small>{component.inventoryTracked ? `Остаток контролируется по SKU ${component.linkedVariantSku}` : "Позиция не списывается со склада"}</small>
                          </div>
                        );
                      })}
                      <span className="bundle-status-tag gold">✓ Покупатель сможет выбрать кнопку «👑 PRO Комплект (+{money(internalProPackPrice)} ₸)»</span>
                    </div>
                  ) : (
                    <div className="bundle-card-disabled-hint">
                      <p>❌ <strong>PRO-комплект отключен</strong>. Кнопка выбора PRO-комплекта скрыта на карточке этого товара.</p>
                    </div>
                  )}
                </div>

                {/* 3. OPTIONAL COMPONENTS */}
                <div className={`bundle-config-card ${internalAllowStrings ? "enabled" : "disabled"}`}>
                  <div className="bundle-card-header-row">
                    <div className="bundle-card-top">
                      <span className="bundle-icon">⚡</span>
                      <div>
                        <strong>3. Дополнительные товары и услуги</strong>
                        <span>Струны, аксессуары и другие предложения перед добавлением в корзину</span>
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
                      <div className="card-subhead between">
                        <div><strong>Предложения покупателю</strong><span>Цена здесь — доплата к основному товару.</span></div>
                        <button type="button" className="primary-button small" onClick={() => addComponent("optional")}>+ Добавить</button>
                      </div>
                      {internalComponents.filter((component) => component.placement !== "pro_pack").map((component) => {
                        const index = internalComponents.indexOf(component);
                        const linkedKey = component.linkedVariantSku
                          ? `${component.linkedProductSku || ""}::${component.linkedVariantSku}`
                          : "";
                        return (
                          <div key={`${component.sku}-${index}`} className="editor-field-card full-width" style={{ marginTop: 10 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "minmax(190px, 1.5fr) minmax(160px, 1fr) 130px 100px auto", gap: 10, alignItems: "end" }}>
                              <label>Товар со склада
                                <select value={linkedKey} onChange={(event) => linkComponentToInventory(index, event.target.value)}>
                                  <option value="">Без связи со складом</option>
                                  {inventoryOptions.map((option) => <option key={option.key} value={option.key}>{option.title} · {option.stock} шт.</option>)}
                                </select>
                              </label>
                              <label>Название<input value={component.title} onChange={(event) => updateComponent(index, { title: event.target.value })} /></label>
                              <label>Доплата, ₸<input type="number" min="0" value={component.price || 0} onChange={(event) => updateComponent(index, { price: Math.max(0, Number(event.target.value) || 0) })} /></label>
                              <label>Количество<input type="number" min="1" value={component.quantity || 1} onChange={(event) => updateComponent(index, { quantity: Math.max(1, Number(event.target.value) || 1) })} /></label>
                              <button type="button" className="outline-button small" onClick={() => removeComponent(index)}>Удалить</button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "160px minmax(180px, 1fr) 2fr", gap: 10, marginTop: 8 }}>
                              <label>Тип<select value={component.kind} onChange={(event) => updateComponent(index, { kind: event.target.value as ComponentDefinition["kind"], inventoryTracked: event.target.value === "physical" && Boolean(component.linkedVariantSku) })}><option value="physical">Товар</option><option value="service">Услуга</option></select></label>
                              <label>SKU предложения<input value={component.sku} onChange={(event) => updateComponent(index, { sku: event.target.value.toUpperCase() })} /></label>
                              <small style={{ alignSelf: "end", paddingBottom: 11 }}>{component.inventoryTracked ? `Остаток контролируется по SKU ${component.linkedVariantSku}` : "Можно оставить без связи для цифровой услуги или товара вне каталога"}</small>
                            </div>
                          </div>
                        );
                      })}
                      {internalComponents.every((component) => component.placement === "pro_pack") && <p>Пока нет предложений. Нажмите «Добавить» и выберите нужные струны или аксессуар.</p>}
                      <span className="bundle-status-tag green">✓ Покупатель увидит только сохранённые и доступные позиции</span>
                    </div>
                  ) : (
                    <div className="bundle-card-disabled-hint">
                      <p><strong>Дополнительные предложения отключены.</strong> В карточке останутся только варианты комплектации.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: UNIVERSAL VARIANTS & STOCK */}
          {activeTab === "matrix" && (
            <div className="tab-pane-content">
              <div className="card-subhead between">
                <div>
                  <strong>Варианты товара и склад ({modelVariants.length})</strong>
                  <span>Размер не обязателен. Добавляйте только реальные отличия: цвет, калибр, совместимость, материал или мощность. Общий остаток: <strong>{totalModelStock} шт.</strong></span>
                </div>
                <button type="button" className="primary-button small" onClick={addVariantRow}>
                  + Добавить вариант
                </button>
              </div>

              <div className="variant-editor-list">
                {modelVariants.map((variant, index) => (
                  <article className="variant-editor-card" key={variant.id || `${variant.sku}-${index}`}>
                    <header className="variant-editor-card__header">
                      <div className="variant-editor-photo">
                        <button
                          type="button"
                          className="variant-editor-photo__preview"
                          onClick={() => setPreviewPhotoModal({
                            url: variant.image || internalPhoto || "/placeholder.png",
                            title: `${internalName} — ${variant.name}`,
                            subtitle: `SKU: ${variant.sku || internalSku}`,
                            variantIndex: index,
                          })}
                          title="Открыть фото"
                        >
                          <Image
                            src={variant.image || internalPhoto || "/placeholder.png"}
                            alt=""
                            fill
                            unoptimized
                            sizes="64px"
                            style={{ objectFit: "contain" }}
                          />
                        </button>
                        <label className="variant-editor-photo__upload">
                          Загрузить фото
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadImageFile(file, (url) => updateVariantRow(index, { image: url }));
                            }}
                          />
                        </label>
                        <small>Фото не влияет на цену</small>
                      </div>

                      <label className="variant-editor-name">
                        <span>Название варианта</span>
                        <input
                          type="text"
                          placeholder="Например, Золотой или 10–47"
                          value={variant.name}
                          onChange={(e) => updateVariantRow(index, { name: e.target.value })}
                        />
                      </label>

                      <div className="variant-actions">
                        <button type="button" className="action-icon-btn" onClick={() => duplicateVariantRow(index)} title="Дублировать вариант">⧉</button>
                        <button type="button" className="action-icon-btn delete" onClick={() => removeVariantRow(index)} disabled={modelVariants.length <= 1} title="Удалить вариант">✕</button>
                      </div>
                    </header>

                    <div className="variant-editor-core-grid">
                      <label><span>SKU варианта</span><input type="text" placeholder="AC-CAPO-GOLD" value={variant.sku} onChange={(e) => updateVariantRow(index, { sku: e.target.value })} /></label>
                      <label><span>Штрихкод</span><input type="text" placeholder="Необязательно" value={variant.barcode || ""} onChange={(e) => updateVariantRow(index, { barcode: e.target.value })} /></label>
                      <label><span>Остаток</span><input type="number" min="0" value={variant.stock === 0 ? "" : variant.stock} onFocus={(e) => e.target.select()} onChange={(e) => updateVariantRow(index, { stock: Math.max(0, +e.target.value) })} /></label>
                      <label>
                        <span>Цена варианта</span>
                        <select value={variant.priceMode === "override" ? "override" : "inherit"} onChange={(e) => updateVariantRow(index, { priceMode: e.target.value as "inherit" | "override", price: e.target.value === "override" ? (variant.price || Math.round(retail)) : undefined })}>
                          <option value="inherit">Базовая цена товара</option>
                          <option value="override">Своя цена</option>
                        </select>
                      </label>
                      {variant.priceMode === "override" && (
                        <label><span>Своя цена, ₸</span><input type="number" min="1" value={variant.price || ""} onFocus={(e) => e.target.select()} onChange={(e) => updateVariantRow(index, { price: Math.max(0, +e.target.value) })} /></label>
                      )}
                    </div>

                    <section className="variant-attributes-editor">
                      <header>
                        <div><strong>Характеристики варианта</strong><small>Укажите только то, чем этот SKU отличается от других.</small></div>
                        <select
                          value=""
                          aria-label={`Добавить характеристику для ${variant.name}`}
                          onChange={(e) => {
                            addVariantAttribute(index, e.target.value);
                            e.currentTarget.value = "";
                          }}
                        >
                          <option value="">+ Добавить характеристику</option>
                          {variantAttributeSuggestions
                            .filter((name) => !(variant.attributes || []).some((attribute) => attribute.name.toLocaleLowerCase("ru-RU") === name.toLocaleLowerCase("ru-RU")))
                            .map((name) => <option key={name} value={name}>{name}</option>)}
                          <option value="Характеристика">Другое…</option>
                        </select>
                      </header>
                      {(variant.attributes || []).length ? (
                        <div className="variant-attribute-list">
                          {(variant.attributes || []).map((attribute, attributeIndex) => (
                            <div className="variant-attribute-row" key={`${attributeIndex}-${attribute.name}`}>
                              <input aria-label="Название характеристики" placeholder="Например, Совместимость" value={attribute.name} onChange={(e) => updateVariantAttribute(index, attributeIndex, { name: e.target.value })} />
                              <input aria-label="Значение характеристики" placeholder="Например, акустическая и электрогитара" value={attribute.value} onChange={(e) => updateVariantAttribute(index, attributeIndex, { value: e.target.value })} />
                              {/цвет/i.test(attribute.name) && <input aria-label="Цвет для образца" className="variant-color-swatch" type="color" value={variant.color || "#8a8175"} onChange={(e) => updateVariantRow(index, { color: e.target.value })} />}
                              <button type="button" className="action-icon-btn delete" onClick={() => removeVariantAttribute(index, attributeIndex)} title="Удалить характеристику">✕</button>
                            </div>
                          ))}
                        </div>
                      ) : <p className="variant-attributes-empty">Для стандартного товара характеристики можно не добавлять.</p>}
                    </section>
                  </article>
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
                    <span className="field-label-text">Предпродажная подготовка / проверка, ₸</span>
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
            <span>товаров на складе</span>
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
                  title="Объединить несколько отдельных записей в одну карточку с вариантами"
                >
                  Объединить в 1 карточку ({selectedProductIds.size})
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
