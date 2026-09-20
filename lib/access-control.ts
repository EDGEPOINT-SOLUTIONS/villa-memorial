/**
 * The access-control vocabulary the Users & roles screen (S30) reads and
 * prints — pure, client + server.
 *
 * The ROLE records are data (`lib/fixtures/auth/access-control.json`, read
 * through `lib/api-client/access-control.ts`); the scope tokens they carry are
 * the frozen `rbac-scopes-v1` vocabulary and are translated into plain words by
 * `lib/rbac/scope-vocabulary.ts`. This module holds only the shape and the
 * screen's own copy, so a fixture and a view cannot disagree about either.
 *
 * There is NO provisioning API in this build: identity-access authenticates
 * sign-ins and issues JWTs, and that is all. Nothing in this module creates a
 * user, sends an invitation or assigns a role — the screen states the gap in
 * one line.
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
  "identity-access signs people in, but it has no API to list, invite or assign roles.";

/** What the roster actually is. */
export const ACCESS_ROSTER_NOTE =
  "The roster is the recorded identity-access seed — its four sign-in accounts, not a list of everyone who works here.";

/** Why no account shows an active/suspended state. */
export const ACCOUNT_STATE_NOTE =
  "Account state (active or suspended) is not recorded: the provisioning service that keeps it does not exist.";

/** One line over the role cards. */
export const ROLE_MATRIX_NOTE =
  "A role is a named set of the frozen permissions. The raw permission code is printed after each line.";

/** The invite path the office will use once provisioning exists. */
export type InviteStep = {
  key: string;
  label: string;
  detail: string;
};

export const INVITE_PATH: ReadonlyArray<InviteStep> = [
  {
    key: "person",
    label: "Add the person",
    detail: "Their name and work email are recorded against the park.",
  },
  {
    key: "role",
    label: "Give them a role",
    detail: "The role carries the permission set — one of the four below.",
  },
  {
    key: "invite",
    label: "Send the invitation",
    detail: "They set their own password, then sign in at the door for the role.",
  },
];

/** What the invite door can honestly say today. */
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
 * A guard used by the fixture contract: every scope a recorded role carries
 * must be one of the frozen twenty-three. Kept beside the type so the reader
 * and the test run the same rule.
 */
export function unknownRoleScopes(role: Pick<AccessRole, "scopes">): string[] {
  return role.scopes.filter((scope) => !isFrozenScope(scope));
}
