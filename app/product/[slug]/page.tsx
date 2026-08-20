import { notFound } from "next/navigation";
import { StoreRuntime } from "../../../components/store/StoreRuntime";
import { commerceCatalog } from "../../../lib/commerce/api-support";

export const dynamic = "force-dynamic";

export default async function ProductRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const products = await commerceCatalog();
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();
  return <StoreRuntime products={products} route={{ kind: "product", product }} />;
}

