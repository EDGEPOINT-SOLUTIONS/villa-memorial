import type { Metadata } from "next";
import Link from "next/link";
import { PLAN_PACKAGES_IMAGE, libraryThumb, libraryThumbSet } from "@/lib/media";
import { Card } from "@/components/ui/card";
import { PlanPaymentTable } from "@/components/villa/plan-payment-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/states";
import { CatalogueActions } from "@/components/villa/catalogue-actions";
import { ProductCard, ResultsGrid } from "@/components/kit";
import { catalogueItemPhoto, type CatalogueItemPhoto } from "@/lib/catalogue-imagery";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { pageMetadata } from "@/lib/seo";
import {
  CASH_ASSISTANCE,
  php,
  VMP_ELIGIBILITY,
  VMP_INCLUSIONS,
  VMP_NOTES,
} from "@/lib/villa-pricing";

export const metadata: Metadata = pageMetadata({
  title: "Villa Memorial Plan — Villa Memorial",
  description:
    "Villa Memorial Plan tiers and terms with the client's 2026 payment-mode tables — regular and senior rates, six-year amortization, and what each plan includes.",
  path: "/plans",
});

// Reads the pricing store per request — a staff edit must be what the NEXT
// visitor sees, never a build-time snapshot.
export const dynamic = "force-dynamic";

/**
 * Public catalog (Module B/C public face) — villa-memorial item-card grammar on
 * the DOC palette. Cards carry REAL catalog data (name, description, price from
 * the frozen commerce contract); display_price is presentation-only and never
 * parsed. Each card offers two actions: "View this item" (the real detail page
 * with the real cart flow) and an "Add to cart" button that adds THIS card's
 * real SKU + price to the same cart context (fixtures-first, no invented
 * shapes — item data flows straight from listCatalogItems into the cart).
 *
 * Below the catalog the page prints the plan's own price list — the client's two
 * 2026 payment-mode schedules (regular + senior), cash assistance, eligibility
 * and notes — from the CURRENT pricing store, so a family can price the plan
 * without leaving the page (the full walk-through stays on
 * /plans/villa-memorial-plan) and an office edit is what they read.
 */
const TYPE_LABELS: Record<string, string> = {
  package: "Packages",
  service: "Services",
  add_on: "Add-ons",
};

