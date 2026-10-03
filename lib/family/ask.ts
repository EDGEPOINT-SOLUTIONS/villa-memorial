/**
 * Family plan & lot inquiries — the ONE reading of "what is this visitor asking
 * about", shared by the plan/lot surfaces that LINK to it, the gate page that
 * renders it and the BFF route that records it.
 *
 * WHY IT EXISTS. The captain's 2026-10-02 decision: a plan or a lot may only be
 * inquired about from a family account, and every such inquiry is tracked in the
 * family's own portal. An inquiry therefore needs an intent that can survive the
 * sign-in round trip — so the surfaces link to `/client/ask` carrying WHAT was
 * clicked, the gate page sends a signed-out visitor to the family sign-in with
 * that same URL as the return path, and the signed-in visitor's confirmation
 * records it against the account.
 *
 * THE PARAM NAMES ARE THE EXISTING REQUEST'S (`item` · `sku` · `price` · `note`),
 * so the long-standing `parseRequestPrefill` reader keeps working on these links;
 * this module ADDS `kind` (plan | lot) and `amount` (the published figure in
 * integer minor units, for the office board's line rendering). The `price` string
 * stays display text — never parsed (repo money rule).
 *
 * PURE AND DEPENDENCY-FREE, like `lib/inquiry-intake.ts`: the gate page imports it
 * as a Server Component and the BFF route imports it on the server, so a single
 * reading is the only reading.
 */
import type { InquiryIntake } from "@/lib/inquiry-intake";

/** The two surfaces the captain gates behind a family account. */
export const FAMILY_ASK_KINDS = ["plan", "lot"] as const;
export type FamilyAskKind = (typeof FAMILY_ASK_KINDS)[number];

/** The gate page. A signed-out visitor is returned here after signing in. */
export const FAMILY_ASK_PATH = "/client/ask";

/** One plan or lot inquiry, exactly as a price-list action carries it. */
export type FamilyAsk = {
  kind: FamilyAskKind;
  /** The item exactly as the surface named it. */
  item: string;
  /** The catalogue SKU, when the item carries one. */
  sku?: string;
  /** The published 2026 figure, formatted for display (never parsed). */
  price?: string;
  /** The same figure in integer minor units, for the office board's line. */
  amountCents?: number;
  /** Extra context ("Villa Memorial Plan enquiry", "nothing is reserved"…). */
  note?: string;
};

const MAX_ITEM = 140;
const MAX_SKU = 60;
const MAX_PRICE = 60;
const MAX_AMOUNT = 1_000_000_000_000; // ₱10 billion in centavos — far above any real figure
const MAX_NOTE = 200;
/** The family's own contact number, collected at the gate (2026-10-03). */
const MAX_PHONE = 40;

