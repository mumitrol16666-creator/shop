import { StoreRuntime } from "../../../components/store/StoreRuntime";
import { commerceCatalog } from "../../../lib/commerce/api-support";

export const dynamic = "force-dynamic";

export default async function OrderRoute({ params }: { params: Promise<{ token: string }> }) {
  const [{ token }, products] = await Promise.all([params, commerceCatalog()]);
  return <StoreRuntime products={products} route={{ kind: "order", token }} />;
}
