import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { MembershipApplicationFolio } from "@/components/membership-application-folio";
import { PlanTermsDisplay } from "@/components/villa/plan-terms-display";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { APPLICATION_NOT_A_COC_NOTE } from "@/lib/contracts/membership-application";
import { hasAnyScope } from "@/lib/rbac/nav";
import { ApiError } from "@/lib/api-client/api-error";

export const metadata = { title: "New membership application — Staff Portal" };

// Reads the pricing store per request — the folio must quote the CURRENT published rate.
export const dynamic = "force-dynamic";

/**
 * New membership application — the enrolment folio (FORMS_PLAN gap 4 / F-18).
 *
 * The server hands the folio the CURRENT pricing document (`loadPricingDocument`) so the
 * live rate readout is the office's published figure, and a server-resolved `today` so the
 * date default cannot differ between server and client. Below the folio the plan's published
 * terms render from the same document (the display module the office shows while a family
 * decides). The scope is `catalog:write` provisionally — no membership scope is frozen.
 */
export default async function NewMembershipApplicationPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["catalog:write"])) {
    return (
      <>
        <PageHeader eyebrow="Commerce · Villa Memorial Plan" title="New membership application" />
        <PageSection>
          <ForbiddenState requiredScopes={["catalog:write"]} />
        </PageSection>
      </>
    );
  }

  let pricing: Awaited<ReturnType<typeof loadPricingDocument>>;
  try {
    pricing = await loadPricingDocument();
  } catch (err) {
    return (
      <>
        <PageHeader eyebrow="Commerce · Villa Memorial Plan" title="New membership application" />
        <PageSection>
          <ErrorState
            message={
              err instanceof ApiError
                ? err.message
                : "The plan rate card is unavailable right now."
            }
          />
        </PageSection>
      </>
    );
  }

  return (
    <div className="stack-4">
      <div>
        <Link href="/staff/plans/membership" className="btn btn--ghost btn--sm">
          <ArrowLeft size={15} aria-hidden="true" />
          Membership applications
        </Link>
      </div>

      <div className="paper-hero">
        <div className="paper-hero__grid">
          <div>
            <p className="paper-hero__eyebrow">Villa Memorial Plan · Membership</p>
            <h1 className="paper-hero__title">Enrol a plan member</h1>
            <p className="paper-hero__lead">{APPLICATION_NOT_A_COC_NOTE}</p>
            <p className="text-sm" style={{ color: "var(--gold-200)", margin: "var(--space-3) 0 0" }}>
              The office&rsquo;s signed membership paper is not archived in this project, so
              this folio captures the plan&rsquo;s known shape and reproduces no document.
            </p>
          </div>
          <div className="paper-hero__price">
            <p className="paper-hero__price-label">Rates</p>
            <p className="paper-hero__price-value">2026 card</p>
            <p className="paper-hero__price-status">
              Every figure comes from the office&rsquo;s current published rate card — never
              typed on this screen.
            </p>
          </div>
        </div>
      </div>

      <MembershipApplicationFolio
        pricing={pricing.plans}
        today={new Date().toISOString().slice(0, 10)}
      />

      <PlanTermsDisplay pricing={pricing.plans} heading="What this plan publishes" />
    </div>
  );
}
