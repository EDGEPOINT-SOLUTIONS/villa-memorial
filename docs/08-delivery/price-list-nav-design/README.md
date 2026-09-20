# Price list navigation — `/price-list` consolidation (2026-09-21)

**Routes changed:** `/plans` (trimmed) · new `/price-list` · `/packages`,
`/plans/villa-memorial-plan`, `/plans/senior-benefits`, `/plans/compare`
(redirects) · Explore more menu.
**Brief:** the captain, 2026-09-21 — *"the /packages should be the new
/plans/PKG-BASIC"*; *"remove these pages inside Villa Memorial Plan: 2026 plan
payments, Compare, Products & Price list, Senior citizen rates and put them all in
one page called only 'Price list' and this should only be in Explore more drop
down"*; *"Remain the 'View packages' and 'Coffins & caskets' inside the Villa
Memorial Plan page."* Plus the addendum: *"In Villa Memorial Plan remove these
section: …"* (the package table, eligibility, senior terms and the four notes).

## What shipped

| Surface | Before | After |
|---|---|---|
| `/plans` | Hero + six chips + five tiers + package/eligibility/notes blocks + 2026 payment-mode tables | **Hero + the five tier cards + two chips** (View packages · Coffins & caskets) + the See-the-2026-rates action that opens `/price-list` |
| `/price-list` (**new**, named **Price list**) | — | ONE page for the package comparison, coffin options, senior plan, plan benefits/payment tables and the lot & mausoleum list |
| `/packages` | Three-package listing | **308 → `/plans/PKG-BASIC`** (the captain's "be the new /plans/PKG-BASIC") |
| `/plans/villa-memorial-plan` · `/plans/senior-benefits` · `/plans/compare` | Separate pages | **308 → `/price-list`** |
| Entry point | Four `/plans` chips + scattered links | The **Explore more** dropdown is the only door: Builder · Facilities · Gallery · Memorials · **Price list** |

The redirects live in `next.config.ts` (routing-layer, not a `page.tsx`) so no
retired route 404s AND a redirect never enters the sitemap table — `lib/seo.ts`'s
`PUBLIC_PAGES` now carries `/price-list` in place of the four retired paths, and
`tests/unit/retired-routes.test.ts` pins each source → destination pair.

## Where each removed `/plans` block lives now

The captain's addendum asked this to be stated per block:

| Removed from `/plans` (`plans` document id) | Now lives on |
|---|---|
| `plans-package` — "Complete memorial package includes" table | `/price-list` §3 "Complete memorial package"; the package detail pages (`/plans/PKG-*`) already carried the package's own table |
| `plans-eligibility` — "Eligibility for the regular rate" | `/price-list` §3 "Eligibility" |
| `plans-senior-terms` — "Senior citizen eligibility & terms" | `/price-list` §2 "Senior citizen plan → Eligibility & terms" |
| `plans-note-contestability` — inception / contestability | `/price-list` §3 "Limited contestability" |
| `plans-note-assign` — assignable/transferable ₱1,000 fee | `/price-list` §3 "Assignable and transferable" |
| `plans-note-extras` — FREE flowers and tarpaulin | `/price-list` §3, under the package table |
| `plans-note-adjust` — 8- and 10-year amortization | `/price-list` §4, under the lot list |
| `#plan-payments` 2026 tables (regular + senior + cash assistance + rate facts) | `/price-list` §2 and §3 |

Nothing was dropped: every block's copy is read from the same editable document
through `lib/plan-content.ts`, so a staff edit on Pages & content still lands.
The long `plans-note-serving` ("Who serves and underwrites") note stays on the
staff terms module, exactly as before.

## Rerouted old links (stated as required)

- `View packages` chip → `/plans/PKG-BASIC`; `Coffins & caskets` chip →
  `/products` (both kept).
- `/plans/[sku]` related chips → "Price list" (`/price-list`) + "Browse all plan
  tiers" (`/plans`).
- `/products`, `/products/[sku]`, `/lots/price-list-2026` inline links →
  `/price-list` (senior) and `/plans` (plan tiers).
- Site footer "Care & planning" → "Villa Memorial Plan" (`/plans`) + "Price list"
  (`/price-list`); the "2026 price list" entry now reads "2026 lot price list".
- Landing content document (`lib/fixtures/landing/content.json`) → the services
  card "Lot + interment + VMP" and the blog post link point at `/price-list`; the
  right-rail "Villa Memorial Plan" card points at `/price-list`.
- Rail-picker catalogue (`lib/landing/catalogue.ts`) → packages → `/plans/PKG-BASIC`,
  plan → `/plans`, compare/senior/coffin entries → `/price-list` (with `#senior` /
  `#coffins` anchors).
- Agent marketing material (`lib/fixtures/agent/workspace.json`) → `/price-list`.

## Content architecture (unchanged)

- The new page renders from the content model where it applies: the plan copy is
  the "Villa Memorial Plan" document via `lib/plan-content.ts`; **no amount is
  authored anywhere** — plan rates and lot families come from the pricing store
  (`loadPricingDocument()` + `PlanPaymentTable`), cash assistance and caskets from
  `lib/villa-pricing.ts`, and the package comparison from the live catalogue read.
- Tokens and the type ladder only; one `h1` per route; the admin naming and the
  view-only `/map` are untouched; no new visual language.

## Verification

- `npm run lint && npm run typecheck && npm test` — 196 files / 2204 tests green.
- `npm run build` — production build passes; `/price-list` emitted, the four
  retired routes absent from the build output.
- New/updated gates: `tests/unit/price-list-page.test.tsx` (the page and its four
  consolidated surfaces), `tests/unit/retired-routes.test.ts` (the redirect
  table), `tests/unit/plans-page-content.test.tsx` (net `/plans` + the block
  move), `tests/unit/pricing-admin-render.test.tsx` (a pricing edit reaches
  `/price-list`), `tests/unit/price-surfacing.test.tsx`,
  `tests/unit/public-nav.test.tsx` (Explore more now carries Price list).

## Evidence shots (1440×900 and 390×844)

`shots/` — `1440-plans-after` · `390-plans-after` · `1440-price-list-after` ·
`390-price-list-after` · `1440-explore-menu-after` · `390-explore-menu-after` ·
`1440-packages-landing-after` · `390-packages-landing-after`, each beside its
`-before` counterpart (`/price-list` has no before — it is new). The before pass
was captured from the branch base (`next.config.mjs`, the old `/plans`, the
packages listing) with no working-tree changes; the server and browser were
stopped between passes.
