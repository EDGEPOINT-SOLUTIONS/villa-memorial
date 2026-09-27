import type { Metadata } from "next";
import Link from "next/link";
import { PublicHero } from "@/components/public/public-hero";
import { SectionHead } from "@/components/public/section-head";
import { PlanTierCard } from "@/components/villa/plan-tier-card";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { planContentFromDocument } from "@/lib/plan-content";
import { planRequestAction } from "@/lib/plan-selection";
import { planMonthlyPrice } from "@/lib/monthly-pricing";
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
 * pricing store (`loadPricingDocument()` + `planMonthlyPrice`); no amount is
 * authored. The monthly installment is the headline and the pending-term line
 * names who still has to confirm the months (minutes item 8, 2026-09-21).
 */
export default async function PlansPage() {
  const [page, pricing] = await Promise.all([
    getPageDocument("plans").catch(() => null),
    loadPricingDocument(),
  ]);
  const plan = planContentFromDocument(page);
  const heroHeadline = page?.hero.headline.trim() ?? "";

  return (
    <div className="plan-flow stack-4">
      <PublicHero
        variant="interior"
        eyebrow={page?.hero.eyebrow.trim() || undefined}
        title={heroHeadline || "Villa Memorial Plan"}
        lead={page?.hero.lead.trim() || undefined}
        textColour={page?.hero.textColour ?? null}
        primary={{ label: "See the 2026 rates", href: "/price-list" }}
        secondary={{ label: "View packages", href: "/plans/PKG-BASIC" }}
      >
        <nav className="hero-chips" aria-label="Related plan pages">
          <Link href="/products">Coffins &amp; caskets</Link>
        </nav>
        <p className="text-sm text-muted">Five tiers · four payment terms · 2026 rates.</p>
      </PublicHero>

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
        {/* The kicker carries the product's signature — the brass margin rule on
            the shared `.section-head__kicker` (UI-guide prompt 07). Without it
            this page was the one public surface with no signature at all, which
            is what made it read as a different design from /services and /map.
            The lead states the answer in one line, per the same prompt. */}
        <SectionHead
          id="tiers-title"
          kicker="The five tiers"
          title="The five tiers — what each one includes"
          lead="Every tier's monthly rate, its payment terms and the inclusions the client's own checklist prints."
        />
        {plan.tiers.length === 0 ? (
          <p className="text-sm text-muted">
            The tier details are being prepared — the 2026 rates are on the Price list.
          </p>
        ) : (
          <div className="plan-tiers">
            {plan.tiers.map((tier) => {
              const price = planMonthlyPrice(pricing.plans, tier.tier, false);
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
                  price={price}
                  requestHref={request.href}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
