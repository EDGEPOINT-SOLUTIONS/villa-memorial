import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PLAN_PACKAGES_IMAGE, libraryThumb, libraryThumbSet } from "@/lib/media";
import { Card } from "@/components/ui/card";
import { PlanPaymentTable } from "@/components/villa/plan-payment-table";
import { PlanTierCard } from "@/components/villa/plan-tier-card";
import { ContentBlocks } from "@/components/content/content-blocks";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { planContentFromDocument } from "@/lib/plan-content";
import { planRequestAction } from "@/lib/plan-selection";
import { planRateOf } from "@/lib/pricing-model";
import { pageMetadata } from "@/lib/seo";
import { CASH_ASSISTANCE, php } from "@/lib/villa-pricing";

export const metadata: Metadata = pageMetadata({
  title: "Villa Memorial Plan — Villa Memorial",
  description:
    "Villa Memorial Plan tiers and terms with the client's 2026 payment-mode tables — regular and senior rates, six-year amortization, and what each plan includes.",
  path: "/plans",
});

// Reads the pricing store + the page document per request — a staff edit must be
// what the NEXT visitor sees, never a build-time snapshot.
export const dynamic = "force-dynamic";

/**
 * The Villa Memorial Plan page (Phase 2 of the content-catalogue plan,
 * data/villa-content-catalog-plan/report.md §9/§11).
 *
 * THE CONTENT HOME: the five tiers and their per-tier inclusion checklists, the
 * complete memorial package table, eligibility and the plan notes are the
 * "Villa Memorial Plan" page document (Pages & content → Villa Memorial Plan,
 * lib/fixtures/content/pages.json) — a staff edit reaches this page on its next
 * request. `lib/plan-content.ts` is the ONE typed reading of that document, so
 * the sub-pages and the staff screens print the same words.
 *
 * THE RATES STAY A LIVE READ: every amount comes through the pricing store
 * (`loadPricingDocument()` + `planRateOf`) or the sheet's cash-assistance
 * constant. No amount is authored in the document — the price blocks keep their
 * SKU/rate-table reference semantics.
 *
 * THE SERVICES LEFT THE PAGE (captain 2026-09-21): this page is the five plan
 * tiers, not the mixed 42-item catalogue. Packages keep their own route
 * (`/packages`) and detail pages (`/plans/[sku]`); coffins and services live on
 * `/products` and `/services`.
 */
export default async function PlansPage() {
  const [page, pricing, items] = await Promise.all([
    getPageDocument("plans").catch(() => null),
    loadPricingDocument(),
    listCatalogItems().catch(() => []),
  ]);
  const plan = planContentFromDocument(page);

  // A price block added to the document still resolves against the live
  // catalogue; a `plans.regular` / `plans.senior` matrix renders the live table.
  const priceBySku = new Map(items.map((item) => [item.sku, item.display_price]));
  const priceOf = (sku: string): string | null => priceBySku.get(sku) ?? null;
  const matrixOf = (ref: string): ReactNode | null => {
    if (ref === "plans.regular") {
      return (
        <PlanPaymentTable
          rows={pricing.plans.regular}
          label="Villa Memorial Plan — regular payment schedule"
        />
      );
    }
    if (ref === "plans.senior") {
      return (
        <PlanPaymentTable
          rows={pricing.plans.senior}
          senior
          label="Villa Memorial Plan — senior citizen payment schedule"
        />
      );
    }
    return null;
  };

  // The tier checklists get the live "from ₱X / month" figure; the rest of the
  // document's blocks render through the shared renderer. The long
  // "serves and underwrites" note stays on the staff terms module, not here.
  const otherBlocks = (page?.blocks ?? []).filter(
    (block) => !block.id.startsWith("plans-tier-") && block.id !== "plans-note-serving",
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
              Five tiers · four payment terms · 2026 rates.
            </p>
            <nav className="hero-chips" aria-label="Related plan pages">
              <Link href="/packages">View packages</Link>
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

      {/* The five tiers — the page's content home. ONE ROW of five premium tier
          cards on desktop (captain 2026-09-21: "the five tier plan make it 5
          plan per row"): `.plan-tiers` is five across from 86rem, 4/3/2 as the
          viewport narrows, and one column on phones. Each is the client's
          pricing-page anatomy — name · "Starting from" · the live monthly rate
          · a one-line description · one enquiry action · the inclusion
          checklist printed under "Key features:" (never a dropdown). An
          optional staff-attached photo leads the card; without one it stays
          premium and text-only. */}
      <section id="tiers" className="stack-4" aria-labelledby="tiers-title">
        <h2 className="section-title" id="tiers-title">
          The five tiers — what each one includes
        </h2>
        {plan.tiers.length === 0 ? (
          <p className="text-sm text-muted">
            The tier details are being prepared — the 2026 rates below still apply.
          </p>
        ) : (
          <div className="plan-tiers">
            {plan.tiers.map((tier) => {
              const monthly = planRateOf(pricing.plans, tier.tier, "monthly", false);
              const request = planRequestAction({
                pricing: pricing.plans,
                tier: tier.tier,
                term: "monthly",
                senior: false,
              });
              return (
                <PlanTierCard
                  key={tier.tier}
                  tier={tier}
                  monthly={monthly}
                  requestHref={request.href}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Package details, eligibility and the plan notes — the document's own
          blocks, rendered by the shared block renderer (money arrives only
          through a price block's binding). */}
      {otherBlocks.length > 0 ? (
        <section id="package-details" className="stack-3" aria-labelledby="package-details-title">
          <h2 className="section-title" id="package-details-title">
            The complete memorial package
          </h2>
          <ContentBlocks blocks={otherBlocks} priceOf={priceOf} matrixOf={matrixOf} />
        </section>
      ) : null}

      {/* The plan's own 2026 price list — the client's two payment-mode
          schedules. Every amount comes through the pricing store. */}
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
          </Card>

          <Card header={<h3>The packages</h3>}>
            <p className="text-sm" style={{ marginTop: 0 }}>
              The three complete packages — Basic, Standard and Premium — with their own
              cards and detail pages.
            </p>
            <p className="text-sm">
              <Link href="/packages">Browse the 2026 packages</Link>
            </p>
            <p className="text-sm">
              <Link href="/plans/villa-memorial-plan">Each inclusion in detail</Link>
            </p>
          </Card>
        </div>
      </section>
    </>
  );
}
