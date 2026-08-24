import { notFound } from "next/navigation";
import { StoreRuntime } from "../../../components/store/StoreRuntime";
import { commerceCatalog } from "../../../lib/commerce/api-support";

export const dynamic = "force-dynamic";

export default async function CategoryRoute({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const products = await commerceCatalog();
  if (!products.some((product) => product.categorySlug === category)) notFound();
  return <StoreRuntime products={products} route={{ kind: "catalog", categorySlug: category }} />;
}
