# Frozen cross-track contract — KEB-D1-03
# Audit event types v1 — producers: all services (via audit API) · consumer: audit service

## Status
**FROZEN as of Tue Aug 25** (Day 1 EOD gate). New types are ADDITIONS (append to the
registry below); renames/removals require Keb review and a version bump.

## Trail entry shape (audit_events row)
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `tenant_id` | string | from verified claims, ALWAYS |
| `actor_user_id` | string | identity-access users.id; empty for system actors |
| `actor_scopes` | string | space-joined scopes held at action time |
| `action` | string | `{resource}.{verb}` from registry below |
| `resource_type` | string | e.g. `user`, `order`, `lot`, `session` |
| `resource_id` | string | opaque id; display snapshots allowed in details |
| `outcome` | enum | `succeeded` \| `denied` \| `failed` |
| `details` | object | no PII beyond ids; never raw tokens/passwords |
| `correlation_id`, `request_id` | string | propagation per template capability #4 |
| `occurred_at` | timestamptz | server clock at append |

## Action registry (v1)
Auth/session: `user.logged_in` · `user.refresh_rotated` · `user.reuse_detected` ·
`user.logged_out`
Identity admin: `user.created` · `user.disabled` · `role.assigned` · `role.revoked`
Tenancy: `tenant.provisioned` · `module.enabled` · `module.disabled`
Security-relevant denials: any `{resource}.access_denied` with outcome `denied`

## Rules
1. Append-only: no UPDATE/DELETE paths exist in code; DB role lacks those privileges
   in staging+. Corrections are compensating entries.
2. Security-relevant authz DENIALS must be audited (`outcome: denied`) — this is a CP-1
   security-smoke requirement, not optional polish.
3. Writes go through `POST /audit/api/v1/events`; services do not write to the audit DB
   directly.
4. Querying: `GET /audit/api/v1/events?action=&resource_type=&resource_id=&limit=` —
   always tenant-scoped by claims.

## Known limitations (documented)
- Services call the audit API synchronously on the request path today; move to async
  event-consumption if latency shows up (deferred to Phase 2 hardening).