/** The order the catalogue index presents the three groups in. */
const CATALOGUE_GROUPS: ReadonlyArray<{ key: "package" | "service" | "add_on"; label: string }> = [
  { key: "package", label: TYPE_LABELS.package },
  { key: "service", label: TYPE_LABELS.service },
  { key: "add_on", label: TYPE_LABELS.add_on },
];

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const filter = ["package", "service", "add_on"].includes(type ?? "")
    ? (type as "package" | "service" | "add_on")
    : undefined;

  const page = await getPageDocument("plans").catch(() => null);

  let itemsAll: Awaited<ReturnType<typeof listCatalogItems>>;
  try {
    itemsAll = await listCatalogItems();
  } catch {
    return (
      <>
        <h1>Villa Memorial Plan</h1>
        <ErrorState message="The catalog is unavailable right now. Please try again shortly." />
      </>
    );
  }
  const items = filter ? itemsAll.filter((i) => i.item_type === filter) : itemsAll;
  const pricing = await loadPricingDocument();
  const counts = itemsAll.reduce<Record<string, number>>(
    (acc, i) => {
      acc[i.item_type] = (acc[i.item_type] ?? 0) + 1;
      return acc;
    },
    {},
  );

  return (
    <>
      <section className="hero-premium">
        <div className="hero-premium__grid">
          <div>
            <p className="eyebrow-label">{page?.hero.eyebrow || "Memorial plans"}</p>
            <h1 className="hero-premium__title">{page?.hero.headline || "Villa Memorial Plan"}</h1>
            {/* The page's one-line answer + one primary action (reading budget,
                captain 2026-09-18). */}
            <p className="hero-premium__lead">
              {page?.hero.lead || "The park's memorial plan — five tiers, four ways to pay."}
            </p>
            <div className="hero-premium__actions">
              <Link href="#plan-payments" className="btn btn--primary">
                See the 2026 rates
              </Link>
            </div>
            <p className="text-sm text-muted" style={{ margin: "var(--space-3) 0 0" }}>
              {counts["package"] ?? 0} packages · {counts["service"] ?? 0} services ·{" "}
              {counts["add_on"] ?? 0} add-ons — 2026 catalogue prices.
            </p>
            <nav className="hero-chips" aria-label="Related plan pages">
              <Link href="/plans?type=package">View packages</Link>
              <Link href="#plan-payments">2026 plan payments</Link>
              <Link href="/plans/compare">Compare</Link>
              <Link href="/plans/villa-memorial-plan">Products &amp; price list</Link>
              <Link href="/plans/senior-benefits">Senior citizen rates</Link>
              <Link href="/products">Coffins &amp; caskets</Link>
            </nav>
          </div>
          <figure className="hero-premium__media">
            {/* eslint-disable-next-line @next/next/no-img-element -- uploaded photo */}
            <img
              src={libraryThumb(PLAN_PACKAGES_IMAGE, 640)}
              srcSet={libraryThumbSet(PLAN_PACKAGES_IMAGE)}
              sizes="(max-width: 60rem) 90vw, 30rem"
              alt="Comprehensive memorial packages for your peace of mind"
            />
            <figcaption>Plan ahead — complete, caring arrangements.</figcaption>
          </figure>
        </div>
      </section>

      <section id="catalogue" className="stack-3" aria-labelledby="catalogue-title">
        <h2 className="section-title" id="catalogue-title">
          2026 catalogue — packages, services &amp; add-ons
        </h2>
        <nav className="seg-filter" aria-label="Filter catalog">
          <Link href="/plans" className={`pill-toggle${!filter ? " pill-toggle--active" : ""}`}>
            All
          </Link>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <Link
              key={value}
              href={`/plans?type=${value}`}
              className={`pill-toggle${filter === value ? " pill-toggle--active" : ""}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {items.length === 0 ? (
          <EmptyState
            title="Nothing in this category yet"
            hint="Check back soon — the catalog is being set up."
          />
        ) : (
          // Imagery pass (captain 2026-09-19): this band was a grouped PRICE
          // INDEX of hairline rows — a reader moving here from /products or
          // /packages saw three images on the whole page and no way to compare a
          // photograph. It is now the same `.shop-grid`/`shop-card` grammar those
          // pages use: every one of the 42 catalogue items leads with its own
          // photograph from the ONE rule home (lib/catalogue-imagery.ts), its
          // name, its published price and its two actions. The group heading
          // still carries the real count.
          <div className="catalogue-index">
            {CATALOGUE_GROUPS.map((group) => {
              const inGroup = items.filter((i) => i.item_type === group.key);
              if (inGroup.length === 0) return null;
              return (
                <section key={group.key} className="cat-band" aria-label={group.label}>
                  <header className="band-head">
                    <h3 className="band-head__title">{group.label}</h3>
                    <span className="band-head__count">
                      {inGroup.length} item{inGroup.length === 1 ? "" : "s"} · 2026 catalogue prices
                    </span>
                  </header>
                  <ResultsGrid
                    items={inGroup.filter((item) => !item.sku.startsWith("SRV-EMBALM"))}
                    itemKey={(item) => item.sku}
                    emptyTitle="No catalogue items in this group yet"
                    renderItem={(item) => {
                      const photo: CatalogueItemPhoto | undefined = item.image
                        ? { id: item.sku, src: item.image, alt: item.name }
                        : catalogueItemPhoto(item.sku) ?? undefined;
                      return (
                        <ProductCard
                          href={`/plans/${item.sku}`}
                          title={item.name}
                          supporting={<code>{item.sku}</code>}
                          price={item.display_price}
                          chip={photo?.chip}
                          caption={photo?.caption}
                          photo={
                            photo
                              ? {
                                  src: photo.src,
                                  srcSet: photo.srcSet,
                                  width: photo.width,
                                  height: photo.height,
                                  sizes: "(max-width: 40rem) 92vw, (max-width: 70rem) 45vw, 26rem",
                                  alt: photo.alt,
                                }
                              : undefined
                          }
                          actions={
                            <>
                              <Link
                                href={`/plans/${item.sku}`}
                                className="btn btn--secondary btn--sm"
                              >
                                View this item
                              </Link>
                              <CatalogueActions
                                item={{
                                  sku: item.sku,
                                  name: item.name,
                                  itemType: item.item_type,
                                  unitPriceCents: item.unit_price_cents,
                                  currency: item.currency,
                                }}
                                displayPrice={item.display_price}
                                prefill={{ note: `${group.label} from the 2026 catalogue.` }}
                              />
                            </>
                          }
                        />
                      );
                    }}
                  />
                  {/* The embalming ladder is ONE service at eight day counts, so it
                      is one photograph and a priced ladder — eight identical cards
                      would be a wall of the same picture. Every row keeps its own
                      Add to cart and Request order (all 42 items stay sellable). */}
                  {inGroup.some((item) => item.sku.startsWith("SRV-EMBALM")) ? (
                    <div className="day-ladder">
                      <figure className="day-ladder__media">
                        {(() => {
                          const photo = catalogueItemPhoto("SRV-EMBALM-3D");
                          if (!photo) return null;
                          return (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element -- the client's own photograph */}
                              <img
                                src={photo.src}
                                srcSet={photo.srcSet}
                                sizes="(max-width: 60rem) 92vw, 22rem"
                                alt=""
                                loading="lazy"
                              />
                              <figcaption className="day-ladder__caption">
                                {photo.caption}
                              </figcaption>
                            </>
                          );
                        })()}
                      </figure>
                      <ul className="day-ladder__rows">
                        {inGroup
                          .filter((item) => item.sku.startsWith("SRV-EMBALM"))
                          .map((item) => (
                            <li className="day-ladder__row" key={item.sku}>
                              <span className="day-ladder__name">{item.name}</span>
                              <span className="day-ladder__price">{item.display_price}</span>
                              <CatalogueActions
                                item={{
                                  sku: item.sku,
                                  name: item.name,
                                  itemType: item.item_type,
                                  unitPriceCents: item.unit_price_cents,
                                  currency: item.currency,
                                }}
                                displayPrice={item.display_price}
                                prefill={{ note: `${group.label} from the 2026 catalogue.` }}
                              />
                            </li>
                          ))}
                      </ul>
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        )}
      </section>

      {/* The plan's own 2026 price list — the client's two payment-mode
          schedules. Every amount comes through lib/villa-pricing.ts. */}
      <section id="plan-payments" className="stack-3" aria-labelledby="plan-payments-title">
        <h2 className="section-title" id="plan-payments-title">
          2026 rates — five tiers, four payment terms
        </h2>
        <ul className="rate-facts">
          <li>Regular rate — ages 1–60</li>
          <li>Senior rate — ages 61–100, no insurance benefit</li>
          <li>Annual = 2 × semi-annual = 4 × quarterly = 12 × monthly</li>
          <li>Amortization adjustable to 8 or 10 years</li>
        </ul>
        <div className="split-grid">
          <Card header={<h3>Regular rate</h3>}>
            <PlanPaymentTable
              rows={pricing.plans.regular}
              label="Villa Memorial Plan — regular payment schedule"
            />
          </Card>
          <Card header={<h3>Senior citizen rate</h3>}>
            <PlanPaymentTable
              rows={pricing.plans.senior}
              senior
              label="Villa Memorial Plan — senior citizen payment schedule"
            />
          </Card>
        </div>

        <div className="split-grid">
          <Card header={<h3>Eligibility &amp; plan notes</h3>}>
            <ul className="rate-facts">
              {VMP_ELIGIBILITY.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            <p className="text-sm" style={{ marginTop: "var(--space-3)" }}>
              {VMP_NOTES.contestability}
            </p>
            <p className="text-sm" style={{ marginTop: "var(--space-2)" }}>
              {VMP_NOTES.assign}
            </p>
          </Card>

          <Card header={<h3>Cash assistance with hospital benefit</h3>}>
            <div className="table-wrapper" tabIndex={0}>
              <table className="table price-table">
                <thead>
                  <tr>
                    <th scope="col">Coffin tier</th>
                    <th scope="col">Cash assistance</th>
                  </tr>
                </thead>
                <tbody>
                  {CASH_ASSISTANCE.map((c) => (
                    <tr key={c.tiers}>
                      <th scope="row">{c.tiers}</th>
                      <td className="table__numeric">{php(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted" style={{ marginTop: "var(--space-2)" }}>
              During the paying period only.
            </p>
            <p className="text-sm" style={{ marginTop: "var(--space-3)" }}>
              Complete memorial package includes:
            </p>
            <ul className="rate-facts" style={{ marginTop: "var(--space-2)" }}>
              {VMP_INCLUSIONS.map((i) => (
                <li key={i.service}>{i.service}</li>
              ))}
            </ul>
            <p className="text-sm" style={{ marginTop: "var(--space-2)" }}>
              <Link href="/plans/villa-memorial-plan">Each inclusion in detail</Link>
            </p>
          </Card>
        </div>
      </section>
    </>
  );
}
