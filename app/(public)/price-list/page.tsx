import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/states";
import { PublicHero } from "@/components/public/public-hero";
import { SectionHead } from "@/components/public/section-head";
import { PublicDisclosure } from "@/components/public/public-disclosure";
import { ListingNav, ListingShell } from "@/components/kit";
import { LOGO_VILLA_AGENCY, LOGO_VILLA_GROUP } from "@/lib/media";
import { PlanPaymentTable } from "@/components/villa/plan-payment-table";
import { MonthlyPriceTable } from "@/components/villa/monthly-price-table";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { planContentFromDocument } from "@/lib/plan-content";
import { lotMonthlyPrice, planMonthlyPrice } from "@/lib/monthly-pricing";
import { CASH_ASSISTANCE, COFFINS, PLAN_TIERS, php } from "@/lib/villa-pricing";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Price list — Villa Funeraria",
  description:
    "The complete Villa Memorial price list: package comparison, coffins, senior-citizen rates, the five plan tiers' 2026 payment tables and the lot &amp; mausoleum list.",
  path: "/price-list",
});

// Reads the pricing store per request — an office edit must be visible here.
export const dynamic = "force-dynamic";

/**
 * PRICE LIST (captain, 2026-09-21; Phase 0 public layout pass, Lane 3).
 *
 * ONE page for what four retired surfaces carried:
 *   · the 2026 plan payment tables (formerly `#plan-payments` on /plans),
 *   · the package comparison (formerly /plans/compare),
 *   · the products & price list view (formerly /plans/villa-memorial-plan),
 *   · the senior-citizen plan (formerly /plans/senior-benefits).
 *
 * Its ONLY public entry point is the grouped "Explore more" menu
 * (`EXPLORE_MORE_LINKS` in components/landing/site-header.tsx); the retired
 * routes redirect here from next.config.ts.
 *
 * THE LANE-3 PASS (`data/villa-public-design-plan` §5.5). The measured page was
 * 14.4 phone screens — the four tables were all open at once on a 390 px screen.
 * The blueprint is now the Phase 0 grammar: the shared `PublicHero`, one
 * `SectionHead` per band, and the four long tables behind `PublicDisclosure`
 * (the detail stays in the DOM; it is not dropped). An amount is still a live
 * read — plan rates and lot families come from the pricing store
 * (`loadPricingDocument()` + `PlanPaymentTable`), the cash-assistance table and
 * the casket tiers from `lib/villa-pricing.ts`, every catalogue figure from the
 * live catalogue read, and the plan copy from the "Villa Memorial Plan" page
 * document through `lib/plan-content.ts`. No amount is authored here.
 */
