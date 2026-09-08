# Microservice Decomposition

> **Status:** Proposed (2026-08-24). Supersedes the single-deployable framing of
> [`adr-001-rails-monolith.md`](adr-001-rails-monolith.md); see
> [`adr-002-microservices.md`](adr-002-microservices.md) for the decision record.
> Each module is an independent codebase: standalone, portable, own repo, own database.

## Decomposition principles

1. **Database per service** — no shared schemas or cross-service DB queries. Integration happens
   only through versioned APIs and events.
2. **Bounded context = deployable boundary** — consolidates the ~50 blueprint bounded contexts
   (`system-architecture.md`) into services that are cohesive around data ownership yet small
   enough for a three-builder team.
3. **Deterministic core** — money calculations, payment allocation, ownership changes, schedules,
   permissions, and status transitions are conventional application logic inside their owning
   service. AI never owns them (`05-ai/ai-governance.md`).
4. **Standalone & portable** — every service ships with:
   - its own repository, schema/migrations, seeded dev DB (`docker-compose.yml` up = working demo)
   - config via environment; no build-time coupling to other services
   - health checks, structured logging, correlation IDs
   - versioned API contracts and event schemas (`schema_version` discipline per
     `08-delivery/contracts/order-fulfilled-event.md`)
5. **Events are first-class contracts** — the `order.fulfilled` outbox pattern generalizes:
   append-only, tenant-scoped, at-least-once delivery, idempotent consumers, dedupe on
   `event_uuid`, ignore unknown schema versions without crashing.
6. **Tenant ID on everything** — every entity, event, and log line carries tenant context;
   isolation enforced at the service boundary (`multi-tenancy.md`).

## Service catalog

### Platform services (cross-cutting)

| # | Service | Owns | Notes |
|---|---------|------|-------|
| P1 | **identity-access** | Users, roles, permissions, MFA, sessions, API keys | Issues JWTs consumed by all services; RBAC granular per module+action (`roles-permissions.md`) |
| P2 | **tenancy-config** | Tenants, orgs, business units, branches, facility registry, module on/off, terminology, branding | The Configuration Engine lives here; publishes config snapshots |
| P3 | **workflow-engine** | Workflow definitions, stage instances, state machines, checklists, approvals, deadlines, escalations | Generic executor — funeral case / interment / transfer lifecycles are *data*, not code |
| P4 | **notification** | Templates, notification rules, delivery logs, consent records | Channels: email · SMS · Messenger · push · in-app; consumes domain events |
| P5 | **documents** | Templates, generated documents, versions, e-signature, verification statuses, storage refs | Death certificates, permits, contracts, certificates of ownership |
| P6 | **audit** | Append-only audit trail (user, action, timestamp, IP/device, entity+ID, old/new value, reason) | Never silently delete critical historical records |

### Domain services

| # | Service | Owns | Publishes (examples) |
|---|---------|------|---------------------|
| D1 | **catalog-pricing** | Services, products, packages, add-ons, price rules, promos/discounts, effective-dated pricing | `catalog.updated`, `price.changed` |
| D2 | **commerce-ordering** | Carts, quotes, orders (at-need / pre-need contract / property transaction), checkout holds | `order.fulfilled` v1 (frozen), `quote.created`, `cart.abandoned` |
| D3 | **crm-families** | Leads, pipeline, opportunities, customers, family accounts + members + relationships, engagement reminders | `lead.converted`, `customer.created` |
| D4 | **funeral-cases** | Funeral cases, deceased records, embalming/preparation records | `case.opened/closed`, `case.stage.changed` |
| D5 | **scheduling-resources** | Chapels, rooms, vehicles, drivers, staff calendars, bookings, temporary holds w/ expiry, dispatch | `booking.confirmed`, `dispatch.completed` |
| D6 | **property-gis** | Parks → sections → blocks → lots, lot status lifecycle, reservations, ownership/transfers, interments/exhumations, GIS geometry, QR targets | `lot.reserved/sold/occupied`, `interment.recorded`, `transfer.approved` |
| D7 | **public-web** | Digital memorials, media, tributes, privacy controls, QR/NFC targets, CMS content, SEO/structured data, public catalog reads | `memorial.published`, `content.published` |
| D8 | **finance-billing** | Payments, invoices, receipts, installment schedules, refunds, AR aging, collections, commission engine (see Open Decisions) | `payment.completed/failed`, `invoice.overdue` |
| D9 | **inventory** ⓡ | SKUs, suppliers, stock movements, allocations/reservations to orders, reorder levels — industry-neutral stock model; funeral goods are item attributes | `stock.low`, `item.allocated` |
| D10 | **field-ops** | Maintenance/work orders, inspections, photo evidence, offline-sync PWA backend | `workorder.completed` |
| D11 | **support-ticketing** | Universal "Create Request" tickets, SLAs, escalation | Fold candidate — see Open Decisions |
| D12 | **accounting** ⓡ | Chart of accounts (configurable per project), journal entries/lines, cash receipts/disbursements, fiscal periods, financial statements | Consumes generic posting instructions derived from domain events via posting-rule configuration; no domain vocabulary. Ratified 2026-08-24 (IMSMS module F) |
| D13 | **hr** ⓡ | Employee records, attendance, leave monitoring; payroll as outbound interface only | Generic employer/workforce model. Ratified 2026-08-24 (IMSMS module G) |

