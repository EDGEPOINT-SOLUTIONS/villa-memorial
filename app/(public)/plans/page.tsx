import Link from "next/link";
import { PLAN_PACKAGES_IMAGE } from "@/lib/media";
import { Card } from "@/components/ui/card";
import { PlanPaymentTable } from "@/components/villa/plan-payment-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/states";
import { CatalogueAddButton } from "@/components/catalogue-add-button";
import { listCatalogItems } from "@/lib/api-client/commerce";
import {
  CASH_ASSISTANCE,
  php,
  SENIOR_PAYMENTS,
  VMP_ELIGIBILITY,
  VMP_INCLUSIONS,
  VMP_NOTES,
  VMP_PAYMENTS,
} from "@/lib/villa-pricing";

export const metadata = { title: "Villa Memorial Plan — Villa Memorial" };

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
 * and notes — from lib/villa-pricing.ts, so a family can price the plan without
 * leaving the page (the full walk-through stays on /plans/villa-memorial-plan).
 */
const TYPE_LABELS: Record<string, string> = {
  package: "Packages",
  service: "Services",
  add_on: "Add-ons",
};

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const filter = ["package", "service", "add_on"].includes(type ?? "")
    ? (type as "package" | "service" | "add_on")
    : undefined;

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
            <p className="eyebrow-label">Memorial plans</p>
            <h1 className="hero-premium__title">Villa Memorial Plan</h1>
            <p className="hero-premium__lead">
              Choose what your family needs, spread the cost over time, and have the comfort
              of knowing everything is arranged.
            </p>
            <p className="text-sm text-muted" style={{ margin: "var(--space-2) 0 0" }}>
              {counts["package"] ?? 0} bundled packages · {counts["service"] ?? 0} services ·{" "}
              {counts["add_on"] ?? 0} add-ons — real catalogue prices, no surprises.
            </p>
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
            <img src={PLAN_PACKAGES_IMAGE} alt="Comprehensive memorial packages for your peace of mind" />
            <figcaption>Plan ahead — complete, caring arrangements.</figcaption>
          </figure>
        </div>
      </section>

      {items.length === 0 ? (
        <EmptyState
          title="Nothing in this category yet"
          hint="Check back soon — the catalog is being set up."
        />
      ) : (
        <div className="catalog-grid">
          {items.map((item) => (
            <article key={item.sku} className="item-card">
              <div className="item-card__media">
                {/* eslint-disable-next-line @next/next/no-img-element -- local sample imagery */}
                <img
                  src={PLAN_PACKAGES_IMAGE}
                  alt=""
                  loading="lazy"
                />
              </div>
              <div className="item-card__body">
                <span className="badge badge--accent" style={{ alignSelf: "flex-start" }}>
                  {TYPE_LABELS[item.item_type] ?? item.item_type}
                </span>
                <h3 className="item-card__title">
                  <Link href={`/plans/${item.sku}`}>{item.name}</Link>
                </h3>
                {item.description ? (
                  <p className="item-card__meta">{item.description}</p>
                ) : null}
                <div className="item-card__price">{item.display_price}</div>
                <div className="item-card__actions item-card__actions--split">
                  <Link href={`/plans/${item.sku}`} className="btn btn--secondary btn--sm btn--block">
                    View this item
                  </Link>
                  <CatalogueAddButton
                    item={{
                      sku: item.sku,
                      name: item.name,
                      itemType: item.item_type,
                      unitPriceCents: item.unit_price_cents,
                      currency: item.currency,
                    }}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* The plan's own 2026 price list — the client's two payment-mode
          schedules. Every amount comes through lib/villa-pricing.ts. */}
      <section id="plan-payments" className="stack-3" aria-labelledby="plan-payments-title">
        <h2 className="section-title" id="plan-payments-title">
          2026 payment schedules — five tiers, four terms
        </h2>
        <p className="text-sm text-muted">
          Five plan tiers on four payment terms. The regular table applies to ages 1–60; the
          senior-citizen table (61–100, no insurance benefit) is the senior plan rate. Annual
          × 1 = semi-annual × 2 = quarterly × 4 = monthly × 12, and amortization can be
          adjusted to 8 and 10 years.
        </p>
        <div className="split-grid">
          <Card header={<h3>Regular rate</h3>}>
            <PlanPaymentTable rows={VMP_PAYMENTS} label="Villa Memorial Plan — regular payment schedule" />
          </Card>
          <Card header={<h3>Senior citizen rate</h3>}>
            <PlanPaymentTable
              rows={SENIOR_PAYMENTS}
              label="Villa Memorial Plan — senior citizen payment schedule"
            />
          </Card>
        </div>

        <div className="split-grid">
          <Card header={<h3>Eligibility &amp; plan notes</h3>}>
            <ul className="stack-3">
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
            <div className="table-wrapper">
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
              Complete memorial package:{" "}
              {VMP_INCLUSIONS.map((i) => i.service).join(" · ")} — see the{" "}
              <Link href="/plans/villa-memorial-plan">full plan page</Link> for each
              inclusion&rsquo;s detail.
            </p>
          </Card>
        </div>
      </section>
    </>
  );
}
