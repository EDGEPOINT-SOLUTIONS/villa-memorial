# CP-1 Day Plan — Aug 24–28 (VM feature-complete sprint)

> **Status:** Adopted (2026-08-24). Zoom-in of [`checkpoint-delivery-plan.md`](checkpoint-delivery-plan.md)
> Phase 1. Ownership gates and review rules from [`microservices-build-plan.md`](microservices-build-plan.md)
> apply every day. Cut lines at the bottom are pre-agreed — invoke them, don't negotiate them.

## Sprint-wide working agreements

- **Repo shape:** 4 coarse-grain backend repos + `web`: `platform` (identity-access ·
  tenancy-config · audit) · `commerce-finance` (catalog-pricing · commerce-ordering ·
  finance-billing · accounting) · `operations` (funeral-cases · scheduling-resources ·
  property-gis) · `web`. Splits happen post-CP-2, never during the sprint.
- **Daily rhythm:** 08:30 sync (15 min, blockers only) · contracts freeze decisions at EOD ·
  nightly scope check against cut lines · every merge reviewed same day (Keb reviews all;
  money/auth/contracts are Keb-merge-only).
- **Gab's loop:** task card (per capacity-building-plan format) → coding agent → run self-check
  commands from AGENTS.md → PR → checklist. Blocked >30 min → escalate or note in card retro.
- **Fixtures-first:** Gab's screens are built against recorded contract fixtures so he never waits
  on Keb's services; fixture↔contract drift fails CI nightly.

---

## Day 0 — Sun Aug 24: Scaffolding & contracts infrastructure

**Keb** — ✅ DONE (2026-08-24, verified live)
| Block | Deliverable |
|---|---|
| AM | Service template repo (`service-template/`) + generator (`tools/generate-service.sh`): compose (svc+db+seed), `/healthz`·`/readyz`, migrations dir, seed harness, **contract-test runner**, outbox publisher/consumer skeleton — unit/contract/integration suites all green |
| PM | Event envelope v1 committed (code + JSON Schemas + locking tests) · edge gateway (`edge-gateway/`: nginx + jwt-verifier sidecar, TLS/rate-limit/auth matrix verified) · AGENTS.md exemplars: template + platform + identity-access + web (`docs/08-delivery/exemplars/`) · **dedicated-profile compose stack as CI target** (`.github/workflows/ci.yml`, boots + fail-closed verified) |

**Gab**
| Block | Deliverable |
|---|---|
| AM | Scaffold `platform` repo from template; pipeline green locally and in CI |
| PM | Agent workflow live (task-card → agent → self-check → PR); identity seeds: roles/permissions from RBAC matrix, user fixtures per persona |

**EOD gate:** any templated repo goes clone→green unaided; dedicated single-tenant stack boots in CI; envelope v1 committed.

---

## Day 1 — Mon Aug 25: Foundation

**Keb** — ✅ DONE (2026-08-25, verified live). **Stack note:** backend re-based to Rails per
[ADR-007](../02-architecture/adr-007-rails-backend.md) — Node Day-1 implementations moved to
`legacy/`, all contracts/gates re-proven on Rails (e2e green).
| Block | Deliverable |
|---|---|
| AM | identity-access: RS256 issuance (persistent keys + kid), JWKS endpoint, bcrypt login, refresh rotation w/ family reuse-detection, users/roles/permissions enforcement — 10/10 tests green |
| PM | tenancy-config: provisioning + module registry A–J (+ `tenant.provisioned` v1 outbox) · audit: append-only trail + tenant-scoped query endpoint · **EOD FREEZE DONE**: `contracts/jwt-claims-v1.md` · `contracts/tenant-context-header-v1.md` · `contracts/audit-event-types-v1.md` |

EOD gate proof: `platform/tests/e2e.sh` green on live Rails stack — login via gateway → RBAC denials at service boundary → audited action → queryable tenant-scoped trail.

**Gab**
| Block | Deliverable |
|---|---|
| AM | `web` shell: login page (fixtures first, real JWKS when live), BFF session handling |
| PM | Staff portal frame with RBAC-gated nav; error/empty/loading states per design system; notification ⓡ spec walkthrough notes |

**EOD gate:** login end-to-end through gateway; an action writes a queryable audit row; portals render role-differentiated navs.

