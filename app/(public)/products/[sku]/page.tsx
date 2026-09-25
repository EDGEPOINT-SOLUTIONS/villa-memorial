import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/states";
import { ProductDetail, type PdpVariant } from "@/components/villa/product-detail";
import { getCatalogItem, listCatalogItems } from "@/lib/api-client/commerce";
import { listItemEntries } from "@/lib/api-client/content-entries";
import { getProductLineForSku } from "@/lib/api-client/product-lines";
import { itemEntryView } from "@/lib/catalogue-content";
import { listLandingContent } from "@/lib/api-client/landing";
import { casketDetailHref, coffinModelForSku, coffinSku } from "@/lib/catalogue-skus";
import { catalogueItemPhoto } from "@/lib/catalogue-imagery";
import { resolveSpecs } from "@/lib/product-line";
import { php } from "@/lib/villa-pricing";
import { casketSamplePhoto } from "@/lib/media";
import { clientPhotoWide } from "@/lib/client-photos";
import { buildRequestHref } from "@/lib/public-forms/request-prefill";
import { mediaPublicBaseUrl } from "@/lib/media-url";
import { pageMetadata } from "@/lib/seo";

/**
 * Casket detail — /products/[sku] (the "View details" action on every catalogue
 * card). A route rather than a dialog: the page follows the app's existing
 * /plans/[sku] detail pattern, so a model is linkable, shareable and readable
 * without JavaScript, and every fact comes from data (the catalogue entry plus
 * lib/villa-pricing.ts) instead of being typed into the view.
 *
 * P3 (data/villa-pdp-cms-plan/report.md §6): the page is the Amazon STRUCTURE in
 * our tokens — a sticky gallery beside the buy box, then the editable catalogue
 * content below the fold. The legacy bespoke blocks (the long sample captions,
 * "This model at a glance", "What comes with this model", "How the five tiers are
 * shown", the five-link row and the sibling row) are gone; every visible string
 * below the fold comes from the entry, and money is always a live price.
 *
 * THE VARIANT SELECTOR (P2). The model's line (its sheet collection) and EVERY
 * sibling entry are resolved server-side in one pass and handed to
 * `components/villa/product-detail.tsx`, so choosing a model swaps the gallery,
 * price and specs locally with no round-trip. The URL stays per-SKU
 * (`history.replaceState`), and the head's canonical stays per-SKU too.
 *
 * The URL carries the catalogue SKU from lib/catalogue-skus.ts; the sheet model
 * is resolved by that map, so a stale or hand-typed slug 404s instead of
 * rendering a half-filled page.
 */

type CasketDetailParams = { params: Promise<{ sku: string }> };

// Reads the landing contact document and the fixture stores per request — a
// price or a line edit reaches the page on its next visit.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: CasketDetailParams): Promise<Metadata> {
  const { sku } = await params;
  const model = coffinModelForSku(decodeURIComponent(sku));
  if (!model) {
    // Unknown SKU: the route 404s; canonicalise the head to the catalogue.
    return pageMetadata({
      title: "Coffins & caskets — Villa Memorial",
      description:
        "The client's full 2026 casket catalogue at published prices — SRP, senior-citizen price and the inclusions per family.",
      path: "/products",
    });
  }
  const sample = casketSamplePhoto(model);
  return pageMetadata({
    title: `${model.model} casket — 2026 price — Villa Memorial`,
    description: `${model.model} (${model.collection}) — the client's 2026 SRP of ${php(model.srp)} and the senior-citizen price of ${php(model.seniorPrice)}, with the inclusions this model carries.`,
    // Canonicalise every case/spelling variant to the sheet's own SKU URL.
    path: `/products/${coffinSku(model.model)}`,
    // The share card takes the feature crop (3:2, the largest published width),
    // not the 4:3 catalogue thumbnail.
    image: clientPhotoWide(sample.id).src,
    imageAlt: `Illustrative sample coffin — ${sample.alt}`,
  });
}

