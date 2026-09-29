import type { Metadata } from "next";
import { CalendarDays, Package, ScrollText } from "lucide-react";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { listLandingContent } from "@/lib/api-client/landing";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { planContentFromDocument } from "@/lib/plan-content";
import { builderCatalog } from "@/lib/service-builder-catalog";
import { ServiceBuilder } from "@/components/builder/service-builder";
import { PublicHero } from "@/components/public/public-hero";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Smart Service Builder — Villa Funeraria",
  description:
    "Build a funeral arrangement step by step — casket, preparation, chapel and extras — and see the running total from the client's published 2026 prices. An estimate the office confirms, never a quotation.",
  path: "/builder",
});

// Reads the pricing store per request: an office edit on /staff/plans must be
// what the NEXT visitor sees, never a build-time snapshot (same rule as /plans
// and /lots/price-list-2026).
export const dynamic = "force-dynamic";

/**
 * Smart Service Builder (F-05) — the public configurator, and the last unbuilt
 * public screen in the requirement document (screen inventory: "Smart Service
 * Builder / configurator", blueprint §8).
 *
 * WHAT THE SCREEN IS FOR: a family works out what it needs and sees what it
 * costs. The PRD's live pricing/availability rule engine does not exist, so
 * nothing here is computed by a service: the catalog this page hands the client
 * is resolved from the client's own 2026 figures — the casket catalogue, the
 * a-la-carte fees, the embalming ladder and the chapel schedule in
 * `lib/villa-pricing.ts`, plus the plan tables in the CURRENT pricing store
 * document (an office edit is what a visitor sees). `lib/service-builder.ts` is
 * the one rules home (what a step can be, how the total adds up, what the
 * request carries) and the view never states an amount of its own.
 *
 * HONESTY (the withdrawn-items precedent): an item the sheets do not price has
 * no figure anywhere in the flow — the four withdrawn catalogue lines appear
 * only as "ask the office" labels, an unanswered step reads "still to choose",
 * and the lot is named as an office quotation rather than given a family price.
 * The screen ends, as it must, on the office: the staff-editable 24/7 number and
 * the existing /contact request path with the arrangement written in.
 *
 * THE OPENING IS THE HOME'S GATEWAY (the approved 2026-09-30 builder plan). It
 * is a centred, designed band — eyebrow, headline at the page-title step, a
 * one-line lead, the gold call and one outline action — then the three
 * orientation facts under a hairline: the catalogue count, the preparation
 * ladder and the page's own "estimate, not a quotation" promise. Every fact is
 * a read from a store or the page's stated rule; none is typed.
 *
 * The hero is the page's own (server) markup so the reading-budget guard can
 * measure the opening sentence and the primary action; everything interactive —
 * the five questions, the running total and the hand-over — is the client
 * component beside it.
 */
export default async function BuilderPage() {
  const [pricing, content, plansPage, catalogItems] = await Promise.all([
    loadPricingDocument(),
    listLandingContent(),
    getPageDocument("plans").catch(() => null),
    listCatalogItems().catch(() => []),
  ]);
  const plan = planContentFromDocument(plansPage);
  // The catalogue is the LIVE selling record, so the estimate quotes what the office
  // actually charges today; the sheet is the module's fallback if it cannot be read.
  const catalog = builderCatalog(pricing, plan.notes.contestability, catalogItems);
  const { contact } = content;

  return (
    <div className="sb-page plan-flow">
      <PublicHero
        variant="interior"
        eyebrow="Smart Service Builder · 2026 prices"
        title="Build the service you need"
        lead="What you already have, what you need, and the running total."
        primary={{ label: `Call ${contact.phoneDisplay}`, href: contact.phoneHref }}
        secondary={{ label: "Start with your situation", href: "#sb-step-situation" }}
      />

      {/* The home gateway's trust row: three facts a family needs before the
          workbench is useful. The casket count is the live catalogue's own;
          the ladder and the promise are the page's stated rules. */}
      <ul className="plan-orient" aria-label="How the builder works">
        <li>
          <span className="plan-orient__icon" aria-hidden="true">
            <Package size={20} />
          </span>
          <p className="plan-orient__label">{catalog.caskets.length} casket models</p>
          <p className="plan-orient__text">From the 2026 catalogue.</p>
        </li>
        <li>
          <span className="plan-orient__icon" aria-hidden="true">
            <CalendarDays size={20} />
          </span>
          <p className="plan-orient__label">Preparation, 3–9 days</p>
          <p className="plan-orient__text">Priced by the day.</p>
        </li>
        <li>
          <span className="plan-orient__icon" aria-hidden="true">
            <ScrollText size={20} />
          </span>
          <p className="plan-orient__label">An estimate, not a quotation</p>
          <p className="plan-orient__text">The office confirms the final figures.</p>
        </li>
      </ul>

      {/* Band 2's designed opening: the home's band-head grammar (kicker · title
          · one-line lead under a gold hairline). The step titles below promote
          to h3, so the ladder never skips a level. */}
      <header className="sb-band" data-section-head="">
        <p className="sb-band__kicker">The arrangement</p>
        <h2 className="sb-band__title" id="sb-arrangement-title">
          Build it, question by question
        </h2>
        <p className="sb-band__lead">Five questions on the left; the total follows on the right.</p>
      </header>

      <ServiceBuilder catalog={catalog} contact={contact} />
    </div>
  );
}
