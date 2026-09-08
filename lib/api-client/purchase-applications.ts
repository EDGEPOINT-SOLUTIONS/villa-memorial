/**
 * Typed data access for the lot Purchase Application capture (Track B — FORMS_PLAN gap 2).
 *
 * ⚠️ There is NO frozen purchase-application contract: nothing under
 * `docs/08-delivery/contracts/` names an application record or a sale's financing terms,
 * and property-gis's frozen `lot.*` family (KEB-D3-01) stops at reserve/sell with an
 * owner name. The record this module reads and writes is therefore a fixture/demo shape
 * invented from Villa's papers (see `lib/contracts/purchase-application.ts`), stored
 * in-process exactly like the fixture-mode reservation overlay in `property.ts`.
 *
 * Live mode: because no service endpoint exists, live persistence is honestly
 * UNIMPLEMENTED — these functions answer 503 with the reason instead of pretending to
 * proxy. Capture demos run in fixture mode (the default: no PROPERTY_BASE_URL), which is
 * what FORMS_PLAN's "waits on dev" gate intends until the shape freezes.
 */
import appsFile from "@/lib/fixtures/property/purchase-applications.json";
import { ApiError } from "@/lib/api-client/api-error";
import { propertyLiveModeEnabled } from "@/lib/api-client/property";
import type {
  PurchaseApplication,
  PurchaseApplicationInput,
} from "@/lib/contracts/purchase-application";

const NOT_WIRED =
  "live purchase applications are not wired: no purchase-application contract is frozen " +
  "yet (FORMS_PLAN gap 2 — waits on dev). Fixture mode records demo applications in-process.";

type ApplicationStore = {
  tenant_id: string;
  applications: PurchaseApplication[];
};

/** Tolerant reader: missing optional fields read as null/empty, never crash. */
function toPurchaseApplication(raw: unknown): PurchaseApplication {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed purchase application", 502);
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.lot_id !== "string" || typeof r.application_date !== "string") {
    throw new ApiError("malformed purchase application", 502);
  }
  const str = (k: string): string => (typeof r[k] === "string" ? (r[k] as string) : "");
  const nullable = (k: string): string | null =>
    typeof r[k] === "string" && r[k] !== "" ? (r[k] as string) : null;
  const num = (k: string): number | null =>
    typeof r[k] === "number" && Number.isFinite(r[k]) ? (r[k] as number) : null;
  const beneficiaries = Array.isArray(r.beneficiaries)
    ? r.beneficiaries.map((entry) => {
        const row = (typeof entry === "object" && entry !== null ? entry : {}) as Record<
          string,
          unknown
        >;
        return {
          name: typeof row.name === "string" ? row.name : "",
          age: typeof row.age === "number" && Number.isInteger(row.age) ? row.age : null,
          relationship: typeof row.relationship === "string" ? row.relationship : "",
        };
      })
    : [];

  return {
    lot_id: r.lot_id,
    lot_number: str("lot_number"),
    application_date: r.application_date,
    last_name: str("last_name"),
    first_name: str("first_name"),
    middle_name: str("middle_name"),
    date_of_birth: nullable("date_of_birth"),
    civil_status: nullable("civil_status") as PurchaseApplication["civil_status"],
    gender: nullable("gender") as PurchaseApplication["gender"],
    religion: nullable("religion"),
    citizenship: nullable("citizenship"),
    contact_number: nullable("contact_number"),
    email: nullable("email"),
    tin: nullable("tin"),
    gsis_sss_number: nullable("gsis_sss_number"),
    alternative_contact_number: nullable("alternative_contact_number"),
    facebook_account: nullable("facebook_account"),
    address: nullable("address"),
    occupation: nullable("occupation"),
    employer: nullable("employer"),
    employer_address: nullable("employer_address"),
    employer_telephone: nullable("employer_telephone"),
    beneficiaries,
    classification: nullable("classification"),
    basic_price_cents: num("basic_price_cents"),
    total_contract_price_cents: num("total_contract_price_cents"),
    mcf_cents: num("mcf_cents"),
    vat_cents: num("vat_cents"),
    mode_of_payment: nullable("mode_of_payment") as PurchaseApplication["mode_of_payment"],
    amortization_value: num("amortization_value"),
    amortization_unit: nullable("amortization_unit") as PurchaseApplication["amortization_unit"],
    interment_funeral_bundle_inclusion: nullable(
      "interment_funeral_bundle_inclusion",
    ) as PurchaseApplication["interment_funeral_bundle_inclusion"],
    others_insurance: nullable("others_insurance"),
    dpa_consent: r.dpa_consent === true,
    dpa_consented_at: nullable("dpa_consented_at"),
    sales_agent_name: nullable("sales_agent_name"),
    created_at: str("created_at") || new Date().toISOString(),
    updated_at: str("updated_at") || new Date().toISOString(),
  };
}

/* ----------------------------- fixture mode ----------------------------- */

// Next.js compiles route handlers and screens into separate bundles, so demo mutations
// live on globalThis to be visible from both (same reasoning as property's reservation
// overlay and commerce's fixture order store).
type FixtureGlobal = typeof globalThis & {
  __imFixturePurchaseApplications?: Map<string, PurchaseApplication>;
};
const fixtureGlobal = globalThis as FixtureGlobal;
const savedApplications = (fixtureGlobal.__imFixturePurchaseApplications ??= new Map<
  string,
  PurchaseApplication
>());

function fixtureApplications(): PurchaseApplication[] {
  const store = appsFile as unknown as ApplicationStore;
  // The tolerant reader is the gate for fixture rows too — a malformed seed crashes
  // loudly at read time rather than surfacing as a half-shaped record on a screen.
  const seeded = store.applications.map((raw) => toPurchaseApplication(raw));
  const byLot = new Map<string, PurchaseApplication>();
  for (const app of seeded) byLot.set(app.lot_id, app);
  for (const [lotId, app] of savedApplications) byLot.set(lotId, app);
  return [...byLot.values()];
}

/** The application captured for a lot, or null when nobody has filled one in yet. */
export async function getPurchaseApplicationForLot(
  lotId: string,
): Promise<PurchaseApplication | null> {
  if (propertyLiveModeEnabled()) {
    throw new ApiError(NOT_WIRED, 503);
  }
  const found = fixtureApplications().find((a) => a.lot_id === lotId);
  return found ? { ...found, beneficiaries: found.beneficiaries.map((b) => ({ ...b })) } : null;
}

/**
 * Records (or updates) the purchase application for a lot. Fixture mode keeps a demo
 * copy in-process so the capture → agreement loop demos standalone; live persistence
 * waits on the dev freezing the application/sale shape — see the module header.
 */
export async function savePurchaseApplication(
  lotId: string,
  lotNumber: string,
  input: PurchaseApplicationInput,
): Promise<PurchaseApplication> {
  if (propertyLiveModeEnabled()) {
    throw new ApiError(NOT_WIRED, 503);
  }
  const existing = fixtureApplications().find((a) => a.lot_id === lotId);
  const now = new Date().toISOString();
  const record: PurchaseApplication = {
    ...input,
    beneficiaries: input.beneficiaries.map((b) => ({ ...b })),
    lot_id: lotId,
    lot_number: lotNumber,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  savedApplications.set(lotId, record);
  return { ...record, beneficiaries: record.beneficiaries.map((b) => ({ ...b })) };
}
