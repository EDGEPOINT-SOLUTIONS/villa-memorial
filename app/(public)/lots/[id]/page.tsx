import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/states";
import { PublicHero, PublicImage } from "@/components/kit";
import { getLot } from "@/lib/api-client/property";
import { listLandingContent } from "@/lib/api-client/landing";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { LOT_FAMILY_BY_SECTION } from "@/lib/catalog-sources";
import { lotFamilyMonthlyPrice } from "@/lib/monthly-pricing";
import { formatMinorUnits } from "@/lib/money";
import { php, php2 } from "@/lib/villa-pricing";
import { buildRequestHref } from "@/lib/public-forms/request-prefill";
import { lotPhoto } from "@/lib/lot-imagery";
import { LOT_TONE, lotStatusLabel } from "@/lib/lot-labels";
import { containerClass } from "@/lib/public-layout";
import { pageMetadata } from "@/lib/seo";

type LotDetailParams = { params: Promise<{ id: string }> };

/**
 * Per-lot metadata: the lot number, section, status and — when the record
 * carries one — the published price, all read from the same frozen Lot contract
 * the page renders. A lot the office removed from public listings 404s; its
 * head points at the browse page rather than inventing one.
 */
export async function generateMetadata({ params }: LotDetailParams): Promise<Metadata> {
  const { id } = await params;
  const lot = await getLot(decodeURIComponent(id)).catch(() => null);
  if (!lot) {
    return pageMetadata({
      title: "Memorial lots — Villa Memorial",
      description:
        "Browse the park's plots by park, status and legend type — see availability and the published lot prices, then reserve with the park office.",
      path: "/lots",
    });
  }
  const price = lot.price_cents > 0 ? formatMinorUnits(lot.price_cents, lot.currency) : null;
  return pageMetadata({
    title: `Lot ${lot.lot_number} — ${lot.section} — Villa Memorial`,
    description: `Lot ${lot.lot_number} in ${lot.section} at Villa Memorial Park — ${lotStatusLabel(lot.status)}${price ? `, ${price}` : ""}. See the plot on the park map and ask the office about reserving it.`,
    path: `/lots/${encodeURIComponent(lot.id)}`,
  });
}

const TYPE_LABEL: Record<string, string> = {
  individual: "Individual lot",
  family: "Family lot",
  estate: "Estate lot",
};

/** Public lot detail — real data from the frozen Lot contract. Reservation is
 * handled by the memorial park office (online reservation is staff-scoped / M1). */
