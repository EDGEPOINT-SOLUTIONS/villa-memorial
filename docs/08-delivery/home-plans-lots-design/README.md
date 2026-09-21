# Home — "Memorial plans & garden lots" + newsfeed + map labels (2026-09-21)

Captain's direction (2026-09-21): on the homepage, **remove the "What we do / Services
we offer — Four ways to be served" section** and replace it with a **"Memorial plans &
garden lots"** section built like his example; show **one post per column** in the
newsfeed; and fix the homepage park-map preview's **lot names** ("text that are so not
good in the eye"). His framing: *"our homepage is our way to communicate with customers
for them to trust that we know what we are doing, we know what they need and what they
have to buy, the costing, how their funeral will be smooth."*

## What changed

### 1 · The band: "Memorial plans & garden lots"

Replaces the retired `services` region. The document now carries a `plansLots` section
(`lib/api-client/landing.ts`): `kicker · heading · intro · note` plus an **admin-extendable
list of cards**. Each card is:

| Field | Meaning |
|---|---|
| `kind` | the captain's type word — `lot` → "Garden lot" · `structure` → "Structure" · `plan` → "Life plan" |
| `title` | the name on the card |
| `image` | the card's own client photograph (library asset, staff URL or device upload); null falls back to `planLotCardPhoto()` |
| `category` + `product` | lot/structure only — a LIVE lot family + product row in the pricing store |
| `tier` | plan only — a live `PlanTier` |
| `text` | plan only — the one supporting line (lot lines are derived) |
| `href` | where the card goes |

**No amount is authored anywhere.** `lib/landing/plan-lots.ts` is the ONE reading:

- lot/structure → `row.regular.selling` + `"{area} sqm · {family.caption} · regular"`
  (the captain's "2.5 sqm · lot only · regular");
- plan → `from {planRate(tier, monthly)}` + the card's supporting line.

The view renders the kit `ResultsGrid` + `ProductCard` (AGENTS: new screens render the
kit); `.shop-grid.plan-lot-grid` is the only new CSS, narrowing the shared column floor.

**Seeded cards (the captain's five):**

| Card | Type word | Live source | Figure |
|---|---|---|---|
| Premium Lot | Garden lot | `1. Lot Only` · Premium Lots | ₱114,000 |
| Prime Lot | Garden lot | `1. Lot Only` · Prime Lots | ₱128,000 |
| Garden Niches | Structure | `1. Lot Only` · Garden Niches | ₱567,000 |
| Mausoleum | Structure | `1. Lot Only` · Mausoleum | ₱1,073,000 |
| Villa Memorial Plan | Life plan | plan tier `bronze1`, monthly (regular) | from ₱600 / month |

Closing note (verbatim): *"Prices shown are the regular 'lot only' selling prices and the
Villa Memorial Plan monthly rate from the 2026 price list. Senior, installment and
interment options are on each plan page."*

The captain's example wrote "from ₱500/month" for the plan; the 2026 sheet's regular
Bronze-1 monthly is **₱600** (the ₱500 → ₱600 correction AGENTS records). The card is a
live read, so it prints the sheet's ₱600 — never the stale example figure.

### 2 · The newsfeed: one post per column

`.blog-feed` is now a single row of equal columns (`grid-auto-flow: column`,
`grid-auto-columns: minmax(15rem, 1fr)`) inside its own pan frame — every post its own
column, no full-width spanning lead, and no column stacking two posts. Below 40 rem it is
one column, one post per row. `BlogPostCard` lost its `lead` prop and the
`.post-card--lead*` CSS.

### 3 · The map preview's lot names

`lib/park-maps.ts` `labelDensityFor(plotWidthPx)` is the one rule:

- `off` — the plot is narrower than `LABEL_MIN_PLOT_PX` (30 px): paint nothing;
- `code` — room for the lot code alone;
- `full` — wide enough (`LABEL_FULL_PLOT_PX`, 120 px) for the legend type line + owner.

`components/parks-canvas.tsx` computes each plot's rendered width (circle diameter /
bbox × `pxPerUnit`) and sets a per-marker `data-label-density`, refreshed on `zoomend` and
after every redraw. The CSS hides the marker when `off`, trims it to the code in `code`,
and each label now sits on a translucent plate for contrast. `labelsTightAt` is retired.

## Measured evidence

### Card columns (`.plan-lot-grid`), rendered

| Viewport | Columns | Card width | Grid width |
|---|---|---|---|
| 1440 | 3 | 227 px | 714 px |
| 1200 | 3 | 155 px | 496 px |
| 1024 | 2 | 439 px | 894 px |
| 900 | 2 | 425 px | 866 px |
| 768 | 2 | 359 px | 734 px |
| 600 | 1 | 566 px | 566 px |
| 390 | 1 | 356 px | 356 px |

Breakpoints: `repeat(3, …)` by default, `repeat(2, …)` below 75 rem, `minmax(0,1fr)` below
40 rem.

### Price sources (live reads, never typed)

- Premium Lot / Prime Lot / Garden Niches / Mausoleum → the `1. Lot Only` family in
  `lib/fixtures/commerce/pricing.json` (the office-editable store read per request
  through `loadPricingDocument()`).
- Villa Memorial Plan → `planRateOf(pricing, "bronze1", "monthly")` (regular table).
- Photographs: `PARK_PLACE_PHOTOS` composition derivatives (premium / prime / niches /
  mausoleum) and `/media/gallery/wake-viewing-840.webp` for the plan —
  `planLotCardPhoto()` in `lib/media.ts` is the fallback rule; a card's own `image` wins.

### Map label density (measured on the home preview, 390–1440)

| Zoom | px per frame unit | Premium plot width | Density |
|---|---|---|---|
| 1.995 (overview) | 3.99 | ~9 px | off |
| 2.995 | 7.97 | ~17 px | off |
| 4.995 | 31.9 | ~69 px | code |
| 7.995 | 255 | ~550 px | full |

## Screenshots (`shots/`)

- `home-1440-{before,after}.webp`, `home-390-{before,after}.webp` — the full page.
- `map-{before,after}.webp` — the map section close-up (the before is the jumbled smear).
- `map-labels-zoom.webp` — the labels at a useful zoom (`code` density, plates legible).
- `editor-cards.webp` — the editor's new zone 05 card controls (type word · photo · live
  family + product binding, with the derived figure in each row header).

## Rules preserved

- Kit + tokens only; one `h1`; the public layout grammar (Phase 0) and the reading budget
  are untouched (the home's copy is staff-editable, so it is measured here, not gated).
- Real prices are live reads; the seven withheld client photographs are never published;
  sample imagery keeps its labels elsewhere.
- The homepage stays fully editable: the editor zone 05 was rebuilt (`PlansLotsEditor`)
  with add / remove / reorder and per-card binding, and the save validator refuses a card
  whose family + product, or plan tier, is not in the live store.

Tests: `tests/unit/landing-view.test.tsx` (`plan-lot-grid`, the five figures, the note),
`tests/fixture-contract/landing.test.ts` (bindings + refusals),
`tests/unit/composition-pass.test.tsx` (kit grid + one-post-per-column),
`tests/unit/park-map-labels.test.ts` (the density rule), `tests/unit/public-page-budget.test.tsx`.
