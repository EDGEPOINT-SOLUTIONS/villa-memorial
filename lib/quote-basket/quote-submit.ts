import type { QuoteValues } from "@/lib/public-forms/validation";
import type { QuoteLine, QuoteSender } from "@/lib/quote-basket/quote-basket-context";
import {
  quoteLinePriced,
  toQuoteLineInput,
  type QuoteLineInput,
} from "@/lib/quote-basket/quote-line";

/**
 * Composing the ONE inquiry a quote basket submits — the pure half, so the
 * multi-line behaviour is unit-testable without a browser.
 *
 * The office takes inquiries, not orders: the basket's lines become a single
 * Request-for-Quote (`POST /api/inquiries`, kind "quote"). Since D6-A the payload
 * carries a STRUCTURED `lines` array (SKU, kind, pricing mode, quantity, the
 * family's own detail) plus a concise topic, so the board renders one row per
 * line with a "needs pricing" flag instead of one free-text blob. The family's
 * own note travels in `notes`; nothing here is a price claim and nothing
 * reserves anything.
 *
 * A quote-only line contributes NO amount to the payload (its `unitPriceCents`
 * is null); the board's "needs pricing" flag is what tells the coordinator to
 * price it by hand.
 */
export type QuoteSubmission = {
  values: QuoteValues;
  /** A concise one-line subject (the board's `topic`). */
  summary: string;
  /** The structured line rows the office receives. */
  lines: QuoteLineInput[];
  lineCount: number;
};

/** A one-line description of a line, used by the message fallback and tests. */
export function quoteLineSummary(line: QuoteLine): string {
  const detail = line.detail?.trim();
  const quantity = line.booking
    ? ""
    : line.kind === "lot"
      ? " (1 lot)"
      : line.quantity > 1
        ? ` ×${line.quantity}`
        : "";
  const price = quoteLinePriced(line) ? " (published 2026 figure)" : " (to be quoted)";
  return `${line.name}${quantity}${detail ? ` — ${detail}` : ""}${price}`;
}

/**
 * Turn the basket into the single quote inquiry it submits. `sender` and
 * `consent` come from the send step (the family's own details); `notes` is
 * anything extra they typed. Every line keeps its own row:
 *   · `values.lines` — the structured rows the office board renders;
 *   · `values.service` — a concise subject ("Quote request — 3 items");
 *   · `values.notes`   — the family's own note only (the lines are structured).
 */
export function buildQuoteInquiry(
  lines: ReadonlyArray<QuoteLine>,
  sender: QuoteSender,
  options: { consent: boolean; notes?: string },
): QuoteSubmission {
  const lineInputs = lines.map(toQuoteLineInput);
  const summary =
    lineInputs.length === 0
      ? "Quote request"
      : `Quote request — ${lineInputs.length} ${lineInputs.length === 1 ? "item" : "items"}`;
  const extra = (options.notes ?? "").trim();
  return {
    values: {
      full_name: sender.full_name.trim(),
      email: sender.email.trim(),
      phone: sender.phone.trim(),
      service: summary,
      preferred_date: "",
      notes: extra,
      consent: options.consent,
      lines: lineInputs,
    },
    summary,
    lines: lineInputs,
    lineCount: lineInputs.length,
  };
}
