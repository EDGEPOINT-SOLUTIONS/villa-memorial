import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { PaperExportActions } from "@/components/paper/paper-export-actions";
import { PaperSheet } from "@/components/paper/paper-sheet";
import { getMembershipApplication } from "@/lib/api-client/membership-applications";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import {
  APPLICATION_NOT_A_COC_NOTE,
  MEMBERSHIP_COVERAGE,
  MEMBERSHIP_RELATIONSHIP_LABEL,
  planHolderAgeOn,
  planHolderFullName,
  planTermLabel,
  planTermPer,
} from "@/lib/contracts/membership-application";
import {
  buildMembershipApplicationPaper,
  membershipPaperFileStem,
} from "@/lib/contracts/membership-paper";
import { formatMinorUnits } from "@/lib/money";
import { hasAnyScope } from "@/lib/rbac/nav";
import { PLAN_TIERS } from "@/lib/villa-pricing";

export const metadata = { title: "Membership application — Staff Portal" };

/**
 * One recorded membership application — the folio at a glance plus the application paper.
 *
 * The paper is built from the RECORDED values (the rate exactly as it was read from the
 * pricing store when the application was saved), rendered through the shared paper kit
 * (`PaperSheet` + `PaperExportActions`), so the screen, the .docx and the .pdf cannot drift.
 * The honest line is on the screen and on the paper: this is an application, not a COC.
 */
