import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { listPricingQuestions, loadPricingDocument, pricingLiveModeEnabled } from "@/lib/api-client/pricing";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { PlanRatesEditor } from "./plan-rates-editor";

export const metadata = { title: "Plans — Staff Portal" };

/**
 * Staff plan-rate administration (phase 3 of the admin-commerce plan): the five
 * tiers × four payment modes for BOTH the regular and senior-citizen 2026
 * schedules, edited against the pricing store every public plan surface reads
 * (/plans, /plans/villa-memorial-plan, /plans/senior-benefits, /plans/[sku] and
 * the home board). The screen's save posts to /api/pricing and the public pages
 * print the stored document on their next request.
 *
 * Scope: `catalog:write` — the same provisional scope the Commerce nav entry for
 * /staff/plans already uses (lib/rbac/nav.ts); reads use `catalog:read`. No new
 * scope is invented. Live mode refuses with an honest 503 (no pricing write
 * contract has frozen — see lib/api-client/pricing.ts).
 */
export default async function PlansPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["catalog:write"])) {
    return (
      <>
        <PageHeader eyebrow="Commerce" title="Plans" />
        <PageSection>
          <ForbiddenState requiredScopes={["catalog:write"]} />
        </PageSection>
      </>
    );
  }

  let pricing;
  let questions;
  try {
    [pricing, questions] = await Promise.all([loadPricingDocument(), listPricingQuestions()]);
  } catch {
    return (
      <>
        <PageHeader eyebrow="Commerce" title="Plan rates" />
        <PageSection>
          <ErrorState message="The pricing store is unavailable right now." />
        </PageSection>
      </>
    );
  }

  return (
    <div className="stack-4">
      <PageHeader
        eyebrow="Commerce · Villa Memorial Plan"
        title="Plan rates"
        actions={
          <Link href="/plans" target="_blank" rel="noreferrer" className="btn btn--secondary btn--sm">
            View live page
          </Link>
        }
      />
      <PlanRatesEditor
        initialPlans={pricing.plans}
        initialUpdatedAt={pricing.updated_at}
        initialUpdatedBy={pricing.updated_by}
        questions={questions.filter((q) => q.scope === "plans")}
        live={pricingLiveModeEnabled()}
      />
    </div>
  );
}
