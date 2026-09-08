/**
 * Presentation-only money helpers. The frozen rule: integer minor units
 * (`*_cents`) everywhere; `display_price` strings from APIs are shown as-is,
 * never parsed. This formatter exists for pure-UI surfaces (cart previews).
 */
export function formatMinorUnits(
  cents: number,
  currency = "PHP",
  locale = "en-PH",
): string {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error("money must be a non-negative integer of minor units");
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/** Cart preview subtotal — display only; servers re-price authoritatively. */
export function previewSubtotal(
  lines: Array<{ unitPriceCents: number; quantity: number }>,
): number {
  return lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
}
