import type { Metadata } from "next";
import Link from "next/link";
import { PLAN_PACKAGES_IMAGE, libraryThumb, libraryThumbSet } from "@/lib/media";
import { PlanTierCard } from "@/components/villa/plan-tier-card";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { planContentFromDocument } from "@/lib/plan-content";
import { planRequestAction } from "@/lib/plan-selection";
import { planRateOf } from "@/lib/pricing-model";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Villa Memorial Plan — Villa Memorial",
  description:
    "The Villa Memorial Plan's five tiers and the live monthly rate each one starts from — the plan a family can build on. The 2026 payment tables and terms live on the Price list.",
  path: "/plans",
});

// Reads the pricing store + the page document per request — a staff edit must be
// what the NEXT visitor sees, never a build-time snapshot.
export const dynamic = "force-dynamic";

/**
 * The Villa Memorial Plan page (captain, 2026-09-21).
 *
 * NET PAGE = the hero + the five tier cards + the two chips (View packages ·
 * Coffins & caskets) + the See-the-2026-rates action that opens the consolidated
 * Price list. Everything else the page used to carry — the package-inclusion
 * table, eligibility, senior terms, the four plan notes and the 2026
 * payment-mode tables — moved to /price-list, the plan's one pricing/terms home.
 * The package-detail table is also carried by the package pages (/plans/PKG-*).
 *
 * THE CONTENT HOME: the five tiers and their per-tier inclusion checklists are
 * the "Villa Memorial Plan" page document (Pages & content → Villa Memorial
 * Plan, lib/fixtures/content/pages.json) — a staff edit reaches this page on its
 * next request. `lib/plan-content.ts` is the ONE typed reading of that document,
 * so the price list, the package page and the staff screens print the same words.
 *
 * THE RATES STAY A LIVE READ: each tier's monthly figure comes through the
 * pricing store (`loadPricingDocument()` + `planRateOf`); no amount is authored.
 */
export default async function PlansPage() {
  const [page, pricing] = await Promise.all([
    getPageDocument("plans").catch(() => null),
    loadPricingDocument(),
  ]);
  const plan = planContentFromDocument(page);

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
              <Link href="/price-list" className="btn btn--primary">
                See the 2026 rates
              </Link>
            </div>
            <p className="text-sm text-muted" style={{ margin: "var(--space-3) 0 0" }}>
              Five tiers · four payment terms · 2026 rates.
            </p>
            <nav className="hero-chips" aria-label="Related plan pages">
              <Link href="/plans/PKG-BASIC">View packages</Link>
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
            The tier details are being prepared — the 2026 rates are on the Price list.
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
    </>
  );
}
