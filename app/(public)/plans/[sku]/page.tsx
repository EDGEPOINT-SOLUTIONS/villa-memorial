import type { Metadata } from "next";
import { getCatalogItem } from "@/lib/api-client/commerce";
import { pageMetadata } from "@/lib/seo";
import { renderItemPage } from "./package-view";

type PlanDetailParams = { params: Promise<{ sku: string }> };

/**
 * Per-item metadata: the catalogue item's own name and recorded description,
 * canonicalised to its SKU URL. An unknown SKU 404s in the page itself, so the
 * head points at the plan index instead of inventing a title.
 */
export async function generateMetadata({ params }: PlanDetailParams): Promise<Metadata> {
  const { sku } = await params;
  const item = await getCatalogItem(decodeURIComponent(sku)).catch(() => null);
  if (!item) {
    return pageMetadata({
      title: "Villa Memorial Plan — Villa Funeraria",
      description:
        "Villa Memorial Plan tiers and terms with the client's 2026 payment-mode tables — regular and senior rates, six-year amortization, and what each plan includes.",
      path: "/plans",
    });
  }
  return pageMetadata({
    title: `${item.name} — Villa Funeraria`,
    description:
      item.description?.trim() ||
      `${item.name} — the Villa Memorial Plan's inclusions, eligibility and published 2026 prices.`,
    path: `/plans/${item.sku}`,
    image: item.image ?? undefined,
  });
}

// Reads the pricing store per request — an office edit must be visible here.
export const dynamic = "force-dynamic";

/**
 * `/plans/[sku]` — every catalogue item that is NOT a package (service lines and
 * add-ons). The packages answer at `/plans/packages`: next.config.ts redirects
 * their SKU URLs before this route runs (captain, 2026-09-30). The page body
 * lives in ./package-view.tsx, which both routes render, so one view is the only
 * source for either address.
 */
export default async function PlanDetailPage({ params }: PlanDetailParams) {
  const { sku } = await params;
  return renderItemPage(decodeURIComponent(sku));
}
