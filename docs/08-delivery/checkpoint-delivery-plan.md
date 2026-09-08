# Checkpoint Delivery Plan — Aug 28 & Sep 30

> **Status:** Adopted (2026-08-24). Governs schedule; supersedes week numbering in
> [`microservices-build-plan.md`](microservices-build-plan.md) Rev 2 (ownership map, review gates,
> capacity ladder remain fully in force).
>
> **CP-1 · Thu Aug 28:** all founding-client (Villa Memoria) features finished — IMSMS modules
> A–J on the dedicated single-tenant profile.
> **CP-2 · Tue Sep 30:** entire SaaS platform delivered — multi-tenant platform + deferred
> capabilities live.

## What "finished" means (checkpoint definitions of done)

### CP-1 — VM feature-complete (Aug 28)
A module counts as finished only if **all** hold:
- Every contracted user flow in the module executes end-to-end on the dedicated profile with real
  (seeded) data — no mocked screens behind the happy path
- Money flows post to the GL through posting-rule configuration (module E/F proof)
- Cross-service flows run through real events (`order.fulfilled` → case → bookings → tasks)
- Contract tests green; compose stack healthy; audit trail captures the flows
- Known-limitations list written per module (allowed; silent gaps are not)

Explicitly **deferred to September** without failing CP-1: performance tuning, penetration-test
remediation beyond basics, UI polish, load testing, training materials, VM production data
migration (rehearsal only), offline PWA, AI features.

## Phase 1 — CP-1 sprint (Aug 24 → Aug 28)

Working mode: agent-leveraged parallel streams; Keb reviews every merge daily (see ownership map
in build plan); no meetings beyond a 15-min morning sync and the CP-1 demo.

| Day | Keb | Gab |
|---|---|---|
| **Sun 24** | Wave 0 compressed: service template + generator; event envelope v1; edge gateway config; AGENTS.md exemplars (template, identity-access, web); dedicated-profile compose CI target | Scaffold practice; agent workflow setup; seeds for identity/tenancy |
| **Mon 25** | identity-access, tenancy-config, audit; JWT/tenant/audit contracts frozen by EOD | `web` shell: login, RBAC nav, staff portal frame vs frozen fixtures |
| **Tue 26** | catalog-pricing + commerce-ordering (minimal state machines); finance-billing + accounting with posting rules | Customer mgmt screens (A); plan catalog + subscription UX (B); notification ⓡ core |
| **Wed 27** | property-gis core (lots/status/reservation/ownership), funeral-cases + scheduling-resources minimal (scenario H path); interment scheduling | Lot map + reservation UX (D); billing/collections/receipt screens (E); hr screens (G); ops board |
| **Thu 28** | Integration fixes; documents/receipts wiring; GL proof; **CP-1 demo on dedicated profile** | Dashboards (I) minimal; document screens (H); demo prep; known-limitations list |

**Cut lines if a day slips** (in order): GIS map interactivity → static lot grid · accounting
statements → journal entries + trial balance only · scheduling conflict detection → calendar view
without auto-conflict blocking · dashboards → tables over queries. Never cut: auth, audit,
money-to-GL, contract tests.

## Phase 2 — Hardening & SaaS build (Sep 1 → Sep 30)

### Week 1 (Sep 1–7): VM hardening to production-ready
- Depth pass on what CP-1 cut: GIS interactivity, scheduling conflicts, statements
- Security baseline, backup/DR validation (J), load smoke tests
- VM data migration rehearsal; training materials start
- **Fri Sep 5 gate:** VM release candidate v1.0

### Week 2 (Sep 8–14): VM cutover + platform foundations
- **VM production cutover** on VM's server; hypercare window
- Multi-tenant hardening: tenant provisioning automation, per-tenant module flags/config engine,
  tenant-isolation test suite
- Workflow-engine extraction begins (Gab's Stage 3→4 project, Keb reviewing)

### Week 3 (Sep 15–21): SaaS differentiators
- public-web: CMS, SEO, digital memorial pages, QR targets (SaaS-only surface)
- ai-orchestration: read-only assistants over the event stream (case summaries, search) —
  deterministic-core guardrails enforced
- support-ticketing ⓡ standalone; reporting-analytics exec dashboards completed

### Week 4 (Sep 22–29): SaaS completeness & assurance
- field-ops PWA (online-first, selected offline views)
- Performance/load testing, penetration test + fixes, observability polish
- SaaS onboarding path proven: second tenant configured via tenancy-config without code changes
  (**the "build once configure many times" acceptance test**)
- **Tue Sep 30 · CP-2:** SaaS platform demo — two+ tenants live, differentiated configs, full
  module set, AI assistants, ticketing, public web

## Checkpoint exit criteria summary

| | CP-1 (Aug 28) | CP-2 (Sep 30) |
|---|---|---|
| Profile | Dedicated single-tenant | SaaS multi-tenant (+ VM patched & live) |
| Modules | A–J functional, known-limits documented | A–J hardened + deferred backlog shipped |
| Proof | End-to-end flows + GL postings + audit trail | Second tenant onboarded config-only; load/security passed |
| Docs | Per-service DoD complete | User/admin manuals, technical docs, training materials (contract deliverables) |

## Risks & responses

| Risk | Response |
|---|---|
| CP-1 scope doesn't fit 5 days | Cut lines pre-agreed (above); Keb re-scopes nightly; scope bar is flows, not polish |
| Agent-generated defects under sprint pressure | Contract tests are non-negotiable floor; Keb daily review of every merge; traps sections updated same-day |
| Keb bottleneck across 20 services | Coarse-grain repos; Gab owns all screen surfaces + 3 services; deferred items genuinely deferred |
| VM data quality blocks migration | Rehearsal in W1 Phase 2; import-path issues fed back as seed/template fixes |
| Single-tenant regressions as SaaS evolves | Dedicated-profile CI target from Wave 0 keeps running through CP-2 |

## Post-CP-2 (October+, not scheduled here)
Iterative SaaS roadmap: predictive analytics, commissions extraction, advanced integrations,
digital twin, AR — per master blueprint phases; VM adopts by opt-in releases only.
