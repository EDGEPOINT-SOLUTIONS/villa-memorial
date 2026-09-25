import Link from "next/link";
import {
  DataTable,
  StatCard,
  StatusChip,
  type DataTableColumn,
} from "@/components/kit";
import { PageHeader, PageSection } from "@/components/ui/page";
import { Alert } from "@/components/ui/alert";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { loadTenantSettingsView, type IdentityRow } from "@/lib/api-client/tenant-settings";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import {
  CONFIGURATION_STATE_LABEL,
  CONFIGURATION_STATE_TONE,
  SETTINGS_NOT_WIRED,
  SETTINGS_NOT_WIRED_NOTE,
  SETTINGS_NOT_WIRED_TITLE,
  type BusinessRule,
  type ConfigurationRow,
  type ConfigurationState,
  type PlatformOnlyItem,
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
 *
 * Layout renders through the component kit (`components/kit`) — the four tables
 * are `DataTable`, the tiles `StatCard`, the state chips `StatusChip`.
 */

const IDENTITY_COLUMNS: ReadonlyArray<DataTableColumn<IdentityRow>> = [
  { key: "setting", header: "Setting" },
  { key: "value", header: "Value" },
];

const RULE_COLUMNS: ReadonlyArray<DataTableColumn<BusinessRule>> = [
  { key: "rule", header: "Rule" },
  { key: "value", header: "What the product applies" },
  { key: "source", header: "Comes from", className: "text-sm text-muted" },
];

const CONFIGURATION_COLUMNS: ReadonlyArray<DataTableColumn<ConfigurationRow>> = [
  { key: "setting", header: "Setting" },
  { key: "state", header: "State" },
  { key: "basis", header: "Basis", className: "text-sm" },
];

const PLATFORM_COLUMNS: ReadonlyArray<DataTableColumn<PlatformOnlyItem>> = [
  { key: "item", header: "Item" },
  { key: "owner", header: "Owner", className: "text-sm" },
];

function stateBadge(state: ConfigurationState) {
  return (
    <StatusChip tone={CONFIGURATION_STATE_TONE[state]}>
      {CONFIGURATION_STATE_LABEL[state]}
    </StatusChip>
  );
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
        lead="How this park is configured, and what only the platform can change."
        actions={<StatusChip tone="neutral">Read-only</StatusChip>}
      />

      <PageSection>
        <Alert tone="warning">
          <p>
            <strong>{SETTINGS_NOT_WIRED_TITLE}.</strong>
          </p>
          <p>{SETTINGS_NOT_WIRED}</p>
          <p className="mb-0">{SETTINGS_NOT_WIRED_NOTE}</p>
        </Alert>
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
          <StatCard
            label="Identity"
            value={CONFIGURATION_STATE_LABEL[stateOf("identity")]}
            sub="park name · lines · addresses"
          />
          <StatCard
            label="Rates"
            value={CONFIGURATION_STATE_LABEL[stateOf("rates")]}
            sub={"from the client’s 2026 sheets"}
          />
          <StatCard
            label="Chapels"
            value={CONFIGURATION_STATE_LABEL[stateOf("chapels")]}
            sub="open client question"
          />
          <StatCard
            label="Platform-only"
            value={view.platformOnly.length}
            sub="account · subscription · modules"
          />
        </div>
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">Identity the app publishes</h2>
        <p className="text-sm text-muted">
          Read from the landing content document; edited in Pages &amp; content.
        </p>
        <DataTable<IdentityRow>
          columns={IDENTITY_COLUMNS}
          rows={view.identity}
          rowKey={(row) => row.key}
          rowHeader
          renderCell={(row, column) => {
            if (column.key !== "value") return row.label;
            return row.value ? (
              row.href ? (
                <a href={row.href}>{row.value}</a>
              ) : (
                row.value
              )
            ) : (
              <span className="text-muted">Not set</span>
            );
          }}
          caption={<>What the public chrome and the contact surface currently show.</>}
          emptyTitle="No identity recorded"
          emptyHint="Identity values appear here once the content document carries them."
        />
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">Business rules the product applies</h2>
        <p className="text-sm text-muted">
          Every figure comes from the module that applies it — no rule is typed into this screen.
        </p>
        <DataTable<BusinessRule>
          columns={RULE_COLUMNS}
          rows={view.rules}
          rowKey={(rule) => rule.key}
          rowHeader
          renderCell={(rule, column) => {
            switch (column.key) {
              case "rule":
                return rule.rule;
              case "value":
                return rule.value;
              case "source":
                return rule.source;
              default:
                return null;
            }
          }}
          caption={<>The rules in force today, with the sheet or contract they come from.</>}
          emptyTitle="No rules recorded"
          emptyHint="Rules appear here as the modules that enforce them are built."
        />
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">Configured, still placeholder, or waiting</h2>
        <p className="text-sm text-muted">
          What the office edits, what is still a placeholder, and what waits on a service.
        </p>
        <DataTable<ConfigurationRow>
          columns={CONFIGURATION_COLUMNS}
          rows={view.configuration}
          rowKey={(row) => row.key}
          rowHeader
          renderCell={(row, column) => {
            switch (column.key) {
              case "setting":
                return row.setting;
              case "state":
                return stateBadge(row.state);
              case "basis":
                return row.basis;
              default:
                return null;
            }
          }}
          caption={<>Every setting this screen can see, its state, and the recorded reason.</>}
          emptyTitle="Nothing to configure"
          emptyHint="Configuration rows appear here once the product holds them."
        />
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">Only the platform can change</h2>
        <p className="text-sm text-muted">
          These belong to the platform operator, not to this portal.
        </p>
        <DataTable<PlatformOnlyItem>
          columns={PLATFORM_COLUMNS}
          rows={view.platformOnly}
          rowKey={(entry) => entry.key}
          rowHeader
          renderCell={(entry, column) =>
            column.key === "item" ? entry.item : entry.owner
          }
          emptyTitle="No platform-only items"
          emptyHint="Items the platform owns appear here."
        />
      </PageSection>
    </>
  );
}
