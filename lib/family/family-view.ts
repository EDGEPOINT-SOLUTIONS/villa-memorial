/**
 * Pure family-portal view logic — the parts of the approved design that must be
 * testable without a browser or a service.
 *
 * Everything here is DERIVED from what the family snapshot actually carries
 * (name, life dates, plan summary, balance, recent documents). Nothing is
 * invented: where a design block needs data that does not exist yet, the page
 * renders the honest "not wired yet" state instead of a plausible fake.
 *
 * Money rule (repo-wide, frozen): display strings from fixtures/APIs are shown
 * as-is and NEVER parsed. The only amount arithmetic here is the paid share
 * from the fixture's integer minor units (`balance_cents`), and a
 * fixture-contract test pins that the display strings and the integers agree.
 *
 * The workspace records (`FamilyRequest`, `FamilyAppointment`) carry the office's
 * own dates and instants, so the label helpers below are the ONE way a family
 * screen prints a day: calendar dates format in UTC (deterministic), instants
 * format in Asia/Manila (the park's own time), and the fixture's recorded labels
 * are pinned to both by tests/fixture-contract/family-workspace.test.ts.
 */
import type { FamilyAppointmentState, FamilyRequestState } from "@/lib/api-client/family";

/** Family-facing document words for the raw status a record carries. */
export type FamilyDocTone = "success" | "warning" | "info" | "neutral" | "danger";

export type FamilyDocumentView = {
  title: string;
  /** The status in a family's words. */
  status: string;
  tone: FamilyDocTone;
  /** One line telling the family what happens next, when we know. */
  note: string;
};

/** The words a family never sees. A unit test walks every family page's copy. */
export const FAMILY_JARGON = [
  "AR aging",
  "aging bucket",
  "delinquen",
  "delinquent",
  "forfeit",
  "liquidated damages",
  "applicant",
  "utilisation",
  "utilization",
  "KPI",
  "ledger",
  "reconciliation",
  "SLA",
  "ticket status",
  "no-show",
  "remains transfer",
  "chattel",
  "dunning",
] as const;

/** Share of a plan paid, 0–100, from integer minor units. Display only. */
export function paidPercent(totalCents: number, paidCents: number): number {
  if (!Number.isInteger(totalCents) || totalCents <= 0) return 0;
  const pct = Math.round((paidCents / totalCents) * 100);
  return Math.max(0, Math.min(100, pct));
}

/**
 * The same share said in words — “almost half”, never “48%”. The bar supports
 * the sentence; it never replaces it.
 */
export function percentWords(percent: number): string {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  if (pct <= 0) return "nothing yet";
  if (pct >= 100) return "paid in full";
  if (pct < 10) return "just started";
  if (pct < 50) return "almost half";
  if (pct === 50) return "half";
  if (pct < 90) return "more than half";
  return "almost finished";
}

const COUNT_WORDS = [
  "No",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
] as const;

/** Small counts in a family's words — “Two papers”, never “2 papers” (up to ten). */
export function countWord(count: number): string {
  return COUNT_WORDS[count] ?? String(count);
}

/**
 * Map a document status (the fixture's display words today; the frozen
 * `documents-api-v1` enum later) to a family's words + what happens next.
 * Unknown values degrade to a neutral, honest label rather than a raw code.
 */
export function familyDocumentView(title: string, rawStatus: string): FamilyDocumentView {
  const key = rawStatus.trim().toLowerCase();
  if (key === "generated" || key === "approved" || key === "ready") {
    return {
      title,
      status: "Ready",
      tone: "success",
      note: "You can open it here at any time.",
    };
  }
  if (key === "sent") {
    return {
      title,
      status: "Ready",
      tone: "success",
      note: "Send to us if a bank, SSS or an insurer asks for a copy.",
    };
  }
  if (key === "uploaded" || key === "pending_review") {
    return {
      title,
      status: "Being checked",
      tone: "warning",
      note: "We are looking at it — we will tell you if anything is missing.",
    };
  }
  if (key === "verified") {
    return { title, status: "Checked", tone: "success", note: "Checked by our team." };
  }
  if (key === "rejected") {
    return {
      title,
      status: "We need a clearer copy",
      tone: "danger",
      note: "Nothing is wrong — we just could not read this copy.",
    };
  }
  return {
    title,
    status: rawStatus || "On file",
    tone: "neutral",
    note: "On file with your family's records.",
  };
}

