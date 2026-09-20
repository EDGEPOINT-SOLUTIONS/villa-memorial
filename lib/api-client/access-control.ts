/**
 * Typed data access for the Users & roles screen (S30) — the recorded roles and
 * the recorded sign-in accounts.
 *
 * ⚠ NO USER-PROVISIONING API EXISTS. `identity-access` authenticates sign-ins
 * and issues JWTs; it publishes no user list, no role assignment and no invite
 * endpoint, and no frozen contract names one. The records this module reads are
 * APP-AUTHORED with provenance (`lib/fixtures/auth/access-control.json`): the
 * four roles, whose scope lists are EXACTLY the seeded personas' scope lists in
 * `auth/personas.json`, pinned by `tests/fixture-contract/access-control.test.ts`.
 *
 * The reader therefore offers NO live branch to claim — `accessControlLiveModeEnabled()`
 * is always false, because setting a URL cannot make an endpoint that does not
 * exist. A malformed role crashes loudly (500) instead of reaching a screen, and
 * a role carrying a token outside the frozen vocabulary is refused the same way.
 *
 * When a provisioning API freezes, this module gains a live branch and the
 * fixture's provenance header is replaced by contract references; the screen's
 * shape does not change.
 */
import accessFile from "@/lib/fixtures/auth/access-control.json";
import personasFile from "@/lib/fixtures/auth/personas.json";
import { type AccessAccount, type AccessRole, unknownRoleScopes } from "@/lib/access-control";
import { ApiError } from "@/lib/api-client/api-error";
import { portalHomeFor } from "@/lib/auth/destination";

/** The records are app-authored seed data, so there is no live branch to claim. */
export function accessControlLiveModeEnabled(): boolean {
  return false;
}

export const ACCESS_CONTROL_NOT_WIRED =
  "no user-provisioning or role-assignment API exists in this build; the roles and the " +
  "roster are recorded seed records.";

export type AccessControlRoster = {
  roles: AccessRole[];
  accounts: AccessAccount[];
};

/* -------------------------------- reader --------------------------------- */

function malformed(what: string): never {
  throw new ApiError(`malformed access-control fixture: ${what}`, 500);
}

function record(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null) malformed(what);
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim().length === 0) malformed(what);
  return value;
}

function stringList(value: unknown, what: string): string[] {
  if (!Array.isArray(value)) malformed(what);
  return value.map((entry, index) =>
    requiredString(entry, `${what}[${index}]`),
  );
}

/** Field-by-field reader; extra fields are ignored, missing ones fail loudly. */
export function readAccessRoles(raw: unknown): AccessRole[] {
  const root = record(raw, "roles file");
  if (!Array.isArray(root.roles)) malformed("roles");

  const roles = root.roles.map((value, index) => {
    const row = record(value, `roles[${index}]`);
    const key = requiredString(row.key, `roles[${index}].key`);
    const scopes = stringList(row.scopes, `${key}.scopes`);
    const holder_emails = stringList(row.holder_emails, `${key}.holder_emails`);
    const role: AccessRole = {
      key,
      label: requiredString(row.label, `${key}.label`),
      detail: requiredString(row.detail, `${key}.detail`),
      holder_emails,
      scopes,
    };
    const unknown = unknownRoleScopes(role);
    if (unknown.length > 0) {
      malformed(`${key} grants scopes outside the frozen vocabulary: ${unknown.join(", ")}`);
    }
    return role;
  });

  if (roles.length === 0) malformed("roles (empty)");
  return roles;
}

const PERSONAS = personasFile as unknown as {
  personas: Array<{ email: string; display_name: string; user_id: string; scopes: string[] }>;
};

function portalLabelFor(scopes: string[]): string {
  const home = portalHomeFor(scopes);
  if (home.startsWith("/staff/")) return "Admin portal";
  if (home.startsWith("/agent/")) return "Agent portal";
  return "Family portal";
}

/**
 * The roles plus one account row per recorded sign-in the role holds. The two
 * fixtures are joined by email and the join is strict: an account held by no
 * role, a role holding an unknown email, or one email held by two roles is a
 * 500, never a half-built roster.
 */
export async function loadAccessControlRoster(): Promise<AccessControlRoster> {
  const roles = readAccessRoles(accessFile);

  const personasByEmail = new Map(PERSONAS.personas.map((persona) => [persona.email, persona]));
  const heldBy = new Map<string, AccessRole>();

  const accounts: AccessAccount[] = [];
  for (const role of roles) {
    for (const email of role.holder_emails) {
      const persona = personasByEmail.get(email);
      if (!persona) {
        throw new ApiError(`malformed access-control fixture: ${role.key} holds unknown ${email}`, 500);
      }
      const previous = heldBy.get(email);
      if (previous) {
        throw new ApiError(
          `malformed access-control fixture: ${email} is held by both ${previous.key} and ${role.key}`,
          500,
        );
      }
      heldBy.set(email, role);
      accounts.push({
        id: persona.user_id,
        name: persona.display_name,
        email: persona.email,
        role,
        portal_label: portalLabelFor(role.scopes),
      });
    }
  }

  const unheld = PERSONAS.personas.filter((persona) => !heldBy.has(persona.email));
  if (unheld.length > 0) {
    throw new ApiError(
      `malformed access-control fixture: no role holds ${unheld.map((p) => p.email).join(", ")}`,
      500,
    );
  }

  return { roles, accounts };
}
