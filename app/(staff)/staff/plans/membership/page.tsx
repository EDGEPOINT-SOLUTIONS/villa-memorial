import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { PlanTermsDisplay } from "@/components/villa/plan-terms-display";
import { listMembershipApplications } from "@/lib/api-client/membership-applications";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { planContentFromDocument } from "@/lib/plan-content";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import {
  APPLICATION_NOT_A_COC_NOTE,
  MEMBERSHIP_RELATIONSHIP_LABEL,
  planHolderFullName,
  planTermLabel,
} from "@/lib/contracts/membership-application";
import { hasAnyScope } from "@/lib/rbac/nav";
import { PLAN_TIERS } from "@/lib/villa-pricing";
import { ApiError } from "@/lib/api-client/api-error";

export const metadata = { title: "Membership applications — Admin Portal" };

/**
 * Membership applications — the Villa Memorial Plan enrolment register (FORMS_PLAN gap 4 /
 * F-18). The recorded folios (seed fixture + durable store) sit above the plan's published
 * terms module, so the office can show a family what the plan covers and what it costs while
 * they decide, then open a new folio.
 *
 * SCOPE: `catalog:write` provisionally — the scope the Commerce plan screens already use.
 * `rbac-scopes-v1` names no membership/plan-holder scope; the screen says so and the PR
 * records the ask. The page's own gate is UX; a service would re-check.
 */
export default async function MembershipsPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["catalog:write"])) {
    return (
      <>
        <PageHeader eyebrow="Commerce · Villa Memorial Plan" title="Membership applications" />
        <PageSection>
          <ForbiddenState requiredScopes={["catalog:write"]} />
        </PageSection>
      </>
    );
  }

  let applications: Awaited<ReturnType<typeof listMembershipApplications>>;
  let pricing: Awaited<ReturnType<typeof loadPricingDocument>>;
  let planContent: ReturnType<typeof planContentFromDocument>;
  try {
    const [apps, rates, page] = await Promise.all([
      listMembershipApplications(),
      loadPricingDocument(),
      getPageDocument("plans").catch(() => null),
    ]);
    applications = apps;
    pricing = rates;
    planContent = planContentFromDocument(page);
  } catch (err) {
    return (
      <>
        <PageHeader eyebrow="Commerce · Villa Memorial Plan" title="Membership applications" />
        <PageSection>
          <ErrorState
            message={
              err instanceof ApiError
                ? err.message
                : "The membership register is unavailable right now."
            }
          />
        </PageSection>
      </>
    );
  }

  const newestFirst = [...applications].sort((a, b) => (a.application_date < b.application_date ? 1 : -1));

  return (
    <div className="stack-4">
      <PageHeader
        eyebrow="Commerce · Villa Memorial Plan"
        title="Membership applications"
        actions={
          <Link href="/staff/plans/membership/new" className="btn btn--primary btn--sm">
            <Plus size={15} aria-hidden="true" />
            New application
          </Link>
        }
      />

      <Alert tone="info" title="The application folio — not the certificate of coverage">
        {APPLICATION_NOT_A_COC_NOTE} Each folio records the enrolment details the office
        keeps and prints an application paper; no membership/COC record contract is frozen
        yet (pre-need partner domain), so the register is fixture-mode and the scope reuses{" "}
        <code>catalog:write</code> provisionally.
      </Alert>

      <PageSection>
        <h2 className="section-title">Recorded applications</h2>
        {newestFirst.length === 0 ? (
          <EmptyState
            title="No membership applications recorded yet"
            hint="Open a new folio to enrol a plan holder."
          />
        ) : (
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <caption className="visually-hidden">Recorded membership applications</caption>
              <thead>
                <tr>
                  <th scope="col">Plan holder</th>
                  <th scope="col">Plan</th>
                  <th scope="col">Protects</th>
                  <th scope="col">Branch</th>
                  <th scope="col">Applied</th>
                  <th scope="col">Recorded by</th>
                  <th scope="col">
                    <span className="visually-hidden">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {newestFirst.map((app) => {
                  const tierName =
                    PLAN_TIERS.find((t) => t.id === app.plan_tier)?.name ?? app.plan_tier;
                  return (
                    <tr key={app.id}>
                      <th scope="row">{planHolderFullName(app)}</th>
                      <td>
                        {tierName} · {planTermLabel(app.plan_term)}
                        {app.senior ? " · senior" : ""}
                      </td>
                      <td>
                        {app.beneficiaries.length === 0
                          ? "—"
                          : app.beneficiaries
                              .map(
                                (b) =>
                                  `${b.name} (${MEMBERSHIP_RELATIONSHIP_LABEL[b.relationship]})`,
                              )
                              .join(" · ")}
                      </td>
                      <td>{app.branch || "—"}</td>
                      <td>{app.application_date}</td>
                      <td>{app.recorded_by ?? "—"}</td>
                      <td className="table__numeric">
                        <Link
                          href={`/staff/plans/membership/${app.id}`}
                          className="btn btn--ghost btn--sm"
                        >
                          Open folio
                          <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      <PlanTermsDisplay pricing={pricing.plans} content={planContent} />
    </div>
  );
}