/**
 * The household name shown under the brand — presentation only, derived from
 * the loved one's recorded name (“Ernesto Dela Cruz” → “Dela Cruz family”).
 * Filipino surnames often carry two words (Dela Cruz, Del Rosario, San Juan),
 * so a three-word name keeps its last two; a two-word name keeps its last.
 * With no usable name the account holder's first name is used, then a plain
 * fallback — the chrome must never invent a name or break on a provisional
 * snapshot.
 */
export function familyHousehold(lovedOneName?: string | null, accountName?: string | null): string {
  const name = (lovedOneName ?? "").trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 3) return `${parts.slice(-2).join(" ")} family`;
    if (parts.length === 2) return `${parts[1]} family`;
    return `${parts[0]} family`;
  }
  const account = (accountName ?? "").trim().split(/\s+/).filter(Boolean);
  if (account.length > 0) return `${account[0]} family`;
  return "your family";
}

/* ------------------------------------------------------- days and instants --- */

const DAY_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
});
const MANILA_WEEKDAY_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Manila",
  weekday: "long",
});
const MANILA_DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Manila",
  day: "numeric",
  month: "long",
});
const MANILA_TIME_FORMAT = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/**
 * A calendar date (yyyy-mm-dd) the office wrote down — “12 September”. Calendar
 * dates are day-only records, so they format in UTC: the reader's timezone can
 * never shift a recorded day. Unusable values render as a dash, never a broken
 * date and never a made-up one.
 */
export function familyDayLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "—" : DAY_FORMAT.format(date);
}

/** A true instant in the park's own time — the weekday alone (“Tuesday”). */
export function familyInstantWeekday(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : MANILA_WEEKDAY_FORMAT.format(date);
}

/** The same instant's day and month — “22 September”. */
export function familyInstantDateLabel(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : MANILA_DATE_FORMAT.format(date);
}

/** The same instant's clock time — “10:00 AM”. */
export function familyInstantTimeLabel(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : MANILA_TIME_FORMAT.format(date);
}

/* ------------------------------------------------------------ the records ---- */

export type FamilyRequestView = {
  /** The state in a family's words. */
  label: string;
  /** True only for “waiting on you” — the warm chip, never a red alarm. */
  wait: boolean;
};

/** Where a request stands, in words a family would use. Unknown values never leak. */
export function familyRequestState(state: FamilyRequestState | string): FamilyRequestView {
  if (state === "waiting_on_you") return { label: "Waiting on you", wait: true };
  if (state === "done") return { label: "Done", wait: false };
  return { label: "With the office", wait: false };
}

/** A time is real only once a person confirmed it — the state is a sentence, not a colour. */
export function familyAppointmentState(state: FamilyAppointmentState | string): string {
  if (state === "confirmed") return "Confirmed by the office";
  if (state === "waiting") return "Waiting for the office";
  return "Happened";
}

/**
 * The initials a memorial shows before the family shares a photograph —
 * “Ernesto Dela Cruz” → “ED”, the approved design sample's own letters for
 * exactly this name (page-06-remembering: initials until the family is ready).
 * A single name keeps its one letter; no name gives an empty plate the page
 * simply does not render.
 */
export function monogram(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = [...parts[0]][0] ?? "";
  const second = parts.length > 1 ? [...parts[1]][0] ?? "" : "";
  return `${first}${second}`.toUpperCase();
}
