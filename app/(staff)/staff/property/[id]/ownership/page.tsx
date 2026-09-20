import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { getLotOwnership, listLotInterments } from "@/lib/api-client/lot-lifecycle";
import { getLot } from "@/lib/api-client/property";
import { lotStatusLabel } from "@/lib/lot-labels";
import { formatRecordDay, intermentSummary } from "@/lib/lot-lifecycle";
import { LotRecordTabs } from "../lot-record-tabs";

export const metadata = { title: "Ownership — Admin Portal" };

/**
 * Ownership (captain checklist F-11) — the lot's record card: the owner as the
 * papers stand, co-owners and authorised family, the right of interment, how the
 * lot was acquired and when, and the documents that back it.
 *
 * Read-only by design: lot-events-v1 (frozen) has NO ownership projection — one
 * `owner_name` string and the acquisition dates, nothing more — so the card is
 * composed from records the app really has (the lot, the captured purchase
 * application, the documents repository) and the gap is named in one line. The
 * screen never invents a co-owner, a date or a paper.
 */

/** The one-line gap notice (each lot-record screen names its own gap once). */
const GAP =
  "No ownership projection exists yet — lot-events-v1 returns one owner name and the dates, not co-owners, family or right of interment. This card reads the recorded lot, application and papers.";

const STATUS_TONE: Record<string, "success" | "warning" | "info" | "neutral" | "danger"> = {
  available: "success",
  reserved: "warning",
  sold: "info",
  occupied: "neutral",
  on_hold: "danger",
  maintenance_hold: "danger",
  for_transfer: "warning",
};

const PAPER_TONE: Record<string, "success" | "warning" | "info" | "neutral" | "danger"> = {
  uploaded: "info",
  pending_review: "warning",
  verified: "info",
  approved: "success",
  rejected: "danger",
};

const PAPER_LABEL: Record<string, string> = {
  uploaded: "Uploaded",
  pending_review: "Pending review",
  verified: "Verified",
  approved: "Approved",
  rejected: "Rejected",
};