---

## Day 2 — Tue Aug 26: Money spine

**Keb** — ✅ DONE (2026-08-26, verified live; money path e2e green)
| Block | Deliverable |
|---|---|
| AM | catalog-pricing ✅: items/packages/add-ons + price rules (11 VM line-items seeded; prices placeholder pending VM import) |
| PM | commerce-ordering ✅ (checkout per frozen KEB-M0-10, server-priced, `order.fulfilled` v1) · finance-billing ✅ (invoice + 50%/3-month schedule from events, payment allocation oldest-first) · accounting ⓡ ✅ (generic ledger + posting-rule config, trial-balance proof) · **EOD FREEZE DONE**: `contracts/order-events-v1.md` · `payment-completed-v1.md` · `posting-instruction-v1.md` |

**Gab**
| Block | Deliverable |
|---|---|
| AM | Customer registration, inquiry capture, family account screens (A) — against frozen contracts/fixtures |
| PM | Plan catalog + subscription/pre-need contract UX (B) · notification ⓡ: templates + rule engine skeleton + console delivery provider (real SMS/email provider deferred to Phase 2) |

**EOD gate:** the money path proves itself — buy → `order.fulfilled` → invoice → payment → journal entry visible in GL. This is the day that de-risks the whole checkpoint; if it slips, invoke cut lines immediately.

---

## Day 3 — Wed Aug 27: Operations & property

**Keb**
| Block | Deliverable |
|---|---|
| AM | property-gis: park→section→block→lot model, status lifecycle, reservation → sale; lot grid API (JSON; GeoJSON if time) |
| PM | funeral-cases: minimal lifecycle consuming `order.fulfilled` (create case, stage changes) · scheduling-resources: bookings + calendar view (auto-conflict blocking deferred) · **EOD FREEZE: `lot.*` family · `case.stage.changed` · `booking.confirmed`** |

**Gab**
| Block | Deliverable |
|---|---|
| AM | Lot inventory/grid UX + reserve-and-pay flow (scenarios D/F/G) over Keb's APIs |
| PM | Billing/collections/official-receipt screens (E) · hr screens (G): employees, attendance, leave · ops board reading case/booking/task state (scenario H view) |

**EOD gate:** scenario F (map/search → select lot → reserve → pay) and scenario H (paid order creates case + chapel booking + staff tasks) both run end-to-end.

---

## Day 4 — Thu Aug 28: Integration, proof, checkpoint

| Time | Who | Activity |
|---|---|---|
| 08:30–12:00 | Keb | documents ⓡ: receipt/certificate generation from templates (E/H artifacts) · cross-service integration fixes · trial-balance proof from posted journals · security smoke (authz denials logged, tenant isolation spot-check) |
| 08:30–12:00 | Gab | Dashboards (I): collections/sales/ops as query-backed tables · document repository screens (H) · **known-limitations list per module A–J** · demo script assembly |
| 13:00–14:30 | Both | Full dress rehearsal of the demo script on the **dedicated profile** — fix only what breaks the script |
| 15:00–17:00 | All | **CP-1 checkpoint demo**: walk modules A–J flows on dedicated deployment, ending with GL postings + audit trail + known-limitations handout |

**CP-1 exit = checkpoint DoD** (see checkpoint-delivery-plan.md): every contracted flow runs end-to-end with real data; money posts to GL; cross-service events drive cases/bookings/tasks; contract tests green; limitations documented.

---

## Pre-agreed cut lines (invoke in order when a day slips)

1. GIS interactivity → static lot grid/list (Wed AM)
2. Financial statements → journal entries + trial balance only (Thu)
3. Auto-conflict blocking → calendar display + manual vigilance (Wed PM)
4. Dashboards as charts → query-backed tables (Thu AM)
5. GeoJSON map payloads → JSON grids (Wed)

**Never cut:** authN/authZ · audit trail · money-to-GL postings · contract tests · tenant scoping · the demo itself.

## Post-checkpoint immediate actions (Fri Aug 29)

- Tag `vm-1.0.0-rc1`; open Phase-2 backlog from the known-limitations lists (feeds W1 of September)
- Retro: what agents got wrong → update AGENTS.md traps sections same day
- Gab's ladder checkpoint: Stage 1 criteria reviewed against evidence
