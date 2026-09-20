import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/states";
import { LOGO_VILLA_AGENCY, LOGO_VILLA_GROUP, PLAN_PACKAGES_IMAGE } from "@/lib/media";
import { PlanPaymentTable } from "@/components/villa/plan-payment-table";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { planContentFromDocument } from "@/lib/plan-content";
import { CASH_ASSISTANCE, COFFINS, php } from "@/lib/villa-pricing";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Price list — Villa Memorial",
  description:
    "The complete Villa Memorial price list: package comparison, coffins, senior-citizen rates, the five plan tiers' 2026 payment tables and the lot &amp; mausoleum list.",
  path: "/price-list",
});

// Reads the pricing store per request — an office edit must be visible here.
export const dynamic = "force-dynamic";

/**
 * PRICE LIST (captain, 2026-09-21).
 *
 * ONE page for what four retired surfaces carried:
 *   · the 2026 plan payment tables (formerly `#plan-payments` on /plans),
 *   · the package comparison (formerly /plans/compare),
 *   · the products & price list view (formerly /plans/villa-memorial-plan),
 *   · the senior-citizen plan (formerly /plans/senior-benefits).
 *
 * Its ONLY public entry point is the grouped "Explore more" menu
 * (`EXPLORE_MORE_LINKS` in components/landing/site-header.tsx); the retired
 * routes redirect here from next.config.mjs.
 *
 * NO AMOUNT IS AUTHORED HERE: plan rates and lot families come from the pricing
 * store (`loadPricingDocument()` + `PlanPaymentTable`), the cash-assistance
 * table and the casket tiers from `lib/villa-pricing.ts`, and every catalogue
 * figure from the live catalogue read. The plan copy (package inclusions,
 * eligibility, senior terms, notes) is the "Villa Memorial Plan" page document
 * read through `lib/plan-content.ts`, so a staff edit on Pages & content
 * reaches this page on the next request.
 */