export default async function MembershipApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["catalog:write"])) {
    return (
      <>
        <PageHeader eyebrow="Commerce · Villa Memorial Plan" title="Membership application" />
        <PageSection>
          <ForbiddenState requiredScopes={["catalog:write"]} />
        </PageSection>
      </>
    );
  }

  const { id } = await params;
  const numericId = Number(id);

  let application: Awaited<ReturnType<typeof getMembershipApplication>>;
  try {
    application = await getMembershipApplication(numericId);
  } catch {
    return (
      <>
        <PageHeader eyebrow="Commerce · Villa Memorial Plan" title="Membership application" />
        <PageSection>
          <ErrorState message="The membership register is unavailable right now." />
        </PageSection>
      </>
    );
  }

  if (!application) {
    return (
      <>
        <PageHeader eyebrow="Commerce · Villa Memorial Plan" title="Membership application" />
        <PageSection>
          <ErrorState message="No membership application is recorded under that number." />
        </PageSection>
      </>
    );
  }

  const holder = planHolderFullName(application);
  const age = planHolderAgeOn(application.date_of_birth, application.application_date);
  const tierName = PLAN_TIERS.find((t) => t.id === application.plan_tier)?.name ?? application.plan_tier;
  const per = planTermPer(application.plan_term);
  const rate = formatMinorUnits(application.rate_cents);
  const { blocks, title } = buildMembershipApplicationPaper(application);
  const fileStem = membershipPaperFileStem(application);

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
            <p className="paper-hero__eyebrow">Villa Memorial Plan · Membership application</p>
            <h1 className="paper-hero__title">{holder}</h1>
            <p className="paper-hero__lead">{APPLICATION_NOT_A_COC_NOTE}</p>
            <div className="paper-hero__chips">
              <span className="paper-hero__chip">
                {tierName} · {planTermLabel(application.plan_term)}
              </span>
              <span className="paper-hero__chip">
                {rate} {per}
              </span>
              <span className="paper-hero__chip">{application.branch || "No branch recorded"}</span>
              {application.senior ? <span className="paper-hero__chip">Senior rate</span> : null}
              <span className="paper-hero__chip">Applied {application.application_date}</span>
            </div>
          </div>
          <div className="paper-hero__price">
            <p className="paper-hero__price-label">Rate class</p>
            <p className="paper-hero__price-value">{application.senior ? "Senior citizen" : "Regular"}</p>
            <p className="paper-hero__price-status">
              {age === null ? "Age not recorded." : `Age ${age} on the application date.`} The
              rate is the office&rsquo;s published figure when the folio was recorded.
            </p>
          </div>
        </div>
      </div>

      <Alert tone="info" title="The office issues the membership document">
        This folio records the enrolment details and prints a working application. The
        certificate of coverage (COC) is issued by the office through the plan&rsquo;s
        underwriter — no number, coverage dates or clause wording is produced here. Recording
        it was {application.recorded_by ?? "not attributed"}; the folio is{" "}
        {application.pricing_updated_at
          ? `priced against the rate card updated ${application.pricing_updated_at.slice(0, 10)}`
          : "priced against the recorded 2026 rate card"}
        .
      </Alert>

      <div className="split-grid">
        <section className="card" aria-labelledby="holder-title">
          <div className="card__header">
            <h2 id="holder-title">The plan holder</h2>
          </div>
          <div className="card__body">
            <div className="table-wrapper" tabIndex={0}>
              <table className="table">
                <tbody>
                  <tr>
                    <th scope="row">Name</th>
                    <td>{holder}</td>
                  </tr>
                  <tr>
                    <th scope="row">Date of birth</th>
                    <td>
                      {application.date_of_birth ?? "—"}
                      {age === null ? "" : ` · age ${age}`}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Contact</th>
                    <td>{[application.contact_number, application.email].filter(Boolean).join(" · ") || "—"}</td>
                  </tr>
                  <tr>
                    <th scope="row">Address</th>
                    <td>{application.address ?? "—"}</td>
                  </tr>
                  <tr>
                    <th scope="row">Branch</th>
                    <td>{application.branch || "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="card" aria-labelledby="protected-title">
          <div className="card__header">
            <h2 id="protected-title">Who the plan protects</h2>
          </div>
          <div className="card__body stack-2">
            {application.beneficiaries.length === 0 ? (
              <p className="text-sm text-muted" style={{ margin: 0 }}>
                No beneficiary is recorded on this folio.
              </p>
            ) : (
              application.beneficiaries.map((b) => (
                <p key={`${b.name}-${b.relationship}`} style={{ margin: 0 }}>
                  <strong>{b.name}</strong>{" "}
                  <Badge tone="neutral">{MEMBERSHIP_RELATIONSHIP_LABEL[b.relationship]}</Badge>
                </p>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="split-grid">
        <section className="card" aria-labelledby="plan-title">
          <div className="card__header">
            <h2 id="plan-title">The plan &amp; rate</h2>
          </div>
          <div className="card__body">
            <div className="table-wrapper" tabIndex={0}>
              <table className="table">
                <tbody>
                  <tr>
                    <th scope="row">Coverage</th>
                    <td>{MEMBERSHIP_COVERAGE}</td>
                  </tr>
                  <tr>
                    <th scope="row">Plan</th>
                    <td>
                      {tierName} · {planTermLabel(application.plan_term)}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Published rate</th>
                    <td>
                      {rate} {per}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Rate class</th>
                    <td>{application.senior ? "Senior citizen (61–100, no insurance benefit)" : "Regular (ages 1–60)"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="card" aria-labelledby="declarations-title">
          <div className="card__header">
            <h2 id="declarations-title">Declarations</h2>
          </div>
          <div className="card__body stack-2">
            <p style={{ margin: 0 }}>
              <Badge tone={application.health_declaration ? "success" : "warning"}>
                {application.health_declaration ? "Declared" : "Not declared"}
              </Badge>{" "}
              Good-health declaration
            </p>
            <p style={{ margin: 0 }}>
              <Badge tone={application.dpa_consent ? "success" : "warning"}>
                {application.dpa_consent ? "Given" : "Not given"}
              </Badge>{" "}
              Data-privacy consent
              {application.dpa_consented_at
                ? ` · ${application.dpa_consented_at.slice(0, 10)}`
                : ""}
            </p>
            <p className="text-sm text-muted" style={{ margin: 0 }}>
              The paper&rsquo;s own health questionnaire and consent wording are not archived
              in this project; the office&rsquo;s signed paper governs.
            </p>
          </div>
        </section>
      </div>

      <PageSection>
        <div className="paper-view">
          <div className="card paper-view__toolbar">
            <div className="paper-view__toolbar-row">
              <div className="paper-view__toolbar-head">
                <p className="page-header__eyebrow">Application paper</p>
                <h2>{title}</h2>
                <p className="text-sm text-muted">
                  {holder} · {tierName} · {rate} {per} — the same content exported as Word and
                  PDF.
                </p>
              </div>
              <PaperExportActions blocks={blocks} filename={fileStem}>
                <Link
                  href="/staff/plans/membership/new"
                  className="btn btn--secondary btn--sm"
                >
                  <Plus size={16} aria-hidden="true" />
                  Record another
                </Link>
              </PaperExportActions>
            </div>
          </div>
          <PaperSheet blocks={blocks} />
        </div>
      </PageSection>
    </div>
  );
}
