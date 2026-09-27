# AGENTS.md — `app/(platform)` (platform operator surface)

> Nested instructions. A harness that loads `AGENTS.md` files discovers this file when a
> session touches a file under `app/(platform)/`, and it is not loaded before then.
> The cross-cutting rules stay in the repository-root [`AGENTS.md`](../../AGENTS.md). Read that first.

## Platform operator surface — `/platform/*` (read before touching the platform screens)

- Three designed screens for the platform's own team, NOT the funeral product: tenant
  management (`/platform/tenants`, `/platform/tenants/[id]` — state · plan · address, one
  tenant's record, read-only), the operator door (`/platform/sign-in`, the documented entry
  point, reached by URL) and tenant sign-up (`/platform/sign-up` — a two-step flow that
  creates nothing). No tenancy/identity service or contract exists
  (`docs/02-architecture/platform-administration.md` classifies the surface), so every screen
  states what the platform must provide, and `app/(platform)/layout.tsx` carries the
  operator-surface marker wording. Never link the surface from a public/staff/family/agent
  menu (`tests/unit/platform-screens.test.tsx` fails one), and `/platform/` stays disallowed
  in `app/robots.ts` plus `noindex` in its own head.
- ONE vocabulary home: `lib/platform-admin.ts` (states active_trial / trial_expired /
  cancelled, the single free_trial plan — paid plans deferred — the requirement/deferred
  lists, the onboarding sequence, and `validateTenantSignUpDraft`, the gate the flow runs).
  The fixture is APP-AUTHORED SAMPLES: `lib/fixtures/platform/tenants.json` (every row
  `sample: true`, "Sample"/"Example" named, `.example` addresses) read by
  `lib/api-client/platform.ts`, which REFUSES an unmarked row and has no live mode. Never add
  a real business, plan or hostname — `tests/fixture-contract/platform.test.ts` fails one.
  The accessibility + reading-budget harnesses render these pages (one `h1`, labelled fields,
  short leads and list items).

