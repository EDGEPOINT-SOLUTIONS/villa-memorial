/**
 * The public "request order" seam — how a price-list item that a visitor cannot
 * simply buy online (a lot, a plan term, a senior rate) reaches the office.
 *
 * The repo has no orders/enquiries write contract, so a request reuses the
 * existing public contact capture (app/(public)/contact + its validation and
 * Data Privacy Act consent). A link anywhere on the storefront builds a URL
 * carrying WHAT was clicked — item name, catalogue SKU, the published figure —
 * and the contact page parses it into the form's subject and message:
 *
 *   /contact?item=White+Rose+Half+casket&sku=CSK-WHITE-ROSE-HALF&price=₱62,000.00
 *
 * Rules:
 *  - What the visitor sees on the form must be exactly what they clicked, so the
 *    three params are echoed unchanged (trimmed/clamped) and never re-derived.
 *  - Requesting is an enquiry, never a reservation or a purchase; copy built here
 *    says so and the capture confirmation repeats it.
 *  - Params are untrusted input: absent/empty params → null (no banner), and
 *    over-long values are clamped before they reach the message.
 */

export type RequestPrefill = {
  /** The item exactly as the storefront named it. */
  item: string;
  /** The catalogue SKU, when the item is a catalogue entry. */
  sku?: string;
  /** The published 2026 figure, formatted for display (never parsed). */
  price?: string;
  /** Extra context (the unit, the senior condition, "does not reserve"…). */
  note?: string;
};

/** The route that captures requests (it stores the enquiry for the staff board). */
export const REQUEST_PATH = "/contact";

/**
 * The route that captures Request-for-Quote enquiries (the funeral-service
 * surfaces send visitors here). Same prefill grammar as a storefront request,
 * but no published amount: a service price is quoted, never shown.
 */
export const QUOTE_PATH = "/quote";

const MAX_ITEM = 140;
const MAX_SKU = 60;
const MAX_PRICE = 60;
const MAX_NOTE = 200;

function clamp(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function first(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

/** Build the request URL for an item (used by every storefront action link). */
export function buildRequestHref(
  prefill: RequestPrefill,
  base: string = REQUEST_PATH,
): string {
  const query = new URLSearchParams();
  query.set("item", clamp(prefill.item, MAX_ITEM));
  if (prefill.sku) query.set("sku", clamp(prefill.sku, MAX_SKU));
  if (prefill.price) query.set("price", clamp(prefill.price, MAX_PRICE));
  if (prefill.note) query.set("note", clamp(prefill.note, MAX_NOTE));
  return `${base}?${query.toString()}`;
}

/**
 * Build the Request-for-Quote URL for a funeral-service line. It carries WHAT
 * the visitor asked about (the service, and its catalogue SKU when one exists)
 * so the quote form opens on that service — never a price, because the office
 * quotes the service.
 */
export function buildQuoteHref(prefill: Omit<RequestPrefill, "price">): string {
  return buildRequestHref({ item: prefill.item, sku: prefill.sku, note: prefill.note }, QUOTE_PATH);
}

type SearchParamsLike =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

/**
 * Tolerant reader for the request params (search params, or Next's page
 * `searchParams`). Returns null when there is no item to ask about, so an
 * ordinary /contact visit renders the plain form.
 */
export function parseRequestPrefill(params: SearchParamsLike | undefined): RequestPrefill | null {
  if (!params) return null;
  const read = (key: string): string | undefined => first(
    params instanceof URLSearchParams ? params.get(key) ?? undefined : params[key],
  );

  const item = read("item");
  if (!item || !item.trim()) return null;

  const prefill: RequestPrefill = { item: clamp(item, MAX_ITEM) };
  const sku = read("sku");
  if (sku?.trim()) prefill.sku = clamp(sku, MAX_SKU);
  const price = read("price");
  if (price?.trim()) prefill.price = clamp(price, MAX_PRICE);
  const note = read("note");
  if (note?.trim()) prefill.note = clamp(note, MAX_NOTE);
  return prefill;
}

/**
 * The message the visitor finds waiting in the contact form — a plain enquiry
 * that names the item, its SKU and the figure they clicked, and asks the office
 * to confirm. Never claims a reservation.
 */
export function requestMessage(prefill: RequestPrefill): string {
  const lines = [
    "I would like to request an order for:",
    `• ${prefill.item}${prefill.sku ? ` (${prefill.sku})` : ""}`,
  ];
  if (prefill.price) lines.push(`• Published 2026 price: ${prefill.price}`);
  if (prefill.note) lines.push(`• ${prefill.note}`);
  lines.push(
    "",
    "Please contact me to confirm availability, the final price and the next steps. I understand this request does not reserve the item.",
  );
  return lines.join("\n");
}
