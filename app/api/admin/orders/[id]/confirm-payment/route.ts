import { isAdminRequest } from "../../../../../../lib/admin-auth-server";
import { commerceD1, commerceFailure, noStoreHeaders } from "../../../../../../lib/commerce/api-support";
import { commerceError } from "../../../../../../lib/commerce/errors";
import { confirmPaymentD1 } from "../../../../../../lib/commerce/d1-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!(await isAdminRequest(request))) {
      return Response.json({ error: "Требуется вход администратора" }, { status: 401, headers: noStoreHeaders });
    }
    const segments = new URL(request.url).pathname.split("/").filter(Boolean);
    const orderId = decodeURIComponent(segments.at(-2) || "");
    const d1 = commerceD1();
    if (!d1) throw commerceError("INTERNAL_ERROR", "Хранилище заказов временно недоступно.");
    const order = await confirmPaymentD1({ d1, orderId, actorType: "admin" });
    return Response.json({ order }, { headers: noStoreHeaders });
  } catch (error) {
    return commerceFailure(error);
  }
}
