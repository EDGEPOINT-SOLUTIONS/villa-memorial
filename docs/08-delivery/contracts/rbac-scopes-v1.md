# Frozen cross-track contract — KEB-D3-04
# RBAC scope vocabulary v1 — producer: identity-access · consumers: every service boundary + web nav

## Status
**FROZEN as of Fri Aug 29.** Closes the gap flagged in
[`notes/known-limitations-cp1.md`](../notes/known-limitations-cp1.md): `hr:read` and
`documents:read` were in use by shipped screens and in the identity-access seed, but named in no
frozen contract. They are now frozen. Adding a scope is additive (no version bump); renaming or
removing one is breaking (bump to v2).

## Format
`{module}:{action}` — lowercase, colon-separated, per `jwt-claims-v1.md` (`scopes` claim, array of
strings). Two identity scopes use a three-part form for historical reasons and stay as they are.

## Frozen vocabulary
| Scope | Grants |
|---|---|
| `identity:roles:read` | Read roles and the permission matrix |
| `identity:users:manage` | Create/update users, assign roles |
| `tenancy:tenants:manage` | Provision and configure tenants |
| `tenancy:modules:read` | Read the A–J module registry flags |
| `audit:events:read` | Query the tenant-scoped audit trail |
| `catalog:read` / `catalog:write` | Catalog items, packages, price rules |
| `orders:read` / `orders:write` | Orders and checkout |
| `billing:read` / `billing:write` | Invoices, installments, payments |
| `accounting:read` / `accounting:post` | Ledger read; post journal entries |
| `cases:read` / `cases:write` | Funeral cases, stages, tasks |
| `scheduling:read` / `scheduling:write` | Resources and bookings |
| `property:read` / `property:write` | Lots, reservations, sales |
| `hr:read` / `hr:write` | Employee directory, attendance, leave |
| `documents:read` / `documents:write` | Document repository, generated artifacts |

## Rules
1. **Nav gating is UX only.** `web/lib/rbac/nav.ts` hides what a session cannot use; the
   authoritative check is `require_scope!` at the service boundary. Never treat a hidden nav item
   as an access control.
2. Scopes come from verified JWT claims only — never from headers, params or body.
3. A service enforces only its own module's scopes. No service checks another module's scopes.
4. Roles are data (`identity-access/db/seeds.rb`), not code. Role→scope mapping is a tenant
   configuration concern; the vocabulary above is the platform contract.

## Cross-check
This table is the union of:
- `PERMISSIONS` in `platform/services/identity-access/db/seeds.rb`
- scopes referenced in `web/lib/rbac/nav.ts` and `web/lib/fixtures/auth/personas.json`

A CI check should assert these three stay in sync. Not yet automated — tracked in the Phase-2
backlog.
