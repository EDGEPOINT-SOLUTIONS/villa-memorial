/**
 * Typed data access for the Users & roles screen (S30) — the recorded roles, the
 * recorded sign-in accounts, and the durable record of an edited permission set.
 *
 * ⚠ NO USER-PROVISIONING API EXISTS. `identity-access` authenticates sign-ins
 * and issues JWTs; it publishes no user list, no role assignment and no invite
 * endpoint, and no frozen contract names one. The records this module reads are
 * APP-AUTHORED with provenance (`lib/fixtures/auth/access-control.json`): the
 * four roles, whose SEED scope lists are EXACTLY the seeded personas' scope
 * lists in `auth/personas.json`, pinned by
 * `tests/fixture-contract/access-control.test.ts`.
 *
 * WHAT IS EDITABLE, AND WHAT IS NOT. The captain asked to check permissions
 * with checkboxes (2026-10-02), so a role's permission set is now editable. The
 * edit is a durable journal (`ACCESS_CONTROL_STORE_PATH` or
 * `.data/auth-access-control.json`, gitignored; append-only, atomic writer, one
 * in-process chain) folded over the read-only seed:
 *
 *   · `role_scopes_set` events carry the role key, the whole ordered scope list
 *     and the actor; the fold applies them in order, so the newest event for a
 *     role wins and updating the seed never has to migrate old state.
 *   · Every scope is validated against the frozen vocabulary on the way in AND
 *     on the way out (`scopeSelectionProblem`): a role can never carry an
 *     invented or duplicated token.
 *   · The role's IDENTITY (key, label, detail, holders) and the ACCOUNT's door
 *     stay the recorded seed — a permission edit never renames a role or moves a
 *     person to another portal.
 *
 * The store is fixture-mode only and says so: `accessControlLiveModeEnabled()`
 * is always false, because setting a URL cannot make an endpoint that does not
 * exist. The saved scopes are the ROLE RECORD; the sign-in gates keep reading
 * the provider's session scopes (rule 1 of `rbac-scopes-v1`), so no saved edit
 * can widen what the running session may do. A malformed role or event crashes
 * loudly (500) instead of reaching a screen.
 *
 * When a provisioning API freezes, this module gains a live branch and the
 * fixture's provenance header is replaced by contract references; the screen's
 * shape does not change.
 */
import {
  createJournalLock,
  journalPath,
  logSkippedJournalEvents,
  readJournalEvents,
  writeJournalEvents,
  type SkippedJournalEvent,
} from "@/lib/api-client/journal";
import accessFile from "@/lib/fixtures/auth/access-control.json";
import personasFile from "@/lib/fixtures/auth/personas.json";
import {
  scopeSelectionProblem,
  type AccessAccount,
  type AccessRole,
  unknownRoleScopes,
} from "@/lib/access-control";
import { orderScopes } from "@/lib/rbac/scope-vocabulary";
import { ApiError } from "@/lib/api-client/api-error";

/** The records are app-authored seed data, so there is no live branch to claim. */
export function accessControlLiveModeEnabled(): boolean {
  return false;
}

export const ACCESS_CONTROL_NOT_WIRED =
  "no user-provisioning or role-assignment API exists in this build; the roster is recorded, " +
  "and a role edit is kept in the local record.";

