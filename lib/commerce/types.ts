export const CART_SCHEMA_VERSION = 1 as const;
export const COMMERCE_STATE_SCHEMA_VERSION = 1 as const;
export const COMMERCE_CURRENCY = "KZT" as const;

export const BUNDLE_SKUS = {
  base: "BUNDLE-BASE",
  giftCourse: "BUNDLE-GIFT-COURSE",
  proPack: "BUNDLE-PRO-PACK",
} as const;

export const COMPONENT_SKUS = {
  proPack: "COMP-PRO-PACK",
  elixirStrings: "COMP-STRINGS-ELIXIR",
  daddarioStrings: "COMP-STRINGS-DADDARIO",
} as const;

export type PriceComponent = {
  sku: string;
  title: string;
  amount: number;
};

export type PriceBreakdown = {
  base: number;
  variantDelta: number;
  components: PriceComponent[];
  subtotal: number;
  discount: number;
  final: number;
  currency: typeof COMMERCE_CURRENCY;
  pricingVersion: string;
};

export type CatalogVariant = {
  id: string;
  sku: string;
  title: string;
  image: string;
  color?: string;
  secondaryColor?: string;
  note?: string;
  barcode?: string;
  colorName?: string;
  size?: string;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  status: "active" | "out_of_stock" | "hidden" | "discontinued";
  currentPrice: number;
};

export type BundleDefinition = {
  id: "base" | "gift_course" | "pro_pack";
  sku: string;
  title: string;
  description: string;
  componentSkus: string[];
  priceDelta: number;
  eligible: boolean;
};

export type ComponentDefinition = {
  sku: string;
  title: string;
  price: number;
  kind: "physical" | "digital" | "service";
  inventoryTracked: boolean;
};

export type ProductReadModel = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  shortName: string;
  category: string;
  description: string;
  image: string;
  features: string[];
  badge?: string;
  audioUrl?: string;
  publicationStatus?: string;
  attachedCourseId?: string;
  variants: CatalogVariant[];
  selectionRequired: boolean;
  bundleDefinitions: BundleDefinition[];
  componentDefinitions: ComponentDefinition[];
  pricingVersion: string;
  defaultPrice: PriceBreakdown;
  availability: {
    status: "in_stock" | "out_of_stock";
    totalAvailable: number;
  };
  searchableAttributes: string[];
};

export type CartDraftLine = {
  lineId: string;
  productId: string;
  productSku: string;
  variantSku?: string;
  bundleSku: string;
  componentSkus: string[];
  quantity: number;
  observedPricingVersion?: string;
  observedFinal?: number;
};

export type CartDraft = {
  schemaVersion: typeof CART_SCHEMA_VERSION;
  updatedAt: string;
  lines: CartDraftLine[];
};

export type ReconciliationState =
  | "draft"
  | "reconciling"
  | "ready"
  | "changed"
  | "invalid"
  | "error";

export type CommerceErrorCode =
  | "INVALID_REQUEST"
  | "PRODUCT_NOT_FOUND"
  | "VARIANT_REQUIRED"
  | "VARIANT_NOT_FOUND"
  | "VARIANT_OUT_OF_STOCK"
  | "INSUFFICIENT_STOCK"
  | "INVALID_BUNDLE"
  | "INVALID_COMPONENT"
  | "PRICE_CHANGED"
  | "CART_INVALID"
  | "ORDER_NOT_FOUND"
  | "ORDER_EXPIRED"
  | "PAYMENT_ALREADY_REPORTED"
  | "PAYMENT_METHOD_NOT_REPORTABLE"
  | "FORBIDDEN_TRANSITION"
  | "IDEMPOTENCY_REQUIRED"
  | "IDEMPOTENCY_CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export type CommerceErrorShape = {
  code: CommerceErrorCode;
  message: string;
  recoverable: boolean;
  field?: string;
  lineId?: string;
  details?: Record<string, unknown>;
};

