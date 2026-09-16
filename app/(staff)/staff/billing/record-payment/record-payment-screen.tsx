"use client";

/**
 * Record payment — the counter's provisional-receipt capture (FORMS_PLAN.md gap 3).
 *
 * The shared capture shell from the forms report: one numbered section (`01 Payment`)
 * with the six field inventory, field hints, the `.peso-input` treatment for the amount,
 * the validity warning, and one action bar. Capturing shows the provisional receipt the
 * capture produced — rendered from the shared paper grammar so Print / Word / PDF are the
 * same sheet — with the note that it is valid only when an official receipt confirms it.
 *
 * Honesty rules this screen lives by (AGENTS.md rule 1 + FORMS_PLAN.md non-negotiables):
 * - Capture is CLIENT-SIDE ONLY. No payment endpoint exists (finance-billing arrives via
 *   events only), and the BFF must not originate data writes, so records live in this
 *   browser tab for the session and the confirmation says exactly that.
 * - Nothing is computed, allocated, numbered or posted: the receipt prints what was
 *   captured, and the official receipt remains finance's.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { PaperExportActions } from "@/components/paper/paper-export-actions";
import { PaperSheet } from "@/components/paper/paper-sheet";
import { formatMinorUnits } from "@/lib/money";
import {
  INSTRUMENT_LABEL,
  PAYMENT_INSTRUMENTS,
  PROVISIONAL_RECEIPT_NOTE,
  emptyPaymentCaptureDraft,
  formatRecordedAt,
  paymentCaptureFromDraft,
  validatePaymentCapture,
  type PaymentCapture,
  type PaymentCaptureDraft,
  type PaymentCaptureErrors,
} from "@/lib/contracts/payment-capture";
import {
  buildProvisionalReceipt,
  provisionalReceiptFileStem,
} from "@/lib/contracts/provisional-receipt";

/** One record the payment may be captured against — loaded by the page, never invented. */
export type PaymentTarget = {
  reference: string;
  label: string;
  kind: "invoice" | "case";
};