export default async function PublicLotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { contact } = await listLandingContent();

  let lot;
  try {
    lot = await getLot(id);
  } catch {
    return (
      <div className={`${containerClass("catalogue")} stack-4 catalogue-page`}>
        <h1>Lot not found</h1>
        <ErrorState message="We couldn't find that lot. It may have been removed from public listings." />
        <Link href="/lots" className="btn btn--secondary btn--sm">
          Back to lots
        </Link>
      </div>
    );
  }

  const photo = lotPhoto({ plotCode: lot.lot_number, section: lot.section });

  // The monthly-first price (Villa Memorial minutes, 2026-09-21, item 8): the
  // lot's section family figure from the CURRENT pricing store — the same
  // binding the listing card and the price list print. Unknown family → null and
  // the page falls back to the record's own published price.
  const pricing = await loadPricingDocument().catch(() => null);
  const family = LOT_FAMILY_BY_SECTION[lot.section.toUpperCase()];
  const monthly =
    family && pricing ? lotFamilyMonthlyPrice(pricing.lotCategories, family) : null;
  const monthlyLead = monthly
    ? `${TYPE_LABEL[lot.type] ?? lot.type} · ${lot.section}, block ${lot.block} · ${lot.area_sqm} sqm · ${php2(monthly.monthly)} / month`
    : `${TYPE_LABEL[lot.type] ?? lot.type} · ${lot.section}, block ${lot.block} · ${lot.area_sqm} sqm`;

  return (
    <div className={`${containerClass("catalogue")} stack-4 catalogue-page`}>
      {/* The shared interior hero: the lot number is the page's one h1, the lead
          is what a family reads first (type · section, block · area), and the
          office call is the page's commitment. */}
      <PublicHero
        variant="interior"
        eyebrow="Memorial lots"
        title={lot.lot_number}
        lead={monthlyLead}
        primary={{ label: `Call ${contact.phoneDisplay}`, href: contact.phoneHref }}
        secondary={{ label: "Back to lots", href: "/lots" }}
      />

      <div className="landing__grid landing__grid--pair">
        {/* The picture comes from the ONE imagery rule home the listing uses
            (lib/lot-imagery.ts), so a lot cannot show one photograph in the
            grid and another on its own page. PublicImage reserves the 4:3 box,
            carries the derivative's `sizes` (D5) and prints the honesty line as
            its caption — it is a photograph of the section, never this plot. */}
        <div>
          <PublicImage
            role="pdp-main"
            src={photo.src}
            srcSet={photo.srcSet}
            sizes="(max-width: 48rem) 92vw, 36rem"
            alt={photo.caption}
            width={photo.width ?? 720}
            height={photo.height ?? 540}
          />
          <p className="text-xs text-muted" style={{ marginTop: "var(--space-2)" }}>
            {photo.caption}
          </p>
        </div>

        <div className="detail-sticky">
<Card header={<h2 className="text-lg">Lot details</h2>}>
          <div className="stack-3">
            <div>
              <Badge tone={LOT_TONE[lot.status] ?? "neutral"}>
                {lotStatusLabel(lot.status)}
              </Badge>
            </div>
            <div className="row row--space">
              <span className="text-sm text-muted">Section</span>
              <span>{lot.section}</span>
            </div>
            <div className="row row--space">
              <span className="text-sm text-muted">Block</span>
              <span>{lot.block}</span>
            </div>
            <div className="row row--space">
              <span className="text-sm text-muted">Type</span>
              <span>{TYPE_LABEL[lot.type] ?? lot.type}</span>
            </div>
            <div className="row row--space">
              <span className="text-sm text-muted">Area</span>
              <span>{lot.area_sqm} sqm</span>
            </div>
            {monthly ? (
              <>
                <div className="row row--space">
                  <span className="text-sm text-muted">Monthly payment</span>
                  <strong>{php2(monthly.monthly)} / month</strong>
                </div>
                <div className="row row--space">
                  <span className="text-sm text-muted">Payment term</span>
                  <span>{monthly.term.label}</span>
                </div>
                {monthly.total !== null ? (
                  <div className="row row--space">
                    <span className="text-sm text-muted">Total contract price</span>
                    <strong>{php(monthly.total)}</strong>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="row row--space">
                <span className="text-sm text-muted">Price</span>
                <strong>{formatMinorUnits(lot.price_cents, lot.currency)}</strong>
              </div>
            )}
          </div>
        </Card></div>

      </div>

      {lot.status === "available" ? (
        <div className="stack-3">
          <p className="text-sm text-muted">
            This lot is available. Online reservation is not available yet — the park
            office holds the lot for you and confirms the terms.
          </p>
          <div className="row row--wrap">
            <Link
              className="btn btn--accent"
              href={buildRequestHref({
                item: `Lot ${lot.lot_number} (${lot.section}, block ${lot.block})`,
                price: monthly
                  ? `${php2(monthly.monthly)} / month${monthly.total !== null ? ` · total contract price ${php(monthly.total)}` : ""}`
                  : lot.price_cents > 0
                    ? formatMinorUnits(lot.price_cents, lot.currency)
                    : undefined,
                note: "Hold request — nothing is reserved by this message.",
              })}
            >
              Ask the office to hold this lot
            </Link>
          </div>
        </div>
      ) : (
        <div className="stack-3">
          <p className="text-sm text-muted">
            This lot is {lotStatusLabel(lot.status).toLowerCase()} — the park office can
            tell you what is possible.
          </p>
          <p>
            <a href={contact.phoneHref}>Call {contact.phoneDisplay}</a>
          </p>
        </div>
      )}
    </div>
  );
}