export type ReconciledCartLine = {
  lineId: string;
  configurationKey: string;
  productId: string;
  productSku: string;
  productTitle: string;
  productImage: string;
  variantId: string;
  variantSku: string;
  variantTitle: string;
  variantImage: string;
  bundleSku: string;
  bundleTitle: string;
  componentSkus: string[];
  componentSnapshot: PriceComponent[];
  quantity: number;
  availableQuantity: number;
  pricing: PriceBreakdown;
  previousFinal?: number;
  priceChanged: boolean;
  status: "valid" | "changed" | "invalid";
  errors: CommerceErrorShape[];
};

export type CartReconciliation = {
  schemaVersion: typeof CART_SCHEMA_VERSION;
  catalogVersion: string;
  state: Exclude<ReconciliationState, "draft" | "reconciling" | "error">;
  lines: ReconciledCartLine[];
  invalidLines: Array<{
    lineId: string;
    errors: CommerceErrorShape[];
  }>;
  totals: {
    subtotal: number;
    discount: number;
    final: number;
    currency: typeof COMMERCE_CURRENCY;
  };
  reconciledAt: string;
};

export const ORDER_STATUSES = [
  "draft",
  "pending_contact",
  "awaiting_payment",
  "payment_reported",
  "paid",
  "processing",
  "completed",
  "cancelled",
  "expired",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = "awaiting_payment" | "payment_reported" | "paid" | "cancelled";
export type ReservationStatus = "reserved" | "confirmed" | "released" | "expired";

export type OrderRecord = {
  id: string;
  publicToken: string;
  idempotencyKey: string;
  payloadHash: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerComment: string;
  fulfilmentMethod: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  total: number;
  currency: typeof COMMERCE_CURRENCY;
  status: OrderStatus;
  isTest: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrderItemRecord = {
  id: string;
  orderId: string;
  productId: string;
  productSku: string;
  variantId: string;
  variantSku: string;
  bundleSku: string;
  titleSnapshot: string;
  variantSnapshot: string;
  componentSnapshot: PriceComponent[];
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
  pricingVersion: string;
  createdAt: string;
};

export type PaymentRecord = {
  id: string;
  orderId: string;
  method: string;
  status: PaymentStatus;
  amount: number;
  reportedAt?: string;
  verifiedAt?: string;
  reference?: string;
  receiptMetadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type OrderStatusHistoryRecord = {
  id: string;
  orderId: string;
  fromStatus?: OrderStatus;
  toStatus: OrderStatus;
  actorType: "customer" | "admin" | "provider" | "system";
  actorId?: string;
  reason?: string;
  createdAt: string;
};

export type StockReservationRecord = {
  id: string;
  orderId: string;
  variantId: string;
  variantSku: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CommerceStoreState = {
  schemaVersion: typeof COMMERCE_STATE_SCHEMA_VERSION;
  orders: OrderRecord[];
  orderItems: OrderItemRecord[];
  payments: PaymentRecord[];
  statusHistory: OrderStatusHistoryRecord[];
  reservations: StockReservationRecord[];
};

export type CreateOrderRequest = {
  cart: CartDraft;
  customer: {
    name: string;
    phone: string;
    city: string;
    comment?: string;
  };
  fulfilment: {
    method: string;
  };
  payment: {
    method: string;
  };
  testMode?: boolean;
};

export type PublicOrder = {
  orderId: string;
  publicToken: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  customer: {
    name: string;
    city: string;
  };
  fulfilmentMethod: string;
  paymentMethod: string;
  items: Array<{
    title: string;
    variant: string;
    productSku: string;
    variantSku: string;
    bundleSku: string;
    components: PriceComponent[];
    quantity: number;
    unitPrice: number;
    discount: number;
    lineTotal: number;
  }>;
  totals: {
    subtotal: number;
    discount: number;
    final: number;
    currency: typeof COMMERCE_CURRENCY;
  };
  createdAt: string;
  updatedAt: string;
};
