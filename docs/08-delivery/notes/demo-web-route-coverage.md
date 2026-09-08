# Demo → Web Route Coverage Checklist (living document)

> Purpose: track every ui-ux-demo route against production `web/` so nothing is silently
> missing. **Check = open the route in a running build** (`cd web && npm run dev`) and tick
> the status below. When a route is a stub, its page says why ("not wired yet" / "Coming
> soon") — that label is the honest state, not the end state.
>
> Status legend: ✅ real screen (works against fixtures/live) · ⚠ stub ("not wired yet"
> page exists, RBAC-gated) · 🚧 in progress · ❌ absent.

## How to check (the plan)
1. `cd web && npm run dev` (fixture mode — no env vars needed).
2. Log in as each persona at `/login` (hints fill the email; password `Demo-Passw0rd!`):
   admin (everything) · staff (operational) · customer (storefront/family).
3. Walk the tables below in order; for each route confirm the page renders and shows
   **real data, an honest empty state, or a "not wired yet" label** — never a broken page.
4. Tick the box; a ❌ left over is a task card, not an accident.

## Public / marketing
| Demo route | Web route | Status |
|---|---|---|
| `/`, `/home` (landing) | `/` | ✅ Landing page (memorial-park marketing; links to catalog/map/login) |
| `/site/services` + death-at-home/hospital | `/services` | ✅ Static service pages (links; content is marketing copy) |
| `/site/plans` + `/site/plans/:slug` | `/plans`, `/plans/:sku` | ✅ real (catalog) |
| `/site/plans/compare` | `/plans/compare` | ✅ real-data comparison (packages) |
| `/site/plans/senior-benefits` | `/plans/senior-benefits` | ✅ static content page |
| `/site/lots` + `/site/lots/:slug` | `/lots` + `/lots/[id]` | ✅ real lot browse/detail (fixture/live-gated like the map) |
| `/site/map` | `/map` | ✅ shared park map |
| `/site/packages` + detail | `/packages` (detail via `/plans/:sku`) | ✅ real packages from catalog |
| `/site/products` + detail | `/products` | ⚠ door page (no product type in catalog contract yet) |
| `/site/transport` | — | ❌ absent (defer) |
| `/site/contact` · `/site/quote` · `/site/appointments` · `/site/faq` | — | ❌ absent (needs inquiry/CRM contract) |
| `/site/register` | `/register` | ✅ |

## Storefront
| Demo route | Web route | Status |
|---|---|---|
| `/cart` · `/checkout` | same | ✅ real |
| `/order/:reference` | `/orders/[number]` | ✅ real |
| `/orders` (staff) | `/staff/orders` | ⚠ stub (no list API yet) |

## Staff portal
| Demo route | Web route | Status |
|---|---|---|
| `/dashboard` | `/staff/dashboard` | ✅ |
| `/customers` + `/:id` | same under /staff | ✅ fixture-backed |
| `/customers/new` | — | ❌ (needs crm contract) |
| `/inquiries` + `/inquiries/new` | `/staff/inquiries` | ✅ list; new-form ❌ |
| `/plans` + `/:id` (staff) | — | ❌ (staff catalog mgmt = catalog:write contract) |
| `/catalog` | `/staff/catalog` | ⚠ |
| `/inventory` | `/staff/inventory` | ⚠ |
| `/pricing` | `/staff/pricing` | ⚠ |
| `/pipeline` | `/staff/pipeline` | ⚠ |
| `/cases` + `/new` + `/:id` | same | ✅ |
| `/schedule` + `/schedule/new` | `/staff/schedule` | ✅ (new = inline form) |
| `/dispatch` | `/staff/dispatch` | ⚠ |
| `/property` + `/:id` | `/staff/property` + `[id]` | ✅ map pilot + purchase-application section (reads fixture application where captured) |
| — | `/staff/property/[id]/apply` | ✅ fixture-backed purchase-application capture (fixture mode; live 503 — no application contract frozen yet) |
| `/work-orders` | `/staff/work-orders` | ⚠ |
| `/notifications` | — | ❌ (no scope/contract) |
| `/billing` | `/staff/billing` | ✅ |
| `/accounting` | `/staff/accounting` | ⚠ |
| `/hr` + `/:id` | same | ✅ fixture-backed |
| `/hr/new` | — | ❌ (hr contract) |
| `/documents` + `/:id` + `/documents/new` | `/staff/documents` | ✅ repo; detail/generate partial |
| `/reports` | `/staff/dashboard` covers | ❌ separate (reporting contract) |
| `/admin/users` + `/new` | `/staff/users` | ⚠ users; new ❌ |
| `/admin/store` | `/staff/store` | ⚠ |
| `/admin/workflows` + `/new` | `/staff/workflows` | ⚠ |
| `/admin/settings` | `/staff/settings` | ⚠ |
| `/admin/audit` | `/staff/audit` | ✅ |

## Family portal (customer/family)
| Demo route | Web route | Status |
|---|---|---|
| `/client/login` | `/client/login` | ✅ (real auth; family persona) |
| `/client/dashboard` | `/client/dashboard` | ✅ fixture-backed summary |
| `/client/profile` | same | ✅ |
| `/client/plans` | same | ⚠ coming-soon (no family plans API) |
| `/client/property` | same | ⚠ coming-soon |
| `/client/payments` | same | ⚠ coming-soon (billing is staff-scoped) |
| `/client/cases` | same | ⚠ coming-soon |
| `/client/documents` | same | ⚠ coming-soon |
| `/client/memorials` · `/requests` · `/notifications` · `/appointments` · `/support` · `/privacy` | same | ⚠ coming-soon (no backend concept yet) |

## Agent portal
| Demo route | Web route | Status |
|---|---|---|
| all `/agent/*` (7) | — | ❌ absent — needs agent/commission contract; not built (defer) |

## Standing rules for every row
- ✅ means the screen shows live-or-fixture data and passes RBAC — not just "the route exists".
- ⚠ "not wired yet" pages must say **what unblocks them** (contract name), not just exist.
- Never render a route that pretends to have data it cannot fetch (❌ vs ⚠ distinction).
- Re-run this checklist before every demo; update ticks in the same PR as the screens.
