# Item catalogue + cleanup — Phase 4 implementation record (2026-09-21)

**Brief:** Phase 4 (final) of the captain-approved content-catalogue plan —
`data/villa-content-catalog-plan/report.md` §9 (phase table) and §11 step 6: *"Finish the item
catalogue + cleanup; retire the stubs and update the route-coverage record."* Phases 0–3
(PRs #89, #92, #93) gave the model, the page documents and the service/plan patterns.

## What shipped

### 1 · Casket and package entries carry editable content

The catalogue half of the model now lands. A **casket or package** catalogue item gets an editable
page-content entry with the ecommerce-style half the captain asked for: a **long description**,
**photographs** and ordered **content blocks** — paragraphs, bullets, checklists, steps, images,
tables (specifications, dimensions, inclusions), price tables/lists, notes and links.

| Piece | File |
|---|---|
| The one typed reading (which SKUs qualify · derived identity · the editor target · the page view) | `lib/catalogue-content.ts` (new) |
| The item-entry store (authored half only; identity re-derived per read) | `lib/api-client/content-entries.ts` |
| The editor target shape | `EntryEditorTarget` in `lib/content-catalog.ts` |
| The editor (generalised — one grammar for service guides AND item entries) | `components/content/catalogue-entry-editor.tsx` |
| The staff route | `app/(staff)/staff/catalog/[id]/content/page.tsx` (new) |
| The BFF write path (dispatches an item SKU vs a service key) | `app/api/content/entries/route.ts` |
| Storefront rendering | `app/(public)/products/[sku]/page.tsx` · `app/(public)/plans/[sku]/page.tsx` |

**The identity never drifts.** The catalogue record stays the authority for the NAME, collection,
SKU and price. `catalogueEntryDefaults()` derives the entry's identity from the live record on
every read; `mergeItemEntry()` keeps only the authored half (summary · media · blocks); and
`saveItemEntry()` re-imposes the identity before validation, so a content body can neither rename
a product nor restate a price. A price block edits a **reference** (a catalogue SKU) and the
validator refuses a dangling one against the LIVE catalogue.

**Only the two families the captain named:** the 24 casket models (`CSK-*`) and the three
packages (`PKG-*`). Service lines, embalming days, chapel per-day rows and add-ons keep their own
screens (`/staff/landing` service entries; the catalogue form).

**Honest photography.** The default entry picture is the one `catalogueItemPhoto()` already
publishes for the SKU; a stand-in sample is marked `sample: true`, so the editor's caption rule
applies (and the existing sample wording stays). No withheld photograph is offered.

### 2 · The Coffins & caskets page document gained its block canvas

`PAGE_DOCUMENTS.coffins.blocks` is now `true` and `/products` renders the document's blocks, so
the casket catalogue's own page copy is editable beside the per-model entries. The five tier
document and the item entries are deliberately separate layers: the page says which items appear;
each entry says what an item is.

### 3 · Navigation consolidated to the captain's §6.1 shape

Commerce is now exactly: **Pages & content · Catalog · Pricing rules · Inventory · Orders ·
Memberships** (`lib/rbac/nav.ts`). The two pricing editors edited ONE pricing document from two
nav entries — the ambiguity the plan named. They now share one home:

- `/staff/pricing` renders **both** the plan-rate editor and the lot-price editor, with an
  in-page `Plan rates` / `Lot prices` split;
- `/staff/plans` is a **redirect** to `/staff/pricing` (a bookmark still lands in the one home);
- the membership folio keeps its own nested `/staff/plans/membership` route and nav entry.

### 4 · The stubs are retired

`app/(staff)/staff/plans/[id]/page.tsx` and `app/(staff)/staff/plans/new/page.tsx` (the two
`gatedSectionPage` "not wired" stubs) are **deleted**. `/staff/plans/anything-else` now 404s
honestly; `/staff/plans` redirects. The route-coverage note carries the changed rows.

### 5 · The platform contract ask is recorded

The content/CMS read-write contract (page documents + catalogue entries) is added to the platform
contract list in [`frontend-complete.md`](../frontend-complete.md#the-platform-the-dev--the-contract-list)
and [`prd-alignment-audit.md`](../prd-alignment-audit.md#72-platform--dev-contract--blocked-or-503-until-a-contract-freezes).
No upstream content service exists: the stores are app-authored (globalThis, fixture mode), and a
save validates against the LIVE catalogue + pricing stores.

## Evidence (shots/)

Production/dev build, viewports 1440×900 and 390×844.

| Shot | What it shows |
|---|---|
| `catalog-edit-before-1440.png` · `catalog-edit-after-1440.png` | The catalogue form before/after Phase 4 (the new **Edit page content** action). |
| `item-editor-after-1440.png` · `item-editor-after-390.png` | The new per-item page-content editor: identity locked to the record, long description, hero photograph, content blocks. |
| `pricing-before-1440.png` · `pricing-after-1440.png` · `pricing-after-390.png` | `/staff/pricing` before (lot prices only) and after (the consolidated Plan rates + Lot prices home). |
| `casket-detail-before-1440.png` · `casket-detail-after-1440.png` · `casket-detail-after-390.png` | `/products/CSK-WHITE-ROSE-FULL`: the authored long description replaces the catalogue line; below, `casket-authored-blocks-after-1440.png` shows the authored content block. |

## Tests

- `tests/unit/catalogue-content.test.ts` — which SKUs qualify, the derived identity, the merge
  that keeps the catalogue's name/group, the page view.
- `tests/unit/catalogue-entries-store.test.ts` — the store serves every casket/package, saves an
  authored description + blocks, re-imposes the identity (a body cannot rename or re-price), and
  refuses a price binding the catalogue cannot resolve.
- `tests/unit/catalogue-entry-page.test.tsx` — **an entry edit reaches `/products/[sku]` and
  `/plans/[sku]`**; the admin editor renders with the identity locked and 403s without
  `catalog:write`.
- Repinned: `tests/unit/nav.test.ts` (the standalone Plans entry is gone; `/staff/plans` owns no
  nav item), `tests/unit/pricing-admin-rbac.test.tsx` (`/staff/pricing` renders both editors;
  `/staff/plans` redirects).
- Gates: `npm run lint && npm run typecheck && npm test` (2195 passed) and `npm run build`.

## Deliberately not in this pass

- **Plan-tier entries** (`kind: "planTier"`) as opposed to the plan document's blocks remain out
  of scope, as the plan's §9 marks them a separate appetite.
- The casket detail's rule-driven sample figure, price grid and inclusion panel stay rule-driven
  (they are pinned by `villa-services-premium`, `price-surfacing` and `catalogue-imagery`); the
  entry adds content around them rather than replacing the sheet's own reading.
- No public URL or public design changed. Migration is content-only; the typography, phone,
  composition, reading-budget and broken-pages gates stay green.
