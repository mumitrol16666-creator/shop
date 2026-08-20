import { commerceD1, commerceFailure, noStoreHeaders } from "../../../../lib/commerce/api-support";
import { commerceError } from "../../../../lib/commerce/errors";
import { readPublicOrderD1 } from "../../../../lib/commerce/d1-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const token = decodeURIComponent(new URL(request.url).pathname.split("/").filter(Boolean).at(-1) || "");
    const d1 = commerceD1();
    if (!d1) throw commerceError("INTERNAL_ERROR", "Хранилище заказов временно недоступно.");
    return Response.json(
      { order: await readPublicOrderD1(d1, token) },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return commerceFailure(error);
  }
}
