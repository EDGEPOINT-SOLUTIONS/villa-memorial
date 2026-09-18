/**
 * The guarantee-instrument tracker, in the case page's folio language (F-18 / gap 5).
 *
 * Two surfaces, one grammar:
 *  - `GuaranteeInstrumentsCard` — the compact card the case page shows beside the
 *    service-contract card: one line per instrument, its office state and its deadline,
 *    linking through to the tracker. It summarises; it never pushes the case's own
 *    information around.
 *  - `GuaranteeInstrumentsTracker` — the `/staff/cases/[id]/instruments` folio: the
 *    paper-hero band with the case-wide filing deadline, then one row per instrument with
 *    who it is claimed from, the amount the contract records, the recorded step dates and
 *    the supporting-document checklist.
 *
 * Honest states, compressed: the only honesty note is the one line on the detail screen
 * (and its short sibling on the card). There is no sub-ledger behind this screen, so the
 * note says once that amounts and posting stay with finance — and the views never compute,
 * never invent a reference and never dress demo data up as a service.
 */
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMinorUnits } from "@/lib/money";
import {
  FILING_DEADLINE_TONE,
  INSTRUMENT_DOCUMENT_STATE_LABEL,
  INSTRUMENT_KIND_LABEL,
  INSTRUMENT_STATUS_LABEL,
  INSTRUMENT_STATUS_TONE,
  instrumentDateLabel,
  instrumentNeedsFiling,
  outstandingDocuments,
  summariseCaseInstruments,
  type CaseInstrumentsSummary,
  type FilingDeadline,
  type GuaranteeInstrument,
} from "@/lib/guarantee-instruments";
import { TRACKER_NOT_WIRED, type CaseInstrumentsRead } from "@/lib/api-client/guarantee-instruments";

/** The one honesty line — there is no sub-ledger behind the tracker (dev boundary). */
const STATUS_ONLY_NOTE =
  "Tracking the paperwork only — the amounts, balances and posting behind a guarantee stay with finance's sub-ledger.";

function amountLabel(instrument: GuaranteeInstrument): string {
  return instrument.amount_cents === null
    ? "— not on the recorded contract"
    : formatMinorUnits(instrument.amount_cents);
}

/** The unfiled instrument's deadline, or null once it is filed (the clock is moot). */
function unfiledDeadline(
  instrument: GuaranteeInstrument,
  summary: CaseInstrumentsSummary,
): FilingDeadline | null {
  return instrumentNeedsFiling(instrument) ? summary.deadline : null;
}

/** The case-wide deadline line for the hero's gold panel. */
function heroDeadlineLine(summary: CaseInstrumentsSummary): string {
  if (summary.total === 0) return "No instruments recorded";
  if (summary.unfiled === 0) {
    return `All ${summary.total} instrument${summary.total === 1 ? "" : "s"} filed`;
  }
  if (summary.deadline.state === "unknown") {
    return `${summary.unfiled} of ${summary.total} not filed — no contract date to run the clock from`;
  }
  return `${summary.unfiled} of ${summary.total} not filed · ${summary.deadline.label}`;
}

/* ------------------------------------------------------------------ */
/* The case page's compact card                                        */
/* ------------------------------------------------------------------ */

