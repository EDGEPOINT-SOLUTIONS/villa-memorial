/**
 * The frozen RBAC scope vocabulary in plain words — the ONE home for the human
 * reading of `docs/08-delivery/contracts/rbac-scopes-v1.md`.
 *
 * The contract is the authority for the TOKENS; this module is the authority
 * for how the product prints them. `tests/fixture-contract/access-control.test.ts`
 * re-reads the contract and fails if the two scope sets differ, so a scope can
 * never be silently dropped here or quietly invented on a screen.
 *
 * The grant lines are the contract's own "Grants" column, phrased for staff —
 * `catalog:read`'s "Catalog items, packages, price rules" becomes "See catalog
 * items, packages and price rules". No rule is added: read/write pairs keep the
 * contract's own distinction.
 */

export type ScopeEntry = {
  /** The frozen token, exactly as `rbac-scopes-v1` prints it. */
  scope: string;
  /** What holding the scope lets a person do, in plain words. */
  grant: string;
};

export type ScopeGroup = {
  key: string;
  label: string;
  entries: ReadonlyArray<ScopeEntry>;
};

/** The twenty-three frozen scopes, grouped the way the contract lists them. */
export const SCOPE_GROUPS: ReadonlyArray<ScopeGroup> = [
  {
    key: "identity",
    label: "Identity & access",
    entries: [
      { scope: "identity:roles:read", grant: "See the roles and what each one may do" },
      { scope: "identity:users:manage", grant: "Add people and give them a role" },
      { scope: "tenancy:tenants:manage", grant: "Set up and configure this park's account" },
      { scope: "tenancy:modules:read", grant: "See which modules are switched on" },
      { scope: "audit:events:read", grant: "Read the record of who changed what" },
    ],
  },
  {
    key: "commerce",
    label: "Catalog & orders",
    entries: [
      { scope: "catalog:read", grant: "See catalog items, packages and price rules" },
      { scope: "catalog:write", grant: "Change catalog items, packages and price rules" },
      { scope: "orders:read", grant: "See orders and checkout" },
      { scope: "orders:write", grant: "Handle orders and checkout" },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    entries: [
      { scope: "billing:read", grant: "See invoices, instalments and payments" },
      { scope: "billing:write", grant: "Record payments and change billing" },
      { scope: "accounting:read", grant: "See the ledger" },
      { scope: "accounting:post", grant: "Post entries to the ledger" },
    ],
  },
  {
    key: "operations",
    label: "Cases & operations",
    entries: [
      { scope: "cases:read", grant: "See funeral cases, stages and tasks" },
      { scope: "cases:write", grant: "Move cases and work their tasks" },
      { scope: "scheduling:read", grant: "See resources and bookings" },
      { scope: "scheduling:write", grant: "Book resources and change the schedule" },
      { scope: "property:read", grant: "See lots, reservations and sales" },
      { scope: "property:write", grant: "Handle lots, reservations and sales" },
    ],
  },
  {
    key: "people",
    label: "People & documents",
    entries: [
      { scope: "hr:read", grant: "See the staff directory, attendance and leave" },
      { scope: "hr:write", grant: "Change staff, attendance and leave records" },
      { scope: "documents:read", grant: "See the document repository" },
      { scope: "documents:write", grant: "File and generate documents" },
    ],
  },
];

/** Every frozen scope with its plain-words grant, in contract order. */
export const SCOPE_VOCABULARY: ReadonlyArray<ScopeEntry> = SCOPE_GROUPS.flatMap(
  (group) => group.entries,
);

const BY_SCOPE = new Map(SCOPE_VOCABULARY.map((entry) => [entry.scope, entry]));

/** True when the token is one of the frozen twenty-three. */
export function isFrozenScope(scope: string): boolean {
  return BY_SCOPE.has(scope);
}

/** The plain-words grant for a token, or null when the token is not frozen. */
export function grantForScope(scope: string): ScopeEntry | null {
  return BY_SCOPE.get(scope) ?? null;
}

export type GroupedGrants = {
  key: string;
  label: string;
  entries: ScopeEntry[];
};

/**
 * A role's scopes grouped for display: only the groups the role touches, each
 * with its entries in contract order. An unknown token is kept in an "Other"
 * group rather than dropped — a screen must never hide a permission it does not
 * recognise.
 */
export function grantsByGroup(scopes: ReadonlyArray<string>): GroupedGrants[] {
  const groups: GroupedGrants[] = [];
  for (const group of SCOPE_GROUPS) {
    const entries = group.entries.filter((entry) => scopes.includes(entry.scope));
    if (entries.length > 0) {
      groups.push({ key: group.key, label: group.label, entries: [...entries] });
    }
  }
  const unknown = scopes.filter((scope) => !BY_SCOPE.has(scope));
  if (unknown.length > 0) {
    groups.push({
      key: "other",
      label: "Other",
      entries: unknown.map((scope) => ({ scope, grant: "Not in the frozen vocabulary" })),
    });
  }
  return groups;
}
