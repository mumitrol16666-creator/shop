import { isAdminRequest } from "../../../../../../lib/admin-auth-server";
import { commerceD1, commerceFailure, noStoreHeaders } from "../../../../../../lib/commerce/api-support";
import { transitionOrderD1 } from "../../../../../../lib/commerce/d1-store";
import { commerceError } from "../../../../../../lib/commerce/errors";
import { notifyAdminOrderStatus } from "../../../../../../lib/commerce/mystore-info";
import type { OrderStatus } from "../../../../../../lib/commerce/types";

export const dynamic = "force-dynamic";

const allowedStatuses = new Set<OrderStatus>(["awaiting_payment", "processing", "completed"]);

export async function POST(request: Request) {
  try {
    if (!(await isAdminRequest(request))) {
      return Response.json(
        { error: "Требуется вход администратора" },
        { status: 401, headers: noStoreHeaders },
      );
    }
    const segments = new URL(request.url).pathname.split("/").filter(Boolean);
    const orderId = decodeURIComponent(segments.at(-2) || "");
    const payload = (await request.json().catch(() => ({}))) as {
      status?: OrderStatus;
      reason?: string;
    };
    if (!payload.status || !allowedStatuses.has(payload.status)) {
      throw commerceError("INVALID_REQUEST", "Недопустимый статус заказа.", {
        recoverable: true,
        field: "status",
      });
    }
    const d1 = commerceD1();
    if (!d1) throw commerceError("INTERNAL_ERROR", "Хранилище заказов временно недоступно.");
    const order = await transitionOrderD1({
      d1,
      orderId,
      toStatus: payload.status as "awaiting_payment" | "processing" | "completed",
      reason: payload.reason,
    });
    await notifyAdminOrderStatus(order, `📦 Статус заказа: ${order.status}`);
    return Response.json({ order }, { headers: noStoreHeaders });
  } catch (error) {
    return commerceFailure(error);
  }
}