export type AccessControlRoster = {
  roles: AccessRole[];
  accounts: AccessAccount[];
  /** When the current role scopes were last saved, and by whom (null = recorded seed). */
  updated_at: string | null;
  updated_by: string | null;
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

/* --------------------------- durable role store -------------------------- */

type PersistedRoleEvent = {
  kind: "role_scopes_set";
  at: string;
  role_key: string;
  scopes: string[];
  actor: string | null;
};

/** One role's edited permission set, as the screen posts it. */
export type RoleScopeUpdate = {
  key: string;
  scopes: string[];
};

/** The folded role record plus its save stamp. */
export type RoleAccessState = {
  roles: AccessRole[];
  updated_at: string | null;
  updated_by: string | null;
};

export function accessControlStorePath(): string {
  return journalPath("ACCESS_CONTROL_STORE_PATH", "auth-access-control.json");
}

const withStoreLock = createJournalLock();

function toPersistedRoleEvent(raw: unknown): PersistedRoleEvent {
  const row = record(raw, "store event");
  if (row.kind !== "role_scopes_set") {
    malformed(`store event kind ${String(row.kind)}`);
  }
  const role_key = requiredString(row.role_key, "store event role_key");
  const scopes = stringList(row.scopes, `${role_key}.scopes`);
  const problem = scopeSelectionProblem(scopes);
  if (problem) malformed(`store event ${role_key}: ${problem}`);
  const at = requiredString(row.at, "store event at");
  const actor = row.actor == null ? null : requiredString(row.actor, "store event actor");
  return { kind: "role_scopes_set", at, role_key, scopes, actor };
}

async function readPersistedEvents(): Promise<PersistedRoleEvent[]> {
  const events = await readJournalEvents(accessControlStorePath(), "access-control");
  return events.map(toPersistedRoleEvent);
}

/** The edge case a fold skips: an event naming a role the seed does not carry. */
function skippedEvent(event: PersistedRoleEvent): SkippedJournalEvent {
  return {
    kind: event.kind,
    at: event.at,
    parent: "role_key",
    reference: event.role_key,
  };
}

/** Seed roles + the journal folded in order, with the last save's stamp. */
async function loadRoleState(): Promise<{
  state: RoleAccessState;
  events: PersistedRoleEvent[];
}> {
  const roles = readAccessRoles(accessFile).map((role) => ({
    ...role,
    scopes: [...role.scopes],
  }));
  const byKey = new Map(roles.map((role) => [role.key, role]));
  const events = await readPersistedEvents();
  const skipped: SkippedJournalEvent[] = [];
  let updated_at: string | null = null;
  let updated_by: string | null = null;
  for (const event of events) {
    const role = byKey.get(event.role_key);
    if (!role) {
      skipped.push(skippedEvent(event));
      continue;
    }
    role.scopes = [...event.scopes];
    updated_at = event.at;
    updated_by = event.actor;
  }
  if (skipped.length > 0) logSkippedJournalEvents("access-control", skipped);
  return { state: { roles: [...byKey.values()], updated_at, updated_by }, events };
}

/** The folded role record — the recorded seed until the office saves an edit. */
export async function loadRoleAccessState(): Promise<RoleAccessState> {
  return (await loadRoleState()).state;
}

/** Read the posted `roles` list field by field; a bad token is a 422. */
function toRoleScopeUpdates(raw: unknown): RoleScopeUpdate[] {
  if (!Array.isArray(raw)) {
    throw new ApiError("roles must be a list of roles and permissions.", 422);
  }
  return raw.map((value, index) => {
    const row = record(value, `roles[${index}]`);
    const key = requiredString(row.key, `roles[${index}].key`);
    const scopes = stringList(row.scopes, `${key}.scopes`);
    const problem = scopeSelectionProblem(scopes);
    if (problem) throw new ApiError(problem, 422);
    return { key, scopes: orderScopes(scopes) };
  });
}

/**
 * Write the posted role permission sets. The whole selection is validated first
 * (frozen vocabulary, no duplicates, known role, no repeated role), then one
 * `role_scopes_set` event is appended per CHANGED role inside the store lock —
 * so two concurrent saves cannot interleave a read-modify-write, and a save
 * that changes nothing writes nothing.
 */
export async function saveRoleScopes(raw: unknown, actor: string): Promise<RoleAccessState> {
  const updates = toRoleScopeUpdates(raw);
  const who = actor.trim() || "Staff";
  return withStoreLock(async () => {
    const { state, events } = await loadRoleState();
    const current = new Map(state.roles.map((role) => [role.key, role.scopes]));
    const seen = new Set<string>();
    const now = new Date().toISOString();
    const appended: PersistedRoleEvent[] = [];
    for (const update of updates) {
      if (!current.has(update.key)) {
        throw new ApiError(`unknown role: ${update.key}`, 422);
      }
      if (seen.has(update.key)) {
        throw new ApiError(`role ${update.key} is listed twice.`, 422);
      }
      seen.add(update.key);
      const before = current.get(update.key)!;
      const unchanged =
        before.length === update.scopes.length &&
        before.every((scope, index) => scope === update.scopes[index]);
      if (unchanged) continue;
      appended.push({
        kind: "role_scopes_set",
        at: now,
        role_key: update.key,
        scopes: update.scopes,
        actor: who,
      });
    }
    if (appended.length === 0) return state;
    await writeJournalEvents(accessControlStorePath(), "access-control", [
      ...events,
      ...appended,
    ]);
    return (await loadRoleState()).state;
  });
}

/* ------------------------------- the roster ------------------------------ */

const PERSONAS = personasFile as unknown as {
  personas: Array<{ email: string; display_name: string; user_id: string; scopes: string[] }>;
};

/**
 * Which door a role opens. The door is a property of the RECORDED ACCOUNT, not
 * of its editable permission set, so it reads the role key — unticking a scope
 * never moves a person to another portal.
 */
const PORTAL_BY_ROLE: Record<string, string> = {
  administrator: "Admin portal",
  staff: "Admin portal",
  agent: "Agent portal",
  customer: "Family portal",
};

function portalLabelFor(roleKey: string): string {
  return PORTAL_BY_ROLE[roleKey] ?? "Family portal";
}

/**
 * The roles plus one account row per recorded sign-in the role holds. The two
 * fixtures are joined by email and the join is strict: an account held by no
 * role, a role holding an unknown email, or one email held by two roles is a
 * 500, never a half-built roster. The role's scopes are the FOLDED record, so an
 * office edit shows on the account's own permission view.
 */
export async function loadAccessControlRoster(): Promise<AccessControlRoster> {
  const { state } = await loadRoleState();
  const { roles, updated_at, updated_by } = state;

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
        portal_label: portalLabelFor(role.key),
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

  return { roles, accounts, updated_at, updated_by };
}
