"use client";

import Link from "next/link";
import type { ContactInfo } from "@/lib/api-client/landing";
import { formatMinorUnits } from "@/lib/money";
import {
  BUILDER_ESTIMATE_NOTE,
  BUILDER_NO_RESERVATION_NOTE,
  builderEstimate,
  builderRequestHref,
  type BuilderCatalog,
  type BuilderLine,
  type BuilderSelection,
} from "@/lib/service-builder";

/**
 * The builder's running total (`/builder`, F-05) — the one place the estimate is
 * printed, and the step the family hands over.
 *
 * WHAT IT PRINTS AND WHAT IT WILL NOT: every amount comes from the estimate the
 * pure rules module built out of the client's published figures, so this view
 * never does arithmetic and never holds a price. Three honesty rules shape it:
 *
 *  · the TOTAL sums one-time lines only. The plan is an instalment product, so
 *    its amount is printed on its own line and never folded in;
 *  · a line the family's plan already covers is listed WITHOUT an amount — the
 *    total is reduced by omission, never by a fake zero;
 *  · a step not answered yet ("Still to choose: Casket") and an item the office
 *    quotes ("Burial lot — the office quotes it per plot") print as words with
 *    no figure. Nothing on this screen is invented to fill a gap.
 *
 * The panel is sticky beside the steps on a desktop and the step headers carry
 * the same running figure on a phone (service-builder.tsx), so the total is
 * never more than a glance away.
 *
 * Accessibility: the total is a polite live region (the one thing worth
 * announcing after a choice), the reset is a real button, and the hand-over is
 * the existing /contact request seam with the arrangement already written in.
 */
function EstimateLine({ line }: { line: BuilderLine }) {
  return (
    <li className="sb-estimate__line">
      <span className="sb-estimate__line-text">
        <span className="sb-estimate__line-label">{line.label}</span>
        {line.detail ? <span className="sb-estimate__line-detail">{line.detail}</span> : null}
        {line.seniorRate ? <span className="sb-estimate__line-flag">Senior rate</span> : null}
      </span>
      <span className="sb-estimate__line-amount">
        {line.amountCents === null ? "Covered" : formatMinorUnits(line.amountCents)}
      </span>
    </li>
  );
}

export function BuilderEstimatePanel({
  catalog,
  selection,
  contact,
  onReset,
}: {
  catalog: BuilderCatalog;
  selection: BuilderSelection;
  contact: ContactInfo;
  onReset: () => void;
}) {
  const estimate = builderEstimate(catalog, selection);

  return (
    <aside className="sb-side" id="estimate" aria-labelledby="sb-estimate-title">
      <div className="card sb-estimate">
        <h2 className="sb-estimate__title" id="sb-estimate-title">
          Your estimate
        </h2>

        {selection.alreadyArranged ? (
          <div className="sb-estimate__arranged">
            <p className="sb-estimate__arranged-figure">Already arranged</p>
            <p className="sb-estimate__arranged-text">
              The office already holds your arrangement — call to change anything.
            </p>
          </div>
        ) : (
          <>
            <p className="sb-estimate__total">
              <span className="sb-estimate__total-label">One-time items</span>
              <strong className="sb-estimate__total-amount" aria-live="polite">
                {formatMinorUnits(estimate.totalCents)}
              </strong>
            </p>
            <p className="sb-estimate__total-note">{BUILDER_NO_RESERVATION_NOTE}</p>

            {estimate.lines.length > 0 ? (
              <ul className="sb-estimate__lines">
                {estimate.lines.map((line) => (
                  <EstimateLine key={line.id} line={line} />
                ))}
              </ul>
            ) : (
              <p className="sb-estimate__empty">
                Nothing chosen yet — each step adds its 2026 price here.
              </p>
            )}

            {estimate.covered.length > 0 ? (
              <div className="sb-estimate__covered">
                <p className="sb-estimate__covered-title">Covered by your plan</p>
                <ul className="sb-estimate__lines">
                  {estimate.covered.map((line) => (
                    <EstimateLine key={line.id} line={line} />
                  ))}
                </ul>
              </div>
            ) : null}

            {estimate.owned.length > 0 ? (
              <p className="sb-estimate__owned">Already yours: {estimate.owned.join(" · ")}</p>
            ) : null}

            {estimate.monthly ? (
              <p className="sb-estimate__monthly">
                <span className="sb-estimate__monthly-label">{estimate.monthly.label}</span>
                <strong className="sb-estimate__monthly-amount">
                  {formatMinorUnits(estimate.monthly.amountCents)} {estimate.monthly.per}
                </strong>
                <span className="sb-estimate__monthly-note">
                  The plan is paid in instalments — shown separately from the one-time items.
                </span>
              </p>
            ) : null}

            {estimate.pending.length > 0 ? (
              <p className="sb-estimate__pending">
                Still to choose: {estimate.pending.join(" · ")}
              </p>
            ) : null}

            {estimate.officeQuotes.length > 0 ? (
              <ul className="sb-estimate__quotes">
                {estimate.officeQuotes.map((quote) => (
                  <li key={quote}>{quote}</li>
                ))}
              </ul>
            ) : null}
          </>
        )}

        <p className="sb-estimate__note">{BUILDER_ESTIMATE_NOTE}</p>

        <div className="sb-estimate__actions">
          <a className="btn btn--primary" href={contact.phoneHref}>
            Call {contact.phoneDisplay}
          </a>
          <Link className="btn btn--secondary" href={builderRequestHref(catalog, selection)}>
            Send this arrangement to the office
          </Link>
          <button type="button" className="btn btn--ghost" onClick={onReset}>
            Start over
          </button>
        </div>
      </div>
    </aside>
  );
}
