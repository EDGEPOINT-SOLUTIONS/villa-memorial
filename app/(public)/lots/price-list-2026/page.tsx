import type { Metadata } from "next";
import Link from "next/link";
import { PriceList2026Tables } from "@/components/villa/price-list-2026";
import { MonthlyPriceTable } from "@/components/villa/monthly-price-table";
import { PublicHero, PublicImage, SectionHead } from "@/components/kit";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { planContentFromDocument } from "@/lib/plan-content";
import { lotMonthlyPrice } from "@/lib/monthly-pricing";
import { containerClass } from "@/lib/public-layout";
import { pageMetadata } from "@/lib/seo";
import { PARK_PLACE_PHOTOS } from "@/lib/media";

export const metadata: Metadata = pageMetadata({
  title: "2026 Price list — Lots & mausoleum",
  description:
    "The client's 2026 lot, mausoleum and garden-niche price list — regular and senior-citizen prices with the six-year amortization amounts.",
  path: "/lots/price-list-2026",
});

// Reads the pricing store per request — an office edit must be visible here.
export const dynamic = "force-dynamic";

/** The four lot/mausoleum families the sheet prices, with their photograph of
 *  that KIND of ground (never the marketing tile — see the composition pass). */
const FAMILIES = [
  { label: "Mausoleum", src: PARK_PLACE_PHOTOS.mausoleum },
  { label: "Garden Niches", src: PARK_PLACE_PHOTOS.niches },
  { label: "Premium Lot", src: PARK_PLACE_PHOTOS.premium },
  { label: "Primary Lot", src: PARK_PLACE_PHOTOS.prime },
] as const;

function lotPhotoSource(src: string) {
  const base = src.replace("-720.webp", "");
  return {
    src: `${base}-480.webp`,
    srcSet: `${base}-480.webp 480w, ${src} 720w`,
    sizes: "(max-width: 40rem) 92vw, (max-width: 60rem) 45vw, 16rem",
  };
}

/** Villa Memorial 2026 price list: all categories, regular + senior, 6-year
 *  amortization — the catalogue-page grammar (hero · family photographs · the
 *  four tables, first open, the rest disclosed · source notes). */
export default async function PriceList2026Page() {
  const [pricing, plansPage] = await Promise.all([
    loadPricingDocument(),
    getPageDocument("plans").catch(() => null),
  ]);
  const plan = planContentFromDocument(plansPage);
  // The minutes' monthly-first summary (item 8, 2026-09-21): one row per lot
  // product, the monthly installment leading and the 6-year term named.
  const lotMonthlyRows = pricing.lotCategories.flatMap((category) =>
    category.rows.map((row) => ({
      product: row.product,
      family: category.caption,
      price: lotMonthlyPrice(row.regular),
    })),
  );
  return (
    <div className={`${containerClass("catalogue")} stack-4 catalogue-page`}>
      <PublicHero
        variant="interior"
        eyebrow="Price list 2026"
        title="Lots, mausoleum & packages"
        lead="Six-year amortization, regular and senior."
        primary={{ label: "Ask about a lot", href: "/contact" }}
        secondary={{ label: "Walk the park map", href: "/map" }}
      >
        <p className="catalogue-hero__facts">{plan.notes.adjust}</p>
      </PublicHero>

      {/* The photograph-only derivatives, not the marketing tiles: the tiles
          carry their own logo lock-up and title band ("MAUSOLEUM", "PRIMARY
          LOT") which would print beside the caption that already names the type
          (composition pass, 2026-09-18). */}
      <ul
        className="public-grid catalogue-photos"
        aria-label="The lot families on this price list"
      >
        {FAMILIES.map((family) => (
          <li key={family.label}>
            <PublicImage
              role="card"
              {...lotPhotoSource(family.src)}
              alt={`The ${family.label.toLowerCase()} ground at the park`}
              width={720}
              height={540}
              caption={family.label}
            />
          </li>
        ))}
      </ul>

      <section className="catalogue-band" aria-labelledby="installments-title">
        <SectionHead
          id="installments-title"
          kicker="At a glance"
          title="Monthly installments"
          lead="The monthly installment with its six-year term and the total contract price."
        />
        <MonthlyPriceTable rows={lotMonthlyRows} />
      </section>

      <section className="catalogue-band" aria-labelledby="lot-rates-title">
        <SectionHead
          id="lot-rates-title"
          kicker="The tables"
          title="Regular and senior rates"
          lead="Each family opens on its own table; six-year amortization."
        />
        <PriceList2026Tables categories={pricing.lotCategories} disclose />
      </section>

      <p className="text-sm text-muted">
        Source: the client&rsquo;s own <em>PRICE LIST FOR 2026</em> (Sanctuario de Mercedes y
        Gloria) — all four product families and every row, with the regular and senior-citizen
        columns, reproduced exactly.
      </p>
      <p className="text-sm text-muted">
        Coffins and services live on <Link href="/products">Coffins &amp; caskets</Link> and{" "}
        <Link href="/services">Services</Link>; the plan&rsquo;s own schedules are on the{" "}
        <Link href="/price-list">Price list</Link>. Ask the office about 8- and 10-year terms.
      </p>
    </div>
  );
}
