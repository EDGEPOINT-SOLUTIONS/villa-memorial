import type { Metadata } from "next";
import Link from "next/link";
import { PriceList2026Tables } from "@/components/villa/price-list-2026";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { VMP_NOTES } from "@/lib/villa-pricing";
import { pageMetadata } from "@/lib/seo";
import {
  LOT_GARDEN_NICHES,
  LOT_MAUSOLEUM,
  LOT_PREMIUM,
  LOT_PRIMARY,
} from "@/lib/media";

export const metadata: Metadata = pageMetadata({
  title: "2026 Price list — Lots & mausoleum",
  description:
    "The client's 2026 lot, mausoleum and garden-niche price list — regular and senior-citizen prices with the six-year amortization amounts.",
  path: "/lots/price-list-2026",
});

// Reads the pricing store per request — an office edit must be visible here.
export const dynamic = "force-dynamic";

/** Villa Memorial 2026 price list: all categories, regular + senior, 6-year amortization. */
export default async function PriceList2026Page() {
  const pricing = await loadPricingDocument();
  return (
    <div className="stack-4">
      <section className="page-hero">
        <p className="eyebrow-label">Price list 2026</p>
        <h1 className="page-hero__title">Lots, mausoleum &amp; packages</h1>
        <p className="page-hero__lead">
          Six-year amortization for regular and senior citizens.{" "}
          <strong>{VMP_NOTES.adjust}</strong>
        </p>
      </section>

      <div className="landing__grid">
        {[
          { img: LOT_MAUSOLEUM, label: "Mausoleum" },
          { img: LOT_GARDEN_NICHES, label: "Garden Niches" },
          { img: LOT_PREMIUM, label: "Premium Lot" },
          { img: LOT_PRIMARY, label: "Primary Lot" },
        ].map((x) => (
          <figure key={x.label} className="card landing__card">
            <div className="media-block card-media media-block--natural">
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded imagery */}
              <img src={x.img} alt={x.label} loading="lazy" />
            </div>
            <figcaption className="card__body">
              <h3>{x.label}</h3>
            </figcaption>
          </figure>
        ))}
      </div>

      <PriceList2026Tables categories={pricing.lotCategories} />

      <p className="text-sm text-muted">
        Source: the client&rsquo;s own PRICE LIST FOR 2026 (Sanctuario de Mercedes y Gloria) —
        all four product families and every row, with the regular and senior-citizen
        columns, reproduced exactly. Prices for coffins and services live on{" "}
        <Link href="/products">Coffins &amp; caskets</Link> and{" "}
        <Link href="/services">Services</Link>; the plan&rsquo;s own payment schedules are on{" "}
        <Link href="/plans">Villa Memorial Plan</Link>.
      </p>

      <p className="text-sm text-muted">
        See lots on the <Link href="/map">park map</Link>, explore the{" "}
        <Link href="/plans/villa-memorial-plan">Villa Memorial Plan</Link>, or{" "}
        <Link href="/contact">ask the park office</Link> about 8- and 10-year terms.
      </p>
    </div>
  );
}
