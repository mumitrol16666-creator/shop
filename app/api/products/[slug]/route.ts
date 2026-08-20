import { commerceCatalog, commerceFailure, noStoreHeaders } from "../../../../lib/commerce/api-support";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const slug = decodeURIComponent(new URL(request.url).pathname.split("/").filter(Boolean).at(-1) || "");
    const products = await commerceCatalog();
    const product = products.find((item) => item.slug === slug || item.sku === slug || item.id === slug);
    if (!product) {
      return Response.json(
        { error: { code: "PRODUCT_NOT_FOUND", message: "Товар не найден.", recoverable: false } },
        { status: 404, headers: noStoreHeaders },
      );
    }
    return Response.json({ product }, { headers: noStoreHeaders });
  } catch (error) {
    return commerceFailure(error);
  }
}
