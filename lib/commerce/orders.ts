import { reconcileCart } from "./cart";
import { commerceError } from "./errors";
import { stableHash } from "./pricing";
import { assertOrderTransition } from "./status";
import {
  normalizeFulfilmentMethod,
  normalizePaymentMethod,
  orderDisplayId,
} from "./checkout";
import {
  COMMERCE_STATE_SCHEMA_VERSION,
  type AdminOrder,
  type CommerceStoreState,
  type CreateOrderRequest,
  type OrderItemRecord,
  type OrderRecord,
  type OrderStatus,
  type OrderStatusHistoryRecord,
  type PaymentRecord,
  type ProductReadModel,
  type PublicOrder,
  type StockReservationRecord,
} from "./types";

export const DEFAULT_RESERVATION_TTL_MINUTES = 30;
export const DEFAULT_REPORTED_RESERVATION_TTL_MINUTES = 24 * 60;

export const emptyCommerceStoreState = (): CommerceStoreState => ({
  schemaVersion: COMMERCE_STATE_SCHEMA_VERSION,
  orders: [],
  orderItems: [],
  payments: [],
  statusHistory: [],
  reservations: [],
});

export function assertCreateOrderRequest(
  request: unknown,
): asserts request is CreateOrderRequest {
  const candidate = request as Partial<CreateOrderRequest> | null;
  const cart = candidate?.cart as CreateOrderRequest["cart"] | undefined;
  if (
    !candidate ||
    !cart ||
    cart.schemaVersion !== 1 ||
    !Array.isArray(cart.lines) ||
    !candidate.customer ||
    typeof candidate.customer.name !== "string" ||
    typeof candidate.customer.phone !== "string" ||
    typeof candidate.customer.city !== "string" ||
    !candidate.fulfilment ||
    typeof candidate.fulfilment.method !== "string" ||
    !candidate.payment ||
    typeof candidate.payment.method !== "string" ||
    cart.lines.some(
      (line) =>
        !line ||
        typeof line.lineId !== "string" ||
        typeof line.productId !== "string" ||
        typeof line.productSku !== "string" ||
        typeof line.bundleSku !== "string" ||
        !Array.isArray(line.componentSkus) ||
        !Number.isInteger(line.quantity),
    )
  ) {
    throw commerceError("INVALID_REQUEST", "Некорректная структура заказа.", {
      recoverable: true,
    });
  }
}

const cloneState = (state: CommerceStoreState): CommerceStoreState =>
  structuredClone(state);

