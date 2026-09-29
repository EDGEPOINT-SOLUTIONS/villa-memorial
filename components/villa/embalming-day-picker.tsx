"use client";

import { useId, useState } from "react";
import { ItemQuoteButton } from "@/components/villa/item-quote-button";
import { embalmingDaySku } from "@/lib/catalogue-skus";
import { EMBALMING_RATES } from "@/lib/villa-pricing";

/**
 * Embalming — quoted by the day (Request-for-Quote, captain 2026-09-21 item 5).
 *
 * The sheet prices embalming per stay length (3–9 days; a day beyond nine is its
 * own line below), so the reader's real question is "what does N days cost?".
 * The services page no longer shows an amount: this picker lets the visitor say
 * how many days the viewing will be open, then ADDS THAT STAY as a line to the
 * quote basket (office, inbox 047). The whole day ladder stays visible under
 * the picker (the sheet's own rows) so nothing is hidden — see EmbalmingRates
 * in service-rates-2026.tsx.
 *
 * Rules live in lib/villa-pricing.ts; this component authors no figure.
 */
const EMBALMING_PICKER_NOTE =
  "Embalming, make-up and dressing. A-la-carte service — applies when the family does not take a package.";

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
            Add <strong>{selected.days} days</strong> to your quote — the office confirms the
            price.
          </span>
        </p>
        <p className="sv-note">Package includes embalming — no fixed day count.</p>
        <div className="sv-picker__actions">
          <ItemQuoteButton
            lines={[
              {
                sku: embalmingDaySku(selected.days),
                name: `Embalming — ${selected.days} days`,
                itemType: "service",
                detail: EMBALMING_PICKER_NOTE,
              },
            ]}
            name={`Embalming — ${selected.days} days`}
            label="Add to Quote"
          />
        </div>
      </div>
    </div>
  );
}