export default async function PriceListPage() {
  const [pricing, page, packages] = await Promise.all([
    loadPricingDocument(),
    getPageDocument("plans").catch(() => null),
    listCatalogItems("package").catch(() => null),
  ]);
  const content = planContentFromDocument(page);

  // The minutes' monthly-first summary (item 8, 2026-09-21): the monthly
  // installment leads, with the term and the recorded total. The full published
  // schedules stay below, unchanged.
  const planMonthlyRows = PLAN_TIERS.map((tier) => ({
    product: tier.name,
    price: planMonthlyPrice(pricing.plans, tier.id, false),
  }));
  const lotMonthlyRows = pricing.lotCategories.flatMap((category) =>
    category.rows.map((row) => ({
      product: row.product,
      family: category.caption,
      price: lotMonthlyPrice(row.regular),
    })),
  );

  return (
    <div className="plan-flow stack-4">
      <PublicHero
        variant="interior"
        eyebrow="Price list"
        title="Price list"
        lead="Every published 2026 amount — packages, coffins, plans and lots."
        primary={{ label: "Ask the park office", href: "/contact" }}
        secondary={{ label: "Compare the packages", href: "#packages" }}
      >
        <p className="text-sm text-muted">
          Served by Funeraria Villa &amp; ZC-Arcega Funeral Homes, underwritten by Villa Agency
          Insurance Services.
        </p>
        <p className="logo-row">
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded client logo */}
          <img src={LOGO_VILLA_AGENCY} alt="Villa Agency Insurance Services — Insure. Invest. Prosper." />
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded client logo */}
          <img src={LOGO_VILLA_GROUP} alt="Villa Group of Companies" />
        </p>
      </PublicHero>

      {/* ONE sticky section rail (captain 2026-09-25): the five bands, always in
          view while scrolling, collapsing to a sheet on a phone. It replaces the
          hero's jump chips, which did the same job once and then scrolled away. */}
      {/* No `sheetAction`: this is a NAV rail (`ListingNav`), and `ListingShell`
          closes its phone sheet on the anchor's `hashchange`. A commit button
          would also be a defect here — this is a Server Component, so a
          `{ label, onClick }` object cannot cross the boundary (React refuses to
          serialise the handler and the whole page 500s in a production build). */}
      <ListingShell
        railLabel="Price list sections"
        sheetLabel="Sections"
        sheetIcon={false}
        rail={
          <ListingNav
            label="Price list sections"
            items={[
              { id: "packages", label: "Compare packages" },
              { id: "coffins", label: "Coffin options" },
              { id: "senior", label: "Senior citizen plan" },
              { id: "vmp", label: "Plan benefits" },
              { id: "prices", label: "2026 price list" },
            ]}
          />
        }
      >
      {/* Package comparison — the retired /plans/compare table. REAL catalog
          data: the frozen contract carries name, description, type and price,
          and this compares exactly those fields and no invented ones. */}
      <section id="packages" className="stack-3" aria-labelledby="packages-title">
        <SectionHead
          id="packages-title"
          kicker="Packages"
          title="Compare the packages"
          action={
            <Link href="/plans/PKG-BASIC" className="btn btn--secondary btn--sm">
              View packages
            </Link>
          }
        />
        {packages === null ? (
          <ErrorState message="Packages are unavailable right now. Please try again shortly." />
        ) : packages.length === 0 ? (
          <EmptyState title="No packages to compare yet" hint="Check back soon." />
        ) : (
          <div className="table-wrapper" tabIndex={0}>
            <table className="table compare-table">
              <thead>
                <tr>
                  <th scope="col">Package</th>
                  {packages.map((item) => (
                    <th key={item.sku} scope="col">
                      <Link href={`/plans/${item.sku}`}>{item.name}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Price</th>
                  {packages.map((item) => (
                    <td key={item.sku}>
                      <strong>{item.display_price}</strong>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Description</th>
                  {packages.map((item) => (
                    <td key={item.sku} className="text-sm">
                      {item.description ?? "—"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Category</th>
                  {packages.map((item) => (
                    <td key={item.sku} className="text-sm">
                      {item.item_type}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Locations — compressed to one wrapping row (blueprint §5.5). */}
      <section id="served-by" className="stack-3" aria-labelledby="served-by-title">
        <SectionHead id="served-by-title" title="Branches &amp; affiliated locations" />
        <ul className="plan-branch-row">
          <li>Funeraria Villa – Capilla de San Jose, Isabela City, Basilan</li>
          <li>Funeraria Villa – National Highway, Brgy. Salvacion, Panabo City</li>
          <li>Villa ZC-Arcega Funeral Homes – Zamboanga City</li>
          <li>All Villa-affiliated funeral parlors around Mindanao</li>
        </ul>
      </section>

      {/* 1 · Coffin options — the five tiers, disclosed (was a full grid). */}
      <section id="coffins" className="stack-3" aria-labelledby="coffins-title">
        <SectionHead
          id="coffins-title"
          kicker="1 · Coffins"
          title="Coffin options"
          action={
            <Link href="/products" className="btn btn--secondary btn--sm">
              Coffins &amp; caskets — every model with prices
            </Link>
          }
        />
        <PublicDisclosure summary={`Show the ${COFFINS.length} casket tiers`}>
          <div className="landing__grid">
            {COFFINS.map((c) => (
              <article key={c.tier} className="card landing__card">
                <div className="media-block media-block--natural card-media">
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded casket photos */}
                  <img src={c.photo} alt={`${c.tier} casket`} loading="lazy" />
                </div>
                <div className="card__body">
                  <h3>{c.tier}</h3>
                  <p className="text-sm text-muted">{c.description}</p>
                  <p className="text-sm">
                    <strong>Lid:</strong> {c.lid}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </PublicDisclosure>
      </section>

      {/* 2 · Senior citizen plan */}
      <section id="senior" className="stack-3" aria-labelledby="senior-title">
        <SectionHead
          id="senior-title"
          kicker="2 · Senior plan"
          title="Senior citizen plan"
          lead="Ages 61–100, with no insurance benefit."
        />
        <PublicDisclosure summary="Show the eligibility terms and the senior payment schedule (PHP)">
          <div className="card">
            <div className="card__body">
              <h3>Eligibility &amp; terms</h3>
              <ul className="stack-3">
                {content.seniorTerms.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
          <PlanPaymentTable
            rows={pricing.plans.senior}
            senior
            label="Senior citizen payment schedule"
          />
        </PublicDisclosure>
      </section>

      {/* 3 · Villa Memorial Plan (regular) */}
      <section id="vmp" className="stack-3" aria-labelledby="vmp-title">
        <SectionHead
          id="vmp-title"
          kicker="3 · Plan"
          title="Villa Memorial Plan"
          lead="Regular and senior rates, what each package includes, and the payment schedule."
        />
        <ul className="rate-facts">
          <li>Regular rate — ages 1–60</li>
          <li>Senior rate — ages 61–100, no insurance benefit</li>
          <li>Annual = 2 × semi-annual = 4 × quarterly = 12 × monthly</li>
          <li>Amortization adjustable to 8 or 10 years</li>
        </ul>
        <h3>Monthly installments at a glance</h3>
        <MonthlyPriceTable rows={planMonthlyRows} />
        <PublicDisclosure summary="Show the package inclusions, conditions and payment schedule (PHP)">
          <div className="card">
            <div className="card__body stack-3">
              <h3>Complete memorial package</h3>
              <div className="table-wrapper" tabIndex={0}>
                <table className="table">
                  <tbody>
                    {content.packageInclusions.map((p) => (
                      <tr key={p.label}>
                        <th scope="row">{p.label}</th>
                        <td>{p.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted">{content.notes.extras}</p>
            </div>
          </div>

          <div className="split-grid">
            <div className="card">
              <div className="card__body stack-3">
                <h3>Eligibility</h3>
                <ul className="stack-3">
                  {content.eligibility.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
                <h3>Limited contestability</h3>
                <p className="text-sm">{content.notes.contestability}</p>
              </div>
            </div>
            <div className="card">
              <div className="card__body stack-3">
                <h3>Cash assistance with hospital benefit</h3>
                <div className="table-wrapper" tabIndex={0}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">Coffin tier</th>
                        <th scope="col">Cash assistance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CASH_ASSISTANCE.map((c) => (
                        <tr key={c.tiers}>
                          <td>{c.tiers}</td>
                          <td>{php(c.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-muted">During the paying period only.</p>
                <h3>Assignable and transferable</h3>
                <p className="text-sm">{content.notes.assign}</p>
              </div>
            </div>
          </div>

          <PlanPaymentTable
            rows={pricing.plans.regular}
            label="Villa Memorial Plan — regular payment schedule"
          />
        </PublicDisclosure>
      </section>

      {/* 4 · Price list 2026 — lots & mausoleum, one disclosure for all families. */}
      <section id="prices" className="stack-4" aria-labelledby="prices-title">
        <SectionHead
          id="prices-title"
          kicker="4 · Lots"
          title="Price list 2026 — lots &amp; mausoleum"
          lead={`Six-year amortization for regular and senior citizens. ${content.notes.adjust}`}
          action={
            <Link href="/lots/price-list-2026" className="btn btn--secondary btn--sm">
              Price list page
            </Link>
          }
        />
        <h3>Monthly installments at a glance</h3>
        <MonthlyPriceTable rows={lotMonthlyRows} />
        <PublicDisclosure summary={`Show the ${pricing.lotCategories.length} lot & mausoleum tables`}>
          {pricing.lotCategories.map((cat) => (
            <div className="card" key={cat.title}>
              <div className="card__body stack-3">
                <h3>{cat.title} — 6 years amortization</h3>
                <div className="table-wrapper" tabIndex={0}>
                  <table className="table price-table">
                    <thead>
                      <tr>
                        <th scope="col">Product</th>
                        <th scope="col">Area (sqm)</th>
                        <th scope="col" colSpan={5}>
                          Regular
                        </th>
                        <th scope="col" className="blank" aria-hidden="true" />
                        <th scope="col" colSpan={5}>
                          Senior citizen
                        </th>
                      </tr>
                      <tr>
                        <th scope="col" aria-hidden="true" />
                        <th scope="col" aria-hidden="true" />
                        <th scope="col">Selling</th>
                        <th scope="col">Annual</th>
                        <th scope="col">Semi-annual</th>
                        <th scope="col">Quarterly</th>
                        <th scope="col">Monthly</th>
                        <th scope="col" className="blank" aria-hidden="true" />
                        <th scope="col">Selling</th>
                        <th scope="col">Annual</th>
                        <th scope="col">Semi-annual</th>
                        <th scope="col">Quarterly</th>
                        <th scope="col">Monthly</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.rows.map((r) => (
                        <tr key={cat.title + r.product}>
                          <td>{r.product}</td>
                          <td className="text-sm">{r.area}</td>
                          <td>{php(r.regular.selling)}</td>
                          <td>{php(r.regular.annual)}</td>
                          <td>{php(r.regular.semi)}</td>
                          <td>{php(r.regular.quarter)}</td>
                          <td>{php(r.regular.monthly)}</td>
                          <td className="blank" aria-hidden="true" />
                          <td>{php(r.senior.selling)}</td>
                          <td>{php(r.senior.annual)}</td>
                          <td>{php(r.senior.semi)}</td>
                          <td>{php(r.senior.quarter)}</td>
                          <td>{php(r.senior.monthly)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </PublicDisclosure>
      </section>
      </ListingShell>

      {/* Footer nav — one short line (blueprint: no prose wall). */}
      <section>
        <p className="text-sm text-muted">
          Compare the <Link href="/plans">five plan tiers</Link>, 2026{" "}
          <Link href="/services">service rates</Link>, <Link href="/products">coffins with prices</Link>,
          or <Link href="/lots">browse plots on the map</Link>. Prices are the published 2026 Villa
          rates, confirmed at the office.
        </p>
      </section>
    </div>
  );
}
