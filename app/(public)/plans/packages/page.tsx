import type { Metadata } from "next";
import { getCatalogItem } from "@/lib/api-client/commerce";
import { pageMetadata } from "@/lib/seo";
import { renderItemPage } from "../[sku]/package-view";

/**
 * `/plans/packages` — the packages page (captain, 2026-09-30).
 *
 * The package view used to answer only on its catalogue-SKU URL
 * (`/plans/PKG-BASIC`), which is an inventory code rather than something a
 * visitor reads or shares. This route pins the same view to the package that
 * opens the tier list (Bronze 1 = `PKG-BASIC`); the tier × term selector inside
 * shows every other package, and the old SKU URLs redirect here
 * (`../[sku]/page.tsx`).
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const item = await getCatalogItem("PKG-BASIC").catch(() => null);
  return pageMetadata({
    title: `${item?.name ?? "Villa Memorial Plan"} — Villa Funeraria`,
    description:
      item?.description?.trim() ||
      "The Villa Memorial Plan packages: what each one includes, who is eligible, and the published 2026 payment terms.",
    path: "/plans/packages",
    image: item?.image ?? undefined,
  });
}

export default async function PackagesPage() {
  return renderItemPage("PKG-BASIC");
}
