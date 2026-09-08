# web — In Memoriam frontend (Next.js, all portals + BFF)

> **Migration note (2026-09):** this repository is now the home of the real
> frontend, copied in whole from `in-memoriam/web`. The former clickable
> prototype (React + Vite) is archived under [`legacy-mockup/`](legacy-mockup/)
> (git tag `mockup-design-final`). See [`PORT_PLAN.md`](PORT_PLAN.md) for the
> migration status and the open dev decisions (palette, deploy, sync policy).

One codebase, one deploy — **four surfaces sharing one identity**. This is the
production-grade counterpart of the `villa-memorial` visual prototype (which remains
the UX reference; this app is what actually runs against the platform services).

## The four surfaces (one product, four doors)

| Surface | Door | Persona (demo) | State |
|---|---|---|---|
| **Public site** | `/` (landing) + `/plans` `/lots` `/map` `/packages` etc. | none | ✅ real (catalog/lot data, cart/checkout on frozen commerce contract) |
| **Staff portal** | `/login` → `/staff/*` | `admin@vm.demo` / `staff@vm.demo` | ✅ real core (dashboard, billing, cases, schedule, property map, documents, audit) + honest "not wired yet" screens |
| **Family portal** | `/client/login` → `/client/*` | `customer@vm.demo` | Shell: real auth + portal frame; data screens run on a recorded snapshot fixture until the family API contract freezes (dev-authored) |
| **Agent portal** | `/agent/login` → `/agent/*` | `agent@vm.demo` | Shell: real auth + portal frame; screens labelled "coming soon" until the agent/commission contract exists |

All four doors use the **same login BFF** (`POST /api/auth/login`) and the same
httpOnly session. Doors are separate today because the JWT carries permission
*scopes* but no role/portal claim — so the app cannot yet auto-route a user to their
surface. When the dev adds a role/portal claim to the frozen contract, one door
(`/login`) becomes enough; until then the **Portal switcher** (visible in every
surface's header/sidebar) keeps the four surfaces connected.

## Demo logins (fixture mode)

Password for every persona: `Demo-Passw0rd!` (dev-only; opt-in via
`NEXT_PUBLIC_DEMO_PASSWORD`, never set in production builds).

| Persona | Scopes (subset) | Best door |
|---|---|---|
| `admin@vm.demo` | everything incl. `property:write`, `identity:users:manage` | `/login` |
| `staff@vm.demo` | read/write operations, no admin | `/login` |
| `agent@vm.demo` | catalog/orders/property reads | `/agent/login` |
| `customer@vm.demo` | public storefront only | `/client/login` |

## Run it

```bash
npm install
npm run dev        # → http://localhost:4000 (fixture mode: no env vars needed)
npm run lint && npm run typecheck && npm test && npm run build
```

Fixture mode serves recorded contract fixtures in-process so every surface demos
standalone. Live mode = set the gateway base URLs (`.env.example`) — screens flip
to real services with no code changes.

## "Not wired yet" labels are honest, not decoration

Screens marked "not wired yet"/"coming soon" exist so the IA, design and RBAC are
reviewable; each states **what unblocks it** (usually a dev-authored backend
contract — crm-families, hr, reporting, family/agent APIs, catalog write, etc.).
Nothing fake-wires data that has no backend. Tracked per route in
`docs/08-delivery/notes/demo-web-route-coverage.md`.

## Structure conventions (summary — full rules in `AGENTS.md`)

- `app/(public)` · `app/(staff)` · `app/(family)` · `app/(agent)` — route groups per surface
- `app/api/*` — BFF route handlers only (session, thin proxies; no business rules)
- `components/ui/*` — shared design-system kit (tokens + BEM, zero domain vocabulary)
- `components/*` — feature components; `lib/api-client/*` typed clients (fixture/live)
- `lib/fixtures/*` — recorded contract fixtures (provenance in `lib/fixtures/README.md`)
- `styles/tokens.css` — single source of truth for every visual decision (DOC palette)
