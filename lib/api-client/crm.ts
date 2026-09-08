/**
 * Typed data access for Module A screens (customers · families · inquiries).
 *
 * ⚠️ NO frozen API contract exists for this domain yet (crm-families service is
 * unbuilt — cp1-day-plan Day 2 AM). Screens consume FIXTURES today through this
 * one seam; when Keb freezes the D3 contract + OpenAPI spec, the live branch of
 * each function flips on via CRM_BASE_URL without touching any screen code.
 * Shapes mirror docs/04-modules/crm-cases.md (blueprint §25–26).
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

async function requireLive(): Promise<void> {
  // Live mode arrives with the D3 contract; until then this guard keeps the
  // seam honest instead of silently pretending fixtures are real.
  if (!crmLiveModeEnabled()) return;
  throw new ApiError("crm live client not wired yet", 501);
}

export async function listCustomers(): Promise<Customer[]> {
  await requireLive();
  const store = customersFile as unknown as CustomerStore;
  return store.customers.map((c) => ({ ...c }));
}

export async function getCustomer(
  id: string,
): Promise<{ customer: Customer; family: Family | null }> {
  await requireLive();
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
  await requireLive();
  return (inquiriesFile.inquiries as unknown as Inquiry[]).map((i) => ({ ...i }));
}
