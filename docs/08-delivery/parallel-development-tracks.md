# Parallel Development Tracks — 3-Person Team (Keb, Jawi, Gab)

Supersedes the pod model in [team-and-workflow.md](team-and-workflow.md) for the current phase.
JP (business systems) and Hana (QA/data) are not staffed; their responsibilities are redistributed
below and several scopes are explicitly deferred to keep the 4-week MVP achievable with three people.

## Staffing reality & consequences

| Removed capacity | Redistribution |
|---|---|
| JP — commerce/finance backend | Keb absorbs catalog/pricing/orders/payments; pre-need plans **deferred** (scenario E drops out of MVP demo set unless W3 goes well) |
| Hana — QA, master data, traceability | Test-writing shifts to each track owner; Gab owns seed/demo fixtures; regression checklist owned by Keb at Friday demos. Traceability becomes a lightweight spec→test note per feature card |

**Rule of thumb:** each person owns one vertical slice end-to-end (spec → build → test → docs).
No handoffs between people inside a week.

---

## Track A — Platform Core + Commerce + Money  (Keb)

Everything other tracks depend on, plus the transactional engine.

1. **W1 foundation:** Postgres (+PostGIS) switch, tenancy scoping, RBAC, audit concern,
   notification/job patterns, CI/CD, module boundaries decision
2. Catalog: products/services/packages/add-ons
3. Pricing rules engine (per-tenant, versioned)
4. Cart/order/checkout, order state machine, payment adapter + idempotent webhooks
5. Order→fulfillment event schema (the hook Jawi consumes — freeze in W1)
6. Minimal manager dashboard reads (scenario K) — simple queries/views only
7. AI assistant demo (scenario L) — last-week spike, read-only retrieval, cut first if squeezed

## Track B — Operations + Memorial Property/GIS  (Jawi)

The service-delivery and property domains.

1. Funeral case + deceased records (customer ≠ deceased relationship modeling)
2. Embalming/preparation; viewing/wake scheduling
3. Chapel/facility booking + shared availability service (also serves lot scheduling)
4. Vehicles/dispatch, retrieval/transfer — trim to what scenario H needs
5. Operations board + task/checklist engine consuming Track A fulfillment events
6. PostGIS park → section → block → row → lot geometry, map search API
7. Lot reservation/sale linkage to orders; ownership record; interment linked to case

## Track C — Experience Layer + Family Surface  (Gab)

All user-facing surface, built against API contracts/fixtures so it never blocks on A or B.

1. Design system with full UI states (loading/empty/error/validation/permission-denied)
2. Staff/admin shell wired to RBAC matrix
3. Checkout UX, ops board UI, chapel scheduling UI
4. Lot map UI over Jawi's GeoJSON endpoints
5. Customer/family portal: payments, orders, documents view (scenario I)
6. Digital memorial + QR code page + tribute submission/approval flow (scenario J)
7. Seed/demo data for all tenants, catalogs, parks (absorbing Hana's master-data role)

---

## Cross-track contracts (freeze in W1 — these are the whole parallelization strategy)

| Contract | Producer → Consumer | Owner |
|---|---|---|
| Tenancy/auth/audit patterns | Keb → everyone | Keb |
| Order fulfilled event schema | A → B | Keb drafts, Jawi reviews |
| Availability/scheduling service interface | B → B (chapels + lots share it), C consumes | Jawi drafts, Gab reviews |
| GeoJSON lot/map API shape | B → C | Jawi drafts, Gab reviews |
| Order/payment/case API shapes | A → C | Keb drafts, Gab reviews |

Contract changes require PR review by the consumer. Contracts versioned; no silent edits.

## Revised MVP scope for 3 people

Keep (scenarios): **A, B, C, D** (commerce paths) · **F, G, H** (property↔case integration) · **I, J** (portal/memorial) · **K** (dashboard)
Defer / cut first under pressure:
- **E** (pre-need plans) — model stubbed, flows post-MVP
- AI assistant (**L**) — spike only in W4, first thing dropped
- CRM/commissions, collections depth, accounting export — post-MVP
- Vehicle dispatch beyond minimal retrieval task

## Week plan

| Week | Keb (A) | Jawi (B) | Gab (C) |
|---|---|---|---|
| W1 | Tenancy/RBAC/audit/CI, contracts frozen ★ | Case/deceased models, availability service design, GIS setup | Design system, shells, seed data |
| W2 | Catalog → pricing → cart/order → payments (M1 demo A–D) | Chapel booking, embalming, ops board backend | Staff UIs for shipped APIs, checkout UX |
| W3 | Fulfillment events live, order→case wiring support | Lot map/search/reservation, interment link (F,G,H) | Map UI, ops UI, family portal (I) |
| W4 | Dashboard (K), AI spike (L), hardening | Ownership/transfer, interment completion, fixes | QR memorial (J), portal polish, UAT support |

★ W1 exit gate: no migrations/routes from Jawi or Gab before Keb's tenancy/RBAC/audit patterns merge.

## Cadence (adjusted for 3 people)

- Daily 15-min stand-up; contracts reviewed async via PRs same-day
- Friday integrated demo remains the hard integration point — trunk must run all scenarios demoed so far
- Keb retains architecture/security/release gate; JBR business acceptance unchanged

## Risks specific to this staffing

- **Bus factor = 1 per domain.** Mitigate: everything in one repo, pair on cross-track contract changes, no private branches older than 2 days.
- **No dedicated QA.** Mitigate: system specs mandatory per feature card before Friday demo; Keb runs the A–L regression checklist weekly.
- **Keb overload (foundation + commerce + money).** Pre-need (E) and AI (L) are the designed pressure valves — cut them, don't slip the foundation.
- **Jawi spans two domains.** Ops wins ties in W2–W3; GIS map search is the minimum property deliverable.
