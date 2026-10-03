import Link from "next/link";
import {
  DataTable,
  StatusChip,
  type DataTableColumn,
} from "@/components/kit";
import { PageHeader, PageSection } from "@/components/ui/page";
import { Alert } from "@/components/ui/alert";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import {
  ACCESS_ROSTER_NOTE,
  ACCOUNT_STATE_NOTE,
  GATES_UNCHANGED_NOTE,
  INVITE_NOT_WIRED,
  PROVISIONING_NOT_WIRED,
  ROLE_SCOPE_EDIT_NOTE,
  USER_ROLE_SCOPES_NOTE,
  initialsOf,
  permissionCountLabel,
  type AccessAccount,
} from "@/lib/access-control";
import { loadAccessControlRoster } from "@/lib/api-client/access-control";
import { hasAnyScope } from "@/lib/rbac/nav";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { RolesEditor } from "./roles-editor";
import { ScopeCheckboxes } from "./scope-checkboxes";

export const metadata = { title: "Users & roles — Admin Portal" };

/**
 * Users & roles (S30) — the people, and each role's permission set as tick
 * boxes (captain, 2026-10-02: "we should be able to check checkboxes for
 * permissions").
 *
 * The role records and the roster are the recorded identity-access seed
 * (`lib/api-client/access-control.ts`), and a role's permission set is now
 * editable through the ONE save in `RolesEditor` → the durable role store. The
 * role's identity and every account's door stay recorded data.
 *
 * WHAT IS STILL NOT WIRED, HONESTLY. identity-access publishes no user list, no
 * role assignment and no invite endpoint, so this screen provisions nobody and
 * sends no invitation. A saved permission set edits the ROLE RECORD; the
 * sign-in gates keep reading the provider's session scopes, and the frozen
 * `rbac-scopes-v1` vocabulary is unchanged — no scope can be invented here.
 *
 * Layout renders through the component kit (`DataTable`, `StatusChip`) and the
 * ONE permission reading (`ScopeCheckboxes`, the same groups the editor ticks).
 */

const PEOPLE_COLUMNS: ReadonlyArray<DataTableColumn<AccessAccount>> = [
  { key: "person", header: "Person" },
  { key: "email", header: "Email", className: "text-sm" },
  { key: "role", header: "Role" },
  { key: "permissions", header: "Permissions" },
  { key: "portal", header: "Portal", className: "text-sm" },
  { key: "state", header: "State" },
];

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

  const { roles, accounts, updated_at, updated_by } = roster;

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Users & roles"
        lead="Check what each role may do."
      />

      <PageSection>
        <Alert tone="warning">
          <p>
            <strong>User provisioning is not wired.</strong>
          </p>
          <p>{PROVISIONING_NOT_WIRED}</p>
          <p className="mb-0">{INVITE_NOT_WIRED}</p>
        </Alert>
        <p className="mt-4 mb-0">
          <Link className="btn btn--secondary btn--sm" href="/staff/users/new">
            See the invite path
          </Link>
        </p>
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">People</h2>
        <p className="text-sm text-muted">{USER_ROLE_SCOPES_NOTE}</p>
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
                    <div className="mt-2">
                      <ScopeCheckboxes
                        selected={account.role.scopes}
                        idPrefix={`user-${account.id}`}
                        disabled
                      />
                    </div>
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
          caption={
            <>
              {ACCESS_ROSTER_NOTE} {ACCOUNT_STATE_NOTE}
            </>
          }
          emptyTitle="No sign-in accounts recorded"
          emptyHint="Recorded accounts appear here once identity-access publishes them."
        />
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">Roles and permissions</h2>
        <p className="text-sm text-muted">
          {ROLE_SCOPE_EDIT_NOTE} {GATES_UNCHANGED_NOTE}
        </p>
        <RolesEditor
          initialRoles={roles}
          initialUpdatedAt={updated_at}
          initialUpdatedBy={updated_by}
        />
      </PageSection>
    </>
  );
}
