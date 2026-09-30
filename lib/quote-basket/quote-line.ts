import { chapelBookingLineSummary, type ChapelBookingLine } from "@/lib/chapel-booking";

/**
 * The QUOTE LINE MODEL — one descriptor plus one explicit pricing mode, so a
 * NEW kind of item joins `/quote` with no page redesign (the captain's word for
 * this revision: "flexible").
 *
 * WHY A DESCRIPTOR AND NOT A KIND SWITCH. The page used to branch on
 * `itemType`, `booking`, and "has a price" in half a dozen places; a new kind (a
 * keepsake, an urn, a transfer, a grave-care service) meant edits in every
 * branch and inherited whichever one happened to match. Here the ADDING SURFACE
 * — the only code that knows what the item is — supplies a `descriptor` (its
 * badge label, its unit, how its detail should be shown, which actions the row
 * offers) and an explicit `pricing`. The page renders `descriptor` + `pricing`
 * and never switches on the kind string.
 *
 * PRICING IS AUTHORITATIVE. A line is either `published` (a 2026 sheet figure the
 * surface already derived) or `on_request` (the office quotes it by hand). The
 * page must never infer a figure from the catalogue: `/services` publishes no
 * funeral-service amount by the captain's 2026-09-21 minute 5, so a service,
 * embalming or chapel line is `on_request` and prints "To be quoted by the
 * office" — never a figure, a line total, or a contribution to a total. The
 * recorded bug this closes: the basket's catalogue-refresh effect used to
 * overwrite `on_request` lines with the catalogue's price, so Retrieval and
 * chapel use silently acquired ₱2,500.00 / ₱1,500.00.
 *
 * This module is pure (no React, no localStorage) so both the client basket and
 * the server inquiry intake can share one reading of a line.
 */

/** How a line's figure is known. Decided by the adding surface, at add time. */
export type QuoteLinePricing =
  | { mode: "published"; unitPriceCents: number; currency: string }
  | { mode: "on_request" };

export type QuoteLineAction = "remove" | "change" | "details";

/**
 * Everything the page needs to render one line. `label` is the badge;
 * `unit`/`detailSchema` tell the renderer whether the line has an editable
 * quantity, a held date range or a plot; `actions` is the row's action set.
 */
export type QuoteLineDescriptor = {
  /** The badge: "Service" | "Package" | "Lot" | "Chapel stay" | a new kind. */
  label: string;
  /** The unit a quantity counts ("day", "night"); absent hides the stepper. */
  unit?: string;
  /** How the line's own detail is shown. `dates` = a held chapel range. */
  detailSchema?: "dates" | "plot" | "text";
  actions: ReadonlyArray<QuoteLineAction>;
};

export type QuoteLine = {
  sku: string;
  name: string;
  /** OPEN vocabulary — the descriptor carries the presentation, not this. */
  kind: string;
  descriptor: QuoteLineDescriptor;
  pricing: QuoteLinePricing;
  quantity: number;
  /** Stable identity for lines that may repeat a SKU (chapel bookings). */
  lineId?: string;
  /** The chapel reservation this line holds, when it is a chapel stay. */
  booking?: ChapelBookingLine;
  /** What this line is about — the family's own detail (service notes, plot). */
  detail?: string;
  /** The date the family prefers, when the line carries one. */
  preferredDate?: string;
};

/** The structured row the office receives for one line (D6-A). */
export type QuoteLineInput = {
  sku: string;
  name: string;
  kind: string;
  pricingMode: "published" | "on_request";
  /** The published 2026 figure in minor units, or null when quoted by hand. */
  unitPriceCents: number | null;
  currency: string | null;
  quantity: number;
  detail?: string;
  /** A held chapel range, a lot area, or a preferred date — human readable. */
  dateRange?: string;
};

/** The one label every quote-only line prints instead of a figure. */
export const QUOTE_ON_REQUEST_LABEL = "To be quoted by the office";

const DEFAULT_ACTIONS: ReadonlyArray<QuoteLineAction> = ["remove", "details"];

/**
 * The known kinds' presentation defaults. A kind NOT in this table still renders
 * (label = a humanised kind), which is the flexibility contract: adding
 * `keepsake` or `transfer` needs no page change.
 */
const KIND_DEFAULTS: Record<string, Omit<QuoteLineDescriptor, "actions">> = {
  package: { label: "Package" },
  service: { label: "Service", detailSchema: "text" },
  add_on: { label: "Add-on", detailSchema: "text" },
  lot: { label: "Lot", detailSchema: "plot" },
  chapel: { label: "Chapel stay", unit: "day", detailSchema: "dates" },
};

function titleCase(value: string): string {
  const words = value.replace(/[_-]+/g, " ").trim().split(/\s+/);
  return words
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ") || "Item";
}

/** The descriptor for a kind, with any surface-supplied overrides applied. */
export function quoteLineDescriptor(
  kind: string,
  overrides: Partial<QuoteLineDescriptor> = {},
): QuoteLineDescriptor {
  const base = KIND_DEFAULTS[kind] ?? {};
  const label = overrides.label ?? base.label ?? titleCase(kind);
  const unit = overrides.unit ?? base.unit;
  const detailSchema = overrides.detailSchema ?? base.detailSchema;
  return {
    label,
    ...(unit ? { unit } : {}),
    ...(detailSchema ? { detailSchema } : {}),
    actions: overrides.actions ?? DEFAULT_ACTIONS,
  };
}

/** Is this line carrying a published figure? */
export function quoteLinePriced(line: Pick<QuoteLine, "pricing">): boolean {
  return line.pricing.mode === "published";
}

/** The unit figure in minor units (0 for an `on_request` line). */
export function quoteLineUnitPrice(line: Pick<QuoteLine, "pricing">): number {
  return line.pricing.mode === "published" ? line.pricing.unitPriceCents : 0;
}

/** The line's currency (PHP for an `on_request` line, which prints no figure). */
export function quoteLineCurrency(line: Pick<QuoteLine, "pricing">): string {
  return line.pricing.mode === "published" ? line.pricing.currency : "PHP";
}

/** The line total in minor units (0 for an `on_request` line). */
export function quoteLineTotal(line: Pick<QuoteLine, "pricing" | "quantity">): number {
  return quoteLineUnitPrice(line) * line.quantity;
}

/** The office must price this line by hand. */
export function lineNeedsPricing(line: Pick<QuoteLine, "pricing">): boolean {
  return line.pricing.mode === "on_request";
}

/** The line's own date context: a held chapel range, else a preferred date. */
export function quoteLineDateRange(
  line: Pick<QuoteLine, "preferredDate" | "booking">,
): string | undefined {
  if (line.booking) return chapelBookingLineSummary(line.booking);
  return line.preferredDate?.trim() || undefined;
}

/** Reduce a live line to the structured row the office receives (D6-A). */
export function toQuoteLineInput(line: QuoteLine): QuoteLineInput {
  const dateRange = quoteLineDateRange(line);
  return {
    sku: line.sku,
    name: line.name,
    kind: line.kind,
    pricingMode: line.pricing.mode,
    unitPriceCents: line.pricing.mode === "published" ? line.pricing.unitPriceCents : null,
    currency: line.pricing.mode === "published" ? line.pricing.currency : null,
    quantity: line.quantity,
    ...(line.detail?.trim() ? { detail: line.detail.trim() } : {}),
    ...(dateRange ? { dateRange } : {}),
  };
}
