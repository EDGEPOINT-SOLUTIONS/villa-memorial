import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { loadTenantSettingsView } from "@/lib/api-client/tenant-settings";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import {
  CONFIGURATION_STATE_LABEL,
  CONFIGURATION_STATE_TONE,
  SETTINGS_NOT_WIRED,
  SETTINGS_NOT_WIRED_NOTE,
  SETTINGS_NOT_WIRED_TITLE,
  type ConfigurationState,
} from "@/lib/tenant-settings";

export const metadata = { title: "Tenant settings — Admin Portal" };

/**
 * Tenant settings (S32) — this park's own configuration.
 *
 * READ-ONLY BY DESIGN: `tenancy-config` (the service that would own tenant
 * settings and module flags) is not in this build, so this screen reflects
 * configuration the product actually applies — the identity its public pages
 * publish, the business rules its modules enforce, what is configured versus
 * still waiting — and names in one line what only the platform can change. It
 * provisions nothing.
 */

function stateBadge(state: ConfigurationState) {
  return <Badge tone={CONFIGURATION_STATE_TONE[state]}>{CONFIGURATION_STATE_LABEL[state]}</Badge>;
}

export default async function SettingsPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["tenancy:tenants:manage"])) {
    return (
      <>
        <PageHeader eyebrow="Administration" title="Tenant settings" />
        <PageSection>
          <ForbiddenState requiredScopes={["tenancy:tenants:manage"]} />
        </PageSection>
      </>
    );
  }

  let view;
  try {
    view = await loadTenantSettingsView();
  } catch {
    return (
      <>
        <PageHeader eyebrow="Administration" title="Tenant settings" />
        <PageSection>
          <ErrorState message="Unable to load the recorded configuration." />
        </PageSection>
      </>
    );
  }

  const canEditContent = hasAnyScope(session.scopes, ["catalog:write"]);
  const stateOf = (key: string): ConfigurationState =>
    view.configuration.find((row) => row.key === key)?.state ?? "not_readable";

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Tenant settings"
        actions={<Badge tone="neutral">Read-only</Badge>}
      />

      <PageSection>
        <p className="text-md">How this park is configured, and what only the platform can change.</p>
        <div className="alert alert--warning">
          <div>
            <p>
              <strong>{SETTINGS_NOT_WIRED_TITLE}.</strong>
            </p>
            <p>{SETTINGS_NOT_WIRED}</p>
            <p className="mb-0">{SETTINGS_NOT_WIRED_NOTE}</p>
          </div>
        </div>
        <p className="mt-4 mb-0">
          <Link
            className="btn btn--secondary btn--sm"
            href={canEditContent ? "/staff/landing" : "/staff/dashboard"}
          >
            {canEditContent ? "Edit the published identity" : "Go to the dashboard"}
          </Link>
        </p>
      </PageSection>

      <PageSection>
        <div className="kpi-grid">
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Identity</span>
              <span className="kpi-card__value">{CONFIGURATION_STATE_LABEL[stateOf("identity")]}</span>
              <span className="kpi-card__sub">park name · lines · addresses</span>
            </span>
          </span>
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Rates</span>
              <span className="kpi-card__value">{CONFIGURATION_STATE_LABEL[stateOf("rates")]}</span>
              <span className="kpi-card__sub">from the client&rsquo;s 2026 sheets</span>
            </span>
          </span>
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Chapels</span>
              <span className="kpi-card__value">
                {CONFIGURATION_STATE_LABEL[stateOf("chapels")]}
              </span>
              <span className="kpi-card__sub">open client question</span>
            </span>
          </span>
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Platform-only</span>
              <span className="kpi-card__value">{view.platformOnly.length}</span>
              <span className="kpi-card__sub">account · subscription · modules</span>
            </span>
          </span>
        </div>
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">Identity the app publishes</h2>
        <p className="text-sm text-muted">
          Read from the landing content document; edited in Pages &amp; content.
        </p>
        <div className="table-wrapper" tabIndex={0}>
          <table className="table">
            <caption>What the public chrome and the contact surface currently show.</caption>
            <thead>
              <tr>
                <th scope="col">Setting</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>
              {view.identity.map((row) => (
                <tr key={row.key}>
                  <th scope="row">{row.label}</th>
                  <td>
                    {row.value ? (
                      row.href ? (
                        <a href={row.href}>{row.value}</a>
                      ) : (
                        row.value
                      )
                    ) : (
                      <span className="text-muted">Not set</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">Business rules the product applies</h2>
        <p className="text-sm text-muted">
          Every figure comes from the module that applies it — no rule is typed into this screen.
        </p>
        <div className="table-wrapper" tabIndex={0}>
          <table className="table">
            <caption>The rules in force today, with the sheet or contract they come from.</caption>
            <thead>
              <tr>
                <th scope="col">Rule</th>
                <th scope="col">What the product applies</th>
                <th scope="col">Comes from</th>
              </tr>
            </thead>
            <tbody>
              {view.rules.map((rule) => (
                <tr key={rule.key}>
                  <th scope="row">{rule.rule}</th>
                  <td>{rule.value}</td>
                  <td className="text-sm text-muted">{rule.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">Configured, still placeholder, or waiting</h2>
        <p className="text-sm text-muted">
          What the office edits, what is still a placeholder, and what waits on a service.
        </p>
        <div className="table-wrapper" tabIndex={0}>
          <table className="table">
            <caption>Every setting this screen can see, its state, and the recorded reason.</caption>
            <thead>
              <tr>
                <th scope="col">Setting</th>
                <th scope="col">State</th>
                <th scope="col">Basis</th>
              </tr>
            </thead>
            <tbody>
              {view.configuration.map((row) => (
                <tr key={row.key}>
                  <th scope="row">{row.setting}</th>
                  <td>{stateBadge(row.state)}</td>
                  <td className="text-sm">{row.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">Only the platform can change</h2>
        <p className="text-sm text-muted">
          These belong to the platform operator, not to this portal.
        </p>
        <div className="table-wrapper" tabIndex={0}>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Owner</th>
              </tr>
            </thead>
            <tbody>
              {view.platformOnly.map((entry) => (
                <tr key={entry.key}>
                  <th scope="row">{entry.item}</th>
                  <td className="text-sm">{entry.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>
    </>
  );
}
