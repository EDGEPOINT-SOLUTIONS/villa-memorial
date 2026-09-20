# `/products` listing pass — implementation record (2026-09-21)

**Route:** `/products` (`app/(public)/products/page.tsx`,
`components/villa/casket-catalogue.tsx`, `components/villa/catalogue-actions.tsx`, the
"shop grid" block of `styles/components.css`).
**Brief:** the captain's direction of 2026-09-21 — *"fix the ui/ux of this
http://localhost:4000/products"*. The president's standing complaint rides along:
*"too wordy — it should be understandable at a glance"*. The storefront standard is the
already-fixed `/lots` listing (picture first, price and status prominent, one clear action,
deliberate even columns), with Amazon as the structural reference and the blue/gold design
language fixed.

## Diagnosed first (measured, 1440×900 and 390×844)

Rendered with the fixture store, before any change:

| Defect | Measurement |
|---|---|
| **Two paragraphs of honesty per card** | Card `<li>` ran **50–73 words** (average **54.8**): a ~25-word photograph caption plus a per-model cover note, e.g. Lumina's 28-word `COFFIN_COVER_UNSTATED` sentence, reprinted on all 24 cards. |
| **A three-button action row** | Every card carried `View details` + `Add to cart` + `Request order` as three `.btn` controls of near-equal weight; the primary was not readable as primary. |
| **A per-card senior mini-table** | `Senior citizen ₱X — ₱Y off (61–100, no insurance benefit)` on its own row under a full price block — 11 words of fine print per card. |
| **Ragged collection bands** | Four independent grids (Lumina **1**, White Rose 6, Crown 8, Dynasty 9). The single Lumina card sat alone in a 448px column with ~900px of empty row beside it. |
| **Broken column ladder** | Shared `.shop-grid` floor (26rem) gave **2 × 604px** cards at 1280 and **1 × 852px** card at 900/768 — a tablet never saw the "two columns" the brief asks for. |
| **Long, wordy hero** | A 61-word lead paragraph and no hero action. |
| Page height (1440) | **9284 px** |

## What shipped

### The card — picture, name, one line, price, one primary action

`components/villa/casket-catalogue.tsx` `CasketCard`, on the shared kit `ProductCard`
(picture → eyebrow → title → supporting → price → senior → actions):

- **Photograph first**, the sample chip, then **one short caption**:
  `"{photo.label}. Illustration purposes only."`.
- **Family · model name · ONE supporting line** — the cover the model's name states
  (`Half-glass lid`, `Full glass lid`, …). Lumina's unnamed cover reads the short
  *"Cover confirmed by the office"*; the full `COFFIN_COVER_UNSTATED` sentence and the SKU
  now live only on `/products/[sku]`.
- **Regular SRP prominent** (`--text-2xl`), with the senior figure as **one compact line**:
  `Senior 61–100 · ₱X · ₱Y off` (same two published amounts, no mini-table).
- **ONE primary action**: the gold `.btn--accent` `Add to cart` (`CatalogueAddButton`, exact
  catalogue SKU/price). `Request order` and `View details` are quiet
  `.catalogue-actions__link` text links, and the **photograph and title both lead to the
  detail route** — no three-button row. `CatalogueActions` grew a single
  `secondaryAsLink` option for this; `/services` and the embalming picker keep their
  two-button grammar unchanged.

### One grid, not four bands (+ a lightweight collection index)

The four per-collection grids became **one continuous 24-card grid** in the sheet's own
collection order. A static **collection index** above it (name · model count · entry price,
no filter, no second control) keeps the at-a-glance shape the band headers carried. This is
what removes the stranded single-card band and makes every desktop row even.

A new `.casket-grid` modifier narrows the shared grid's column floor to 21rem:
**3 across at 1440 (448px) and 1280 (395px), 2 at 1024/900/768, 1 at ≤600**, max 4 at 1920.
No second media query; `min(100%, 21rem)` still protects the phone column.

### Hero

The 61-word lead became one sentence, **"Every 2026 coffin, with its published price."**
(8 words), with two hero actions — *See the catalogue* (anchor to the grid) and *Compare the
five tiers*. The seeded page document (`lib/fixtures/content/pages.json`) carries the same
sentence, so the fallback and the editable copy agree.

### Sections reviewed

- **Five-tier ledger — kept.** It is the sheet's own index of what the five Bronze→Gold tiers
  mean and which lid each states; it answers a real question the model grid does not. Its
  `tier-ledger__*` markup, lid lines and client photographs are unchanged
  (`tests/unit/broken-pages.test.ts` pins them).
- **Per-family inclusions table — kept unchanged.** Flowers / tarp / lapida / family car /
  1 doz roses / thank-you card plus the common & private chapel day rates are the one place a
  family compares what a family name includes. Still read from `lib/villa-pricing.ts`.
- **Closing links — two short paragraphs** instead of one 41-word sentence; every destination
  kept (`/plans`, `/price-list`, `/services`, `/lots/price-list-2026`).

## Honesty kept

- The **sample chip** and the client's **"Illustration purposes only"** label travel with every
  photograph; the full substitution sentence (`COFFIN_TIER_NOTE`) prints **once**, under the
  tier band, and on the detail view.
- Every published figure survives on the card: SRP, senior price, senior discount, and the
  prefilled `Request order` / `Add to cart` on the exact SKU.
- Nothing was invented: no amount, no cover, no photograph is authored in the view.

## Measurements before → after

| Metric (1440 unless noted) | Before | After |
|---|---|---|
| Card words (`<li>`, incl. chip, caption, figures, actions) | 50–73, avg **54.8** | 29–39, avg **32.9** |
| Card body words | avg 32.3 (max 53) | avg 24.3 |
| Card caption words | avg 25.7 | ~9 (one line) |
| Action controls per card | 3 buttons | 1 gold primary + 2 quiet links |
| Columns at 1440 / 1280 / 1024 / 900 / 768 / 390 | 3 / **2** / 2 / **1** / **1** / 1 | 3 / 3 / 2 / 2 / 2 / 1 |
| Card width at 1440 | 448px | 448px |
| Consistent card heights (1440) | 633 / 654 / 676 | **615 only** |
| Page height | 9284 px | 8168 px |
| Horizontal overflow, all widths | none | none (`scrollWidth == innerWidth`) |

## Evidence

- `shots/1440-full-before.jpg` · `shots/1440-full-after.jpg`
- `shots/390-full-before.jpg` · `shots/390-full-after.jpg`
- `shots/1440-cards-before.jpg` · `shots/1440-cards-after.jpg` (card close-up)
- `shots/390-top-after.jpg`

## Tests

- `tests/unit/products-listing.test.tsx` (new) — one grid of 24, the collection index, exactly
  one `.btn--accent` per card, one short honesty line per card / the full note once, the
  card word budget, the paragraph reading budget, and the ≤12-word hero lead + hero action.
- Existing suites kept green: `villa-services-premium`, `price-surfacing`, `broken-pages`,
  `phone-layout`, `kit-product-card`, `catalogue-imagery`, `client-photos`,
  `composition-pass`. Full run: `npm run lint && npm run typecheck && npm test && npm run build`.