### Edge & analytics services

| # | Service | Role |
|---|---------|------|
| E1 | **ai-orchestration** | Assistants, persona copilots, RAG/knowledge retrieval, drafting. Read-only over other services' APIs + event stream; outputs require human confirmation before any write elsewhere |
| E2 | **reporting-analytics** | Consumes all events into a reporting store; reporting catalog, ops/exec dashboards, BI roadmap |

### Reusability classification (ADR-005)

ⓡ = reusable layer (product-agnostic, deployable in any Edgepoint project):
**P1–P6, D11–D13, E2**. Design rules:

- Generic ubiquitous language only — no funeral terms in code/schemas/APIs/seeds.
- Integration via generic contracts; domain→generic translation happens through posting-rule /
  adapter configuration owned by the consuming project, never imported event types.
- Portability review added to DoD: fresh-clone demo with generic seed data, generic docs/config.

All other services are **domain layer** (funeral & memorial subject matter). Domain services are
not force-fit into reusable shapes; extraction stays possible because boundaries are
service-shaped. See [`adr-005-reusable-service-layers.md`](adr-005-reusable-service-layers.md).

### Candidate reusable extractions (reviewed 2026-08-24)

Capabilities in the docs that pass (or nearly pass) the ADR-005 test. Classification action
differs by tier — "classify now" costs nothing at design time; "split" means carve the generic
core out of an existing domain service when it earns extraction.

