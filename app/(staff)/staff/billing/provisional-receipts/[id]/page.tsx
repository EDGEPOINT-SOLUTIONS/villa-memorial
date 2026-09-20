import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { PaperExportActions } from "@/components/paper/paper-export-actions";
import { PaperSheet } from "@/components/paper/paper-sheet";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { ApiError } from "@/lib/api-client/api-error";
import { listLandingContent } from "@/lib/api-client/landing";
import { getProvisionalReceiptView } from "@/lib/api-client/provisional-receipts";
import { formatMinorUnits } from "@/lib/money";
import { formatRecordedAt } from "@/lib/contracts/payment-capture";
import {
  buildOfficialReceiptPaper,
  officialReceiptFileStem,
} from "@/lib/contracts/official-receipt";
import {
  buildProvisionalReceipt,
  provisionalReceiptFileStem,
  provisionalReceiptOffice,
  PROVISIONAL_RECEIPT_MARK,
} from "@/lib/contracts/provisional-receipt";
import { provisionalReceiptAgainst } from "@/lib/contracts/provisional-receipt-capture";

export const metadata = { title: "Provisional receipt — Admin Portal" };

/**
 * One provisional receipt — the counter's paper, or the official receipt that replaces it.
 *
 * ONE STATE OR THE OTHER (never both): while no official receipt exists, this page is the
 * provisional slip, marked unmistakably, ready to print / export Word / export PDF. The
 * moment a recorded payment carries an official receipt — or the documents repository holds
 * one naming this invoice/order/case — the page shows THAT receipt and the way to open it,
 * and the provisional slip is not printed at all.
 *
 * The page posts nothing and numbers nothing: the slip carries no receipt number, and the
 * official receipt's number is always the documents record's own.
 */
export default async function ProvisionalReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["billing:read"])) {
    return (
      <>
        <PageHeader eyebrow="Finance" title="Provisional receipt" />
        <PageSection>
          <ForbiddenState requiredScopes={["billing:read"]} />
        </PageSection>
      </>
    );
  }
  const canRecordPayments = hasAnyScope(session.scopes, ["billing:write"]);

  const { id } = await params;
  let view;
  try {
    view = await getProvisionalReceiptView(decodeURIComponent(id));
  } catch (err) {
    const message =
      err instanceof ApiError ? err.message : "Unable to open the provisional-receipt journal.";
    return (
      <>
        <PageHeader eyebrow="Finance" title="Provisional receipt" />
        <PageSection>
          <ErrorState message={message} />
        </PageSection>
      </>
    );
  }

  if (!view) {
    return (
      <>
        <PageHeader eyebrow="Finance" title="Provisional receipt" />
        <PageSection>
          <ErrorState message="That provisional receipt is not in the counter's journal." />
        </PageSection>
      </>
    );
  }

  const { record, official } = view;
  const content = await listLandingContent();
  const office = provisionalReceiptOffice(content);

  const slip = buildProvisionalReceipt(
    {
      payer: record.payer,
      amount_cents: record.amount_cents,
      instrument: record.instrument,
      reference: record.reference,
      received_on: record.received_on,
      against: record.invoice_number,
      order_number: record.order_number,
      case_number: record.case_number,
      notes: record.notes,
      received_by: record.received_by,
      recorded_at: record.issued_at,
    },
    office,
  );

  const officialPaper = official?.figures
    ? buildOfficialReceiptPaper(official.figures, "office")
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Finance · Billing"
        title="Provisional receipt"
        actions={
          <>
            <Link
              href="/staff/billing/provisional-receipts"
              className="btn btn--secondary btn--sm"
            >
              Provisional receipts
            </Link>
            {!official && canRecordPayments ? (
              <Link
                href={`/staff/billing/record-payment?invoice=${encodeURIComponent(record.invoice_number)}`}
                className="btn btn--primary btn--sm"
              >
                Record the payment in Billing
              </Link>
            ) : null}
          </>
        }
      />

      <div className="kpi-grid">
        <span className="card kpi-card">
          <span className="kpi-card__body">
            <span className="kpi-card__label">Amount received</span>
            <span className="kpi-card__value">{formatMinorUnits(record.amount_cents, "PHP")}</span>
            <span className="kpi-card__sub">{record.received_on}</span>
          </span>
        </span>
        <span className="card kpi-card">
          <span className="kpi-card__body">
            <span className="kpi-card__label">Payer</span>
            <span className="kpi-card__value kpi-card__value--sm">{record.payer}</span>
            <span className="kpi-card__sub">received by {record.received_by}</span>
          </span>
        </span>
        <span className="card kpi-card">
          <span className="kpi-card__body">
            <span className="kpi-card__label">Settles</span>
            <span className="kpi-card__value kpi-card__value--sm">
              {provisionalReceiptAgainst(record)}
            </span>
            <span className="kpi-card__sub">recorded billing reference</span>
          </span>
        </span>
        <span className="card kpi-card">
          <span className="kpi-card__body">
            <span className="kpi-card__label">State</span>
            <span className="kpi-card__value kpi-card__value--sm">
              {official ? (
                <Badge tone="success">Official receipt {official.document_number}</Badge>
              ) : (
                <Badge tone="warning">Awaiting official receipt</Badge>
              )}
            </span>
            <span className="kpi-card__sub">
              issued {formatRecordedAt(record.issued_at)}
            </span>
          </span>
        </span>
      </div>

      {official ? (
        <PageSection>
          <Card header={<h3>Official receipt {official.document_number}</h3>}>
            <div className="stack">
              <Alert tone="info" title="The real receipt replaces this provisional slip">
                The documents record covers {provisionalReceiptAgainst(record)}; the provisional
                paper is kept on file and never printed in place of this one.
              </Alert>
              {officialPaper ? (
                <>
                  <PaperExportActions
                    blocks={officialPaper.blocks}
                    profile={officialPaper.profile}
                    filename={officialReceiptFileStem(
                      official.document_number,
                      official.figures?.received_on ?? record.received_on,
                    )}
                  />
                  <PaperSheet blocks={officialPaper.blocks} profile={officialPaper.profile} />
                </>
              ) : (
                <p className="text-sm text-muted">
                  The repository holds this receipt&apos;s record
                  {official.document_title ? ` — ${official.document_title}` : ""}. Open it to
                  see the document the service serves.
                </p>
              )}
              <div>
                <Link
                  className="btn btn--secondary btn--sm"
                  href={`/staff/documents/${encodeURIComponent(official.document_id)}`}
                >
                  View the official receipt in Documents
                </Link>
              </div>
            </div>
          </Card>
        </PageSection>
      ) : (
        <PageSection>
          <Card header={<h3>Provisional receipt</h3>}>
            <div className="stack">
              <Alert tone="warning" title="This paper is not an official receipt">
                {PROVISIONAL_RECEIPT_MARK} It records what the counter received
                {record.invoice_number ? ` against ${record.invoice_number}` : ""} — it changes no
                invoice balance, and finance&apos;s official receipt replaces it when issued.
              </Alert>
              <PaperExportActions
                blocks={slip.blocks}
                profile={slip.profile}
                filename={provisionalReceiptFileStem({
                  against: record.invoice_number,
                  received_on: record.received_on,
                })}
              />
              <PaperSheet blocks={slip.blocks} profile={slip.profile} />
            </div>
          </Card>
        </PageSection>
      )}
    </>
  );
}
