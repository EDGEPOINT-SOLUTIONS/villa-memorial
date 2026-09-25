import Link from "next/link";
import {
  DataTable,
  StatusChip,
  type DataTableColumn,
} from "@/components/kit";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { Alert } from "@/components/ui/alert";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import {
  ACCESS_ROSTER_NOTE,
  ACCOUNT_STATE_NOTE,
  INVITE_NOT_WIRED,
  INVITE_PATH,
  PROVISIONING_NOT_WIRED,
  ROLE_MATRIX_NOTE,
  initialsOf,
  permissionCountLabel,
  type AccessAccount,
  type AccessRole,
} from "@/lib/access-control";
import { loadAccessControlRoster } from "@/lib/api-client/access-control";
import { hasAnyScope } from "@/lib/rbac/nav";
import { grantsByGroup } from "@/lib/rbac/scope-vocabulary";
import { requireSessionOrRedirect } from "@/lib/auth/guard";

export const metadata = { title: "Users & roles — Admin Portal" };

/**
 * Users & roles (S30) — the people and the permission model, read from the
 * recorded identity-access seed (`lib/api-client/access-control.ts`).
 *
 * WHY IT IS READ-ONLY: identity-access authenticates sign-ins and issues JWTs;
 * it publishes no user list, no role assignment and no invite endpoint, and no
 * frozen contract names one. So the screen makes the permission model legible —
 * every recorded role with its permissions in plain words, the raw frozen token
 * beside each, and who holds it — and states the missing provisioning API in
 * one line instead of showing a form that cannot submit.
 *
 * Every scope printed comes from `rbac-scopes-v1` through
 * `lib/rbac/scope-vocabulary.ts`; the role records are pinned to the seeded
 * personas by `tests/fixture-contract/access-control.test.ts`.
 *
 * Layout renders through the component kit (`components/kit`) — the people table
 * is `DataTable`, the state chips `StatusChip`.
 */

const PEOPLE_COLUMNS: ReadonlyArray<DataTableColumn<AccessAccount>> = [
  { key: "person", header: "Person" },
  { key: "email", header: "Email", className: "text-sm" },
  { key: "role", header: "Role" },
  { key: "permissions", header: "Permissions" },
  { key: "portal", header: "Portal", className: "text-sm" },
  { key: "state", header: "State" },
];

/** One role card: what it is, who holds it, and every permission in plain words. */
function RoleCard({ role }: { role: AccessRole }) {
  const groups = grantsByGroup(role.scopes);
  return (
    <Card
      header={
        <div className="row row--space">
          <h3 id={`role-${role.key}`}>{role.label}</h3>
          <StatusChip tone="neutral">{permissionCountLabel(role.scopes.length)}</StatusChip>
        </div>
      }
    >
      <p className="text-sm">{role.detail}</p>
      <p className="text-sm text-muted">
        Held by {role.holder_emails.join(" · ") || "no recorded account"}
      </p>
      <div className="stack-4">
        {groups.map((group) => (
          <div key={group.key} className="stack-2">
            <h4 className="text-sm">{group.label}</h4>
            <ul className="text-sm stack-2">
              {group.entries.map((entry) => (
                <li key={entry.scope}>
                  {entry.grant}{" "}
                  <code className="text-xs text-muted">{entry.scope}</code>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default async function UsersPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["identity:users:manage"])) {
    return (
      <>
        <PageHeader eyebrow="Administration" title="Users & roles" />
        <PageSection>
          <ForbiddenState requiredScopes={["identity:users:manage"]} />
        </PageSection>
      </>
    );
  }

  let roster;
  try {
    roster = await loadAccessControlRoster();
  } catch {
    return (
      <>
        <PageHeader eyebrow="Administration" title="Users & roles" />
        <PageSection>
          <ErrorState message="Unable to load the recorded roles and accounts." />
        </PageSection>
      </>
    );
  }

  const { roles, accounts } = roster;

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Users & roles"
        actions={<StatusChip tone="warning">Read-only</StatusChip>}
      />

      <PageSection>
        <p className="text-md">Who works here, what each role may do, and how invites work.</p>
        <Alert tone="warning">
          <p>
            <strong>User provisioning is not wired.</strong>
          </p>
          <p>{PROVISIONING_NOT_WIRED}</p>
          <p className="mb-0">{ACCESS_ROSTER_NOTE}</p>
        </Alert>
        <p className="mt-4 mb-0">
          <Link className="btn btn--secondary btn--sm" href="/staff/users/new">
            See the invite path
          </Link>
        </p>
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">People</h2>
        <p className="text-sm text-muted">
          The recorded sign-in accounts and the role each one holds. Office staff records live in
          the Staff directory.
        </p>
        <DataTable<AccessAccount>
          columns={PEOPLE_COLUMNS}
          rows={accounts}
          rowKey={(account) => account.id}
          rowHeader
          renderCell={(account, column) => {
            switch (column.key) {
              case "person":
                return (
                  <span className="name-cell">
                    <span className="name-avatar" aria-hidden="true">
                      {initialsOf(account.name)}
                    </span>
                    {account.name}
                  </span>
                );
              case "email":
                return account.email;
              case "role":
                return <Link href={`#role-${account.role.key}`}>{account.role.label}</Link>;
              case "permissions":
                return (
                  <details>
                    <summary className="text-sm">
                      {permissionCountLabel(account.role.scopes.length)}
                    </summary>
                    <ul className="text-sm stack-2 mt-2">
                      {grantsByGroup(account.role.scopes).flatMap((group) =>
                        group.entries.map((entry) => (
                          <li key={entry.scope}>{entry.grant}</li>
                        )),
                      )}
                    </ul>
                  </details>
                );
              case "portal":
                return account.portal_label;
              case "state":
                return <StatusChip tone="neutral">Seeded sign-in</StatusChip>;
              default:
                return null;
            }
          }}
          caption={<>{ACCOUNT_STATE_NOTE}</>}
          emptyTitle="No sign-in accounts recorded"
          emptyHint="Recorded accounts appear here once identity-access publishes them."
        />
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">Roles and what each may do</h2>
        <p className="text-sm text-muted">{ROLE_MATRIX_NOTE}</p>
        <div className="stack-4">
          {roles.map((role) => (
            <RoleCard key={role.key} role={role} />
          ))}
        </div>
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">The path an invitation takes</h2>
        <p className="text-sm text-muted">{INVITE_NOT_WIRED}</p>
        <ol className="steps">
          {INVITE_PATH.map((step) => (
            <li key={step.key}>
              <strong>{step.label}</strong>
              <span className="text-sm text-muted">{step.detail}</span>
            </li>
          ))}
        </ol>
      </PageSection>
    </>
  );
}
