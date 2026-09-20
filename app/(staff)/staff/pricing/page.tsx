import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { listPricingQuestions, loadPricingDocument, pricingLiveModeEnabled } from "@/lib/api-client/pricing";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { PlanRatesEditor } from "../plans/plan-rates-editor";
import { LotPricesEditor } from "./lot-prices-editor";

export const metadata = { title: "Pricing rules — Admin Portal" };

/**
 * Pricing rules — the ONE rate source (content-catalogue Phase 4 nav
 * consolidation).
 *
 * The two halves of the edited 2026 price document live here together, as the
 * captain's §6.1 shape asks: the five plan tiers × four payment modes (regular +
 * senior, read by every public plan surface) and the four lot families (read by
 * /lots/price-list-2026, the package page's Official 2026 price list and the
 * agent lot list). The retired "Plans" nav entry pointed at a second screen that
 * edited the same document; /staff/plans now redirects here so an old bookmark
 * still lands in the one home.
 *
 * Scope: `catalog:write` for the editors, `catalog:read` for the record; live
 * mode refuses writes with an honest 503 (no pricing write contract has frozen —
 * see lib/api-client/pricing.ts).
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
        <PageHeader eyebrow="Commerce" title="Pricing rules" />
        <PageSection>
          <ErrorState message="The pricing store is unavailable right now." />
        </PageSection>
      </>
    );
  }

  const live = pricingLiveModeEnabled();

  return (
    <div className="stack-4">
      <PageHeader
        eyebrow="Commerce · 2026 price list"
        title="Pricing rules"
        actions={
          <Link href="/plans" target="_blank" rel="noreferrer" className="btn btn--secondary btn--sm">
            View live plans
          </Link>
        }
      />

      <p className="text-md" style={{ maxWidth: "46rem" }}>
        One edited 2026 price document feeds every public price: the plan tiers below, then the lot
        families. A save here prints on the public pages on their next request.
      </p>

      <PageSection>
        <section id="plan-rates" aria-labelledby="plan-rates-title" className="stack-3">
          <div>
            <h2 id="plan-rates-title" className="text-lg" style={{ margin: 0 }}>
              Plan rates
            </h2>
            <p className="text-sm text-muted" style={{ margin: 0 }}>
              The five tiers × four payment modes, regular and senior — read by /plans,
              /price-list, /plans/[sku] and the home board.
            </p>
          </div>
          <PlanRatesEditor
            initialPlans={pricing.plans}
            initialUpdatedAt={pricing.updated_at}
            initialUpdatedBy={pricing.updated_by}
            questions={questions.filter((q) => q.scope === "plans")}
            live={live}
          />
        </section>
      </PageSection>

      <PageSection>
        <section id="lot-prices" aria-labelledby="lot-prices-title" className="stack-3">
          <div>
            <h2 id="lot-prices-title" className="text-lg" style={{ margin: 0 }}>
              Lot prices
            </h2>
            <p className="text-sm text-muted" style={{ margin: 0 }}>
              The four 2026 lot families with every product row — read by /lots/price-list-2026 and
              the package page&rsquo;s Official 2026 price list.
            </p>
          </div>
          <LotPricesEditor
            initialCategories={pricing.lotCategories}
            initialUpdatedAt={pricing.updated_at}
            initialUpdatedBy={pricing.updated_by}
            questions={questions.filter((q) => q.scope === "lots")}
            live={live}
          />
        </section>
      </PageSection>
    </div>
  );
}
