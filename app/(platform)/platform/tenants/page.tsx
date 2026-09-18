import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  PlatformDeferredList,
  PlatformRequirementList,
  PlatformSampleNotice,
  PlatformServiceNote,
} from "@/components/platform/platform-ui";
import { loadPlatformTenants } from "@/lib/api-client/platform";
import {
  PLATFORM_DEFERRED,
  PLATFORM_SURFACE_ROBOTS,
  TENANT_PLAN_LABEL,
  TENANT_PLAN_NOTE,
  TENANT_PROVISIONING_REQUIREMENTS,
  TENANT_STATE_META,
  tenantTrialLine,
} from "@/lib/platform-admin";

export const metadata: Metadata = {
  title: "Tenant management",
  description:
    "The platform's tenant list with each business's state, plan and address — recorded sample records, read-only, and naming what provisioning requires.",
  robots: PLATFORM_SURFACE_ROBOTS,
};

// The list reads the recorded tenant store per request so a future tenancy
// service branch is never served from a build-time snapshot.
export const dynamic = "force-dynamic";

/**
 * Tenant management (PRD screen inventory "Platform Dashboard/Tenant
 * Management", classification `docs/02-architecture/platform-administration.md`).
 *
 * READ-ONLY, AND SAYING SO: the tenancy service owns provisioning, and this
 * screen cannot create, suspend or delete a tenant. It shows each tenant's
 * recorded state, plan and address, opens one tenant's detail, and names what
 * the platform must provide (the provisioning requirements) and what is
 * deferred upstream.
 *
 * THE SAMPLES FLOOR: the records are marked samples and the reader refuses an
 * unmarked row (`lib/api-client/platform.ts`), so this table can never show a
 * business that might be mistaken for a real customer.
 */
export default async function PlatformTenantsPage() {
  const tenants = await loadPlatformTenants();

  return (
    <div className="platform-page">
      <header className="platform-hero">
        <p className="platform-hero__eyebrow">Tenant management</p>
        <h1>Tenants</h1>
        <p className="platform-hero__lead">Every funeral business on the platform and its state.</p>
      </header>

      <div className="platform-grid">
        <div className="platform-stack">
          <PlatformSampleNotice />
          <p className="platform-card-note">
            Read-only: the tenancy service owns provisioning, and this screen cannot create,
            suspend or delete a tenant.
          </p>

          <div className="table-wrapper" tabIndex={0} aria-label="Recorded sample tenants">
            <table className="table platform-table">
              <caption>Recorded sample tenants — the tenancy service owns the real list.</caption>
              <thead>
                <tr>
                  <th scope="col">Business</th>
                  <th scope="col">State</th>
                  <th scope="col">Plan</th>
                  <th scope="col">Address</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => {
                  const meta = TENANT_STATE_META[tenant.state];
                  return (
                    <tr key={tenant.id}>
                      <td>
                        <span className="platform-table__name">{tenant.name}</span>
                        <span className="platform-table__sub">{tenant.subdomain}</span>
                      </td>
                      <td>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        <span className="platform-table__sub">
                          {tenantTrialLine(tenant)}
                        </span>
                      </td>
                      <td>
                        <span>{TENANT_PLAN_LABEL}</span>
                        <span className="platform-table__sub">Paid plans deferred</span>
                      </td>
                      <td>
                        <span className="platform-table__mono">{tenant.hostname}</span>
                      </td>
                      <td>
                        <Link
                          className="platform-table__link"
                          href={`/platform/tenants/${tenant.id}`}
                        >
                          View tenant
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="platform-stack">
          <PlatformServiceNote />
          <PlatformRequirementList
            id="tenant-provisioning-requirements"
            heading="What provisioning a tenant would require"
            items={TENANT_PROVISIONING_REQUIREMENTS}
          />
          <PlatformDeferredList
            id="platform-deferred"
            heading="Deferred upstream"
            items={PLATFORM_DEFERRED}
            note={TENANT_PLAN_NOTE}
          />
        </aside>
      </div>
    </div>
  );
}
