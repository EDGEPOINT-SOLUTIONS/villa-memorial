import type { Metadata } from "next";
import { listLandingContent } from "@/lib/api-client/landing";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { builderCatalog } from "@/lib/service-builder-catalog";
import { ServiceBuilder } from "@/components/builder/service-builder";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Smart Service Builder — Villa Memorial",
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
 * The hero is the page's own (server) markup so the reading-budget guard can
 * measure the opening sentence and the primary action; everything interactive —
 * the seven questions, the running total and the hand-over — is the client
 * component beside it.
 */
export default async function BuilderPage() {
  const [pricing, content] = await Promise.all([loadPricingDocument(), listLandingContent()]);
  const catalog = builderCatalog(pricing);
  const { contact } = content;

  return (
    <div className="sb-page">
      <section className="hero-premium" aria-labelledby="builder-title">
        <div className="hero-premium__grid">
          <div>
            <p className="eyebrow-label">Smart Service Builder · 2026 prices</p>
            <h1 className="hero-premium__title" id="builder-title">
              Build the service you need
            </h1>
            {/* The one-line answer (reading budget, captain 2026-09-18). */}
            <p className="sb-hero__lead">
              What you already have, what you need, and the running total.
            </p>
            <div className="hero-premium__actions">
              <a className="btn btn--primary" href={contact.phoneHref}>
                Call {contact.phoneDisplay}
              </a>
              <a className="btn btn--secondary" href="#sb-step-situation">
                Start with your situation
              </a>
            </div>
          </div>
        </div>
      </section>

      <ServiceBuilder catalog={catalog} contact={contact} />
    </div>
  );
}
