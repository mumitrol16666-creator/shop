import { catalogVersion } from "../../../lib/commerce/pricing";
import { commerceCatalog, commerceFailure, noStoreHeaders } from "../../../lib/commerce/api-support";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await commerceCatalog();
    return Response.json(
      { schemaVersion: 1, catalogVersion: catalogVersion(products), products },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return commerceFailure(error);
  }
}
