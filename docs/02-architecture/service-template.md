# Service Template — Standalone & Portable Definition of Done

> **Status:** Adopted (2026-08-24) per ratified decision #6 in
> [`microservices.md`](microservices.md). Every new service codebase must satisfy this template
> before its first merge. Language/framework is free per service, but the contract surface below
> is not.

## Goal

Any builder can `git clone` a service repo and get a working, seeded, demoable service with one
command — no other services required. Mirrors the platform philosophy: *configure → run → demo*.

## Repository layout (canonical)

```
service-name/
├── README.md              # what it owns, APIs, events, how to run
├── docker-compose.yml     # service + its DB + seed; `up` = working demo
├── Dockerfile             # production image; healthcheck wired
├── .env.example           # every config var documented; config via env only
├── migrations/            # versioned schema migrations, forward-only
├── seed/                  # deterministic dev seed data (incl. ≥1 tenant)
├── src/                   # application code (layout per language convention)
│   ├── api/               # HTTP API handlers (versioned namespaces)
│   ├── events/            # outbox writer, consumer handlers, schema defs
│   └── domain/            # business logic; no framework imports here
├── contracts/
│   ├── api/               # OpenAPI specs per version (api/v1.yaml…)
│   └── events/            # JSON Schema per event type + schema_version
└── tests/
    ├── unit/
    ├── integration/       # against own DB via compose
    └── contract/          # lock event shapes + API shapes (see below)
```

## Mandatory capabilities

### 1. Configuration via environment
- All config through env vars; `.env.example` lists every var with a comment.
- Required at minimum: `DATABASE_URL`, `PORT`, `LOG_LEVEL`, `SERVICE_NAME`, `JWT_PUBLIC_KEY`
  (or JWKS URL from identity-access), `EVENTS_POLL_INTERVAL_MS`.
- No build-time coupling to other services — ever.

### 2. Tenant context everywhere
- Accept tenant ID from verified JWT claims (never from untrusted body/query params).
- Propagate tenant context into: every DB row (tenant-scoped tables), every event payload,
  every log line.

### 3. Health checks
- `GET /healthz` → liveness (process up).
- `GET /readyz` → readiness (DB reachable, migrations current). Used by orchestrator + compose.

### 4. Observability baseline
- Structured JSON logs with: `service_name`, `tenant_id`, `correlation_id`, `request_id`.
- Correlation ID accepted from inbound header (`X-Correlation-Id`) or generated; echoed on
  outbound calls and written into published events.
- Error tracking hook (e.g., Sentry DSN via env) — optional locally, mandatory in staging+.

### 5. Event envelope (all services that publish)
Frozen shape, aligned with `order.fulfilled` v1:

| Field | Type | Notes |
|---|---|---|
| `event_type` | string | `{aggregate}.{action}`, e.g. `lot.reserved` |
| `schema_version` | integer | bump on breaking change; never edit a shipped version |
| `event_uuid` | string (UUIDv4) | unique; consumers dedupe on this |
| `occurred_at` | ISO8601 UTC | |
| `tenant_id` | string | |
| `correlation_id` | string | inherited from triggering request where applicable |
| `payload` | object | typed per event schema in `contracts/events/` |

Outbox rules: append-only table; write in the same DB transaction as the state change; consumers
poll ordered by `(occurred_at, id)` within tenant; at-least-once delivery; idempotent handlers;
unknown `schema_version` → log loudly, skip, never crash.

### 6. Contract tests (non-negotiable)
- **Event contract tests**: serialize fixture events, assert exact field set/types per
  `schema_version`. A failing test blocks any accidental shape change.
- **API contract tests**: assert responses match the OpenAPI spec in `contracts/api/`.
- Consumer-driven expectations: when another service depends on your events, their expected shape
  gets a locking test here too (pattern proven by KEB-M0-05).

### 7. AuthN/AuthZ
- Validate JWTs issued by identity-access (public key/JWKS); reject unsigned/expired tokens.
- Enforce RBAC scopes per module+action at the service boundary; do not trust upstream checks.
- Service-to-service calls use the same token validation or explicit service credentials issued
  by identity-access.

### 8. Data rules
- Own database only; no cross-service queries or foreign keys to other services' schemas.
- Foreign references stored as opaque IDs (+ display-name snapshots where UI needs them,
  e.g. `customer_name` in `order.fulfilled`).
- Money as integer minor units (centavos) + ISO 4217 currency string. Always.
- Migrations forward-only; rollback = new migration.

## Docker compose requirements

```yaml
services:
  db:        # postgres (+postgis if spatial), healthcheck-gated
  service:   # runs migrations on boot, loads seed if empty, exposes PORT
```

`docker compose up --build` must end with a healthy, seeded service answering `/healthz`.
Seed data includes at least one tenant with realistic demo records for the service's domain.

## Definition of Done checklist (per service)

- [ ] Repo layout matches canonical structure
- [ ] `.env.example` complete; zero hardcoded config
- [ ] Compose up → healthy + seeded demo
- [ ] `/healthz` + `/readyz` implemented
- [ ] JWT validation + RBAC enforcement at boundary
- [ ] Tenant context in rows, events, logs
- [ ] Structured logs with correlation IDs
- [ ] Outbox publisher (if it publishes) conforming to envelope
- [ ] Contract tests locking every public API + event shape
- [ ] OpenAPI + JSON Schemas committed under `contracts/`
- [ ] README documents owned entities, published/consumed events, run instructions

### Extra checklist for ⓡ reusable-layer services (ADR-005)

- [ ] Zero domain vocabulary (funeral/memorial terms) in code, schemas, APIs, seeds — merge blocker
- [ ] Domain→generic translation handled by consuming project's adapter/posting-rule config,
      never by importing domain event types into this service
- [ ] Fresh-clone demo runs with generic seed data; docs and `.env.example` written generically
- [ ] Versioning discipline suitable for pinning by future projects

## Phase 1 grains use this template immediately

identity-access · tenancy-config · commerce (catalog-pricing + commerce-ordering) · operations
(funeral-cases + scheduling-resources + property-gis) · finance-billing (incl. commissions) ·
platform bundle (workflow-engine, notification, documents, audit) — split later per the phasing
table in `microservices.md`, each split inheriting this template unchanged.

## Frontend adaptation (`web`, F1)

The `web` codebase (React/Next.js + TS per `adr-003-react-nextjs-frontend.md`) applies the same
portability bar with frontend-appropriate substitutions:

- No DB/migrations/outbox sections; state lives behind services.
- `.env.example` carries only the API Gateway base URL, auth endpoints, analytics/error-tracking keys.
- Health: a `/api/health` route returning liveness for orchestrators.
- Contract tests generate typed clients from services' OpenAPI specs and lock critical response
  shapes; event-driven UI updates consume the Gateway realtime channel, never poll service stores.
- Compose: `docker compose up --build` → production build serving SSR on its PORT against a stub
  Gateway (recorded fixtures) so it demos standalone.
