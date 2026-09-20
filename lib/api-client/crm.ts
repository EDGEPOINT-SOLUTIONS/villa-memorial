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
import inquiriesFile from "@/lib/fixtures/crm/inquiries.json";
import { ApiError } from "@/lib/api-client/api-error";

const BASE_URL = process.env.CRM_BASE_URL ?? "";

export function crmLiveModeEnabled(): boolean {
  return BASE_URL.length > 0;
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
};

type CustomerStore = {
  tenant_id: string;
  customers: Customer[];
  families: Family[];
};

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
  return store.customers.map((c) => ({ ...c }));
}

export async function getCustomer(
  id: string,
): Promise<{ customer: Customer; family: Family | null }> {
  refuseWhenLive();
  const store = customersFile as unknown as CustomerStore;
  const customer = store.customers.find((c) => c.id === id);
  if (!customer) {
    throw new ApiError("not_found", 404);
  }
  const family =
    customer.family_id != null
      ? (store.families.find((f) => f.id === customer.family_id) as Family | undefined) ??
        null
      : null;
  return { customer: { ...customer }, family };
}

export async function listInquiries(): Promise<Inquiry[]> {
  refuseWhenLive();
  return (inquiriesFile.inquiries as unknown as Inquiry[]).map((i) => ({ ...i }));
}