export function GuaranteeInstrumentsCard({
  caseId,
  caseNumber,
  contractDate,
  today,
  read,
}: {
  caseId: string;
  caseNumber: string;
  contractDate: string | null;
  today: string;
  read: CaseInstrumentsRead;
}) {
  const serviceContractHref = `/staff/cases/${encodeURIComponent(caseId)}/service-contract`;
  const trackerHref = `/staff/cases/${encodeURIComponent(caseId)}/instruments`;

  if (read.state === "not_wired") {
    return (
      <Card header={<h3>Guarantee instruments</h3>}>
        <p className="text-sm text-muted">{TRACKER_NOT_WIRED}</p>
      </Card>
    );
  }

  if (read.state === "unavailable") {
    return (
      <Card header={<h3>Guarantee instruments</h3>}>
        <p className="text-sm text-muted">
          The instrument record could not be read just now. Nothing is lost — open the case
          again in a moment.
        </p>
      </Card>
    );
  }

  if (read.state === "absent") {
    return (
      <Card
        header={<h3>Guarantee instruments</h3>}
        footer={
          <Link href={serviceContractHref} className="btn btn--secondary btn--sm">
            Open the service contract form
          </Link>
        }
      >
        <p className="text-sm text-muted">
          No guarantee instruments are recorded for {caseNumber}. They are written down on
          the service contract&rsquo;s deductions block, and this tracker follows them from
          there.
        </p>
      </Card>
    );
  }

  const summary = summariseCaseInstruments(read.instruments, contractDate, today);

  return (
    <Card
      header={
        <h3>
          Guarantee instruments{" "}
          {summary.overdue > 0 ? (
            <Badge tone="danger">
              {summary.overdue} overdue
            </Badge>
          ) : null}
        </h3>
      }
      footer={
        <Link href={trackerHref} className="btn btn--secondary btn--sm">
          Open the instrument tracker
        </Link>
      }
    >
      <ul className="gi-card__list">
        {read.instruments.map((instrument) => {
          const deadline = unfiledDeadline(instrument, summary);
          const filedOn = instrumentDateLabel(instrument.filed_on);
          return (
            <li key={instrument.id} className="gi-card__item">
              <span className="gi-card__what">
                <Badge tone="accent">{INSTRUMENT_KIND_LABEL[instrument.kind]}</Badge>
                {instrument.coverage}
              </span>
              <span className="gi-card__where">
                {deadline && deadline.state === "passed" ? (
                  <Badge tone="danger">Overdue</Badge>
                ) : null}
                <Badge tone={INSTRUMENT_STATUS_TONE[instrument.status]}>
                  {INSTRUMENT_STATUS_LABEL[instrument.status]}
                </Badge>
                {deadline ? (
                  <Badge tone={FILING_DEADLINE_TONE[deadline.state]}>{deadline.label}</Badge>
                ) : (
                  <span className="gi-card__date">
                    {filedOn ? `Filed ${filedOn}` : "Filed — date not recorded"}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="gi-card__note">{STATUS_ONLY_NOTE}</p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* The detail folio                                                    */
/* ------------------------------------------------------------------ */

export function GuaranteeInstrumentsTracker({
  caseId,
  caseNumber,
  deceasedName,
  contractDate,
  today,
  read,
}: {
  caseId: string;
  caseNumber: string;
  deceasedName: string;
  contractDate: string | null;
  today: string;
  read: CaseInstrumentsRead;
}) {
  const backHref = `/staff/cases/${encodeURIComponent(caseId)}`;
  const serviceContractHref = `${backHref}/service-contract`;
  const instruments = read.state === "recorded" ? read.instruments : [];
  const summary = summariseCaseInstruments(instruments, contractDate, today);
  const contractLabel = instrumentDateLabel(contractDate);
  const deadlineLabel = instrumentDateLabel(summary.deadline.date);

  return (
    <div className="stack">
      <div>
        <Link href={backHref} className="btn btn--ghost btn--sm">
          Back to case {caseNumber}
        </Link>
      </div>

      <div className="paper-hero">
        <div className="paper-hero__grid">
          <div>
            <p className="paper-hero__eyebrow">Operations · Case {caseNumber}</p>
            <h1 className="paper-hero__title">Guarantee instruments</h1>
            <p className="paper-hero__lead">
              Where each LGU, DSWD, SSS, GSIS and life-plan deduction the service contract
              records stands — not yet filed, filed, awaiting the agency, confirmed or
              rejected — and what the office still needs for each.
            </p>
            <div className="paper-hero__chips">
              {deceasedName && deceasedName !== "Pending intake" ? (
                <span className="paper-hero__chip">{deceasedName}</span>
              ) : null}
              <span className="paper-hero__chip">
                {contractLabel ? `Contract ${contractLabel}` : "Contract date not recorded"}
              </span>
              <span className="paper-hero__chip">
                {summary.total} instrument{summary.total === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <div className="paper-hero__price">
            <p className="paper-hero__price-label">
              Filing deadline — 3 days from the contract
            </p>
            <p className="paper-hero__price-value">{deadlineLabel ?? "—"}</p>
            <p className="paper-hero__price-status">{heroDeadlineLine(summary)}</p>
          </div>
        </div>
      </div>

      {read.state === "not_wired" ? (
        <Alert tone="warning" title="Live tracking is not wired yet">
          {TRACKER_NOT_WIRED}
        </Alert>
      ) : null}

      {read.state === "unavailable" ? (
        <Alert tone="danger" title="The instrument record could not be read">
          Nothing is lost — open the case again in a moment.
        </Alert>
      ) : null}

      {read.state === "absent" ? (
        <div className="card capture-section">
          <div className="capture-section__body">
            <EmptyState
              title={`No guarantee instruments are recorded for ${caseNumber}`}
              hint="The family's LGU, DSWD, SSS, GSIS and life-plan deductions are written down on the service contract's deductions block; this tracker follows them from there."
            />
            <div className="capture-actions">
              <Link href={serviceContractHref} className="btn btn--secondary btn--sm">
                Open the service contract form
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {read.state === "recorded" ? (
        <>
          <Alert tone="info">{STATUS_ONLY_NOTE}</Alert>
          <section className="card capture-section">
            <div className="capture-section__head">
              <span className="capture-section__num" aria-hidden="true">
                01
              </span>
              <div>
                <h2 className="capture-section__title">Instruments on the contract</h2>
                <p className="capture-section__blurb">
                  Every deduction the service contract records, with where its filing stands
                  and the papers the office still needs.
                </p>
              </div>
            </div>
            <div className="capture-section__body">
              {instruments.map((instrument) => (
                <InstrumentRow
                  key={instrument.id}
                  instrument={instrument}
                  deadline={unfiledDeadline(instrument, summary)}
                  overdue={
                    instrumentNeedsFiling(instrument) &&
                    summary.deadline.state === "passed"
                  }
                />
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function InstrumentRow({
  instrument,
  deadline,
  overdue,
}: {
  instrument: GuaranteeInstrument;
  deadline: FilingDeadline | null;
  overdue: boolean;
}) {
  const filedOn = instrumentDateLabel(instrument.filed_on);
  const responseOn = instrumentDateLabel(instrument.response_on);
  const outstanding = outstandingDocuments(instrument);

  return (
    <article className="gi-row">
      <div className="gi-row__head">
        <h3 className="gi-row__title">{instrument.coverage}</h3>
        <Badge tone="accent">{INSTRUMENT_KIND_LABEL[instrument.kind]}</Badge>
        <Badge tone={INSTRUMENT_STATUS_TONE[instrument.status]}>
          {INSTRUMENT_STATUS_LABEL[instrument.status]}
        </Badge>
        {overdue ? <Badge tone="danger">Overdue</Badge> : null}
      </div>

      <dl className="gi-facts">
        <div>
          <dt>Claimed from</dt>
          <dd>{instrument.claimed_from || "—"}</dd>
        </div>
        <div>
          <dt>Amount on the contract</dt>
          <dd>{amountLabel(instrument)}</dd>
        </div>
        <div>
          <dt>Contract reference</dt>
          <dd>{instrument.reference ?? "—"}</dd>
        </div>
      </dl>

      <div className="gi-row__timeline">
        <span>{filedOn ? `Filed ${filedOn}` : "Not filed yet"}</span>
        {responseOn ? <span>Agency response {responseOn}</span> : null}
        {deadline ? (
          <span>
            {deadline.date ? `File by ${instrumentDateLabel(deadline.date)}` : "Filing deadline"}{" "}
            <Badge tone={FILING_DEADLINE_TONE[deadline.state]}>{deadline.label}</Badge>
          </span>
        ) : null}
      </div>

      {instrument.note ? <p className="text-sm text-muted">{instrument.note}</p> : null}

      <div className="gi-docs">
        <h3 className="capture-subhead">What it waits on</h3>
        {instrument.documents.length === 0 ? (
          <p className="text-sm text-muted">No documents listed for this instrument.</p>
        ) : (
          <ul className="gi-doc-list">
            {instrument.documents.map((doc) => (
              <li key={doc.label} className="gi-doc">
                <span>{doc.label}</span>
                <Badge tone={doc.state === "received" ? "success" : "warning"}>
                  {INSTRUMENT_DOCUMENT_STATE_LABEL[doc.state]}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted">
          {outstanding.length === 0
            ? "Nothing outstanding."
            : `Still needed: ${outstanding.map((doc) => doc.label).join(" · ")}`}
        </p>
      </div>
    </article>
  );
}
