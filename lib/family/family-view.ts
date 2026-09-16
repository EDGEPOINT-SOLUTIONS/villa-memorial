/**
 * Pure family-portal view logic — the parts of the approved design that must be
 * testable without a browser or a service.
 *
 * Everything here is DERIVED from what the family snapshot actually carries
 * (name, life dates, plan summary, balance, recent documents). Nothing is
 * invented: where a design block needs data that does not exist yet, the module
 * says so through `FAMILY_SOURCES_MISSING` and the page renders the honest
 * "not wired yet" state instead of a plausible fake.
 *
 * Money rule (repo-wide, frozen): display strings from fixtures/APIs are shown
 * as-is and NEVER parsed. Amounts therefore come from the fixture's integer
 * minor units (`balance_cents`), and a fixture-contract test pins that the
 * display strings and the integers agree.
 */
import type { FamilySnapshot } from "@/lib/api-client/family";

/** The five bands of the "what needs me now" ladder, highest first. */
export type FamilyNeedKind = "action" | "due" | "next" | "ready" | "memory";

export type FamilyNeed = {
  id: string;
  kind: FamilyNeedKind;
  /** The band's small label, e.g. "Waiting on you". */
  band: string;
  title: string;
  detail: string;
  action: { label: string; href: string };
  quiet?: { label: string; href: string };
};

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

/**
 * Design blocks whose data does not exist yet. Rendered on the page as an
 * honest note (never as a fake card) and listed here so a test can hold the
 * line: when one of these becomes real, it must be removed from this list.
 */
export const FAMILY_SOURCES_MISSING = [
  "the funeral schedule (viewing, service, interment times)",
  "the case progress stages",
  "your balance's payment history and receipts",
  "memorial pages and tributes",
  "requests, appointments and support tickets",
] as const;

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

const BAND_LABEL: Record<FamilyNeedKind, string> = {
  action: "Waiting on you",
  due: "Money that matters now",
  next: "Happening next",
  ready: "Ready for you",
  memory: "Remembering",
};

function band(kind: FamilyNeedKind): string {
  return BAND_LABEL[kind];
}

/**
 * Format integer minor units as a peso amount for display. This is presentation
 * only and never re-parses a display string.
 */
export function pesoFromCents(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error("amounts must be non-negative integer minor units");
  }
  const whole = Math.floor(cents / 100);
  return `₱${whole.toLocaleString("en-PH")}`;
}

/** Share of a plan paid, 0–100, from integer minor units. Display only. */
export function paidPercent(totalCents: number, paidCents: number): number {
  if (!Number.isInteger(totalCents) || totalCents <= 0) return 0;
  const pct = Math.round((paidCents / totalCents) * 100);
  return Math.max(0, Math.min(100, pct));
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
 * The "what needs me now" feed — derived from the snapshot only, in the design's
 * band order. When nothing in the snapshot needs the family, the feed is empty
 * and Home says so in one calm sentence (design §"Nothing new is a state").
 */
export function buildFamilyNeeds(snapshot: FamilySnapshot): FamilyNeed[] {
  const needs: FamilyNeed[] = [];
  const remaining = snapshot.balance_cents?.remaining ?? 0;
  const nextDue = snapshot.plan_summary.next_due;

  if (remaining > 0) {
    needs.push({
      id: "balance",
      kind: "due",
      band: band("due"),
      title: `${pesoFromCents(remaining)} is still open on ${snapshot.plan_summary.plan_name}`,
      detail: `Next due ${nextDue}. It can be paid in parts — tell us if the timing is hard and we will arrange it.`,
      action: { label: "See how to pay", href: "/client/payments" },
      quiet: { label: "Talk to us first", href: "/client/support" },
    });
  }

  const docs = snapshot.recent_documents ?? [];
  if (docs.length > 0) {
    needs.push({
      id: "documents",
      kind: "ready",
      band: band("ready"),
      title:
        docs.length === 1
          ? `${docs[0].title} is ready for your family`
          : `${docs.length} papers are ready for your family`,
      detail:
        "Receipts and contracts we have issued for your family. You can open or download them whenever you need them.",
      action: { label: "Open the papers", href: "/client/documents" },
    });
  }

  // Design rule: at most three cards, highest band first (the array is already
  // built in band order).
  return needs.slice(0, 3);
}