export default async function LotOwnershipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["property:read"])) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Ownership" />
        <PageSection>
          <ForbiddenState requiredScopes={["property:read"]} />
        </PageSection>
      </>
    );
  }

  const { id } = await params;
  const canOpenDocuments = hasAnyScope(session.scopes, ["documents:read"]);

  let lot;
  try {
    lot = await getLot(id);
  } catch {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Lot not found" />
        <PageSection>
          <ErrorState message="We couldn't find that lot record." />
        </PageSection>
      </>
    );
  }

  let ownership;
  let interments;
  try {
    [ownership, interments] = await Promise.all([getLotOwnership(lot), listLotInterments(lot.id)]);
  } catch {
    return (
      <>
        <PageHeader eyebrow={`Operations · Lot ${lot.lot_number}`} title="Ownership" />
        <PageSection>
          <ErrorState message="Unable to load this lot's ownership record." />
        </PageSection>
      </>
    );
  }

  const intermentState = intermentSummary(interments);
  const personLine = (person: { name: string; relationship: string | null; age: number | null }) =>
    [person.name, person.relationship, person.age !== null ? `age ${person.age}` : null]
      .filter(Boolean)
      .join(" · ");

  const applicationPaper = ownership.buyer
    ? {
        title: "Purchase application and agreement",
        backs: "The buyer's own application — the form the sale stands on",
        state: "Recorded",
        on: ownership.buyer.on,
        href: `/staff/property/${encodeURIComponent(lot.id)}/document`,
      }
    : null;

  return (
    <>
      <PageHeader
        eyebrow={`Operations · Lot ${lot.lot_number}`}
        title="Ownership"
        actions={
          <Link
            href={`/staff/property/${encodeURIComponent(lot.id)}`}
            className="btn btn--secondary btn--sm"
          >
            Back to lot
          </Link>
        }
      />
      <LotRecordTabs lotId={lot.id} current="ownership" />
      <p className="lot-rec-gap">{GAP}</p>

      {/* The answer at a glance: who the papers name, where the lot stands. */}
      <PageSection>
        <Card header={<h2>The owner on the papers</h2>}>
          <dl className="kv lot-rec-kv">
            <div>
              <dt>Owner</dt>
              <dd>
                {ownership.owner ? <strong>{ownership.owner}</strong> : "No owner is recorded"}
              </dd>
            </div>
            <div>
              <dt>Co-owners</dt>
              <dd>
                {ownership.co_owners.length > 0
                  ? ownership.co_owners.join(", ")
                  : "None recorded — the platform holds one owner name per lot"}
              </dd>
            </div>
            <div>
              <dt>Authorised family</dt>
              <dd>
                {ownership.authorised_family.length > 0
                  ? ownership.authorised_family.map(personLine).join("; ")
                  : "None recorded"}
              </dd>
            </div>
            <div>
              <dt>How acquired</dt>
              <dd>
                {ownership.acquisition.kind
                  ? `${ownership.acquisition.kind === "sold" ? "Sold" : "Reserved"} · ${formatRecordDay(ownership.acquisition.on)}`
                  : "Not yet acquired — the lot has no reservation or sale on record"}
              </dd>
            </div>
            <div>
              <dt>Lot status</dt>
              <dd>
                <Badge tone={STATUS_TONE[lot.status] ?? "neutral"}>{lotStatusLabel(lot.status)}</Badge>
              </dd>
            </div>
          </dl>
          {ownership.buyer ? (
            <p className="text-sm text-muted mt-4 mb-0">
              Buyer as recorded: <strong>{ownership.buyer.name}</strong>, application dated{" "}
              {formatRecordDay(ownership.buyer.on)}
              {ownership.buyer.classification ? ` · ${ownership.buyer.classification}` : ""}
              {ownership.buyer.mode_of_payment ? ` · ${ownership.buyer.mode_of_payment}` : ""}
            </p>
          ) : null}
          {!ownership.application_available ? (
            <p className="text-sm text-muted mt-4 mb-0">
              The purchase application cannot be read in live mode — no application contract is
              frozen yet. The owner, co-owners and family above are what the app holds.
            </p>
          ) : null}
        </Card>
      </PageSection>

      <PageSection>
        <Card header={<h2>Right of interment</h2>}>
          <dl className="kv lot-rec-kv">
            <div>
              <dt>Recorded with</dt>
              <dd>
                {ownership.right_of_interment.holder ??
                  "No one — the lot has no recorded owner"}
              </dd>
            </div>
            <div>
              <dt>Ground rule</dt>
              <dd>
                &ldquo;{ownership.right_of_interment.rule}&rdquo;
                <br />
                <span className="text-sm text-muted">
                  Purchase agreement, {ownership.right_of_interment.clause_revision}
                </span>
              </dd>
            </div>
            <div>
              <dt>First interment / bundle</dt>
              <dd>
                {ownership.right_of_interment.first_interment === "included"
                  ? "Included"
                  : ownership.right_of_interment.first_interment === "not_included"
                    ? "Not included"
                    : "Not recorded on the application"}
              </dd>
            </div>
            <div>
              <dt>Interments recorded here</dt>
              <dd>
                {interments.length === 0 ? (
                  "None"
                ) : (
                  <>
                    {intermentState.lead} · {intermentState.detail}
                    <br />
                    <Link href={`/staff/property/${encodeURIComponent(lot.id)}/interments`}>
                      Open the interment records
                    </Link>
                  </>
                )}
              </dd>
            </div>
          </dl>
        </Card>
      </PageSection>

      <PageSection>
        <Card header={<h2>Papers on file</h2>}>
          {applicationPaper || ownership.papers.length > 0 ? (
            <>
              <div className="table-wrapper" tabIndex={0}>
                <table className="table">
                  <caption className="visually-hidden">
                    Papers recorded against lot {lot.lot_number}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Paper</th>
                      <th scope="col">What it backs</th>
                      <th scope="col">State</th>
                      <th scope="col">Recorded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applicationPaper ? (
                      <tr>
                        <td>
                          <strong>
                            <Link href={applicationPaper.href}>{applicationPaper.title}</Link>
                          </strong>
                          <div className="text-sm text-muted">Recorded at the counter</div>
                        </td>
                        <td>{applicationPaper.backs}</td>
                        <td>
                          <Badge tone="info">{applicationPaper.state}</Badge>
                        </td>
                        <td className="text-sm">{formatRecordDay(applicationPaper.on)}</td>
                      </tr>
                    ) : null}
                    {ownership.papers.map((paper) => (
                      <tr key={paper.document_number}>
                        <td>
                          <strong>
                            {canOpenDocuments && paper.document_id ? (
                              <Link
                                href={`/staff/documents/${encodeURIComponent(paper.document_id)}`}
                              >
                                {paper.title ?? "Not in the repository"}
                              </Link>
                            ) : (
                              (paper.title ?? "Not in the repository")
                            )}
                          </strong>
                          <div className="text-sm text-muted">{paper.document_number}</div>
                        </td>
                        <td>{paper.backs}</td>
                        <td>
                          {paper.status ? (
                            <Badge tone={PAPER_TONE[paper.status] ?? "neutral"}>
                              {PAPER_LABEL[paper.status] ?? paper.status.replace(/_/g, " ")}
                            </Badge>
                          ) : (
                            <Badge tone="warning">Unread</Badge>
                          )}
                        </td>
                        <td className="text-sm">{formatRecordDay(paper.uploaded_on)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!ownership.papers_available ? (
                <p className="text-sm text-muted mt-4 mb-0">
                  The document repository could not be read — the office&rsquo;s file names
                  these papers by number.
                </p>
              ) : null}
            </>
          ) : (
            <EmptyState
              title="No papers are recorded for this lot"
              hint="The app holds no document against this lot yet. The office's own paper file remains the record."
            />
          )}
        </Card>
      </PageSection>
    </>
  );
}
