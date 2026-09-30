import type { Inquiry, InquiryLine } from "@/lib/api-client/crm";
import {
  validateContact,
  validateQuote,
  type ContactValues,
  type QuoteValues,
} from "@/lib/public-forms/validation";

/**
 * Inquiry intake — turning a form submission into the board's inquiry row.
 *
 * WHY THIS IS ITS OWN MODULE. The same mapping used to live in
 * `lib/demo-inquiry-captures.ts`, a BROWSER module, because the submission never left
 * the browser. Now that the request is posted to the server
 * (`app/api/inquiries/route.ts`) the mapping has to run on BOTH sides: the client to
 * show a field-level error before it posts, the server to be the veto. This module is
 * pure and dependency-free, so both can import it — the same reason
 * `lib/public-forms/validation.ts` is shaped that way.
 *
 * WHAT IT DOES NOT DO. It does not mint an id or a reference, and it does not persist
 * anything; `lib/api-client/inquiry-store.ts` owns those. It only reads untrusted input
 * field by field and composes the one row the office reads.
 */

/** The four facts the client's minutes asked the Request-for-Quote form to record. */
export type InquiryIntake = {
  full_name: string;
  email: string;
  phone: string;
  source: Inquiry["source"];
  topic: string;
  message: string;
  assigned_to: string;
  /** Structured quote lines, when the submission was a basket (D6-A). */
  lines?: InquiryLine[];
};

/** Read one string field, coercing anything that is not a string to "". */
function str(raw: Record<string, unknown>, key: string): string {
  const value = raw[key];
  return typeof value === "string" ? value : "";
}

function bool(raw: Record<string, unknown>, key: string): boolean {
  return raw[key] === true;
}

function asRecord(raw: unknown): Record<string, unknown> {
  return typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
}

/** One structured quote line, read field by field from untrusted input. */
function readQuoteLine(raw: unknown): InquiryLine | null {
  const r = asRecord(raw);
  const sku = str(r, "sku").trim();
  const name = str(r, "name").trim();
  if (!sku || !name) return null;
  const quantity = Number(r.quantity);
  const pricingMode = r.pricingMode === "published" ? "published" : "on_request";
  const cents = Number(r.unitPriceCents);
  const unitPriceCents =
    pricingMode === "published" && Number.isInteger(cents) && cents >= 0 ? cents : null;
  const currency = pricingMode === "published" ? str(r, "currency") || "PHP" : null;
  const detail = str(r, "detail").trim();
  const dateRange = str(r, "dateRange").trim();
  return {
    sku,
    name,
    kind: str(r, "kind").trim() || "service",
    pricingMode,
    unitPriceCents,
    currency,
    quantity: Number.isInteger(quantity) ? Math.min(Math.max(quantity, 1), 99) : 1,
    ...(detail ? { detail } : {}),
    ...(dateRange ? { dateRange } : {}),
  };
}

/** Every structured line in a posted basket, clamped to a sane count. */
function readQuoteLines(raw: unknown): InquiryLine[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const lines = raw
    .map(readQuoteLine)
    .filter((line): line is InquiryLine => line !== null)
    .slice(0, 200);
  return lines.length > 0 ? lines : undefined;
}

/**
 * Tolerant reader for a posted quote form. Nothing is trusted: a missing field becomes
 * an empty string so the validator can refuse it with the office's own wording, rather
 * than the route throwing on a shape it did not expect.
 */
export function readQuoteValues(raw: unknown): QuoteValues {
  const r = asRecord(raw);
  const lines = readQuoteLines(r.lines);
  return {
    full_name: str(r, "full_name"),
    email: str(r, "email"),
    phone: str(r, "phone"),
    service: str(r, "service"),
    preferred_date: str(r, "preferred_date"),
    notes: str(r, "notes"),
    consent: bool(r, "consent"),
    ...(lines ? { lines } : {}),
  };
}

export function readContactValues(raw: unknown): ContactValues {
  const r = asRecord(raw);
  return {
    full_name: str(r, "full_name"),
    email: str(r, "email"),
    phone: str(r, "phone"),
    message: str(r, "message"),
    consent: bool(r, "consent"),
  };
}