export default async function PriceListPage() {
  const [pricing, page, packages] = await Promise.all([
    loadPricingDocument(),
    getPageDocument("plans").catch(() => null),
    listCatalogItems("package").catch(() => null),
  ]);
  const content = planContentFromDocument(page);

  return (
    <div className="stack-4">
      {/* Hero */}
      <section className="hero-premium">
        <div className="hero-premium__grid">
          <div>
            <p className="eyebrow-label">Price list</p>
            <h1 className="hero-premium__title">Price list</h1>
            <p className="hero-premium__lead">
              Every published 2026 amount in one place — packages, coffins, the
              senior plan, the five plan tiers&rsquo; payment tables and the lot list.
            </p>
            <p className="text-sm text-muted" style={{ margin: "var(--space-2) 0 0" }}>
              Served by Funeraria Villa &amp; ZC-Arcega Funeral Homes, underwritten by
              Villa Agency Insurance Services.
            </p>
            {/* The class was .plan-logo-row, whose rule left the stylesheet with
                the package-page pass; .logo-row is the live shared logo row. */}
            <p className="logo-row" style={{ marginTop: "var(--space-4)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded client logo */}
              <img src={LOGO_VILLA_AGENCY} alt="Villa Agency Insurance Services — Insure. Invest. Prosper." />
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded client logo */}
              <img src={LOGO_VILLA_GROUP} alt="Villa Group of Companies" />
            </p>
            <nav className="hero-chips" aria-label="Jump to a section">
              <a href="#packages">Compare packages</a>
              <a href="#coffins">Coffin options</a>
              <a href="#senior">Senior citizen plan</a>
              <a href="#vmp">Plan benefits</a>
              <a href="#payments">Payment schedules</a>
              <a href="#prices">2026 price list</a>
            </nav>
            <div className="row row--wrap" style={{ gap: "var(--space-3)", marginTop: "var(--space-5)" }}>
              <a href="#packages" className="btn btn--accent btn--lg">
                Compare the packages
              </a>
              <Link href="/contact" className="btn btn--secondary btn--lg">
                Ask the park office
              </Link>
            </div>
          </div>
          <figure className="hero-premium__media">
            {/* eslint-disable-next-line @next/next/no-img-element -- uploaded photo */}
            <img src={PLAN_PACKAGES_IMAGE} alt="Memorial plans — comprehensive packages for your peace of mind" />
            <figcaption>Villa Memorial Plan · comprehensive packages</figcaption>
          </figure>
        </div>
      </section>

      {/* Package comparison — the retired /plans/compare table. REAL catalog
          data: the frozen contract carries name, description, type and price,
          and this compares exactly those fields and no invented ones. */}
      <section id="packages" className="stack-3" aria-labelledby="packages-title">
        <header className="band-head">
          <h2 className="band-head__title" id="packages-title">
            Compare the packages
          </h2>
          <Link href="/plans/PKG-BASIC" className="btn btn--secondary btn--sm">
            View packages
          </Link>
        </header>
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

      {/* Locations */}
      <section id="served-by" className="stack-3">
        <div className="row row--space">
          <h2 className="section-title">Branches &amp; affiliated locations</h2>
        </div>
        <div className="card">
          <div className="card__body">
            <ul className="stack-3">
              <li>Funeraria Villa – Capilla de San Jose, Isabela City, Basilan</li>
              <li>Funeraria Villa – National Highway, Brgy. Salvacion, Panabo City</li>
              <li>Villa ZC-Arcega Funeral Homes – Zamboanga City</li>
              <li>All Villa-affiliated funeral parlors around Mindanao</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 1. Coffin options */}
      <section id="coffins" className="stack-3">
        <div className="row row--space">
          <h2 className="section-title">1 · Coffin options</h2>
          <Link href="/products" className="btn btn--secondary btn--sm">
            Coffins &amp; caskets — every model with prices
          </Link>
        </div>
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
      </section>

      {/* 2. Senior citizen plan */}
      <section id="senior" className="stack-3">
        <div className="row row--space">
          <h2 className="section-title">2 · Senior citizen plan</h2>
        </div>
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
        <div className="card">
          <div className="card__body stack-3">
            <h3>Payment schedule (PHP)</h3>
            <PlanPaymentTable
              rows={pricing.plans.senior}
              senior
              label="Senior citizen payment schedule"
            />
          </div>
        </div>
      </section>

      {/* 3. Villa Memorial Plan (regular) */}
      <section id="vmp" className="stack-3">
        <h2 className="section-title">3 · Villa Memorial Plan</h2>
        <ul className="rate-facts">
          <li>Regular rate — ages 1–60</li>
          <li>Senior rate — ages 61–100, no insurance benefit</li>
          <li>Annual = 2 × semi-annual = 4 × quarterly = 12 × monthly</li>
          <li>Amortization adjustable to 8 or 10 years</li>
        </ul>
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

        <div id="payments" className="card">
          <div className="card__body stack-3">
            <h3>Villa Memorial Plan — payment schedule (PHP)</h3>
            <PlanPaymentTable
              rows={pricing.plans.regular}
              label="Villa Memorial Plan — regular payment schedule"
            />
          </div>
        </div>
      </section>

      {/* 4. Price list 2026 — lots & mausoleum */}
      <section id="prices" className="stack-4">
        <div className="row row--space">
          <h2 className="section-title">4 · Price list 2026 — lots &amp; mausoleum</h2>
          <Link href="/lots/price-list-2026" className="btn btn--secondary btn--sm">
            Price list page
          </Link>
        </div>
        <p className="text-sm text-muted">
          Six-year amortization shown for regular and senior citizens.{" "}
          <strong>{content.notes.adjust}</strong>
        </p>
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
      </section>

      {/* Footer nav */}
      <section className="stack-3">
        <p className="text-sm text-muted">
          Compare with the <Link href="/plans">five plan tiers</Link> ·{" "}
          <Link href="/services">2026 service rates</Link> ·{" "}
          <Link href="/products">coffins with prices</Link> ·{" "}
          <Link href="/lots">browse plots on the map</Link>. Need a hand?{" "}
          <Link href="/contact">Contact the park office</Link> — prices above are the
          published 2026 Villa rates, confirmed at the office.
        </p>
      </section>
    </div>
  );
}