function clamp(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function first(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

/** Build the gate link for a plan or lot inquiry (used by every action link). */
export function familyAskHref(ask: FamilyAsk): string {
  const query = new URLSearchParams();
  query.set("kind", ask.kind);
  query.set("item", clamp(ask.item, MAX_ITEM));
  if (ask.sku) query.set("sku", clamp(ask.sku, MAX_SKU));
  if (ask.price) query.set("price", clamp(ask.price, MAX_PRICE));
  if (ask.amountCents != null && Number.isFinite(ask.amountCents)) {
    const amount = Math.max(0, Math.round(ask.amountCents));
    if (amount <= MAX_AMOUNT) query.set("amount", String(amount));
  }
  if (ask.note) query.set("note", clamp(ask.note, MAX_NOTE));
  return `${FAMILY_ASK_PATH}?${query.toString()}`;
}

type SearchParamsLike = URLSearchParams | Record<string, string | string[] | undefined>;

/**
 * The CONTACT the family leaves at the gate (captain, 2026-10-03).
 *
 * The family account is created with a display name and an email and no phone,
 * which is why two of the three sample enquiries could never become prospects.
 * The gate now asks for the number the office should call; it stays optional here
 * (the hard requirement is the case, where a person must be reachable), so a
 * family without a number can still ask.
 */
export type FamilyAskContact = { phone: string };

export function readFamilyAskContact(
  raw: unknown,
): { ok: true; phone: string } | { ok: false; errors: Record<string, string> } {
  const record = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const phone = typeof record.phone === "string" ? record.phone.trim() : "";
  if (phone.length > MAX_PHONE) {
    return { ok: false, errors: { phone: "That contact number is too long." } };
  }
  return { ok: true, phone };
}

/**
 * Tolerant reader for the gate link's params (a URLSearchParams or Next's page
 * `searchParams`). Returns null when there is no plan/lot to ask about, so the
 * gate page can show its honest "nothing to ask" state instead of an empty form.
 */
export function parseFamilyAsk(params: SearchParamsLike | undefined): FamilyAsk | null {
  if (!params) return null;
  const read = (key: string): string | undefined =>
    first(params instanceof URLSearchParams ? params.get(key) ?? undefined : params[key]);

  const kind = read("kind");
  if (kind !== "plan" && kind !== "lot") return null;
  const item = read("item");
  if (!item || !item.trim()) return null;

  const ask: FamilyAsk = { kind, item: clamp(item, MAX_ITEM) };
  const sku = read("sku");
  if (sku?.trim()) ask.sku = clamp(sku, MAX_SKU);
  const price = read("price");
  if (price?.trim()) ask.price = clamp(price, MAX_PRICE);
  const amount = read("amount");
  if (amount != null) {
    const cents = Number(amount);
    if (Number.isInteger(cents) && cents >= 0 && cents <= MAX_AMOUNT) ask.amountCents = cents;
  }
  const note = read("note");
  if (note?.trim()) ask.note = clamp(note, MAX_NOTE);
  return ask;
}

/** The words the gate page and the recorded row use for each kind. */
export function familyAskNoun(kind: FamilyAskKind, { title = false } = {}): string {
  if (kind === "plan") return title ? "Plan inquiry" : "plan";
  return title ? "Lot inquiry" : "lot";
}

/** The visible label the lot surfaces print for their one inquiry action. */
export const LOT_ASK_LABEL = "Ask about this lot";
/** The plan surfaces keep the wording the captain's plan page already ships. */
export const PLAN_ASK_LABEL = "Ask about this plan";

/**
 * The inquiry row an ask becomes: one structured line (so the office board
 * renders the item as a row, not a free-text blob), the person from the session
 * and the family's own note. The amount is published when the surface knew one,
 * and `on_request` otherwise — never invented.
 */
export function familyAskInquiryInput(
  ask: FamilyAsk,
  person: { full_name: string; email: string; phone: string },
): InquiryIntake {
  const detail = [ask.price, ask.note].filter((part): part is string => Boolean(part)).join(" · ");
  return {
    full_name: person.full_name.trim(),
    email: person.email.trim(),
    phone: person.phone.trim(),
    source: "website",
    topic: `${familyAskNoun(ask.kind, { title: true })} — ${ask.item}`,
    message: ask.note?.trim() ?? "",
    assigned_to: "Unassigned",
    lines: [
      {
        sku: ask.sku?.trim() || (ask.kind === "plan" ? "PLAN-INQUIRY" : "LOT-INQUIRY"),
        name: ask.item,
        kind: ask.kind,
        pricingMode: ask.amountCents != null ? "published" : "on_request",
        unitPriceCents: ask.amountCents ?? null,
        currency: ask.amountCents != null ? "PHP" : null,
        quantity: 1,
        ...(detail ? { detail } : {}),
      },
    ],
  };
}

/**
 * Validate an untrusted POST body (the confirmation form) into an ask. The body
 * carries the same fields the link did, so a tampered form is refused rather
 * than recorded.
 */
export function readFamilyAskSubmission(
  raw: unknown,
): { ok: true; ask: FamilyAsk } | { ok: false; errors: Record<string, string> } {
  const record = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const text = (key: string): string | undefined =>
    typeof record[key] === "string" ? (record[key] as string) : undefined;

  const kind = text("kind");
  if (kind !== "plan" && kind !== "lot") {
    return { ok: false, errors: { kind: "Choose a plan or a lot to ask about." } };
  }
  const item = text("item")?.trim() ?? "";
  if (!item) {
    return { ok: false, errors: { item: "There is nothing to ask about." } };
  }
  if (item.length > MAX_ITEM) {
    return { ok: false, errors: { item: "That item name is too long." } };
  }

  const ask: FamilyAsk = { kind, item };
  const sku = text("sku")?.trim();
  if (sku) {
    if (sku.length > MAX_SKU) return { ok: false, errors: { sku: "That SKU is too long." } };
    ask.sku = sku;
  }
  const price = text("price")?.trim();
  if (price) {
    if (price.length > MAX_PRICE) return { ok: false, errors: { price: "That price is too long." } };
    ask.price = price;
  }
  const amount = record.amountCents;
  if (amount != null) {
    const cents = Number(amount);
    if (!Number.isInteger(cents) || cents < 0 || cents > MAX_AMOUNT) {
      return { ok: false, errors: { amount: "That amount is not a valid figure." } };
    }
    ask.amountCents = cents;
  }
  const note = text("note")?.trim();
  if (note) {
    if (note.length > MAX_NOTE) return { ok: false, errors: { note: "That note is too long." } };
    ask.note = note;
  }
  return { ok: true, ask };
}
