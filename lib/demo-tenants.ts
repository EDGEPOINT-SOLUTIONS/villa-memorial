/**
 * Demo tenants for the tenant switcher (villa-memorial parity).
 *
 * ⚠ COSMETIC ONLY: switching changes the label shown to staff, mirroring the
 * villa demo. It does NOT change tenant context — identity/tenancy data is bound
 * to the signed-in tenant and a real switch needs the dev-authored tenancy
 * contract/session story. Flagged here so nobody mistakes it for real
 * multi-tenant switching.
 *
 * The product carries ONE tenant (Villa Memorial): the demo Loyola Gardens /
 * Golden Haven entries were removed 2026-09-21. `TenantSwitcher` renders
 * nothing while this list holds a single tenant — a one-option select is not a
 * switch.
 */
export type DemoTenant = {
  id: string;
  name: string;
  branch: string;
  facility: string;
};

export const DEMO_TENANTS: DemoTenant[] = [
  { id: "villa", name: "Villa Memorial", branch: "Isabela City", facility: "Main Chapel" },
];
