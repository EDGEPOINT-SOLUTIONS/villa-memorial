/**
 * Typed data access for Module A screens (customers · families · inquiries).
 *
 * ⚠️ NO frozen API contract exists for this domain yet (crm-families service is
 * unbuilt — cp1-day-plan Day 2 AM). Screens consume FIXTURES today through this
 * one seam. Shapes mirror docs/04-modules/crm-cases.md (blueprint §25–26) and the
 * platform-contracts plan's proposed C1 packet (not yet frozen).
 *
 * LIVE MODE IS UNIMPLEMENTED, and this module says so instead of lying: setting
 * `CRM_BASE_URL` selects live mode and every read refuses with a named 503
 * (`CRM_NOT_WIRED`). A service never answers a 501 "not wired", and reading a
 * proposed shape straight off a `fetch` would be the AGENTS.md tolerant-reader
 * trap. When Keb freezes the crm-families contract + OpenAPI spec, the live branch
 * is written here behind the same gate (a `toCustomer`/`toFamily`/`toInquiry`
 * reader over `getAuthedJson`, per `property.ts`) with no screen change.
 */
import customersFile from "@/lib/fixtures/crm/customers.json";
import { ApiError } from "@/lib/api-client/api-error";
import { listFixtureInquiries } from "@/lib/api-client/inquiry-store";
import { readShape } from "@/lib/contracts/validate";
import { liveModeEnabled } from "@/lib/live-mode";

/** Live mode is selected by `CRM_BASE_URL` through the one registry (`lib/live-mode.ts`). */
export function crmLiveModeEnabled(): boolean {
  return liveModeEnabled("crm");
}

export type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
  family_id: string | null;
  registered_at: string;
};

export type Family = {
  id: string;
  name: string;
  members: Array<{
    customer_id: string;
    relationship: string;
  }>;
};

/**
 * One line of a structured Request-for-Quote (D6-A, 2026-09-30).
 *
 * ⚠️ PROVISIONAL SHAPE — FLAGGED, NOT SNEAKED IN. No frozen crm-families
 * contract names a structured line. It is added here (and carried on the
 * inquiry) so the office board can render one row per line with a
 * "needs pricing" flag instead of one free-text blob, which was the recorded
 * defect (a 261-character topic and a 573-character message, no SKU, no price).
 * The polite reader (`lib/inquiry-intake.ts`) tolerates `lines` being absent on
 * every older/other inquiry, so nothing breaks if the platform declines it. The
 * contract ask is recorded in `docs/08-delivery/open-items.md`. If the frozen
 * shape differs, the live branch's `toInquiry` maps it — no screen change.
 */
