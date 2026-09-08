# Deliverable Schedule — August Demo → September 30 Launch

Team: Keb · Jawi · Gab. Today: Sun Aug 23, 2026. Client demo: **Mon Aug 31**. Production launch: **Wed Sep 30**.
Companion to [parallel-development-tracks.md](parallel-development-tracks.md). Scope rule: core features
only — pre-need plans (E), AI assistant (L), CRM/commissions are post-launch.

## Milestone calendar

| Date | Milestone |
|---|---|
| Fri Aug 28 | **M0-dry**: internal walkthrough, all 3 demos run on staging |
| Mon Aug 31 | **M0 — CLIENT DEMO**: walking skeleton of full flow |
| Fri Sep 4 | **M1 — Commerce live**: real orders end-to-end (scenarios A–D) |
| Fri Sep 11 | **M2 — Operations live**: paid order creates case + bookings (scenario H) |
| Fri Sep 18 | **M3 — Property + Family live**: lot reserve→interment link, portal, QR memorial (F, G, I, J) |
| Tue Sep 22 | **Feature freeze** — bugs only from here |
| Thu Sep 24 | **M4 — UAT start**: client staff test on staging against scenario checklist |
| Mon Sep 28 | **Production deploy** (go/no-go same day) |
| Wed Sep 30 | **LAUNCH** |

---

## DEMO WEEK — Mon Aug 24 → Mon Aug 31 (day-by-day)

Goal: one continuous story on seeded data — *browse services → add to cart → checkout → order appears
in staff board → lot visible on map*. Everything runs on staging with seed data; no real payments yet
(fake/sandbox gateway), no polish beyond readable UI.

| Day | Keb | Jawi | Gab |
|---|---|---|---|
| Mon 24 | Postgres/PostGIS switch merged; tenancy scoping + RBAC patterns merged (**W1 gate**) | Funeral case + deceased models/migrations on top of Keb's patterns | Design tokens + app shell (staff nav, public header/footer) committed |
| Tue 25 | Catalog CRUD (products/services/packages) + seeds | Availability service interface drafted + chapel model | Public service catalog pages reading Keb's API |
| Wed 26 | Cart + order + fake payment adapter; fulfillment event schema frozen | Chapel booking + ops board backend (reads events via fixture first) | Cart/checkout UX; staff order view |
| Thu 27 | Order→event emitted; wire Jawi's board for real; deploy staging v0.1 | Lot GeoJSON endpoint (simple rectangles fine); interment model stub | Map page rendering lots; demo script written |
| Fri 28 | **M0-dry run**, fix integration breaks, security baseline pass | Same | Same + demo data made presentable |
| Sat 29 / Sun 30 | Buffer: bug fixes only | Buffer | Buffer |
| Mon 31 | **CLIENT DEMO** (Keb drives, Gab presents UI, Jawi covers ops/map) | | |

**M0 acceptance (client sees):** tenant-branded public site → pick package/service → cart → checkout
(sandbox pay) → order created → appears on staff ops board → chapel booking shown → memorial park map
with selectable lot. Explicitly labeled as seeded sandbox data.

---

## SEPTEMBER — weekly deliverables

### Week 1 (Tue Sep 1 – Sun Sep 6) — M1: Commerce live
- **Keb:** real payment gateway (sandbox→live keys), pricing rules engine, order state machine,
  receipts/notifications; A–D scenarios passing
- **Jawi:** embalming/preparation records, retrieval/transfer minimal task flow
- **Gab:** checkout hardening (validation/error states), staff catalog management screens, seed data v2
- **Deliverable Fri Sep 4:** scenarios A–D demoable on staging with sandbox payments

### Week 2 (Mon Sep 7 – Sun Sep 13) — M2: Operations live
- **Keb:** order→case automation (scenario H), audit trail verification, manager dashboard v1 (K)
- **Jawi:** case workflow complete: booking→tasks/checklists→completion; vehicles minimal;
  lot reservation ↔ order linkage (F starts)
- **Gab:** ops board UX complete, chapel calendar UI, family portal scaffold (I)
- **Deliverable Fri Sep 11:** paying for a service produces case + bookings + tasks (H); lot reservable from an order (F partial)

### Week 3 (Mon Sep 14 – Sun Sep 20) — M3: Property + Family live
- **Keb:** lot reservation→sale contract→payment records; ownership record; collections list (minimal)
- **Jawi:** interment scheduling linked to case + lot (G); lot status lifecycle enforced; map search filters
- **Gab:** family portal (I): payments/orders/documents view; digital memorial + QR page + tribute approval (J)
- **Deliverable Fri Sep 18:** F, G, I, J demoable; full scenario list A–D, F–H, I–J, K green

### Week 4 (Mon Sep 21 – Sat Sep 26) — Freeze & UAT
- **Tue 22: FEATURE FREEZE.** Only defect fixes; new work needs Keb's explicit approval
- **Keb:** security pass (brakeman/bundler-audit clean), backup/restore drill, performance sanity, regression owner
- **Jawi:** data migration tooling for Villa's real master data (catalog, park map, staff accounts)
- **Gab:** UAT support, UI polish, empty/permission states verified, training quick-reference doc
- **Thu 24: M4 — UAT begins** on staging with client staff using the scenario checklist
- **Sat 26:** UAT defect triage; go/no-go criteria reviewed

### Launch week (Mon Sep 28 – Wed Sep 30)
- **Mon 28:** go/no-go meeting (Keb + JBR) → production deploy (Kamal), smoke tests, DNS cutover rehearsal done in advance
- **Tue 29:** hypercare — monitor, fast-turn defects, client staff on-site/virtual support
- **Wed 30:** **LAUNCH DAY** — stable, no deploys unless critical; launch retro scheduled

## Standing rules through September

1. Friday demo is mandatory and integrated — trunk must run all green scenarios so far.
2. Contract changes after Aug 31 require both producer + consumer sign-off (Keb arbitrates).
3. Every feature card ships with system specs before its Friday demo — no exceptions given no QA staff.
4. Cut line if any week slips: drop scope in this order — map search filters → tribute approval flow → collections views → vehicle tasks. Never slip: payments correctness, tenancy isolation, audit trail.
5. Staging deploys daily from Mon Aug 31 onward; production deploy rehearsed once before Sep 28.
