import type { Metadata } from "next";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { listLandingContent } from "@/lib/api-client/landing";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { planContentFromDocument } from "@/lib/plan-content";
import { builderCatalog } from "@/lib/service-builder-catalog";
import { ServiceBuilder } from "@/components/builder/service-builder";
import { PageBlocks } from "@/components/villa/page-blocks";
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
 * NO OPENING BAND (captain, 2026-10-02): the gateway hero and its three
 * orientation facts were stripped; the workbench's own designed head leads.
 * Everything interactive — the five questions, the running total and the
 * hand-over — is the client component below.
 */
export default async function BuilderPage() {
  const [pricing, content, plansPage, catalogItems, builderPage] = await Promise.all([
    loadPricingDocument(),
    listLandingContent(),
    getPageDocument("plans").catch(() => null),
    listCatalogItems().catch(() => []),
    getPageDocument("builder").catch(() => null),
  ]);
  const plan = planContentFromDocument(plansPage);
  // The catalogue is the LIVE selling record, so the estimate quotes what the office
  // actually charges today; the sheet is the module's fallback if it cannot be read.
  const catalog = builderCatalog(pricing, plan.notes.contestability, catalogItems);
  const { contact } = content;

  return (
    <div className="sb-page plan-flow">
      {/* The opening band and its three facts are GONE (captain, 2026-10-02): the
          workbench's own designed head leads. A hidden h1 keeps the heading. */}
      <h1 className="visually-hidden">{builderPage?.hero.headline.trim() || "Smart Service Builder"}</h1>
      <PageBlocks blocks={builderPage?.blocks ?? []} />

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
