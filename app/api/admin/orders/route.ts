import { isAdminRequest } from "../../../../lib/admin-auth-server";
import { commerceD1, commerceFailure, noStoreHeaders } from "../../../../lib/commerce/api-support";
import { listAdminOrdersD1 } from "../../../../lib/commerce/d1-store";
import { commerceError } from "../../../../lib/commerce/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!(await isAdminRequest(request))) {
      return Response.json(
        { error: "Требуется вход администратора" },
        { status: 401, headers: noStoreHeaders },
      );
    }
    const url = new URL(request.url);
    const d1 = commerceD1();
    if (!d1) throw commerceError("INTERNAL_ERROR", "Хранилище заказов временно недоступно.");
    const orders = await listAdminOrdersD1({
      d1,
      includeTest: url.searchParams.get("include_test") === "1",
      limit: Number(url.searchParams.get("limit") || 200),
    });
    return Response.json(
      { orders, generatedAt: new Date().toISOString() },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return commerceFailure(error);
  }
}
