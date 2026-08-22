import {
  commerceD1,
  commerceFailure,
  noStoreHeaders,
  reportedReservationTtlMinutes,
} from "../../../../../lib/commerce/api-support";
import { commerceError } from "../../../../../lib/commerce/errors";
import { reportPaymentD1 } from "../../../../../lib/commerce/d1-store";
import { notifyPaymentReported } from "../../../../../lib/commerce/mystore-info";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const startedAt = Date.now();
  try {
    const segments = new URL(request.url).pathname.split("/").filter(Boolean);
    const orderId = decodeURIComponent(segments.at(-2) || "");
    const payload = (await request.json().catch(() => ({}))) as {
      reference?: string;
      receiptMetadata?: Record<string, unknown>;
    };
    const d1 = commerceD1();
    if (!d1) throw commerceError("INTERNAL_ERROR", "Хранилище заказов временно недоступно.");
    const order = await reportPaymentD1({
      d1,
      orderId,
      reference: payload.reference,
      receiptMetadata: payload.receiptMetadata,
      reportedReservationTtlMinutes: reportedReservationTtlMinutes(),
    });
    console.info("commerce_payment_transition", {
      requestId,
      orderId: order.orderId,
      status: order.status,
      durationMs: Date.now() - startedAt,
    });
    await notifyPaymentReported(order, new URL(request.url).origin);
    return Response.json({ order }, { headers: noStoreHeaders });
  } catch (error) {
    return commerceFailure(error);
  }
}