/** The staff counter's own "log a call or walk-in" row. */
export type LogValues = {
  full_name: string;
  email: string;
  phone: string;
  source: Inquiry["source"];
  topic: string;
  message: string;
  assigned_to: string;
};

export function readLogValues(raw: unknown): LogValues {
  const r = asRecord(raw);
  const source = str(r, "source");
  return {
    full_name: str(r, "full_name"),
    email: str(r, "email"),
    phone: str(r, "phone"),
    source: (source || "phone") as Inquiry["source"],
    topic: str(r, "topic"),
    message: str(r, "message"),
    assigned_to: str(r, "assigned_to"),
  };
}

/** First line of a message, clamped — the board's one-line topic. */
function firstLineTopic(message: string, fallback: string): string {
  const line = message.split(/\r?\n/, 1)[0]?.trim() ?? "";
  if (!line) return fallback;
  return line.length > 80 ? `${line.slice(0, 79)}…` : line;
}

/**
 * The public CONTACT form's row: the visitor's message is the substance, so its first
 * line becomes the topic and the whole text stays in `message`.
 */
export function contactInquiryInput(values: ContactValues): InquiryIntake {
  const message = values.message.trim();
  return {
    full_name: values.full_name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    source: "website",
    topic: firstLineTopic(message, "Website enquiry"),
    message,
    assigned_to: "Unassigned",
  };
}

/**
 * The QUOTE basket's row (D6-A, 2026-09-30). The board renders one row per
 * structured line; the `topic` is concise ("Quote request — 3 items") and the
 * `message` carries only the family's own note. The polite reader in
 * `lib/api-client/crm.ts` documents why `lines` is provisional.
 */
export function quoteInquiryInput(values: QuoteValues): InquiryIntake {
  const requirements = values.notes.trim();
  const lines = values.lines ?? [];
  const topic =
    lines.length > 0
      ? `Quote request — ${lines.length} ${lines.length === 1 ? "item" : "items"}`
      : values.service.trim() || "Quote request";
  const messageParts: string[] = [];
  if (requirements) messageParts.push(requirements);
  return {
    full_name: values.full_name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    source: "website",
    topic,
    message: messageParts.join("\n\n"),
    assigned_to: "Unassigned",
    ...(lines.length > 0 ? { lines } : {}),
  };
}

/** The staff counter's row, unchanged except that it is now persisted server-side. */
export function logInquiryInput(values: LogValues): InquiryIntake {
  return {
    full_name: values.full_name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    source: values.source,
    topic: values.topic.trim() || "Front-desk enquiry",
    message: values.message.trim(),
    assigned_to: values.assigned_to.trim() || "Unassigned",
  };
}

/** Which form a submission came from. */
export type InquiryKind = "quote" | "contact" | "log";

/**
 * Validates one posted submission and composes its row. The ONE reading of "is this
 * complete", shared by the browser (for field feedback) and the route (as the veto) —
 * and it reuses the public-forms validators rather than restating their rules.
 */
export function readInquirySubmission(
  kind: InquiryKind,
  raw: unknown,
): { ok: true; intake: InquiryIntake } | { ok: false; errors: Record<string, string> } {
  if (kind === "quote") {
    const values = readQuoteValues(raw);
    const errors = validateQuote(values);
    if (Object.keys(errors).length > 0) return { ok: false, errors };
    return { ok: true, intake: quoteInquiryInput(values) };
  }
  if (kind === "contact") {
    const values = readContactValues(raw);
    const errors = validateContact(values);
    if (Object.keys(errors).length > 0) return { ok: false, errors };
    return { ok: true, intake: contactInquiryInput(values) };
  }
  const values = readLogValues(raw);
  const errors: Record<string, string> = {};
  // The board's own counter rule, unchanged: a name, a number the office can call back
  // on, and what the call was about. Staff may log a message without an email.
  if (!values.full_name.trim()) errors.full_name = "Enter the name of the person who called or visited.";
  if (!values.phone.trim()) errors.phone = "Enter the contact number the office can call back on.";
  if (!values.topic.trim()) errors.topic = "Enter what the enquiry was about.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, intake: logInquiryInput(values) };
}
