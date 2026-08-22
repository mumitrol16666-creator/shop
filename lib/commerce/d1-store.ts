import { reconcileCart } from "./cart";
import { ensureSeedCatalogInD1, type D1BindingLike } from "./d1-catalog";
import { commerceError } from "./errors";
import { orderDisplayId } from "./checkout";
import {
  assertCreateOrderRequest,
  createOrderInMemory,
  DEFAULT_REPORTED_RESERVATION_TTL_MINUTES,
  DEFAULT_RESERVATION_TTL_MINUTES,
  orderPayloadHash,
} from "./orders";
import { assertOrderTransition } from "./status";
import type {
  CreateOrderRequest,
  OrderStatus,
  PaymentStatus,
  ProductReadModel,
  PublicOrder,
} from "./types";

type D1RunResult = { meta?: { changes?: number } };
type D1Prepared = {
  bind: (...values: unknown[]) => D1Prepared;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  all: <T = Record<string, unknown>>() => Promise<{ results?: T[] }>;
  run: () => Promise<D1RunResult>;
};
export type CommerceD1 = D1BindingLike & {
  prepare: (sql: string) => D1Prepared;
  batch: (statements: D1Prepared[]) => Promise<D1RunResult[]>;
};

const addMinutes = (date: Date, minutes: number) =>
  new Date(date.getTime() + minutes * 60_000).toISOString();

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  try {
    return JSON.parse(value || "") as T;
  } catch {
    return fallback;
  }
};

const isConstraint = (error: unknown, token: string) =>
  error instanceof Error && error.message.toUpperCase().includes(token.toUpperCase());

export async function cleanupExpiredD1(d1: CommerceD1, now = new Date()) {
  const nowIso = now.toISOString();
  const expired = await d1
    .prepare(`SELECT order_id, variant_id, SUM(quantity) AS quantity
      FROM stock_reservations
      WHERE status = 'reserved' AND expires_at <= ?
      GROUP BY order_id, variant_id`)
    .bind(nowIso)
    .all<{ order_id: string; variant_id: string; quantity: number }>();
  const expiredRows = expired.results ?? [];
  const orderIds = [...new Set(expiredRows.map((row) => row.order_id))];
  if (!orderIds.length) return;

  const statements: D1Prepared[] = expiredRows.map((row) =>
    d1
      .prepare(`UPDATE product_variants
        SET reserved_quantity = MAX(0, reserved_quantity - ?), updated_at = ?
        WHERE id = ? AND EXISTS (
          SELECT 1 FROM stock_reservations
          WHERE order_id = ? AND variant_id = ? AND status = 'reserved' AND expires_at <= ?
        )`)
      .bind(row.quantity, nowIso, row.variant_id, row.order_id, row.variant_id, nowIso),
  );
  statements.push(
    d1
      .prepare(`UPDATE stock_reservations
        SET status = 'expired', updated_at = ?
        WHERE status = 'reserved' AND expires_at <= ?`)
      .bind(nowIso, nowIso),
  );
  for (const orderId of orderIds) {
    const order = await d1
      .prepare("SELECT status FROM orders WHERE id = ? LIMIT 1")
      .bind(orderId)
      .first<{ status: OrderStatus }>();
    if (!order || !["awaiting_payment", "pending_contact"].includes(order.status)) continue;
    statements.push(
      d1
        .prepare(`INSERT INTO order_status_history (
          id, order_id, from_status, to_status, actor_type, reason, created_at
        ) SELECT ?, ?, ?, 'expired', 'system', 'reservation_ttl_elapsed', ?
          WHERE EXISTS (SELECT 1 FROM orders WHERE id = ? AND status = ?)`)
        .bind(crypto.randomUUID(), orderId, order.status, nowIso, orderId, order.status),
      d1
        .prepare(`UPDATE orders SET status = 'expired', updated_at = ?
          WHERE id = ? AND status IN ('awaiting_payment', 'pending_contact')`)
        .bind(nowIso, orderId),
    );
  }
  await d1.batch(statements);
}

