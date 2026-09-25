"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { embalmingDaySku } from "@/lib/catalogue-skus";
import { buildQuoteHref } from "@/lib/public-forms/request-prefill";
import { EMBALMING_RATES } from "@/lib/villa-pricing";

/**
 * Embalming — quoted by the day (Request-for-Quote, captain 2026-09-21 item 5).
 *
 * The sheet prices embalming per stay length (3–9 days; a day beyond nine is its
 * own line below), so the reader's real question is "what does N days cost?".
 * The services page no longer shows an amount: this picker lets the visitor say
 * how many days the viewing will be open, then asks the office for a quote for
 * that stay. The whole day ladder stays published under the picker (the sheet's
 * own rows) so nothing is hidden — see EmbalmingRates in service-rates-2026.tsx.
 *
 * Rules live in lib/villa-pricing.ts; this component authors no figure.
 */
export function EmbalmingDayPicker() {
  const [days, setDays] = useState(EMBALMING_RATES[0].days);
  const pickerId = useId();
  const selected = EMBALMING_RATES.find((r) => r.days === days) ?? EMBALMING_RATES[0];

  return (
    <div className="sv-picker-group">
      <p className="sv-small" id={`${pickerId}-label`}>
        <strong>How many days will the viewing be open?</strong>
      </p>
      <ul className="sv-days" aria-labelledby={`${pickerId}-label`}>
        {EMBALMING_RATES.map((row) => (
          <li key={row.days}>
            <button
              type="button"
              aria-pressed={row.days === days}
              aria-controls={pickerId}
              onClick={() => setDays(row.days)}
            >
              {row.days}
            </button>
          </li>
        ))}
      </ul>

      <div className="sv-picker" id={pickerId} aria-live="polite">
        <p className="sv-picker__summary">
          <span className="sv-picker__unit">
            Request a quote for <strong>{selected.days} days</strong> — the office confirms
            the price.
          </span>
        </p>
        <p className="sv-note">Package includes embalming — no fixed day count.</p>
        <div className="sv-picker__actions">
          <Link
            className="btn btn--accent btn--sm"
            href={buildQuoteHref({
              item: `Embalming — ${selected.days} days`,
              sku: embalmingDaySku(selected.days),
              note: "Embalming, make-up and dressing. A-la-carte service — applies when the family does not take a package.",
            })}
          >
            Request a quote
          </Link>
        </div>
      </div>
    </div>
  );
}
