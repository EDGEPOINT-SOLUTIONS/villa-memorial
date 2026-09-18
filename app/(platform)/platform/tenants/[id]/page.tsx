import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  PlatformDeferredList,
  PlatformRequirementList,
  PlatformSampleNotice,
  PlatformServiceNote,
} from "@/components/platform/platform-ui";
import { getPlatformTenant } from "@/lib/api-client/platform";
import {
  PLATFORM_DEFERRED,
  PLATFORM_SURFACE_ROBOTS,
  TENANT_PLAN_LABEL,
  TENANT_PLAN_NOTE,
  TENANT_PROVISIONING_REQUIREMENTS,
  TENANT_STATE_META,
  tenantTrialLine,
} from "@/lib/platform-admin";

type TenantDetailParams = { params: Promise<{ id: string }> };

// The detail reads the recorded tenant store per request (same rationale as the
// list): a future live branch must never be served from a build-time snapshot.
export const dynamic = "force-dynamic";

/**
 * One tenant's detail (PRD screen inventory "Platform Dashboard/Tenant
 * Management"): its administrator, its subdomain, when it was provisioned, and
 * what provisioning a new tenant would require.
 *
 * READ-ONLY: no field here can be changed, and an id the recorded store does
 * not carry answers the ordinary not-found page — the platform does not
 * confirm that a business exists, the same privacy posture the memorial pages
 * take (a platform operator reaches the list first).
 */
export async function generateMetadata({ params }: TenantDetailParams): Promise<Metadata> {
  const { id } = await params;
  const tenant = await getPlatformTenant(id);
  return {
    title: tenant ? `${tenant.name} — tenant record` : "Tenant record",
    description:
      "One sample tenant record: state, plan, address, first administrator and what provisioning requires.",
    robots: PLATFORM_SURFACE_ROBOTS,
  };
}

export default async function PlatformTenantDetailPage({ params }: TenantDetailParams) {
  const { id } = await params;
  const tenant = await getPlatformTenant(id);
  if (!tenant) notFound();

  const meta = TENANT_STATE_META[tenant.state];

  return (
    <div className="platform-page">
      <p className="platform-crumb">
        <Link href="/platform/tenants">← All tenants</Link>
      </p>

      <header className="platform-hero">
        <p className="platform-hero__eyebrow">Tenant · sample record</p>
        <h1>{tenant.name}</h1>
        <p className="platform-hero__lead">
          One sample tenant, as the tenancy service would record it.
        </p>
      </header>

      <div className="platform-grid">
        <div className="platform-stack">
          <PlatformSampleNotice />

          <Card header={<h2>Tenant record</h2>}>
            <dl className="kv platform-kv">
                <div>
                  <dt>Business</dt>
                  <dd>{tenant.name}</dd>
                </div>
                <div>
                  <dt>Subdomain</dt>
                  <dd className="platform-kv__mono">{tenant.subdomain}</dd>
                </div>
                <div>
                  <dt>Address</dt>
                  <dd className="platform-kv__mono">{tenant.hostname}</dd>
                </div>
                <div>
                  <dt>State</dt>
                  <dd>
                    <Badge tone={meta.tone}>{meta.label}</Badge>{" "}
                    <span className="platform-kv__note">{meta.detail}</span>
                  </dd>
                </div>
                <div>
                  <dt>Trial</dt>
                  <dd>{tenantTrialLine(tenant)}</dd>
                </div>
                <div>
                  <dt>Trial ends</dt>
                  <dd>{tenant.trial_ends_on ?? "Not recorded"}</dd>
                </div>
                <div>
                  <dt>Plan</dt>
                  <dd>
                    {TENANT_PLAN_LABEL}
                    <span className="platform-kv__note">{TENANT_PLAN_NOTE}</span>
                  </dd>
                </div>
                <div>
                  <dt>Administrator</dt>
                  <dd>
                    {tenant.administrator.name}
                    <span className="platform-kv__mono">{tenant.administrator.email}</span>
                  </dd>
                </div>
                <div>
                  <dt>Provisioned on</dt>
                  <dd>{tenant.provisioned_on}</dd>
                </div>
              </dl>
          </Card>

          <p className="platform-card-note">
            Read-only: no field here can be changed, and no tenant can be created, suspended or
            deleted from this screen.
          </p>
        </div>

        <aside className="platform-stack">
          <PlatformServiceNote />
          <PlatformRequirementList
            id="tenant-provisioning-requirements"
            heading="What provisioning a new tenant would require"
            items={TENANT_PROVISIONING_REQUIREMENTS}
          />
          <PlatformDeferredList
            id="platform-deferred"
            heading="Deferred upstream"
            items={PLATFORM_DEFERRED}
          />
        </aside>
      </div>
    </div>
  );
}
