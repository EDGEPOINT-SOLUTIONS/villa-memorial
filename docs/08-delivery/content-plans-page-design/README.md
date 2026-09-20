# Villa Memorial Plan page — Phase 2 implementation record (2026-09-21)

**Route:** `/plans` (`app/(public)/plans/page.tsx`), with the shared plan content read by
`/plans/villa-memorial-plan`, `/plans/senior-benefits`, `/plans/[sku]`, `/lots/price-list-2026`,
`/builder` and the staff membership screens.
**Brief:** Phase 2 of the captain-approved content-catalogue plan —
`data/villa-content-catalog-plan/report.md` §9 (phase table) and §11 step 4: *"the five tiers +
inclusion checklists, no services; assert a rate-store edit still reaches every plan surface and
a checklist edit reaches the page"* (captain's 2026-09-21 direction; report §10).

## What shipped

### The plan content is now editable

The plan's presentational copy lived as constants in `lib/villa-pricing.ts`
(`VMP_PACKAGE`, `VMP_ELIGIBILITY`, `VMP_NOTES`, `VMP_INCLUSIONS`, `SENIOR_TERMS`) and changed
only in code. Phase 2 moved it into the **"Villa Memorial Plan" page document**
(`lib/fixtures/content/pages.json`), edited in **Pages & content → Villa Memorial Plan**
(`/staff/landing/plans`), using the existing block vocabulary and editor — no new editor concept
was needed.

| Now editable (page-document blocks) | Was |
|---|---|
| Five per-tier inclusion checklists (`plans-tier-<id>`, dropdown mode) | code only |
| The complete memorial package table (`plans-package`) | `VMP_PACKAGE` / `VMP_INCLUSIONS` |
| Regular eligibility (`plans-eligibility`) | `VMP_ELIGIBILITY` |
| Senior eligibility & terms (`plans-senior-terms`) | `SENIOR_TERMS` |
| The five plan notes (`plans-note-*`) | `VMP_NOTES` |

`lib/plan-content.ts` is the ONE typed reading of those blocks. Every plan surface reads it, so
one edit reaches the page, the sub-pages, the package detail page, the staff terms module, the
service builder and the lot price list together.

### Rates stay a live read — money never moves into a block

Every amount still comes from the pricing store (`loadPricingDocument()` + `planRateOf`) or the
sheet's cash-assistance constant:

- each tier card prints its own **"Regular rate from ₱X / month"** read live;
- the two 5 × 4 rate tables are the store's current document;
- `CASH_ASSISTANCE` stays the sheet constant (a client figure, not presentational copy), so no
  amount is ever authored into an editable block — a price block keeps its SKU / rate-table
  binding and the validator refuses a dangling reference.

### The services left the page

`/plans` was a 42-item mixed catalogue (3 packages · 15 services · 24 add-ons) above the rate
tables. Per the captain's direction it now shows **exactly the five tiers** (Bronze 1 · Bronze 2 ·
Silver 1 · Silver 2 · Gold) with their inclusion checklists, the package details and the notes.
Services live on `/services`, coffins on `/products`; the three packages keep `/packages` and
their `/plans/[sku]` detail routes.

## Not changed

- The approved page grammar, tokens, type ladder and routes — content moved into the document,
  the layout is unchanged (the `.hero-premium` hero and `.plan-*` markup are untouched).
- The pricing store, its validation and its staff editors.
- The retired constants' **figures** — the sheet pins stay (`tests/unit/villa-pricing.test.ts`),
  now read through the document.

## Evidence

| Shot | What it shows |
|---|---|
| `shots/plans-before-1440.png` · `plans-after-1440.png` | `/plans` at 1440×900 — before: the mixed 42-item catalogue; after: the five tiers. |
| `shots/plans-before-390.png` · `plans-after-390.png` | `/plans` at 390×844. |
| `shots/plans-after-1440-tiers.png` | The five tiers, each with its live monthly rate and dropdown checklist. |
| `shots/plans-after-1440-package.png` · `plans-after-1440-payments.png` | The complete memorial package (document table) and the live 2026 rate tables + cash assistance. |
| `shots/editor-plans-blocks-1440.png` | The editor surface: **Pages & content → Villa Memorial Plan**, block canvas with the tier checklists (add / reorder / remove, source records). |

## Tests

- `tests/unit/plans-page-content.test.tsx` — the seed's five tiers render; a **checklist edit
  reaches the page**; the package details / eligibility / notes come from the document; a tier
  reads its live monthly rate.
- `tests/unit/pricing-admin-render.test.tsx` — a **rate-store edit reaches** `/plans`,
  `/plans/villa-memorial-plan`, `/plans/senior-benefits`, the package page and the lot price list.
- `tests/unit/plan-content.test.ts` — the typed reading: tier order, package pairs, notes,
  honest empties when a block is absent.
- `tests/unit/price-surfacing.test.tsx` · `tests/unit/composition-pass.test.tsx` — repinned: the
  service / add-on catalogue no longer cards on `/plans`; `/packages` keeps its photographed cards.
- Gates: `npm run lint && npm run typecheck && npm test` (2117 passed) and `npm run build`.

## Open follow-up (named, not smuggled in)

Pages **3–4** of the plan are out of scope here: the Services page (one hero → straight to the
services; service entries) and the item-catalogue blocks (per-casket/package content, nav
cleanup). The plan-tier **entries** (as opposed to document blocks) likewise ship with the
item-catalogue pass; Phase 2 keeps the tiers in the page document, which is why no entry store
was added.