| Candidate | Source in docs | Assessment | Action |
|---|---|---|---|
| **inventory** | blueprint §31 (SKU, suppliers, stock movements, reorder) | Stock management is industry-neutral; caskets/urns are just item attributes | **Classify now** — apply generic language from first commit (D9 becomes ⓡ) |
| **booking/scheduling core** | §10, §13–14, §35 (resource calendars, conflict detection, temporary holds w/ expiry, dispatch) | Resources-with-calendars-and-holds is generic; chapels/wakes/hearses are configured *resource types* | **Split later** — build D5 with a clean generic core (resources, calendars, holds, conflicts) + domain shell; extract core if a second project needs booking |
| **billing/payments core** | §28 (gateway abstraction, invoices, schedules, receipts data) | Invoicing + installment scheduling + idempotent gateway integration is generic; funeral allocation/pricing rules are domain | **Split later** — same approach: generic billing core inside D8, keep allocation rules in domain shell |
| **commission/incentive engine** | §34 (rates, tiers, splits, milestones, clawbacks) | Rules-based sales-commission machinery is cross-industry | **Extract on demand** — lives in D8 until a second project needs it |
| **CRM core** | §33, §25–26 (leads, pipeline, contacts, activities) | Lead/opportunity/contact/activity model is generic; the family/deceased/relationship graph is domain | **Split later** — keep D3 whole; note the seam (crm-core vs family-graph) |
| **cms** | §50 (pages, banners, SEO, structured data) | Content management + SEO is fully generic | **Split later** — currently merged into public-web (decision #2); extract `cms` if reused |
| **knowledge-retrieval (RAG)** | §16 AI Knowledge Assistant, ai-capabilities.md | Tenant-docs retrieval pipeline is generic; persona copilots are domain | **Split later** — inside E1; retrieval core is the extractable half |
| **spatial/GIS core** | §15, §17, §43 (geometry, layers, map tiles) | Polygon storage, layer rendering, geosearch are generic; cadastral/lot model is domain | **Split later** — D6 keeps lot semantics; geometry/tile serving is the generic core |
| **consent management** | security baseline, §41 (lawful marketing only with consent), ConsentRecord entity | Consent capture/withdrawal/audit is needed by any product under privacy law | **Classify now** — implement as part of P4 notification (or P1) with generic consent API, not buried in domain code |
| **search/indexing** | H "Search Facility", AI Search | Unified indexed search across entities is generic plumbing | **Classify now (lightweight)** — generic index service consuming events; starts small inside reporting-analytics or standalone `search` |
| **work orders** | §38 (assignment, priority, SLA, photo evidence) | Work-order lifecycle is near-generic; lot/asset linkage is domain context | Leave in D10; revisit if another project needs field ops |
| **media/assets** | media fields throughout, virtual tours, photo evidence | Upload/processing/DAM is generic; funeral media types are domain | Defer — object storage + P5 documents cover current needs |

Rule applied: nothing moves to ⓡ today except inventory (+ consent/search handled as noted);
everything else gets its **seam documented now** so future extraction is mechanical, honoring the
ADR-005 guardrail against premature abstraction.

### Frontend (independent codebase)

| # | Codebase | Role |
|---|----------|------|
| F1 | **web** | Single React/Next.js + TypeScript app for all surfaces — public site (SSR/ISR), family portal, staff/admin portals, ops board. Talks only to the API Gateway over `api/v1` contracts; PWA/offline field-ops build on the same repo. See [`adr-003-react-nextjs-frontend.md`](adr-003-react-nextjs-frontend.md) |

> Note: CMS/public-web concerns were merged into **public-web** (D7) per ratified decision #2
> (2026-08-24); no separate cms-public-web service.

### Infrastructure (assumed, not services)

API Gateway / BFF · object storage (documents/media) · PostgreSQL + PostGIS per service where
spatial data is needed.

#### BFF & edge gateway — ratified decision (2026-08-24)

Per [`adr-004-bff-gateway.md`](adr-004-bff-gateway.md):

- **BFF**: `web`'s Next.js server side (Route Handlers / Server Components) aggregates and
  reshapes service responses; owns sessions; forwards verified JWTs. Guardrail: fetch ·
  aggregate · reshape · session-manage only — no business rules, no data writes.
- **Edge gateway**: thin config-driven layer (NGINX/Caddy/Traefik to start) — routing, JWT
  validation, rate limiting, TLS. No aggregation in config.
- **Extraction trigger**: dedicated `bff` service when a second consumer class appears (mobile,
  partner APIs), or aggregation/deploy coupling becomes measurable pain.

#### Event backbone — ratified decision #5 (2026-08-24)

No message broker for now. Events are persisted **outbox tables** per producing service;
consumers poll, exactly as frozen in `order.fulfilled` v1:

- append-only `events` table per service, tenant-scoped, unique `event_uuid`
- consumers poll ordered by `(occurred_at, id)` within tenant, dedupe on `event_uuid`, apply
  idempotently, skip unknown `schema_version`s loudly without crashing
- envelope fields (`event_type`, `schema_version`, `occurred_at`) are part of the service template
- revisit trigger: fan-out to >~3 consumers per event or cross-service latency pain → add a broker
  behind an outbox→relay pattern so producer code does not change

## Key interaction flows (illustrative)

```
Checkout:      commerce-ordering ── order.fulfilled ──▶ funeral-cases (create case)
                                                 ├──▶ scheduling-resources (bookings, holds)
                                                 ├──▶ finance-billing (schedule installments)
                                                 └──▶ notification (confirmation)

Lot sale:      property-gis ── lot.reserved ──▶ commerce-ordering (property txn)
                             ── lot.sold ──────▶ documents (certificate of ownership)
                             ── interment.recorded ──▶ public-web, reporting-analytics
```

## Phasing (recommended)

19+ repos is too much operational surface for three builders on an MVP timeline. Start coarse,
split along these seams when a service earns it:

| Phase | Coarse grains | Split later into |
|-------|--------------|------------------|
| 1 | identity-access · tenancy-config · commerce (D1+D2) · operations (D4+D5+D6) · finance-billing (D8) · platform (P3–P6) | as listed above |
| 2 | split operations → funeral-cases, scheduling-resources, property-gis | D7 (public-web), D9, D10, D11 |
| 3 | edge services E1–E2 as separate deployables | — |

Rule: never split a grain until two teams need to change it at different cadences or its scaling
profile diverges.

## Ratified boundary decisions (2026-08-24)

| # | Decision | Outcome |
|---|----------|---------|
| 1 | Commissions placement | **Inside `finance-billing`** for now; extract to standalone when the agent portal/rules engine grow |
| 2 | Public surface | **Merged**: digital memorials + CMS/SEO live in one **`public-web`** service (D7) |
| 3 | Field operations home | **Standalone `field-ops`** service (work orders, inspections, offline-sync PWA backend); vehicle dispatch stays in `scheduling-resources` |
| 4 | Support ticketing | **Standalone `support-ticketing`** service (universal cross-domain "Create Request") |
| 5 | Event backbone | **DB outbox tables + polling consumers**, no broker; revisit trigger documented above |
| 6 | Service scaffolding template | **Create now** before any new codebase starts → [`service-template.md`](service-template.md) |

Final count: **20 backend services** (P1–P6, D1–D13 with public-web merged, E1–E2) **plus one
frontend codebase** (`web`, F1). Eleven are reusable-layer classified per ADR-005 (incl. D9
inventory, reclassified 2026-08-24).