export type InquiryLine = {
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

export type Inquiry = {
  id: string;
  reference: string;
  person: { full_name: string; email: string; phone: string };
  source:
    | "website"
    | "facebook"
    | "messenger"
    | "walk_in"
    | "referral"
    | "phone"
    | "agent"
    | "event"
    | "ads";
  topic: string;
  message: string;
  assigned_to: string;
  status: "new" | "contacted" | "qualified" | "converted" | "closed";
  received_at: string;
  /** Structured quote lines, when the inquiry is a basket submission (D6-A). */
  lines?: InquiryLine[];
};

type CustomerStore = {
  tenant_id: string;
  customers: Customer[];
  families: Family[];
};

/* ------------------------------ adapters ------------------------------- */

/**
 * The tolerant-reader seam (platform-contract pre-wire, P6). Fixture rows pass
 * through the SAME `toX` adapter a future live branch will use, so the recorded
 * shapes and the wire shapes cannot drift. The shared layer ignores extra keys and
 * fails a missing/wrong-typed required field with a 502 — never a cast.
 */
export function toCustomer(raw: unknown): Customer {
  const r = readShape(raw, "customer", [
    { key: "id", type: "string" },
    { key: "first_name", type: "string" },
    { key: "last_name", type: "string" },
    { key: "email", type: "string" },
    { key: "phone", type: "string" },
    { key: "status", type: "string" },
    { key: "family_id", type: "string", optional: true, nullable: true },
    { key: "registered_at", type: "string" },
  ]);
  return {
    id: r.id as string,
    first_name: r.first_name as string,
    last_name: r.last_name as string,
    email: r.email as string,
    phone: r.phone as string,
    status: r.status === "inactive" ? "inactive" : "active",
    family_id: (r.family_id as string | null | undefined) ?? null,
    registered_at: r.registered_at as string,
  };
}

export function toFamily(raw: unknown): Family {
  const r = readShape(raw, "family", [
    { key: "id", type: "string" },
    { key: "name", type: "string" },
    { key: "members", type: "array" },
  ]);
  const members = (Array.isArray(r.members) ? r.members : []).map((entry) => {
    const row = (entry ?? {}) as Record<string, unknown>;
    return {
      customer_id: String(row.customer_id ?? ""),
      relationship: String(row.relationship ?? ""),
    };
  });
  return { id: r.id as string, name: r.name as string, members };
}

export function toInquiry(raw: unknown): Inquiry {
  const r = readShape(raw, "inquiry", [
    { key: "id", type: "string" },
    { key: "reference", type: "string" },
    { key: "person", type: "object" },
    { key: "source", type: "string" },
    { key: "topic", type: "string" },
    { key: "message", type: "string" },
    { key: "assigned_to", type: "string" },
    { key: "status", type: "string" },
    { key: "received_at", type: "string" },
  ]);
  const person = (r.person ?? {}) as Record<string, unknown>;
  return {
    id: r.id as string,
    reference: r.reference as string,
    person: {
      full_name: String(person.full_name ?? ""),
      email: String(person.email ?? ""),
      phone: String(person.phone ?? ""),
    },
    source: r.source as Inquiry["source"],
    topic: r.topic as string,
    message: r.message as string,
    assigned_to: r.assigned_to as string,
    status: r.status as Inquiry["status"],
    received_at: r.received_at as string,
  };
}

/** The honest reason live mode refuses: no crm-families contract is frozen. */
export const CRM_NOT_WIRED =
  "live CRM is not wired: no crm-families contract is frozen yet (D3). " +
  "Fixture mode serves the office's recorded customers and enquiries.";

/**
 * Live mode has no crm-families contract to call yet, so refuse with a named 503
 * (the app's shape for a surface whose service does not exist) instead of a 501
 * a service would never return. Fixture mode is unaffected.
 */
function refuseWhenLive(): void {
  if (crmLiveModeEnabled()) {
    throw new ApiError(CRM_NOT_WIRED, 503);
  }
}

export async function listCustomers(): Promise<Customer[]> {
  refuseWhenLive();
  const store = customersFile as unknown as CustomerStore;
  return (store.customers as unknown[]).map(toCustomer);
}

export async function getCustomer(
  id: string,
): Promise<{ customer: Customer; family: Family | null }> {
  refuseWhenLive();
  const store = customersFile as unknown as CustomerStore;
  const raw = (store.customers as unknown[]).find(
    (c) => (c as { id?: unknown }).id === id,
  );
  if (!raw) {
    throw new ApiError("not_found", 404);
  }
  const customer = toCustomer(raw);
  const rawFamily =
    customer.family_id != null
      ? (store.families as unknown[]).find(
          (f) => (f as { id?: unknown }).id === customer.family_id,
        )
      : undefined;
  return { customer, family: rawFamily ? toFamily(rawFamily) : null };
}

/**
 * Every enquiry the office has: the recorded front-desk seed PLUS whatever has arrived
 * since, newest first.
 *
 * 2026-09-27: this read used to return the recorded fixture alone. The website's own
 * submissions never appeared, because they were written to the VISITOR'S BROWSER by
 * `lib/demo-inquiry-captures.ts` and this is a server read — so a family's
 * Request-for-Quote reached nobody. It now folds the durable journal
 * (`lib/api-client/inquiry-store.ts`), which is where `POST /api/inquiries` writes.
 */
export async function listInquiries(): Promise<Inquiry[]> {
  refuseWhenLive();
  return listFixtureInquiries();
}
