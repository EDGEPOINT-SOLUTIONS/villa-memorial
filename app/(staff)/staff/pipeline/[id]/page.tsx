import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { getCrmLead } from "@/lib/api-client/crm-leads";
import { FAMILY_HELP } from "@/lib/family/contact";
import {
  LEAD_RECORD_SERVICE_NOTE,
  activityKindLabel,
  interestLabel,
  leadFirstName,
  leadFollowOns,
  leadSourceLabel,
  manilaDay,
  manilaTime,
  stageBadgeTone,
  stageMeta,
  stageTrail,
} from "@/lib/crm/lead-view";

export const metadata = { title: "Lead record — Staff Portal" };

/**
 * The staff lead record (PRD S4, Lead Detail) — the office's view of one lead,
 * reached from the CRM area (/staff/pipeline, /staff/customers):
 *
 *   who they are and what they asked (the recorded enquiry) · where they are
 *   (the PRD pipeline plus every recorded stage move, not a bare badge) · what
 *   was said (the recorded calls, visits and notes) · what happens next (the
 *   recorded next step plus the office's contact action).
 *
 * Everything is read from `lib/fixtures/crm/lead-records.json` through
 * `lib/api-client/crm-leads.ts`: the movement, the contact history and the next
 * step are records, never invented at render time. The stage words come from
 * `lib/crm/lead-view.ts`, which shares the agent pipeline's own vocabulary, and
 * the office number is read from `lib/family/contact.ts` rather than typed.
 *
 * Read-only by design: no lead/customer-records contract exists, so nothing here
 * writes or moves a lead, and one line names what waits on the service.
 */
export default async function LeadRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Relationships" title="Lead record" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:read"]} />
        </PageSection>
      </>
    );
  }

  const { id } = await params;

  let lead;
  try {
    lead = await getCrmLead(id);
  } catch {
    // Unknown record → honest error state (the recorded file is small) — never a
    // blank page and never an invented person.
    return (
      <>
        <PageHeader eyebrow="Relationships · Lead" title="Lead not found" />
        <PageSection>
          <ErrorState message="We couldn't find that lead record." />
        </PageSection>
      </>
    );
  }

  const tel = `tel:${lead.phone.replace(/\s/g, "")}`;
  const sms = `sms:${lead.phone.replace(/\s/g, "")}`;
  const trail = stageTrail(lead.stage);
  const followOn = leadFollowOns(lead)[0];

  return (
    <>
      <PageHeader
        eyebrow="Relationships · Lead"
        title={lead.name}
        actions={
          <Link href="/staff/pipeline" className="btn btn--secondary btn--sm">
            Back to pipeline
          </Link>
        }
      />

      <PageSection>
        <div className="card">
          <div className="card__body case-summary">
            <div>
              <p className="page-header__eyebrow">Lead · {interestLabel(lead.interest)} enquiry</p>
              <p className="case-summary__meta">
                {leadSourceLabel(lead.source)} · came in {manilaDay(lead.first_contact_at)} ·
                handled by {lead.owner}
              </p>
              <p className="case-summary__meta">
                <a href={tel}>{lead.phone}</a> · <a href={`mailto:${lead.email}`}>{lead.email}</a>
              </p>
            </div>
            <div className="lead-hero__state">
              <Badge tone={stageBadgeTone(lead.stage)}>{stageMeta(lead.stage).label}</Badge>
              <span className="text-sm text-muted">
                Last contact {manilaDay(lead.last_contact_at)}
              </span>
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <Card header={<h2>Next step</h2>}>
          <p className="text-lg">{lead.next_action}</p>
          <div className="row row--wrap">
            <a className="btn btn--primary" href={tel}>
              Call {leadFirstName(lead.name)}
            </a>
            <a className="btn btn--secondary" href={sms}>
              Text
            </a>
          </div>
          <p className="text-sm text-muted mb-0">
            Office line <a href={FAMILY_HELP.phoneHref}>{FAMILY_HELP.phone}</a> ·{" "}
            {FAMILY_HELP.hours}
          </p>
        </Card>
      </PageSection>

      <PageSection>
        <Card header={<h2>Where they are</h2>}>
          <ol className="lead-trail" aria-label="Pipeline progress">
            {trail.map((step) => (
              <li
                key={step.stage}
                className={`lead-trail__step${step.reached ? " lead-trail__step--reached" : ""}${
                  step.current ? " lead-trail__step--current" : ""
                }`}
              >
                <span className="lead-trail__dot" aria-hidden="true" />
                {step.label}
              </li>
            ))}
          </ol>
          {lead.stage_history.length === 0 ? (
            <p className="text-sm text-muted mb-0">
              No movement recorded yet — the record starts at the enquiry.
            </p>
          ) : (
            <ol className="lead-moves" aria-label="Recorded stage moves">
              {lead.stage_history.map((move) => (
                <li className="lead-move" key={`${move.stage}-${move.at}`}>
                  <span className="lead-move__when">
                    {manilaDay(move.at)} · {move.by}
                  </span>
                  <Badge tone={stageBadgeTone(move.stage)}>
                    {stageMeta(move.stage).label}
                  </Badge>
                  <p className="lead-move__note">{move.note}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </PageSection>

      <PageSection>
        <Card header={<h2>The enquiry</h2>}>
          <dl className="kv">
            <div>
              <dt>Reference</dt>
              <dd>{lead.inquiry_reference ?? "No enquiry reference recorded"}</dd>
            </div>
            <div>
              <dt>Came in</dt>
              <dd>
                {leadSourceLabel(lead.source)} · {manilaDay(lead.first_contact_at)}
              </dd>
            </div>
            <div>
              <dt>Asked about</dt>
              <dd>{lead.topic}</dd>
            </div>
            <div>
              <dt>Handled by</dt>
              <dd>{lead.owner}</dd>
            </div>
          </dl>
          <p className="text-sm text-muted mt-4 mb-0">{lead.message}</p>
        </Card>
      </PageSection>

      <PageSection>
        <Card header={<h2>Contact history</h2>}>
          {lead.activity.length === 0 ? (
            <p className="text-sm text-muted mb-0">
              No contact is recorded yet — the next step above is the first call.
            </p>
          ) : (
            <ol className="lead-contacts" aria-label="Recorded contact history">
              {lead.activity.map((entry) => (
                <li className="lead-contact" key={entry.id}>
                  <span className="lead-contact__when">
                    {manilaDay(entry.at)} · {manilaTime(entry.at)}
                  </span>
                  <span className="lead-contact__kind">{activityKindLabel(entry.kind)}</span>
                  <div>
                    <p className="lead-contact__title">{entry.title}</p>
                    <p className="lead-contact__detail">{entry.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </PageSection>

      <PageSection>
        <Card header={<h2>What follows</h2>}>
          <div className="row row--wrap">
            <Link className="btn btn--secondary btn--sm" href={followOn.href}>
              {followOn.label}
            </Link>
          </div>
          <p className="text-sm text-muted mb-0">{LEAD_RECORD_SERVICE_NOTE}</p>
        </Card>
      </PageSection>
    </>
  );
}
