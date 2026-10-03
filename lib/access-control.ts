/**
 * The access-control vocabulary the Users & roles screen (S30) reads and
 * prints — pure, client + server.
 *
 * The ROLE records are data (`lib/fixtures/auth/access-control.json`, read and
 * folded with the durable role-scope journal in
 * `lib/api-client/access-control.ts`); the scope tokens they carry are the
 * frozen `rbac-scopes-v1` vocabulary and are translated into plain words by
 * `lib/rbac/scope-vocabulary.ts`. This module holds only the shape, the
 * validation rule and the screen's own copy, so a fixture and a view cannot
 * disagree about either.
 *
 * There is STILL no user-provisioning API in this build: identity-access
 * authenticates sign-ins and issues JWTs, and that is all. Nothing in this
 * module creates a user, sends an invitation or assigns a role. What the screen
 * DOES edit is a role's recorded permission set, saved to the local journal; the
 * sign-in gates keep reading the provider's own scopes (see the screen copy).
 */
import { isFrozenScope } from "@/lib/rbac/scope-vocabulary";

export type AccessRole = {
  key: string;
  label: string;
  /** One line: what the role is for. */
  detail: string;
  /** The recorded sign-in accounts that hold it (identity-access seed emails). */
  holder_emails: string[];
  /** The frozen scope tokens the role grants. */
  scopes: string[];
};

export type AccessAccount = {
  id: string;
  name: string;
  email: string;
  role: AccessRole;
  /** Which door the role opens: Admin portal · Agent portal · Family portal. */
  portal_label: string;
};

/* ------------------------------- the words ------------------------------- */

/** The missing service, in one line — printed on the screen. */
export const PROVISIONING_NOT_WIRED =
  "identity-access signs people in, but it has no API to list, invite or assign users.";

/** What the roster actually is. */
export const ACCESS_ROSTER_NOTE =
  "The roster is the recorded identity-access seed — its four sign-in accounts, not a list of everyone who works here.";

/** Why no account shows an active/suspended state. */
export const ACCOUNT_STATE_NOTE =
  "Account state (active or suspended) is not recorded: the provisioning service that keeps it does not exist.";

/** What the tick boxes do. */
export const ROLE_SCOPE_EDIT_NOTE =
  "Tick the permissions a role should carry, then save the role record.";

/**
 * The honest limit of a saved role edit: it changes THIS record, not who can
 * sign in. The gate model and the frozen vocabulary are untouched.
 */
export const GATES_UNCHANGED_NOTE =
  "Sign-in gates keep using the identity provider's own scopes; provisioning does not exist yet.";

/** The user view's one line: a person's permissions come from their role. */
export const USER_ROLE_SCOPES_NOTE =
  "A person's permissions come from their role — change them on the role below.";

/** The invite path can still not be walked. */
export const INVITE_NOT_WIRED =
  "No invitation can be sent from this screen: the user-provisioning API does not exist.";

/* ------------------------------ the helpers ------------------------------ */

/** "Ada Admin" → "AA" — the roster avatar's initials. */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

/**
 * The role's permission count as one short phrase — "1 permission" reads
 * correctly and "23 permissions" does not.
 */
export function permissionCountLabel(count: number): string {
  return count === 1 ? "1 permission" : `${count} permissions`;
}

/**
 * The one validation rule for an edited permission set: every token must be one
 * of the frozen twenty-three and none may repeat. Returns a plain sentence to
 * show the office, or null when the set is valid. Unknown tokens are refused
 * here — a role can never carry a scope the vocabulary does not name.
 */
export function scopeSelectionProblem(scopes: ReadonlyArray<string>): string | null {
  const seen = new Set<string>();
  for (const scope of scopes) {
    if (!isFrozenScope(scope)) {
      return `“${scope}” is not one of the frozen permissions.`;
    }
    if (seen.has(scope)) return `“${scope}” is ticked twice.`;
    seen.add(scope);
  }
  return null;
}

/**
 * A guard used by the fixture contract: every scope a recorded role carries
 * must be one of the frozen twenty-three. Kept beside the type so the reader
 * and the test run the same rule.
 */
export function unknownRoleScopes(role: Pick<AccessRole, "scopes">): string[] {
  return role.scopes.filter((scope) => !isFrozenScope(scope));
}
