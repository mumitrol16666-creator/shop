import type { CartItem, Product } from "../catalog-data";
import type { ProductReadModel, PublicOrder, ReconciledCartLine } from "./types";

export function toStorefrontProduct(model: ProductReadModel): Product {
  return {
    id: model.id,
    databaseId: model.id,
    name: model.name,
    shortName: model.shortName,
    category: model.category,
    image: model.image,
    quantity: model.availability.totalAvailable,
    variants: model.variants.length,
    sku: model.sku,
    badge: model.badge,
    description: model.description,
    features: model.features,
    attachedCourseId: model.attachedCourseId,
    audioUrl: model.audioUrl,
    allowProPack: model.bundleDefinitions.some((bundle) => bundle.id === "pro_pack"),
    proPackTitle: model.bundleDefinitions.find((bundle) => bundle.id === "pro_pack")?.description,
    proPackPrice: model.bundleDefinitions.find((bundle) => bundle.id === "pro_pack")?.priceDelta,
    allowStringsUpsell: model.componentDefinitions.some((component) => component.sku.startsWith("COMP-STRINGS-")),
    price: model.defaultPrice.final,
    originalPrice: model.defaultPrice.subtotal > model.defaultPrice.final ? model.defaultPrice.subtotal : undefined,
    discountPercent: model.defaultPrice.discount > 0 && model.defaultPrice.subtotal > 0
      ? Math.round((model.defaultPrice.discount / model.defaultPrice.subtotal) * 100)
      : undefined,
    isDiscountActive: model.defaultPrice.discount > 0,
    publicationStatus: model.publicationStatus as Product["publicationStatus"],
    isStored: true,
    variantItems: model.variants.map((variant) => ({
      id: variant.id,
      name: variant.title,
      stock: variant.availableQuantity,
      color: variant.color || "#8a8175",
      secondary: variant.secondaryColor,
      note: variant.note,
      barcode: variant.barcode,
      colorName: variant.colorName,
      size: variant.size,
      sku: variant.sku,
      image: variant.image,
      price: variant.currentPrice,
    })),
    commerce: model,
  };
}

const bundleId = (sku: string): CartItem["bundle"] =>
  sku === "BUNDLE-PRO-PACK" ? "pro_pack" : sku === "BUNDLE-GIFT-COURSE" ? "gift_course" : "base";

export function cartItemFromReconciled(line: ReconciledCartLine): CartItem {
  const strings = line.componentSnapshot.find((item) => item.sku.startsWith("COMP-STRINGS-"));
  return {
    key: line.lineId,
    productId: line.productId,
    name: line.productTitle,
    variantName: line.variantTitle,
    sku: line.variantSku,
    image: line.variantImage || line.productImage,
    price: line.pricing.final,
    quantity: line.quantity,
    maxQuantity: line.availableQuantity,
    bundle: bundleId(line.bundleSku),
    bundleTitle: line.bundleTitle,
    stringsUpsell: strings?.title,
    stringsUpsellPrice: strings?.amount,
  };
}

export function cartItemsFromOrder(order: PublicOrder): CartItem[] {
  return order.items.map((item, index) => ({
    key: `${order.orderId}-${index}`,
    productId: item.productSku,
    name: item.title,
    variantName: item.variant,
    sku: item.variantSku,
    image: "",
    price: item.unitPrice,
    quantity: item.quantity,
    maxQuantity: item.quantity,
    bundle: bundleId(item.bundleSku),
    bundleTitle: item.bundleSku,
    stringsUpsell: item.components.find((component) => component.sku.startsWith("COMP-STRINGS-"))?.title,
  }));
}
