import { StoreRuntime } from "../components/store/StoreRuntime";
import { commerceCatalog } from "../lib/commerce/api-support";

export const dynamic = "force-dynamic";

export default async function HomePageRoute() {
  const products = await commerceCatalog();
  return <StoreRuntime products={products} route={{ kind: "home" }} />;
}
