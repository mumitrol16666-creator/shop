import { notFound } from "next/navigation";
import { StoreRuntime } from "../../../components/store/StoreRuntime";
import { categoryBySlug } from "../../../lib/commerce/categories";
import { commerceCatalog } from "../../../lib/commerce/api-support";

export const dynamic = "force-dynamic";

export default async function CategoryRoute({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!categoryBySlug(category)) notFound();
  const products = await commerceCatalog();
  return <StoreRuntime products={products} route={{ kind: "catalog", categorySlug: category }} />;
}

