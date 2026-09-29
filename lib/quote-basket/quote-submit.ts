import type { QuoteValues } from "@/lib/public-forms/validation";
import type { QuoteLine, QuoteSender } from "@/lib/quote-basket/quote-basket-context";

/**
 * Composing the ONE inquiry a quote basket submits — the pure half, so the
 * multi-line behaviour is unit-testable without a browser.
 *
 * The office takes inquiries, not orders: the basket's lines become a single
 * Request-for-Quote (`POST /api/inquiries`, kind "quote") with every line named
 * in the service summary and spelled out in the notes. Nothing here is a price
 * claim and nothing reserves anything — the office confirms every quote by hand,
 * exactly as the single-item quote form always said.
 *
 * A line whose figure is not published (a service the sheets only quote, a lot
 * the office prices per plot) contributes NO amount; the summary says so.
 */
export type QuoteSubmission = {
  values: QuoteValues;
  /** One line naming every item (what the office board shows first). */
  summary: string;
  lineCount: number;
};

/** A one-line description of a line, with its published figure when it has one. */
export function quoteLineSummary(line: QuoteLine): string {
  const detail = line.detail?.trim();
  const quantity = line.booking
    ? ""
    : line.itemType === "lot"
      ? " (1 lot)"
      : line.quantity > 1
        ? ` ×${line.quantity}`
        : "";
  return `${line.name}${quantity}${detail ? ` — ${detail}` : ""}`;
}

/**
 * Turn the basket into the single quote inquiry it submits. `sender` and
 * `consent` come from the send step (the family's own details); `notes` is
 * anything extra they typed. Multi-line baskets keep every line:
 *   · `service` — the items, joined, so the office sees the whole ask first;
 *   · `notes`   — each line on its own row, then the family's own note.
 */
export function buildQuoteInquiry(
  lines: ReadonlyArray<QuoteLine>,
  sender: QuoteSender,
  options: { consent: boolean; notes?: string },
): QuoteSubmission {
  const listed = lines.map(quoteLineSummary);
  const dated = lines.find((line) => line.preferredDate)?.preferredDate ?? "";
  const summary =
    listed.length === 0
      ? "Quote basket"
      : listed.length <= 2
        ? listed.join(" · ")
        : `Quote basket (${listed.length} items): ${listed.join(" · ")}`;
  const rows = listed.map((entry, index) => `${index + 1}. ${entry}`).join("\n");
  const extra = (options.notes ?? "").trim();
  return {
    values: {
      full_name: sender.full_name.trim(),
      email: sender.email.trim(),
      phone: sender.phone.trim(),
      service: summary,
      preferred_date: dated,
      notes: extra ? `${rows}\n\n${extra}` : rows,
      consent: options.consent,
    },
    summary,
    lineCount: listed.length,
  };
}
