import { reconcileCart } from "../../../../lib/commerce/cart";
import { commerceCatalog, commerceFailure, isSmokeRequest, noStoreHeaders } from "../../../../lib/commerce/api-support";
import type { CartDraft } from "../../../../lib/commerce/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { cart?: CartDraft; testMode?: boolean };
    const products = await commerceCatalog({
      includeSmoke: isSmokeRequest(request, payload.testMode === true),
    });
    const reconciliation = reconcileCart(products, payload.cart as CartDraft);
    return Response.json({ reconciliation }, { headers: noStoreHeaders });
  } catch (error) {
    return commerceFailure(error);
  }
}