export default async function CasketDetailPage({ params }: CasketDetailParams) {
  const { sku } = await params;
  const model = coffinModelForSku(decodeURIComponent(sku));
  if (!model) notFound();

  let item: Awaited<ReturnType<typeof getCatalogItem>>;
  try {
    // The SKU comes from the shared map (never the URL), so the page always
    // prices the model it resolved.
    item = await getCatalogItem(coffinSku(model.model));
  } catch {
    return (
      <div className="stack-4">
        <h1>{model.model} casket</h1>
        <ErrorState message="The casket catalogue is unavailable right now, so this model's 2026 price cannot be shown. Please try again shortly." />
      </div>
    );
  }

  // ONE server pass for the whole line: its stored grouping, every catalogue
  // display price (authored price blocks resolve against these), and every
  // sibling entry (so the selector swaps locally).
  const [line, allItems, allEntries, { contact }] = await Promise.all([
    getProductLineForSku(item.sku).catch(() => null),
    listCatalogItems().catch(() => []),
    listItemEntries().catch(() => []),
    listLandingContent(),
  ]);

  const itemsBySku = new Map(allItems.map((line) => [line.sku, line]));
  itemsBySku.set(item.sku, item);
  const entriesByKey = new Map(allEntries.map((entry) => [entry.key, entry]));

  const lineName = line?.name?.trim() || model.collection;
  const inLine =
    line?.variantSkus.some((candidate) => candidate.toUpperCase() === item.sku.toUpperCase()) ??
    false;
  const variantSkus = inLine && line ? line.variantSkus : [item.sku];

  const variants: PdpVariant[] = variantSkus.flatMap((variantSku): PdpVariant[] => {
    const variantItem = itemsBySku.get(variantSku);
    const variantModel = coffinModelForSku(variantSku);
    if (!variantItem || !variantModel) return [];
    const view = itemEntryView(entriesByKey.get(variantSku) ?? null, variantItem);
    // Per-variant specs with the line's shared defaults (captain's Q1). A union
    // over the ≤15 cap is refused by resolveSpecs; the variant's own table (which
    // the entry validator already capped) is the honest fallback.
    const resolved = resolveSpecs(line, view.specs);
    return [
      {
        sku: variantItem.sku,
        name: variantItem.name,
        href: casketDetailHref(variantModel.model),
        model: variantModel,
        item: variantItem,
        summary: view.summary,
        description: view.description,
        gallery: view.gallery,
        specs: resolved.ok ? resolved.value : view.specs,
        blocks: view.blocks,
        thumb: catalogueItemPhoto(variantItem.sku)?.src ?? null,
      },
    ];
  });

  const pricesBySku: Record<string, string> = {};
  for (const line of allItems) pricesBySku[line.sku] = line.display_price;
  pricesBySku[item.sku] = item.display_price;

  const advisor = (
    <section className="buy-card" aria-labelledby="casket-advisor">
      <div className="buy-card__label" id="casket-advisor">
        Talk to our memorial care advisor
      </div>
      <p className="plan-advisor__line">
        <a className="plan-advisor__phone" href={contact.phoneHref}>
          Call {contact.phoneDisplay}
        </a>
        <br />
        <span className="text-sm text-muted">
          {contact.phoneLabel} · {contact.location}
        </span>
      </p>
      <p className="plan-note">
        Not sure which cover or model suits the family? Send a request with this model — the
        office confirms availability and the final price before anything is reserved.
      </p>
      <Link
        href={buildRequestHref({
          item: `${model.model} casket`,
          sku: item.sku,
          price: item.display_price,
          note: `Model question — ${model.collection}, ${model.family} family. Nothing is reserved by this request.`,
        })}
        className="btn btn--secondary btn--sm btn--block"
      >
        Request a model check
      </Link>
    </section>
  );

  const planBadge = (
    <p className="text-sm text-muted" style={{ margin: 0 }}>
      <Badge tone="accent">Casket</Badge> Included in every{" "}
      <Link href="/plans">Villa Memorial Plan</Link> tier; senior citizens enjoy the{" "}
      <Link href="/price-list">senior plan</Link> with free flowers.
    </p>
  );

  return (
    <div className="plan-page">
      <p className="crumbs">
        <Link href="/products">Coffins &amp; caskets</Link> <span aria-hidden="true">▸</span>{" "}
        {lineName}
      </p>

      <ProductDetail
        lineName={lineName}
        selectedSku={item.sku}
        variants={variants}
        pricesBySku={pricesBySku}
        contact={contact}
        mediaBaseUrl={mediaPublicBaseUrl()}
        aside={
          <>
            {advisor}
            {planBadge}
          </>
        }
      />
    </div>
  );
}