async function readPublicOrderBy(
  d1: CommerceD1,
  column: "id" | "public_token",
  value: string,
): Promise<PublicOrder> {
  const order = await d1
    .prepare(`SELECT * FROM orders WHERE ${column} = ? LIMIT 1`)
    .bind(value)
    .first<Record<string, unknown>>();
  if (!order) {
    throw commerceError("ORDER_NOT_FOUND", "Заказ не найден.", { recoverable: false });
  }
  const [itemsResult, payment, reservation] = await Promise.all([
    d1
      .prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at, id")
      .bind(String(order.id))
      .all<Record<string, unknown>>(),
    d1
      .prepare("SELECT * FROM payments WHERE order_id = ? LIMIT 1")
      .bind(String(order.id))
      .first<Record<string, unknown>>(),
    d1
      .prepare("SELECT expires_at FROM stock_reservations WHERE order_id = ? AND status = 'reserved' ORDER BY expires_at LIMIT 1")
      .bind(String(order.id))
      .first<{ expires_at: string }>(),
  ]);
  if (!payment) {
    throw commerceError("INTERNAL_ERROR", "У заказа отсутствует платёжная запись.", {
      recoverable: true,
    });
  }
  return {
    orderId: String(order.id),
    displayId: orderDisplayId(String(order.created_at), String(order.public_token)),
    publicToken: String(order.public_token),
    status: String(order.status) as OrderStatus,
    paymentStatus: String(payment.status) as PaymentStatus,
    customer: {
      name: String(order.customer_name),
      city: String(order.customer_city),
      deliveryAddress: String(order.delivery_address || "") || undefined,
      preferredContactTime: String(order.preferred_contact_time || "") || undefined,
    },
    fulfilmentMethod: String(order.fulfilment_method),
    paymentMethod: String(order.payment_method),
    items: (itemsResult.results ?? []).map((item) => ({
      title: String(item.title_snapshot),
      variant: String(item.variant_snapshot),
      productSku: String(item.product_sku),
      variantSku: String(item.variant_sku),
      bundleSku: String(item.bundle_sku),
      components: parseJson(String(item.component_snapshot_json || "[]"), []),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price_kzt),
      discount: Number(item.discount_kzt),
      lineTotal: Number(item.line_total_kzt),
    })),
    totals: {
      subtotal: Number(order.subtotal_kzt),
      discount: Number(order.discount_kzt),
      final: Number(order.total_kzt),
      currency: "KZT",
    },
    createdAt: String(order.created_at),
    updatedAt: String(order.updated_at),
    reservationExpiresAt: reservation?.expires_at,
  };
}

export async function readPublicOrderD1(
  d1: CommerceD1,
  publicToken: string,
) {
  await cleanupExpiredD1(d1);
  return readPublicOrderBy(d1, "public_token", publicToken);
}

