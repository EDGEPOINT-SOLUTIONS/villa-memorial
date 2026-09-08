# Microservices Build Plan

> **Status:** Rev 2 (2026-08-24) — two-builder team. Supersedes Rev 1 track assignments.
> **Schedule authority:** [`checkpoint-delivery-plan.md`](checkpoint-delivery-plan.md)
> (CP-1 Aug 28 · CP-2 Sep 30) governs timing; this document governs architecture of work —
> ownership map, review gates, capacity ladder, contract discipline.
> Architecture basis: [ADR-002](../02-architecture/adr-002-microservices.md) ·
> [ADR-003](../02-architecture/adr-003-react-nextjs-frontend.md) ·
> [ADR-004](../02-architecture/adr-004-bff-gateway.md) ·
> [ADR-005](../02-architecture/adr-005-reusable-service-layers.md) ·
> [`service-priorities.md`](service-priorities.md).
>
> **Dual goal:** ship the IMSMS ERP **and** develop Gab into a productive builder. Capacity
> building is a first-class workstream — see [`capacity-building-plan.md`](capacity-building-plan.md)
> and the [`agents-md-standard.md`](agents-md-standard.md) that makes agent-assisted building safe.

## Team reality

| Builder | Role | Mode of work |
|---|---|---|
| **Keb** | Project lead | Heavy lifting: architecture, all contracts, money spine, complex domain logic, reviews everything. Writes the AGENTS.md files and specs that make Gab's agent-assisted work reliable |
| **Gab** | Junior builder | Agent-orchestrated building: drives coding agents with task cards and specs written by Keb; owns UI surface and well-bounded services; grows via the capacity ladder |

Consequence of losing one builder: **scope discipline hardens.** Coarse grains stay merged longer
(platform, commerce, operations bundles may live as single repos initially, split per the phasing
table only when forced). The IMSMS contract modules A–J remain the scope bar; everything else
stays in the deferred backlog without apology.

## Ownership map

### Keb-owned (no delegation of design authority)
| Services | Why Keb only |
|---|---|
| P1 identity-access · P2 tenancy-config · P6 audit | Security foundation; everything trusts it |
| D1 catalog-pricing · D2 commerce-ordering | Transactional engine core; hardest state machines |
| D8 finance-billing · D12 accounting ⓡ | Money. Zero tolerance for junior+agent errors; posting rules & chart of accounts designed together |
| D4 funeral-cases · D5 scheduling-resources · D6 property-gis (specs + cores) | Domain complexity (case spine, booking conflicts, GIS) |
| All cross-service contracts, event schemas, AGENTS.md standards | The parallelization/reliability strategy itself |

### Gab-owned (with agent assistance, within guardrails)
| Services / surfaces | Why suitable |
|---|---|
| F1 `web` (all portals) + BFF routes | Contract-driven, fixture-first, no money logic; ideal agent territory |
| P4 notification ⓡ | Bounded domain (templates, rules, delivery logs); clean events-in/messages-out |
| D13 hr ⓡ | Simple CRUD-ish domain, generic model already specified |
| P5 documents | Template rendering + storage flows; no financial computation |
| Seeds/demo data for all services | Absorbs master-data work; teaches each domain |
| E2 reporting-analytics (Wave 4) | Read-mostly consumer; safe to learn on |

### Explicitly Keb-review-gated even when Gab builds
Any PR that: touches money math or allocations · adds/modifies an event schema or API contract ·
modifies auth/RBAC · modifies another builder's service. Gab opens PRs; Keb merges.

## Waves (adjusted)

### Wave 0 — Scaffolding, contracts, teaching infrastructure (Week 1)
- Keb: service template repo + generator; edge gateway config; JWKS stub; event envelope v1;
  **writes the first three AGENTS.md files** (template repo, identity-access, web) as exemplars per
  [`agents-md-standard.md`](agents-md-standard.md); **dedicated-profile compose stack as CI target**
  (single-tenant VM deployment proof per ADR-006)
- Gab: scaffold practice — generate services from template, get compose demos running, write seeds
  for identity-access; set up his agent workflow (task-card → agent → PR → checklist)