export function RecordPaymentScreen({
  targets,
  prefill,
  recordsUnavailable,
}: {
  targets: PaymentTarget[];
  /** Case/invoice reference from the link that opened this screen; "" when opened bare. */
  prefill: string;
  /** True when a records list could not be loaded — the slip can still be typed. */
  recordsUnavailable: boolean;
}) {
  const [draft, setDraft] = useState<PaymentCaptureDraft>(() => ({
    ...emptyPaymentCaptureDraft(),
    against: prefill,
  }));
  const [errors, setErrors] = useState<PaymentCaptureErrors>({});
  const [captures, setCaptures] = useState<PaymentCapture[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const openCapture = openId ? captures.find((c) => c.id === openId) ?? null : null;

  function patch(next: Partial<PaymentCaptureDraft>) {
    setDraft((current) => ({ ...current, ...next }));
    setErrors({});
  }

  function submitCapture(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found = validatePaymentCapture(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const capture = paymentCaptureFromDraft(draft, `session-payment-${captures.length + 1}`, new Date().toISOString());
    setCaptures((current) => [capture, ...current]);
    setOpenId(capture.id);
    setDraft(emptyPaymentCaptureDraft());
    setErrors({});
  }

  function backToForm() {
    setOpenId(null);
    setDraft(emptyPaymentCaptureDraft());
    setErrors({});
  }

  const errorCount = Object.keys(errors).length;
  const hasTargets = targets.length > 0;

  if (openCapture) {
    return (
      <ProvisionalReceiptView
        capture={openCapture}
        sessionCaptures={captures}
        onRecordAnother={backToForm}
        onOpenCapture={setOpenId}
      />
    );
  }

  return (
    <form className="stack" onSubmit={submitCapture} noValidate>
      <Alert tone="info" title="What this records">
        A provisional record of money received at the counter. There is no payment service
        yet, so a capture lives in this browser tab for the session — nothing is written to
        a repository and no invoice balance moves.
      </Alert>

      {errorCount > 0 ? (
        <Alert tone="danger" title="Could not record the payment">
          {errorCount === 1
            ? "One field needs attention before the payment is recorded."
            : `${errorCount} fields need attention before the payment is recorded.`}
        </Alert>
      ) : null}

      <section className="card capture-section">
        <div className="capture-section__head">
          <span className="capture-section__num" aria-hidden="true">
            01
          </span>
          <div>
            <h3 className="capture-section__title">Payment</h3>
            <p className="capture-section__blurb">
              What was received, as written on the paper slip.
            </p>
          </div>
        </div>
        <div className="capture-section__body">
          <div className="field-grid field-grid--3">
            <Field
              label="Amount received"
              htmlFor="pay-amount"
              hint="Exactly as written, pesos and centavos — nothing is computed from it."
              error={errors.amount_text}
            >
              <div className="peso-input">
                <span className="peso-input__mark" aria-hidden="true">
                  ₱
                </span>
                <input
                  id="pay-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  value={draft.amount_text}
                  aria-invalid={errors.amount_text ? true : undefined}
                  onChange={(e) => patch({ amount_text: e.target.value })}
                />
              </div>
            </Field>
            <Field
              label="Instrument"
              htmlFor="pay-instrument"
              hint="How the payment arrived."
              error={errors.instrument}
            >
              <select
                id="pay-instrument"
                value={draft.instrument}
                aria-invalid={errors.instrument ? true : undefined}
                onChange={(e) =>
                  patch({ instrument: e.target.value as PaymentCaptureDraft["instrument"] })
                }
              >
                <option value="">—</option>
                {PAYMENT_INSTRUMENTS.map((instrument) => (
                  <option key={instrument.value} value={instrument.value}>
                    {instrument.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Date received"
              htmlFor="pay-date"
              hint="The day the counter received it."
              error={errors.received_on}
            >
              <input
                id="pay-date"
                type="date"
                value={draft.received_on}
                aria-invalid={errors.received_on ? true : undefined}
                onChange={(e) => patch({ received_on: e.target.value })}
              />
            </Field>
          </div>

          <div className="field-grid field-grid--2">
            <Field
              label="Reference no."
              htmlFor="pay-reference"
              hint="Check / transfer reference; blank for cash."
              error={errors.reference}
            >
              <input
                id="pay-reference"
                autoComplete="off"
                value={draft.reference}
                aria-invalid={errors.reference ? true : undefined}
                onChange={(e) => patch({ reference: e.target.value })}
              />
            </Field>
            <Field
              label="Case or invoice"
              htmlFor="pay-against"
              hint="Pick the record it is captured against, or type the reference as written."
              error={errors.against}
            >
              <>
                <input
                  id="pay-against"
                  list="pay-targets"
                  autoComplete="off"
                  placeholder="CASE-2026-0001 / INV-2026-00001"
                  value={draft.against}
                  aria-invalid={errors.against ? true : undefined}
                  onChange={(e) => patch({ against: e.target.value })}
                />
                <datalist id="pay-targets">
                  {targets.map((target) => (
                    <option key={target.reference} value={target.reference}>
                      {target.label}
                    </option>
                  ))}
                </datalist>
              </>
            </Field>
          </div>

          {recordsUnavailable ? (
            <p className="text-sm text-muted">
              The invoice and case lists could not be loaded just now — type the reference
              as written on the slip.
            </p>
          ) : hasTargets ? null : (
            <p className="text-sm text-muted">
              No invoices or cases are available to pick from — type the reference as
              written on the slip.
            </p>
          )}

          <div className="field-grid field-grid--1">
            <Field
              label="Notes"
              htmlFor="pay-notes"
              hint="Optional — anything the slip does not carry."
            >
              <textarea
                id="pay-notes"
                rows={3}
                value={draft.notes}
                onChange={(e) => patch({ notes: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </section>

      <Alert tone="warning" title="Provisional receipt">
        {PROVISIONAL_RECEIPT_NOTE}
      </Alert>

      <div className="capture-actions">
        <Button type="submit">Record payment</Button>
        <Button variant="ghost" type="button" onClick={backToForm}>
          Clear
        </Button>
      </div>
    </form>
  );
}

/**
 * The provisional receipt the capture produced — the on-screen sheet plus the repo's
 * paper action bar (Print / Word / PDF from the same blocks) and this session's captures.
 * Split out so it renders on its own in tests, exactly as the counter sees it.
 */
export function ProvisionalReceiptView({
  capture,
  sessionCaptures,
  onRecordAnother,
  onOpenCapture,
}: {
  capture: PaymentCapture;
  sessionCaptures: PaymentCapture[];
  onRecordAnother: () => void;
  onOpenCapture: (id: string) => void;
}) {
  const receipt = useMemo(() => buildProvisionalReceipt(capture), [capture]);
  const stem = useMemo(() => provisionalReceiptFileStem(capture), [capture]);

  return (
    <div className="stack">
      <Alert tone="success" title="Payment recorded for this session">
        Nothing was sent to a service — there is no payment endpoint yet, so this
        provisional record lives in this browser tab and no invoice balance moves. Print
        the slip below for the family.
      </Alert>

      <PaperExportActions blocks={receipt.blocks} filename={stem}>
        <Button variant="secondary" size="sm" onClick={onRecordAnother}>
          Record another payment
        </Button>
        <Link href="/staff/billing" className="btn btn--secondary btn--sm">
          Back to billing
        </Link>
      </PaperExportActions>

      <PaperSheet blocks={receipt.blocks} />

      {sessionCaptures.length > 0 ? (
        <Card header={<h3>Captured in this session</h3>}>
          <p className="text-sm text-muted">
            These rows exist only in this browser tab; none of them is stored anywhere yet.
          </p>
          <div className="table-wrapper" style={{ marginTop: "var(--space-3)" }}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Amount</th>
                  <th scope="col">Instrument</th>
                  <th scope="col">Date received</th>
                  <th scope="col">Case or invoice</th>
                  <th scope="col">Recorded</th>
                  <th scope="col">
                    <span className="text-sm text-muted">Receipt</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessionCaptures.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatMinorUnits(entry.amount_cents, "PHP")}</td>
                    <td>{INSTRUMENT_LABEL[entry.instrument]}</td>
                    <td className="text-sm">{entry.received_on}</td>
                    <td>
                      <code>{entry.against}</code>
                    </td>
                    <td className="text-sm">{formatRecordedAt(entry.recorded_at)}</td>
                    <td>
                      {entry.id === capture.id ? (
                        <span className="text-sm text-muted">showing</span>
                      ) : (
                        <Button size="sm" variant="ghost" type="button" onClick={() => onOpenCapture(entry.id)}>
                          View receipt
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