export async function createOrderD1(input: {
  d1: CommerceD1;
  products: ProductReadModel[];
  request: CreateOrderRequest;
  idempotencyKey: string;
  now?: Date;
  reservationTtlMinutes?: number;
}) {
  const now = input.now ?? new Date();
  assertCreateOrderRequest(input.request);
  await ensureSeedCatalogInD1(input.d1);
  await cleanupExpiredD1(input.d1, now);
  const payloadHash = orderPayloadHash(input.request);
  const existing = await input.d1
    .prepare("SELECT id, public_token, payload_hash FROM orders WHERE idempotency_key = ? LIMIT 1")
    .bind(input.idempotencyKey)
    .first<{ id: string; public_token: string; payload_hash: string }>();
  if (existing) {
    if (existing.payload_hash !== payloadHash) {
      throw commerceError(
        "IDEMPOTENCY_CONFLICT",
        "Этот ключ уже использован для другого состава заказа.",
        { recoverable: false },
      );
    }
    return {
      order: await readPublicOrderBy(input.d1, "public_token", existing.public_token),
      replayed: true,
    };
  }

  const reconciliation = reconcileCart(input.products, input.request.cart, now);
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
          .map((line) => ({ lineId: line.lineId, before: line.previousFinal, after: line.pricing.final })),
      },
    });
  }

  const memoryResult = createOrderInMemory({
    state: {
      schemaVersion: 1,
      orders: [],
      orderItems: [],
      payments: [],
      statusHistory: [],
      reservations: [],
    },
    products: input.products,
    request: input.request,
    idempotencyKey: input.idempotencyKey,
    now,
    reservationTtlMinutes:
      input.reservationTtlMinutes ?? DEFAULT_RESERVATION_TTL_MINUTES,
  });
  const order = memoryResult.state.orders[0]!;
  const payment = memoryResult.state.payments[0]!;
  const history = memoryResult.state.statusHistory[0]!;
  const reservationsByVariant = new Map<
    string,
    { id: string; variantId: string; variantSku: string; quantity: number; expiresAt: string }
  >();
  for (const reservation of memoryResult.state.reservations) {
    const current = reservationsByVariant.get(reservation.variantId);
    if (current) current.quantity += reservation.quantity;
    else {
      reservationsByVariant.set(reservation.variantId, {
        id: reservation.id,
        variantId: reservation.variantId,
        variantSku: reservation.variantSku,
        quantity: reservation.quantity,
        expiresAt: reservation.expiresAt,
      });
    }
  }

  const statements: D1Prepared[] = [
    input.d1
      .prepare(`INSERT INTO orders (
        id, public_token, idempotency_key, payload_hash, customer_name,
        customer_phone, customer_city, customer_comment, delivery_address,
        preferred_contact_time, fulfilment_method,
        payment_method, subtotal_kzt, discount_kzt, total_kzt, currency,
        status, is_test, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'KZT', ?, ?, ?, ?)`)
      .bind(
        order.id,
        order.publicToken,
        order.idempotencyKey,
        order.payloadHash,
        order.customerName,
        order.customerPhone,
        order.customerCity,
        order.customerComment,
        order.deliveryAddress,
        order.preferredContactTime,
        order.fulfilmentMethod,
        order.paymentMethod,
        order.subtotal,
        order.discount,
        order.total,
        order.status,
        order.isTest ? 1 : 0,
        order.createdAt,
        order.updatedAt,
      ),
    ...memoryResult.state.orderItems.map((item) =>
      input.d1
        .prepare(`INSERT INTO order_items (
          id, order_id, product_id, product_sku, variant_id, variant_sku,
          bundle_sku, title_snapshot, variant_snapshot, component_snapshot_json,
          quantity, unit_price_kzt, discount_kzt, line_total_kzt,
          pricing_version, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          item.id,
          item.orderId,
          item.productId,
          item.productSku,
          item.variantId,
          item.variantSku,
          item.bundleSku,
          item.titleSnapshot,
          item.variantSnapshot,
          JSON.stringify(item.componentSnapshot),
          item.quantity,
          item.unitPrice,
          item.discount,
          item.lineTotal,
          item.pricingVersion,
          item.createdAt,
        ),
    ),
    input.d1
      .prepare(`INSERT INTO payments (
        id, order_id, method, status, amount_kzt, receipt_metadata_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, '{}', ?, ?)`)
      .bind(
        payment.id,
        payment.orderId,
        payment.method,
        payment.status,
        payment.amount,
        payment.createdAt,
        payment.updatedAt,
      ),
    input.d1
      .prepare(`INSERT INTO order_status_history (
        id, order_id, from_status, to_status, actor_type, reason, created_at
      ) VALUES (?, ?, NULL, ?, ?, ?, ?)`)
      .bind(
        history.id,
        history.orderId,
        history.toStatus,
        history.actorType,
        history.reason ?? null,
        history.createdAt,
      ),
    ...[...reservationsByVariant.values()].map((reservation) =>
      input.d1
        .prepare(`INSERT INTO stock_reservations (
          id, order_id, variant_id, variant_sku, quantity, status,
          expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, (
          SELECT CASE
            WHEN stock_quantity - reserved_quantity >= ? THEN ?
            ELSE NULL
          END FROM product_variants WHERE id = ? AND sku = ?
        ), 'reserved', ?, ?, ?)`)
        .bind(
          reservation.id,
          order.id,
          reservation.variantId,
          reservation.variantSku,
          reservation.quantity,
          reservation.quantity,
          reservation.variantId,
          reservation.variantSku,
          reservation.expiresAt,
          order.createdAt,
          order.updatedAt,
        ),
    ),
    ...[...reservationsByVariant.values()].map((reservation) =>
      input.d1
        .prepare(`UPDATE product_variants
          SET reserved_quantity = reserved_quantity + ?, updated_at = ?
          WHERE id = ? AND sku = ?`)
        .bind(
          reservation.quantity,
          order.updatedAt,
          reservation.variantId,
          reservation.variantSku,
        ),
    ),
  ];

  try {
    await input.d1.batch(statements);
  } catch (error) {
    if (
      isConstraint(error, "INSUFFICIENT_STOCK") ||
      isConstraint(error, "stock_reservations.quantity")
    ) {
      throw commerceError("INSUFFICIENT_STOCK", "Остаток изменился во время оформления.", {
        recoverable: true,
      });
    }
    if (isConstraint(error, "idempotency_key")) {
      const raced = await input.d1
        .prepare("SELECT public_token, payload_hash FROM orders WHERE idempotency_key = ? LIMIT 1")
        .bind(input.idempotencyKey)
        .first<{ public_token: string; payload_hash: string }>();
      if (raced?.payload_hash === payloadHash) {
        return {
          order: await readPublicOrderBy(input.d1, "public_token", raced.public_token),
          replayed: true,
        };
      }
      throw commerceError("IDEMPOTENCY_CONFLICT", "Конфликт повторной отправки заказа.", {
        recoverable: false,
      });
    }
    throw error;
  }

  return {
    order: await readPublicOrderBy(input.d1, "public_token", order.publicToken),
    replayed: false,
  };
}

export async function reportPaymentD1(input: {
  d1: CommerceD1;
  orderId: string;
  reference?: string;
  receiptMetadata?: Record<string, unknown>;
  now?: Date;
  reportedReservationTtlMinutes?: number;
}) {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  await cleanupExpiredD1(input.d1, now);
  const order = await input.d1
    .prepare("SELECT id, public_token, status, payment_method FROM orders WHERE id = ? LIMIT 1")
    .bind(input.orderId)
    .first<{ id: string; public_token: string; status: OrderStatus; payment_method: string }>();
  if (!order) throw commerceError("ORDER_NOT_FOUND", "Заказ не найден.", { recoverable: false });
  if (order.status === "expired") {
    throw commerceError("ORDER_EXPIRED", "Срок резерва заказа истёк.", { recoverable: true });
  }
  if (!/kaspi/i.test(order.payment_method)) {
    throw commerceError("PAYMENT_METHOD_NOT_REPORTABLE", "Для этого способа оплаты отчёт не требуется.", { recoverable: true });
  }
  if (order.status === "payment_reported") {
    throw commerceError("PAYMENT_ALREADY_REPORTED", "Оплата уже отправлена на проверку.", { recoverable: false });
  }
  assertOrderTransition(order.status, "payment_reported", "customer");
  const expiry = addMinutes(
    now,
    input.reportedReservationTtlMinutes ?? DEFAULT_REPORTED_RESERVATION_TTL_MINUTES,
  );
  await input.d1.batch([
    input.d1
      .prepare(`INSERT INTO order_status_history (
        id, order_id, from_status, to_status, actor_type, reason, created_at
      ) SELECT ?, ?, ?, 'payment_reported', 'customer', 'customer_payment_report', ?
        WHERE EXISTS (SELECT 1 FROM orders WHERE id = ? AND status = 'awaiting_payment')`)
      .bind(crypto.randomUUID(), order.id, order.status, nowIso, order.id),
    input.d1
      .prepare("UPDATE orders SET status = 'payment_reported', updated_at = ? WHERE id = ? AND status = 'awaiting_payment'")
      .bind(nowIso, order.id),
    input.d1
      .prepare(`UPDATE payments SET status = 'payment_reported', reported_at = ?,
        reference = ?, receipt_metadata_json = ?, updated_at = ? WHERE order_id = ?`)
      .bind(
        nowIso,
        input.reference?.slice(0, 160) ?? null,
        JSON.stringify(input.receiptMetadata ?? {}),
        nowIso,
        order.id,
      ),
    input.d1
      .prepare("UPDATE stock_reservations SET expires_at = ?, updated_at = ? WHERE order_id = ? AND status = 'reserved'")
      .bind(expiry, nowIso, order.id),
  ]);
  return readPublicOrderBy(input.d1, "public_token", order.public_token);
}

export async function confirmPaymentD1(input: {
  d1: CommerceD1;
  orderId: string;
  actorType: "admin" | "provider";
  actorId?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const order = await input.d1
    .prepare("SELECT id, public_token, status FROM orders WHERE id = ? LIMIT 1")
    .bind(input.orderId)
    .first<{ id: string; public_token: string; status: OrderStatus }>();
  if (!order) throw commerceError("ORDER_NOT_FOUND", "Заказ не найден.", { recoverable: false });
  assertOrderTransition(order.status, "paid", input.actorType);
  const reservations = await input.d1
    .prepare(`SELECT variant_id, SUM(quantity) AS quantity
      FROM stock_reservations WHERE order_id = ? AND status = 'reserved'
      GROUP BY variant_id`)
    .bind(order.id)
    .all<{ variant_id: string; quantity: number }>();
  await input.d1.batch([
    ...(reservations.results ?? []).map((reservation) =>
      input.d1
        .prepare(`UPDATE product_variants
          SET stock_quantity = stock_quantity - ?,
              reserved_quantity = MAX(0, reserved_quantity - ?),
              updated_at = ?
          WHERE id = ? AND EXISTS (
            SELECT 1 FROM orders WHERE id = ? AND status IN ('pending_contact', 'awaiting_payment', 'payment_reported')
          )`)
        .bind(reservation.quantity, reservation.quantity, nowIso, reservation.variant_id, order.id),
    ),
    input.d1
      .prepare(`INSERT INTO order_status_history (
        id, order_id, from_status, to_status, actor_type, actor_id, reason, created_at
      ) SELECT ?, ?, ?, 'paid', ?, ?, 'trusted_payment_confirmation', ?
        WHERE EXISTS (SELECT 1 FROM orders WHERE id = ? AND status IN ('pending_contact', 'awaiting_payment', 'payment_reported'))`)
      .bind(crypto.randomUUID(), order.id, order.status, input.actorType, input.actorId ?? null, nowIso, order.id),
    input.d1.prepare("UPDATE stock_reservations SET status = 'confirmed', updated_at = ? WHERE order_id = ? AND status = 'reserved'").bind(nowIso, order.id),
    input.d1.prepare("UPDATE payments SET status = 'paid', verified_at = ?, updated_at = ? WHERE order_id = ? AND status IN ('awaiting_payment', 'payment_reported')").bind(nowIso, nowIso, order.id),
    input.d1.prepare("UPDATE orders SET status = 'paid', updated_at = ? WHERE id = ? AND status IN ('pending_contact', 'awaiting_payment', 'payment_reported')").bind(nowIso, order.id),
  ]);
  return readPublicOrderBy(input.d1, "public_token", order.public_token);
}

export async function cancelOrderD1(input: {
  d1: CommerceD1;
  orderId: string;
  actorId?: string;
  reason?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const order = await input.d1
    .prepare("SELECT id, public_token, status FROM orders WHERE id = ? LIMIT 1")
    .bind(input.orderId)
    .first<{ id: string; public_token: string; status: OrderStatus }>();
  if (!order) throw commerceError("ORDER_NOT_FOUND", "Заказ не найден.", { recoverable: false });
  assertOrderTransition(order.status, "cancelled", "admin");
  const reservations = await input.d1
    .prepare(`SELECT variant_id, SUM(quantity) AS quantity
      FROM stock_reservations WHERE order_id = ? AND status = 'reserved'
      GROUP BY variant_id`)
    .bind(order.id)
    .all<{ variant_id: string; quantity: number }>();
  await input.d1.batch([
    ...(reservations.results ?? []).map((reservation) =>
      input.d1
        .prepare(`UPDATE product_variants
          SET reserved_quantity = MAX(0, reserved_quantity - ?), updated_at = ?
          WHERE id = ? AND EXISTS (
            SELECT 1 FROM orders WHERE id = ? AND status = ?
          )`)
        .bind(reservation.quantity, nowIso, reservation.variant_id, order.id, order.status),
    ),
    input.d1
      .prepare(`INSERT INTO order_status_history (
        id, order_id, from_status, to_status, actor_type, actor_id, reason, created_at
      ) SELECT ?, ?, ?, 'cancelled', 'admin', ?, ?, ?
        WHERE EXISTS (SELECT 1 FROM orders WHERE id = ? AND status = ?)`)
      .bind(crypto.randomUUID(), order.id, order.status, input.actorId ?? null, input.reason ?? "order_cancelled", nowIso, order.id, order.status),
    input.d1.prepare("UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ? AND status = ?").bind(nowIso, order.id, order.status),
    input.d1.prepare("UPDATE payments SET status = 'cancelled', updated_at = ? WHERE order_id = ? AND status != 'paid'").bind(nowIso, order.id),
    input.d1.prepare("UPDATE stock_reservations SET status = 'released', updated_at = ? WHERE order_id = ? AND status = 'reserved'").bind(nowIso, order.id),
  ]);
  return readPublicOrderBy(input.d1, "public_token", order.public_token);
}
