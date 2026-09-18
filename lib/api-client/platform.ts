/**
 * Typed data access for the platform operator surface — the tenant list and
 * tenant detail screens (PRD screen inventory "Platform Dashboard/Tenant
 * Management"; classification `docs/02-architecture/platform-administration.md`).
 *
 * ⚠ NO TENANCY SERVICE OR CONTRACT EXISTS. The platform surface is not
 * tenant-scoped, platform admins are a separate identity type and sign-up
 * creates a tenant + its owner in one transaction — but none of that is built
 * in this repo, and this repository cannot provision a tenant. This client
 * therefore reads the recorded SAMPLE records
 * (`lib/fixtures/platform/tenants.json`, app-authored with provenance) and
 * offers no live branch to claim. `platformLiveModeEnabled()` is always false.
 *
 * THE SAMPLE FLOOR: the reader REFUSES a row that is not marked `sample: true`
 * — a fabricated tenant, plan or hostname must never reach a page, so the
 * guarantee lives at the read seam as well as in the fixture's contract test.
 * A malformed seed crashes loudly (500) instead of surfacing half-shaped rows.
 *
 * When a tenancy API freezes, this module gains a live branch and the fixture's
 * provenance header is replaced by contract references — the screens do not
 * change (their wording already names the platform's job).
 */
import tenantsFile from "@/lib/fixtures/platform/tenants.json";
import { ApiError } from "@/lib/api-client/api-error";
import {
  TENANT_PLANS,
  TENANT_STATES,
  type PlatformTenant,
  type TenantPlan,
  type TenantState,
} from "@/lib/platform-admin";

/** The records are app-authored samples, so there is no live branch to claim. */
export function platformLiveModeEnabled(): boolean {
  return false;
}

export const PLATFORM_NOT_WIRED =
  "no tenancy service or contract exists in this build; these screens read recorded sample " +
  "records and cannot provision, suspend or delete a tenant.";

/* -------------------------------- reader --------------------------------- */

function malformed(what: string): never {
  throw new ApiError(`malformed platform tenants fixture: ${what}`, 500);
}

function record(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null) malformed(what);
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim().length === 0) malformed(what);
  return value;
}

function nullableString(value: unknown, what: string): string | null {
  if (value === null) return null;
  return requiredString(value, what);
}

function nullableInteger(value: unknown, what: string): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value)) malformed(what);
  return value;
}

function tenantState(value: unknown, what: string): TenantState {
  if (typeof value !== "string" || !(TENANT_STATES as readonly string[]).includes(value)) {
    malformed(`${what} (unknown state)`);
  }
  return value as TenantState;
}

function tenantPlan(value: unknown, what: string): TenantPlan {
  if (typeof value !== "string" || !(TENANT_PLANS as readonly string[]).includes(value)) {
    malformed(`${what} (unknown plan)`);
  }
  return value as TenantPlan;
}

/** Field-by-field reader; extra fields are ignored, missing ones fail loudly. */
export function readPlatformTenants(raw: unknown): PlatformTenant[] {
  const root = record(raw, "tenants file");
  if (!Array.isArray(root.tenants)) malformed("tenants");

  return root.tenants.map((value, index) => {
    const row = record(value, `tenants[${index}]`);
    const id = requiredString(row.id, `tenants[${index}].id`);

    // The sample floor — see the module header. A record the platform has not
    // marked as a sample never reaches a screen.
    if (row.sample !== true) malformed(`${id} is not marked as a sample record`);

    const administrator = record(row.administrator, `${id}.administrator`);
    return {
      id,
      name: requiredString(row.name, `${id}.name`),
      subdomain: requiredString(row.subdomain, `${id}.subdomain`),
      hostname: requiredString(row.hostname, `${id}.hostname`),
      state: tenantState(row.state, `${id}.state`),
      plan: tenantPlan(row.plan, `${id}.plan`),
      trial_days_remaining: nullableInteger(
        row.trial_days_remaining,
        `${id}.trial_days_remaining`,
      ),
      trial_ends_on: nullableString(row.trial_ends_on, `${id}.trial_ends_on`),
      provisioned_on: requiredString(row.provisioned_on, `${id}.provisioned_on`),
      administrator: {
        name: requiredString(administrator.name, `${id}.administrator.name`),
        email: requiredString(administrator.email, `${id}.administrator.email`),
      },
      sample: true,
    };
  });
}

/** The tenant list, in the fixture's own order (the tenancy service's own order live). */
export async function loadPlatformTenants(): Promise<PlatformTenant[]> {
  return readPlatformTenants(tenantsFile as unknown);
}

/** One tenant, or null — the detail page renders not-found for an unknown id. */
export async function getPlatformTenant(id: string): Promise<PlatformTenant | null> {
  const tenants = await loadPlatformTenants();
  return tenants.find((tenant) => tenant.id === id) ?? null;
}

/** Whether the recorded rows are samples (they always are — the reader enforces it). */
export function platformRecordsAreSamples(): boolean {
  return true;
}
