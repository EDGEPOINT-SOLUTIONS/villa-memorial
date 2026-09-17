import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { listPricingQuestions, loadPricingDocument, pricingLiveModeEnabled } from "@/lib/api-client/pricing";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { LotPricesEditor } from "./lot-prices-editor";

export const metadata = { title: "Pricing rules — Staff Portal" };

/**
 * Staff lot-price administration (phase 3 of the admin-commerce plan): the four
 * 2026 lot families with every product row (selling · annual · semi-annual ·
 * quarterly · monthly, regular + senior), edited against the pricing store the
 * public price list reads (/lots/price-list-2026, the package page's Official
 * 2026 price list, the home service cards and the agent lot list).
 *
 * Scope: `catalog:write` — the same provisional scope the Commerce nav entry for
 * /staff/pricing already uses (lib/rbac/nav.ts); reads use `catalog:read`. Live
 * mode refuses with an honest 503 (no pricing write contract has frozen — see
 * lib/api-client/pricing.ts).
 */
export default async function PricingPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["catalog:write"])) {
    return (
      <>
        <PageHeader eyebrow="Commerce" title="Pricing rules" />
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
        <PageHeader eyebrow="Commerce" title="Lot prices" />
        <PageSection>
          <ErrorState message="The pricing store is unavailable right now." />
        </PageSection>
      </>
    );
  }

  return (
    <div className="stack-4">
      <PageHeader
        eyebrow="Commerce · 2026 price list"
        title="Lot prices"
        actions={
          <Link
            href="/lots/price-list-2026"
            target="_blank"
            rel="noreferrer"
            className="btn btn--secondary btn--sm"
          >
            View live page
          </Link>
        }
      />
      <LotPricesEditor
        initialCategories={pricing.lotCategories}
        initialUpdatedAt={pricing.updated_at}
        initialUpdatedBy={pricing.updated_by}
        questions={questions.filter((q) => q.scope === "lots")}
        live={pricingLiveModeEnabled()}
      />
    </div>
  );
}
