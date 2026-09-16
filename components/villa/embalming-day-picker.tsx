"use client";

import { useId, useState } from "react";
import { CatalogueActions } from "@/components/villa/catalogue-actions";
import type { CatalogItem } from "@/lib/api-client/commerce";
import { embalmingDaySku } from "@/lib/catalogue-skus";
import { EMBALMING_RATES, php } from "@/lib/villa-pricing";

/**
 * Embalming — priced by the day (approved 2026-09-16 services design).
 *
 * The sheet prices embalming per stay length (3–9 days; a day beyond nine is
 * its own line below), so the reader's real question is "how much for N days?".
 * This picker answers it in one tap: choose the day count, read the total with
 * its unit, then take the same two storefront actions every other line offers.
 *
 * The whole table stays published under the picker (the sheet's own rows), so
 * nothing is hidden — see EmbalmingRates in service-rates-2026.tsx.
 *
 * Rules live in lib/villa-pricing.ts; this component authors no figure.
 */
export function EmbalmingDayPicker({ items }: { items: CatalogItem[] }) {
  const [days, setDays] = useState(EMBALMING_RATES[0].days);
  const priceId = useId();
  const selected = EMBALMING_RATES.find((r) => r.days === days) ?? EMBALMING_RATES[0];
  const item = items.find((entry) => entry.sku === embalmingDaySku(selected.days));
  const note = `A-la-carte 2026 rate — applies when the family does not take a package. ${selected.days} days' embalming.`;

  return (
    <div className="sv-picker-group">
      <p className="sv-small" id={`${priceId}-label`}>
        <strong>How many days will the viewing be open?</strong>
      </p>
      <ul className="sv-days" aria-labelledby={`${priceId}-label`}>
        {EMBALMING_RATES.map((row) => (
          <li key={row.days}>
            <button
              type="button"
              aria-pressed={row.days === days}
              aria-controls={priceId}
              onClick={() => setDays(row.days)}
            >
              {row.days}
            </button>
          </li>
        ))}
      </ul>

      <div className="sv-picker" id={priceId} aria-live="polite">
        <p className="sv-picker__summary">
          <span className="sv-picker__amount">{php(selected.amount)}</span>
          <span className="sv-picker__unit">
            for <strong>{selected.days} days</strong> — {php(selected.amount)} per stay, not per day
          </span>
        </p>
        <p className="sv-note">
          Embalming is included with no fixed day count in a complete Villa Memorial Plan
          package. This is the a-la-carte rate.
        </p>
        <div className="sv-picker__actions">
          {item ? (
            <CatalogueActions
              item={{
                sku: item.sku,
                name: item.name,
                itemType: item.item_type,
                unitPriceCents: item.unit_price_cents,
                currency: item.currency,
              }}
              prefill={{ note }}
              addLabel={`Add ${selected.days} days`}
              displayPrice={item.display_price}
            />
          ) : (
            <span className="text-sm text-muted">Not offered online — ask the office.</span>
          )}
        </div>
      </div>
    </div>
  );
}
