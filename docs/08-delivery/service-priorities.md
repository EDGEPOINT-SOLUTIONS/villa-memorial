# Service Prioritization — Mapped to IMSMS Contract Feature List

> **Status:** Working draft (2026-08-24). Maps the Integrated Memorial Services Management System
> (IMSMS) contracted feature list (modules A–J) onto the microservice catalog in
> [`../02-architecture/microservices.md`](../02-architecture/microservices.md) and derives build
> priority tiers.
>
> **Deployment note:** this module set is also the **frozen feature boundary for the Villa Memoria
> founding-client deployment** — a dedicated single-tenant install, release-pinned, per
> [`../02-architecture/adr-006-vm-dedicated-deployment.md`](../02-architecture/adr-006-vm-dedicated-deployment.md).
> Everything in "Deferred backlog" here is SaaS-evolution work and never auto-flows to VM.

## Feature → service mapping

| Module | Features | Owning service(s) |
|--------|----------|-------------------|
| **A. Customer Management** | Registration, database, CRM, portal, inquiries, comms | D3 crm-families · P4 notification · F1 web (portal) |
| **B. Memorial Plans** | Plan catalog, subscription, beneficiaries, installments, policy/maturity status | D1 catalog-pricing (plan catalog) · D2 commerce-ordering (pre-need contracts/subscriptions) · D8 finance-billing (installments, status monitoring) · D3 (beneficiaries) |
| **C. Funeral Services** | Scheduling, wake mgmt, coordination, vehicle/staff assignment, inventory utilization | D4 funeral-cases · D5 scheduling-resources · D9 inventory |
| **D. Memorial Lot & Cemetery** | Cemetery mapping, lot inventory/reservation/ownership, interment scheduling, occupancy | D6 property-gis (all of it) · D5 (interment scheduling) |
| **E. Billing & Collection** | Billing generation, collections, official receipts, payment monitoring, aging, reports | D8 finance-billing · P5 documents (receipts) |
| **F. Accounting** | GL, cash receipts/disbursements, journal entries, financial statements | ⚠️ **Gap — see below** (beyond current D8 "accounting integration" scope) |
| **G. Human Resource** | Employee records, attendance, leave, payroll interface | ⚠️ **Gap — no service exists in catalog** |
| **H. Document Management** | Repository, search, attachments | P5 documents |
| **I. Executive Dashboard** | Sales/collection/operational dashboards, exec & statistical reports | E2 reporting-analytics · F1 web |
| **J. System Administration** | Users, roles/permissions, audit trail, security settings, backup utilities | P1 identity-access · P6 audit · P2 tenancy-config · backup = infrastructure |

## Gaps — RESOLVED (ratified 2026-08-24)

1. ~~Accounting (F)~~ → **Decision A: standalone `accounting` service (D12)** — configurable
   chart of accounts, GL, journal entries, cash receipts/disbursements, financial statements.
   Classified as a reusable layer (ADR-005); consumes generic posting instructions mapped from
   `finance-billing` events via posting-rule configuration.
2. ~~Human Resource (G)~~ → **Decision A: new `hr` service (D13)** — employee records,
   attendance, leave monitoring; payroll as outbound interface. Also a reusable layer.
3. Not required by this contract: ai-orchestration, digital memorials, field-ops offline PWA,
   support-ticketing (customer inquiries fold into D3 for this phase).

## Priority tiers

Ordering logic: foundation first (everything depends on J), then the revenue spine (B→E),
then operations (C/D), then reporting (I).

### Tier 0 — Foundation (build first; everything blocks on these)
- **P1 identity-access** — users, roles, permissions, JWTs (module J + auth for all)
- **P2 tenancy-config** — tenants/org structure, module registry (multi-branch data model)
- **P6 audit** — audit trail is a contracted deliverable (J) touching every service

### Tier 1 — Revenue & property spine (the commercial core of the contract)
- **D3 crm-families** — A entirely; beneficiaries for B
- **D1 catalog-pricing** — plan catalog (B) and service/product catalog (C)
- **D2 commerce-ordering** — plan subscription/pre-need contracts (B)
- **D8 finance-billing** — B installments/status, E entirely
- **D6 property-gis** — D entirely (cemetery mapping, lots, interment, occupancy)
- **P5 documents** — official receipts (E), contracts/certificates (B/D)
- **D12 accounting** ⓡ — F entirely; built alongside D8 so posting rules and the chart of
  accounts are designed together

### Tier 2 — Operations
- **D4 funeral-cases** — C case/wake/service coordination
- **D5 scheduling-resources** — C scheduling, vehicle/staff assignment; D interment scheduling
- **D9 inventory** — C inventory utilization
- **P4 notification** — A communications (SMS/email), reminders feeding B/E
- **D13 hr** ⓡ — G entirely (records/attendance/leave); can start after Tier 0 since nothing
  depends on it, but must land before contract completion

### Tier 3 — Visibility & admin polish
- **E2 reporting-analytics** — I entirely (dashboards consume Tier 1–2 events)
- **P3 workflow-engine** — configurable lifecycles; can start embedded in D4/D6 and extract

### Deferred (outside this contract's critical path)
- **E1 ai-orchestration** · digital memorials/public-web content beyond customer portal ·
  D10 field-ops · D11 support-ticketing (fold inquiries into D3 for now)

## Sequencing note vs Phase 1 coarse grains

Tier 0 ≈ platform grain; Tier 1 ≈ commerce + operations + finance grains. The Phase 1 coarse-grain
plan in `microservices.md` already matches these tiers — build grains in tier order, split later
per the phasing table. The two gaps (accounting, HR) should be resolved before Tier 1 starts,
since both touch finance-billing's schema.