const opaqueToken = () => {
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const orderPublicId = (date: Date, token: string) =>
  `MM-${date.toISOString().slice(0, 10).replace(/-/g, "")}-${token.slice(0, 8).toUpperCase()}`;

const addMinutes = (date: Date, minutes: number) =>
  new Date(date.getTime() + minutes * 60_000).toISOString();

const normalizedPayload = (request: CreateOrderRequest) => ({
  cart: {
    schemaVersion: request.cart.schemaVersion,
    lines: request.cart.lines
      .map((line) => ({
        productId: line.productId,
        productSku: line.productSku,
        variantSku: line.variantSku,
        bundleSku: line.bundleSku,
        componentSkus: [...new Set(line.componentSkus)].sort(),
        quantity: line.quantity,
      }))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  },
  customer: {
    name: request.customer.name.trim(),
    phone: request.customer.phone.replace(/\s+/g, " ").trim(),
    city: request.customer.city.trim(),
    comment: request.customer.comment?.trim() || "",
    deliveryAddress: request.customer.deliveryAddress?.trim() || "",
    preferredContactTime: request.customer.preferredContactTime?.trim() || "",
  },
  fulfilment: { method: request.fulfilment.method.trim() },
  payment: { method: request.payment.method.trim() },
  testMode: request.testMode === true,
});

export const orderPayloadHash = (request: CreateOrderRequest) =>
  `payload-${stableHash(normalizedPayload(request))}`;

export const reservationUsage = (state: CommerceStoreState) => {
  const reservedByVariantSku: Record<string, number> = {};
  const confirmedByVariantSku: Record<string, number> = {};
  for (const reservation of state.reservations) {
    if (reservation.status === "reserved") {
      reservedByVariantSku[reservation.variantSku] =
        (reservedByVariantSku[reservation.variantSku] ?? 0) + reservation.quantity;
    }
    if (reservation.status === "confirmed") {
      confirmedByVariantSku[reservation.variantSku] =
        (confirmedByVariantSku[reservation.variantSku] ?? 0) + reservation.quantity;
    }
  }
  return { reservedByVariantSku, confirmedByVariantSku };
};

const applyReservationUsage = (
  products: ProductReadModel[],
  state: CommerceStoreState,
) => {
  const usage = reservationUsage(state);
  return products.map((product) => ({
    ...product,
    variants: product.variants.map((variant) => {
      const reserved = usage.reservedByVariantSku[variant.sku] ?? 0;
      const confirmed = usage.confirmedByVariantSku[variant.sku] ?? 0;
      const availableQuantity = Math.max(
        0,
        variant.stockQuantity - reserved - confirmed,
      );
      return {
        ...variant,
        reservedQuantity: reserved,
        availableQuantity,
        status: availableQuantity > 0 ? ("active" as const) : ("out_of_stock" as const),
      };
    }),
    availability: {
      status: product.variants.some(
        (variant) =>
          variant.stockQuantity -
            (usage.reservedByVariantSku[variant.sku] ?? 0) -
            (usage.confirmedByVariantSku[variant.sku] ?? 0) >
          0,
      )
        ? ("in_stock" as const)
        : ("out_of_stock" as const),
      totalAvailable: product.variants.reduce(
        (sum, variant) =>
          sum +
          Math.max(
            0,
            variant.stockQuantity -
              (usage.reservedByVariantSku[variant.sku] ?? 0) -
              (usage.confirmedByVariantSku[variant.sku] ?? 0),
          ),
        0,
      ),
    },
  }));
};

export function expireReservationsInMemory(
  source: CommerceStoreState,
  now = new Date(),
): CommerceStoreState {
  const state = cloneState(source);
  const nowIso = now.toISOString();
  const expiredOrderIds = new Set<string>();
  for (const reservation of state.reservations) {
    if (reservation.status === "reserved" && reservation.expiresAt <= nowIso) {
      reservation.status = "expired";
      reservation.updatedAt = nowIso;
      expiredOrderIds.add(reservation.orderId);
    }
  }
  for (const orderId of expiredOrderIds) {
    const order = state.orders.find((candidate) => candidate.id === orderId);
    if (!order || !["awaiting_payment", "pending_contact", "payment_reported"].includes(order.status)) continue;
    const fromStatus = order.status;
    order.status = "expired";
    order.updatedAt = nowIso;
    state.statusHistory.push({
      id: crypto.randomUUID(),
      orderId,
      fromStatus,
      toStatus: "expired",
      actorType: "system",
      reason: "reservation_ttl_elapsed",
      createdAt: nowIso,
    });
  }
  return state;
}

export function createOrderInMemory(input: {
  state: CommerceStoreState;
  products: ProductReadModel[];
  request: CreateOrderRequest;
  idempotencyKey: string;
  now?: Date;
  reservationTtlMinutes?: number;
}) {
  assertCreateOrderRequest(input.request);
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const idempotencyKey = input.idempotencyKey.trim();
  if (idempotencyKey.length < 8 || idempotencyKey.length > 160) {
    throw commerceError("IDEMPOTENCY_REQUIRED", "Нужен корректный Idempotency-Key.", {
      recoverable: true,
      field: "Idempotency-Key",
    });
  }
  const payloadHash = orderPayloadHash(input.request);
  let state = expireReservationsInMemory(input.state, now);
  const existing = state.orders.find(
    (order) => order.idempotencyKey === idempotencyKey,
  );
  if (existing) {
    if (existing.payloadHash !== payloadHash) {
      throw commerceError(
        "IDEMPOTENCY_CONFLICT",
        "Этот ключ уже использован для другого состава заказа.",
        { recoverable: false },
      );
    }
    return {
      state,
      order: publicOrderFromState(state, existing.publicToken),
      replayed: true,
    };
  }

  const customerName = input.request.customer.name.trim();
  const customerPhone = input.request.customer.phone.trim();
  const fulfilmentMethod = normalizeFulfilmentMethod(input.request.fulfilment.method);
  const paymentMethod = normalizePaymentMethod(input.request.payment.method);
  if (!customerName) {
    throw commerceError("INVALID_REQUEST", "Укажите имя покупателя.", {
      recoverable: true,
      field: "customer.name",
    });
  }
  if (customerPhone.replace(/\D/g, "").length < 10) {
    throw commerceError("INVALID_REQUEST", "Укажите корректный телефон.", {
      recoverable: true,
      field: "customer.phone",
    });
  }
  if (!fulfilmentMethod) {
    throw commerceError("INVALID_REQUEST", "Выберите самовывоз или доставку по Актобе.", {
      recoverable: true,
      field: "fulfilment.method",
    });
  }
  const deliveryAddress = input.request.customer.deliveryAddress?.trim() || "";
  if (fulfilmentMethod === "aktobe_delivery" && deliveryAddress.length < 5) {
    throw commerceError("INVALID_REQUEST", "Укажите адрес доставки в Актобе.", {
      recoverable: true,
      field: "customer.deliveryAddress",
    });
  }
  if (!paymentMethod) {
    throw commerceError("INVALID_REQUEST", "Выберите способ оплаты.", {
      recoverable: true,
      field: "payment.method",
    });
  }

  const availableProducts = applyReservationUsage(input.products, state);
  const reconciliation = reconcileCart(availableProducts, input.request.cart, now);
  if (!reconciliation.lines.length || reconciliation.state === "invalid") {
    throw commerceError("CART_INVALID", "Корзина содержит недоступные позиции.", {
      recoverable: true,
      details: { invalidLines: reconciliation.invalidLines },
    });
  }
  if (reconciliation.state === "changed") {
    throw commerceError("PRICE_CHANGED", "Цена изменилась. Подтвердите новый итог.", {
      recoverable: true,
      details: {
        lines: reconciliation.lines
          .filter((line) => line.priceChanged)
          .map((line) => ({
            lineId: line.lineId,
            before: line.previousFinal,
            after: line.pricing.final,
          })),
      },
    });
  }

  state = cloneState(state);
  const token = opaqueToken();
  const orderId = crypto.randomUUID();
  const publicId = orderPublicId(now, token);
  const order: OrderRecord = {
    id: orderId,
    publicToken: token,
    idempotencyKey,
    payloadHash,
    customerName,
    customerPhone,
    customerCity: input.request.customer.city.trim() || "Актобе",
    customerComment: input.request.customer.comment?.trim() || "",
    deliveryAddress,
    preferredContactTime: input.request.customer.preferredContactTime?.trim().slice(0, 120) || "",
    fulfilmentMethod,
    paymentMethod,
    subtotal: reconciliation.totals.subtotal,
    discount: reconciliation.totals.discount,
    total: reconciliation.totals.final,
    currency: reconciliation.totals.currency,
    status: paymentMethod === "kaspi_pay" ? "awaiting_payment" : "pending_contact",
    isTest: input.request.testMode === true,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const ttl = Math.max(
    1,
    input.reservationTtlMinutes ?? DEFAULT_RESERVATION_TTL_MINUTES,
  );
  const items: OrderItemRecord[] = reconciliation.lines.map((line) => ({
    id: crypto.randomUUID(),
    orderId,
    productId: line.productId,
    productSku: line.productSku,
    variantId: line.variantId,
    variantSku: line.variantSku,
    bundleSku: line.bundleSku,
    titleSnapshot: line.productTitle,
    variantSnapshot: line.variantTitle,
    componentSnapshot: structuredClone(line.componentSnapshot),
    quantity: line.quantity,
    unitPrice: line.pricing.final,
    discount: line.pricing.discount * line.quantity,
    lineTotal: line.pricing.final * line.quantity,
    pricingVersion: line.pricing.pricingVersion,
    createdAt: nowIso,
  }));
  const payment: PaymentRecord = {
    id: crypto.randomUUID(),
    orderId,
    method: order.paymentMethod,
    status: "awaiting_payment",
    amount: order.total,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const history: OrderStatusHistoryRecord = {
    id: crypto.randomUUID(),
    orderId,
    toStatus: order.status,
    actorType: "customer",
    reason: `order_created:${publicId}`,
    createdAt: nowIso,
  };
  const reservations: StockReservationRecord[] = reconciliation.lines.flatMap(
    (line) => line.inventoryRequirements.map((requirement) => ({
      id: crypto.randomUUID(),
      orderId,
      variantId: requirement.variantId,
      variantSku: requirement.variantSku,
      quantity: line.quantity * requirement.quantityPerUnit,
      status: "reserved",
      expiresAt: addMinutes(now, ttl),
      createdAt: nowIso,
      updatedAt: nowIso,
    })),
  );

  state.orders.push(order);
  state.orderItems.push(...items);
  state.payments.push(payment);
  state.statusHistory.push(history);
  state.reservations.push(...reservations);
  return {
    state,
    order: publicOrderFromState(state, token),
    replayed: false,
  };
}

export function publicOrderFromState(
  state: CommerceStoreState,
  publicToken: string,
): PublicOrder {
  const order = state.orders.find((candidate) => candidate.publicToken === publicToken);
  if (!order) {
    throw commerceError("ORDER_NOT_FOUND", "Заказ не найден.", {
      recoverable: false,
    });
  }
  const items = state.orderItems.filter((item) => item.orderId === order.id);
  const payment = state.payments.find((item) => item.orderId === order.id);
  if (!payment) {
    throw commerceError("INTERNAL_ERROR", "У заказа отсутствует платёжная запись.", {
      recoverable: true,
    });
  }
  return {
    orderId: order.id,
    displayId: orderDisplayId(order.createdAt, order.publicToken),
    publicToken: order.publicToken,
    status: order.status,
    paymentStatus: payment.status,
    customer: {
      name: order.customerName,
      city: order.customerCity,
      deliveryAddress: order.deliveryAddress || undefined,
      preferredContactTime: order.preferredContactTime || undefined,
    },
    fulfilmentMethod: order.fulfilmentMethod,
    paymentMethod: order.paymentMethod,
    items: items.map((item) => ({
      title: item.titleSnapshot,
      variant: item.variantSnapshot,
      productSku: item.productSku,
      variantSku: item.variantSku,
      bundleSku: item.bundleSku,
      components: structuredClone(item.componentSnapshot),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      lineTotal: item.lineTotal,
    })),
    totals: {
      subtotal: order.subtotal,
      discount: order.discount,
      final: order.total,
      currency: order.currency,
    },
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    reservationExpiresAt: state.reservations
      .filter((reservation) => reservation.orderId === order.id && reservation.status === "reserved")
      .map((reservation) => reservation.expiresAt)
      .sort()[0],
  };
}

export function adminOrderFromState(
  state: CommerceStoreState,
  orderId: string,
): AdminOrder {
  const record = state.orders.find((candidate) => candidate.id === orderId);
  if (!record) {
    throw commerceError("ORDER_NOT_FOUND", "Заказ не найден.", { recoverable: false });
  }
  const publicOrder = publicOrderFromState(state, record.publicToken);
  const payment = state.payments.find((candidate) => candidate.orderId === record.id);
  if (!payment) {
    throw commerceError("INTERNAL_ERROR", "У заказа отсутствует платёжная запись.", {
      recoverable: true,
    });
  }
  return {
    ...publicOrder,
    customer: {
      ...publicOrder.customer,
      phone: record.customerPhone,
      comment: record.customerComment || undefined,
    },
    payment: {
      method: payment.method,
      status: payment.status,
      reportedAt: payment.reportedAt,
      verifiedAt: payment.verifiedAt,
      reference: payment.reference,
      receiptMetadata: payment.receiptMetadata
        ? structuredClone(payment.receiptMetadata)
        : undefined,
    },
    history: state.statusHistory
      .filter((entry) => entry.orderId === record.id)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((entry) => structuredClone(entry)),
    isTest: record.isTest,
  };
}

export function listAdminOrdersInMemory(
  state: CommerceStoreState,
  options: { includeTest?: boolean; limit?: number } = {},
): AdminOrder[] {
  const limit = Math.min(500, Math.max(1, options.limit ?? 200));
  return state.orders
    .filter((order) => options.includeTest || !order.isTest)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit)
    .map((order) => adminOrderFromState(state, order.id));
}

export function reportPaymentInMemory(input: {
  state: CommerceStoreState;
  orderId: string;
  reference?: string;
  receiptMetadata?: Record<string, unknown>;
  now?: Date;
  reportedReservationTtlMinutes?: number;
}) {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const state = expireReservationsInMemory(input.state, now);
  const order = state.orders.find((candidate) => candidate.id === input.orderId);
  if (!order) {
    throw commerceError("ORDER_NOT_FOUND", "Заказ не найден.", { recoverable: false });
  }
  if (order.status === "expired") {
    throw commerceError("ORDER_EXPIRED", "Срок резерва заказа истёк.", {
      recoverable: true,
    });
  }
  if (!/kaspi/i.test(order.paymentMethod)) {
    throw commerceError(
      "PAYMENT_METHOD_NOT_REPORTABLE",
      "Для этого способа оплаты отчёт не требуется.",
      { recoverable: true },
    );
  }
  if (order.status === "payment_reported") {
    throw commerceError(
      "PAYMENT_ALREADY_REPORTED",
      "Оплата уже отправлена на проверку.",
      { recoverable: false },
    );
  }
  assertOrderTransition(order.status, "payment_reported", "customer");
  const next = cloneState(state);
  const mutableOrder = next.orders.find((candidate) => candidate.id === order.id)!;
  const mutablePayment = next.payments.find((candidate) => candidate.orderId === order.id)!;
  const fromStatus = mutableOrder.status;
  mutableOrder.status = "payment_reported";
  mutableOrder.updatedAt = nowIso;
  mutablePayment.status = "payment_reported";
  mutablePayment.reportedAt = nowIso;
  mutablePayment.reference = input.reference?.slice(0, 160);
  mutablePayment.receiptMetadata = input.receiptMetadata
    ? structuredClone(input.receiptMetadata)
    : undefined;
  mutablePayment.updatedAt = nowIso;
  const extendedExpiry = addMinutes(
    now,
    Math.max(
      1,
      input.reportedReservationTtlMinutes ??
        DEFAULT_REPORTED_RESERVATION_TTL_MINUTES,
    ),
  );
  for (const reservation of next.reservations) {
    if (reservation.orderId === order.id && reservation.status === "reserved") {
      reservation.expiresAt = extendedExpiry;
      reservation.updatedAt = nowIso;
    }
  }
  next.statusHistory.push({
    id: crypto.randomUUID(),
    orderId: order.id,
    fromStatus,
    toStatus: "payment_reported",
    actorType: "customer",
    reason: "customer_payment_report",
    createdAt: nowIso,
  });
  return {
    state: next,
    order: publicOrderFromState(next, mutableOrder.publicToken),
  };
}

export function confirmPaymentInMemory(input: {
  state: CommerceStoreState;
  orderId: string;
  actorType: "admin" | "provider";
  actorId?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const state = expireReservationsInMemory(input.state, now);
  const order = state.orders.find((candidate) => candidate.id === input.orderId);
  if (!order) {
    throw commerceError("ORDER_NOT_FOUND", "Заказ не найден.", { recoverable: false });
  }
  assertOrderTransition(order.status, "paid", input.actorType);
  const next = cloneState(state);
  const mutableOrder = next.orders.find((candidate) => candidate.id === order.id)!;
  const mutablePayment = next.payments.find((candidate) => candidate.orderId === order.id)!;
  const fromStatus = mutableOrder.status;
  mutableOrder.status = "paid";
  mutableOrder.updatedAt = nowIso;
  mutablePayment.status = "paid";
  mutablePayment.verifiedAt = nowIso;
  mutablePayment.updatedAt = nowIso;
  for (const reservation of next.reservations) {
    if (reservation.orderId === order.id && reservation.status === "reserved") {
      reservation.status = "confirmed";
      reservation.updatedAt = nowIso;
    }
  }
  next.statusHistory.push({
    id: crypto.randomUUID(),
    orderId: order.id,
    fromStatus,
    toStatus: "paid",
    actorType: input.actorType,
    actorId: input.actorId,
    reason: "trusted_payment_confirmation",
    createdAt: nowIso,
  });
  return {
    state: next,
    order: publicOrderFromState(next, mutableOrder.publicToken),
  };
}

export function transitionOrderInMemory(input: {
  state: CommerceStoreState;
  orderId: string;
  toStatus: Extract<OrderStatus, "awaiting_payment" | "processing" | "completed">;
  actorId?: string;
  reason?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const state = expireReservationsInMemory(input.state, now);
  const order = state.orders.find((candidate) => candidate.id === input.orderId);
  if (!order) {
    throw commerceError("ORDER_NOT_FOUND", "Заказ не найден.", { recoverable: false });
  }
  assertOrderTransition(order.status, input.toStatus, "admin");
  const next = cloneState(state);
  const mutableOrder = next.orders.find((candidate) => candidate.id === order.id)!;
  const fromStatus = mutableOrder.status;
  mutableOrder.status = input.toStatus;
  mutableOrder.updatedAt = nowIso;
  next.statusHistory.push({
    id: crypto.randomUUID(),
    orderId: order.id,
    fromStatus,
    toStatus: input.toStatus,
    actorType: "admin",
    actorId: input.actorId,
    reason: input.reason || `admin_${input.toStatus}`,
    createdAt: nowIso,
  });
  return {
    state: next,
    order: publicOrderFromState(next, mutableOrder.publicToken),
  };
}

export function cancelOrderInMemory(input: {
  state: CommerceStoreState;
  orderId: string;
  actorType: "admin" | "system";
  actorId?: string;
  reason?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const state = expireReservationsInMemory(input.state, now);
  const order = state.orders.find((candidate) => candidate.id === input.orderId);
  if (!order) {
    throw commerceError("ORDER_NOT_FOUND", "Заказ не найден.", { recoverable: false });
  }
  assertOrderTransition(order.status, "cancelled", input.actorType);
  const next = cloneState(state);
  const mutableOrder = next.orders.find((candidate) => candidate.id === order.id)!;
  const fromStatus = mutableOrder.status;
  mutableOrder.status = "cancelled";
  mutableOrder.updatedAt = nowIso;
  const payment = next.payments.find((candidate) => candidate.orderId === order.id);
  if (payment && payment.status !== "paid") {
    payment.status = "cancelled";
    payment.updatedAt = nowIso;
  }
  for (const reservation of next.reservations) {
    if (reservation.orderId === order.id && reservation.status === "reserved") {
      reservation.status = "released";
      reservation.updatedAt = nowIso;
    }
  }
  next.statusHistory.push({
    id: crypto.randomUUID(),
    orderId: order.id,
    fromStatus,
    toStatus: "cancelled",
    actorType: input.actorType,
    actorId: input.actorId,
    reason: input.reason || "order_cancelled",
    createdAt: nowIso,
  });
  return {
    state: next,
    order: publicOrderFromState(next, mutableOrder.publicToken),
  };
}
