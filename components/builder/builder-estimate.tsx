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
 * The builder's running total (`/builder`, F-05) — the page's one loud object,
 * and the step the family hands over.
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
 * ON A DESKTOP the panel is the right column and sticks under the site header,
 * capped to the viewport (`max-height` + `overflow: auto`) so its actions can
 * never scroll out of reach. ON A PHONE it moves to the top of the flow and
 * sticks under the header (the CSS order), so the running figure sits on the
 * first screen and every screen after — the defect the old page shipped was a
 * total 3,760px down the sixth card.
 *
 * THE HAND-OVER IS THE ONLY COMMITMENT: "Send this arrangement to the office"
 * opens the existing /contact request seam with the arrangement written in.
 * There is no gold call here — the office's 24/7 line leads the page's opening
 * gateway and the shared closing band, and gold stays the per-item rung. When
 * the arrangement is already with the office there is nothing to send, so the
 * Send action is dropped (the page says so instead).
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
        <div className="sb-estimate__head">
          <h2 className="sb-estimate__title" id="sb-estimate-title">
            Your arrangement
          </h2>
          <p className="sb-estimate__caption">{BUILDER_ESTIMATE_NOTE}</p>
        </div>

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

            {/* On a desktop the sheet's whole ledger shows (the summary is
                hidden); on a phone it folds behind one tap, so the compact
                sticky total does not cover the questions. */}
            <details className="sb-estimate__more">
              <summary className="sb-estimate__more-summary">
                The lines, and what is still to choose
              </summary>
              <div className="sb-estimate__more-body">
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
              </div>
            </details>
          </>
        )}

        <div className="sb-estimate__actions">
          {/* No arrangement on file → the one commitment: hand it over. */}
          {!selection.alreadyArranged ? (
            <Link className="btn btn--primary" href={builderRequestHref(catalog, selection)}>
              Send this arrangement to the office
            </Link>
          ) : (
            <a className="btn btn--primary" href={contact.phoneHref}>
              Call {contact.phoneDisplay}
            </a>
          )}
          <button type="button" className="btn btn--ghost" onClick={onReset}>
            Start over
          </button>
        </div>
      </div>
    </aside>
  );
}
