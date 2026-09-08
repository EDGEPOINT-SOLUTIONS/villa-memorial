# Phase-2 Backlog — derived from the CP-1 known-limitations lists

> Post-checkpoint action (issue #18). Source: `known-limitations-cp1.md` (revised Aug 29),
> `cp1-retro.md`, and the "Deferred" section of each frozen D3 contract. Feeds Week 1 of
> Phase 2 (Sep 1–7, VM hardening to production-ready; **Fri Sep 5 gate: VM RC v1.0**).
>
> Ordering rule: anything that makes a green signal meaningful comes first — CP-1's failure
> mode was tests and demos that measured nothing. Then the flows a user can reach.

---

## P0 — must land before the Fri Sep 5 RC gate

| # | Item | Why now |
|---|---|---|
| 1 | **Dedicated-profile CI asserts a real flow**, not just gateway health + a 401 | The current job passes with zero services attached. It did, all sprint. |
| 2 | **Wire the reserve-and-pay button** (`/staff/property/[id]`) to `POST /lots/:id/reserve` | The API shipped; the button is still inert. Scenario F is demoed via curl, not the UI. Issue #8. |
| 3 | **Ops board task + stage actions** — PATCH task status, POST stage change from the screen | Same gap on the H side: the API supports it, the screen is read-only. |
| 4 | **Schedule screen** over `GET /bookings` + `GET /resources` | `/staff/schedule` is a gated placeholder; bookings exist with no UI. Conflicts are flagged and invisible. |
| 5 | **Fixture/live parity test** — property and cases seeds vs. the web fixtures | Kept in sync by hand today. Drift is silent and would show as "the demo data changed". |
| 6 | **RBAC scope sync check** — `rbac-scopes-v1.md` vs. identity seed vs. `web/lib/rbac/nav.ts` | Three sources, no assertion. This is how `hr:read` went four days unfrozen. |
| 7 | **Convert conditionally-defined tests to in-test `skip`** | `commerce-ordering`'s checkout test silently does not exist without `CATALOG_INTERNAL_URL`. Green suite, no money path. |
| 8 | **Mark or delete `august-september-schedule.md`** | Superseded Aug 24, still the first schedule a reader finds, names a teammate who is not on the project. |

## P1 — Week 1 depth pass (what CP-1 cut)

| Item | Cut line | Notes |
|---|---|---|
| GIS map interactivity + GeoJSON lot payloads | #1, #5 | Contract bump: lots gain geometry. New schema version. |
| Auto-conflict **blocking** for bookings | #3 | Needs resolution UX first — a wrong block is worse than a warning. Design before code. |
| Financial statements beyond trial balance | #2 | accounting has the ledger; statements are the missing layer. |
| Dashboards as charts | #4 | Data is there; presentation was cut. |

## P1 — unbuilt services behind fixture-only modules

| Module | Service | Currently |
|---|---|---|
| A — Customers | crm-families | Fixtures. Inquiries are session-only; nothing persists. |
| E — Billing screens | finance-billing **exists** | Backend is real; the screens still read fixtures. Wiring only — cheapest win on this list. |
| G — HR | hr | Unbuilt (D13 gap). Scopes frozen, no service. |
| I — Reporting | reporting-analytics | Dashboard aggregates are fixtures. |
| J — Documents | documents ⓡ | Unbuilt. Issue #12 (receipt/certificate generation) never started. |

> **Note on E:** finance-billing serves live invoices today and the billing screen does not
> use it — but this is **not** a one-file wiring job like property/operations were. The
> shapes genuinely diverge and there is no frozen billing contract to arbitrate:
>
> | Screen expects | Service returns |
> |---|---|
> | `invoice_number` | `number` |
> | `status: pending \| partial \| paid \| overdue` | `status: issued \| partially_paid \| paid` (no overdue — it is derived, not stored) |
> | `due_at` | absent from the index; only reachable per-invoice via `installments[].due_date` |
> | `aging_bucket` | absent — computed from `due_at`, which the index does not carry |
>
> Mapping this client-side would need one extra fetch per invoice. The right sequence is:
> freeze a billing list contract (add `due_at` to the index response, decide whether
> `overdue` is a stored status or a derived view), then wire. Budget half a day, not an hour.

## P2 — hardening (Week 1 scope per checkpoint-delivery-plan)

- Security baseline: brakeman + bundler-audit clean across all ten services
- Backup/restore drill on the dedicated profile
- Load smoke test — every live list endpoint is currently unpaginated
- End-to-end **multi-tenant** isolation test through the gateway (per-service tests exist;
  no test drives two tenants at once)
- VM data migration rehearsal (catalog, park map, staff accounts)
- Replace the shared-secret internal event auth with identity-issued service credentials
  (`InternalIngest` calls this out as a v1 simplification)

## P2 — contract debt

- `getCase` resolves through the list because funeral-cases addresses cases by `case_number`
  while the screens hold record ids. Fine at demo scale; add a by-id endpoint or have the
  screens route by number.
- Lot-as-order-line: `POST /lots/:id/sell` takes an `order_number` that nothing reconciles
  against commerce-ordering.
- Deceased/intake as a first-class record, not a name string on the case — and a deceased
  field in checkout, which is an M1 contract change needing producer + consumer sign-off.
- `booking.cancelled` event (cancellation is API-only in v1).
- Case creation from anything other than a fulfilled order.
