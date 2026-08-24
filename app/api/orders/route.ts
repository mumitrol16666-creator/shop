import { commerceError } from "../../../lib/commerce/errors";
import { createOrderD1 } from "../../../lib/commerce/d1-store";
import {
  commerceCatalog,
  commerceD1,
  commerceFailure,
  isSmokeRequest,
  noStoreHeaders,
  requiredIdempotencyKey,
} from "../../../lib/commerce/api-support";
import type { CreateOrderRequest } from "../../../lib/commerce/types";
import { stableHash } from "../../../lib/commerce/pricing";
import { notifyNewOrder } from "../../../lib/commerce/mystore-info";
import { readStoreSettings } from "../../../lib/store-settings-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const startedAt = Date.now();
  try {
    const idempotencyKey = requiredIdempotencyKey(request);
    if (!idempotencyKey) {
      throw commerceError("IDEMPOTENCY_REQUIRED", "Для создания заказа нужен Idempotency-Key.", {
        recoverable: true,
      });
    }
    const payload = (await request.json()) as CreateOrderRequest;
    const includeSmoke = isSmokeRequest(request, payload.testMode === true);
    if (payload.testMode && !includeSmoke) {
      throw commerceError("INVALID_REQUEST", "Тестовый режим доступен только production smoke.", {
        recoverable: false,
      });
    }
    const d1 = commerceD1();
    if (!d1) throw commerceError("INTERNAL_ERROR", "Хранилище заказов временно недоступно.");
    const products = await commerceCatalog({ includeSmoke });
    const settings = await readStoreSettings();
    if (
      (payload.fulfilment.method === "pickup" && !settings.pickupEnabled) ||
      (payload.fulfilment.method === "aktobe_delivery" && !settings.deliveryEnabled)
    ) {
      throw commerceError("INVALID_REQUEST", "Выбранный способ получения сейчас отключён.", {
        recoverable: true,
        field: "fulfilment.method",
      });
    }
    if (
      (payload.payment.method === "kaspi_pay" && !settings.kaspiEnabled) ||
      (payload.payment.method === "cash_transfer" && !settings.cashTransferEnabled)
    ) {
      throw commerceError("INVALID_REQUEST", "Выбранный способ оплаты сейчас отключён.", {
        recoverable: true,
        field: "payment.method",
      });
    }
    const result = await createOrderD1({
      d1,
      products,
      request: payload,
      idempotencyKey,
      reservationTtlMinutes: settings.reservationMinutes,
    });
    console.info("commerce_order_created", {
      requestId,
      orderId: result.order.orderId,
      idempotencyRef: stableHash(idempotencyKey),
      status: result.order.status,
      replayed: result.replayed,
      test: includeSmoke,
      durationMs: Date.now() - startedAt,
    });
    if (!result.replayed && !includeSmoke) {
      await notifyNewOrder(result.order, new URL(request.url).origin, payload.customer.phone);
    }
    return Response.json(result, {
      status: result.replayed ? 200 : 201,
      headers: noStoreHeaders,
    });
  } catch (error) {
    return commerceFailure(error);
  }
}