- **Exit:** Gab can take any templated repo from clone to green pipeline unaided (by him, not the
  agent); dedicated single-tenant stack boots in CI

### Wave 1 — Foundation ≈ Tier 0 (Weeks 1–2)
- Keb: identity-access, tenancy-config, audit built; JWT claims + tenant-header + audit-event
  contracts frozen
- Gab: `web` shell — login, RBAC-gated nav, staff portal frame — against Keb's frozen contracts
  and recorded fixtures; notification service spec read-through with Keb
- **Demo:** login → role-differentiated portals → audited trail

### Wave 2 — Revenue & property spine ≈ Tier 1 (Weeks 2–5)
- Keb: catalog-pricing → commerce-ordering → finance-billing → accounting (posting rules +
  chart of accounts together); property-gis core (geometry, lot lifecycle) — heaviest lift in the
  plan; protected time, no interruptions
- Gab: customer registration/inquiry screens (A), plan catalog + subscription UX (B), lot map +
  reservation UX (D) — all contract-driven; then P4 notification end-to-end (his first owned
  service, ⓡ rules apply)
- Frozen: `lead.converted`, `order.*`, `lot.*`, `payment.completed`, posting-instruction schema,
  notification rule/event contract
- **Milestone demo:** scenarios B/E/F/G visible; billing→GL entries; SMS/email confirmations firing

### Wave 3 — Operations ≈ Tier 2 (Weeks 4–6, overlapping W2 tail)
- Keb: funeral-cases + scheduling-resources consuming frozen `order.fulfilled` (scenario H);
  inventory schema oversight
- Gab: ops board UI, scheduling UI, vehicle/staff assignment UX; then D13 hr (G) end-to-end —
  first service where *Gab* writes the AGENTS.md draft and Keb reviews it; P5 documents
- **Milestone demo:** scenarios C/D/H; module G screens; receipts/documents flowing (E)

### Wave 4 — Visibility & hardening (Weeks 6–7 + post-launch)
- Gab: E2 reporting-analytics dashboards (I) consuming the event stream; collections/aging views
  with Keb reviewing money-display logic
- Both: regression A–K, security pass, backup/DR validation (J), UAT support
- VM-specific: cut the **VM release line** at executive acceptance — dedicated-server deploy,
  module flags locked to A–J, VM data migration via seeded-import paths, training materials
- **Executive acceptance = VM acceptance:** modules A–J demonstrable end-to-end on the
  dedicated profile

### Deferred backlog (SaaS evolution — never auto-flows to VM)
ai-orchestration (scenario L becomes read-only spike only if slack) · digital memorial content ·
field-ops PWA · support-ticketing extraction · workflow-engine extraction · broker adoption ·
fine-grained splits. Per ADR-006 these reach Villa Memoria only by opt-in patch/feature releases.

## Capacity-building integration (summary — detail in capacity-building-plan.md)

- Every Gab task arrives as a **task card**: context · spec link · acceptance criteria ·
  "what to watch out for" · learning note ("why this matters").
- Agent-generated code is never merged on trust: template DoD + review gates apply identically.
- Ladder stages gate ownership: fixtures/UI → bounded ⓡ services → domain services → contract
  authorship. Promotion criteria are written, not vibes.
- Keb protects 2×~90-min sessions/week for spec walkthroughs and PR review-with-teaching.

## Standing risks

| Risk | Mitigation |
|---|---|
| Keb overload (single point of failure) | Coarse grains; Gab absorbs everything template-conformant; deferred backlog is genuinely deferred |
| Agent-generated defects in Gab's services | Contract tests mandatory pre-PR; ⓡ generic-language checks; Keb merge gate on listed categories |
| Knowledge concentration in Keb's head | AGENTS.md standard forces written specs/decisions; Gab's seed/data work doubles as documentation |
| Timeline slip from teaching overhead | Teaching IS delivery here (specs, reviews, seeds); scope bar is IMSMS A–J only |

## Definition of done (per wave)

All wave services pass template DoD (+ⓡ checklist where applicable) · contracts locked · seeded
compose demos run standalone · wave demo executed · completeness audit noted · **Gab's ladder
criteria for the wave met and recorded.**
