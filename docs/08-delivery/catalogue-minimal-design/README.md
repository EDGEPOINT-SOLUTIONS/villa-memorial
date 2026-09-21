# Catalogue & grounds pages — the Phase 0 minimal pass (Wave A · Lane 2)

Lane 2 of the captain's public design plan
(`data/villa-public-design-plan/report.md`, released 2026-09-21). The plan's
biggest measured win: `/products` was **23.4 phone screens** and `/lots` **14.5**.

Every route in scope is rebuilt on the frozen Phase 0 contract — `lib/public-layout.ts`
and the `PublicHero` / `SectionHead` / `PublicDisclosure` / `PublicImage`
primitives re-exported from `components/kit`. The lane appends **only** to its own
`/* public: catalogue block */` at the tail of `styles/components.css`; the
Phase 0 grammar block and the other lanes' blocks are untouched.

## What changed, per route

| Route | Rebuilt on |
|---|---|
| `/products` | interior `PublicHero` (one sentence + the real count) → `SectionHead` → the collection index → the model grid → **"Show all 24 models"** `PublicDisclosure` → the five-tier band and the inclusions table each behind their own disclosure. Eight tiles render first (plan §3 R8: a browsing rail shows 6–8); two model tiles per phone row inside the 75 rem catalogue envelope, with the repeated per-card caption stepping out and the honesty line kept on the section lead. |
| `/products/[sku]` (PDP) | Kept as PDP P3 (the Amazon structure is already the target grammar; measured 4.3 screens, under the ≤ 6 target). Only the shared primitive plumbing changed (`PublicImage` gained the LCP `fetchPriority`). |
| `/lots` | interior `PublicHero` (the park-map commitment) → the approved rail/sheet listing. Each legend band renders **six** plots then one `PublicDisclosure` ("Show all N"); a phone prints the "photograph shows the section, not this plot" honesty line **once per band** and hides the per-card repeat (it returns with the rail ≥ 64 rem). |
| `/lots/[id]` (lot detail) | Rebuilt on the grammar: interior `PublicHero` (lot number h1 · type/section/area lead · the office call as the page commitment · Back to lots as support) → `PublicImage` (4:3, sized, lazy) with the honesty caption as a sibling → the lot-details card → **one** gold per-item hold action. |
| `/lots/price-list-2026` | interior `PublicHero` → the four family photographs as sized `PublicImage` cards → `SectionHead` → the four rate tables, the **first open and the rest disclosed** (plan §5.5) → the two compressed source notes. |
| `/gallery` | interior `PublicHero` (the one LCP photo) → three grouped photo bands via `SectionHead` + `PublicImage` (3:2 tiles, lazy) → the walk band, holding the **single** `/map` entry, the office call and the masterplan figure. |
| `/map` | The map/3D page keeps its staff-editable park hero and tab grammar (the plan's own §5.8 note: "today already 4.3 — mostly a phone-panel trim"). The phone Leaflet frame is capped (`min(44vh, 20rem)`) so the details panel and the page below it are reachable without a screen of map. |

## The audit — 390 × 844 phone (before = `main`@`4ec1322`; after = this branch)

| Route | Phone screens | Paragraph words | Longest paragraph | Max image height |
|---|---|---|---|---|
| `/products` | **23.41 → 5.96** | 256 → 282 | 27 → 27 | 257 → 228 px |
| `/products/CSK-LUMINA` | 4.32 → 4.32 | 93 → 93 | 28 → 28 | 227 → 227 px |
| `/lots` | **14.49 → 5.91** | 54 → 68 | 12 → 14 | 257 → **112 px** |
| `/lots/[id]` | 3.49 → 3.55 | 41 → 50 | 23 → 23 | 293 → 224 px |
| `/lots/price-list-2026` | **9.06 → 5.11** | 91 → 85 | **51 → 29** | 252 → 124 px |
| `/gallery` | **7.24 → 6.29** | 106 → 106 | 19 → 19 | 286 → 224 px |
| `/map` | 4.19 → 3.95 | 104 → 104 | 28 → 28 | 242 → 242 px |

Desktop (1440 × 900) page height, same runs:

| Route | Before | After |
|---|---|---|
| `/products` | 8,099 px (9.0 scr) | 3,692 px (4.1 scr) |
| `/lots` | 4,876 px (5.4 scr) | 2,539 px (2.8 scr) |
| `/lots/[id]` | 1,764 px | 1,676 px |
| `/lots/price-list-2026` | 4,198 px (4.7 scr) | 2,938 px (3.3 scr) |
| `/gallery` | 4,298 px (4.8 scr) | 3,782 px (4.2 scr) |
| `/map` | 2,152 px | 2,152 px |

Method: `document.documentElement.scrollHeight` at 390 × 844 (screens = height ÷
844); paragraph numbers are **visible** `<p>` elements only (the reading-budget
unit); image height is the tallest rendered `main img`. Re-run with the plan's
measure harness. No page upscales an image: every rendered width × DPR matched
its derivative's natural width in the same pass.

Notes on honest misses:

- **Paragraph words rose slightly on `/products` (256 → 282) and `/lots`
  (54 → 68).** The pass adds one hero facts line and one honesty line per band;
  both pages stay inside the ≤ 300 paragraph-word budget and the ≤ 30-word
  longest paragraph. The longest paragraph in the lane is 29 words.
- **The lot price list's 51-word source paragraph is now 29 words** — the one
  standing > 30-word offender on these routes is fixed.
- **`/gallery` (6.29) misses the plan's ≤ 5 phone target.** The remaining height
  is shared chrome, not catalogue content: the closing band plus the site footer
  are ~2 phone screens on every public route. The page's own content is three
  photograph bands and the walk band.

## Screenshots (`before/`, `after/`) — 1440 × 900 and 390 × 844

`products-*` · `pdp-*` · `lots-*` · `lot-detail-*` · `lots-pricelist-*` ·
`gallery-*` · `map-*` — each pair rendered full-page from the same seeded
fixtures, at the same viewport, before (`main`@`4ec1322`, after the sample-chip
removal merged) and after this lane.

## Rules kept

- **Tokens and the kit only.** Every surface renders the Phase 0 primitives;
  no new hero/section/card class was invented. The lane's CSS block declares the
  catalogue envelope reset, the phone 2-up model grid and the phone trims — no
  colour, type or radius is hand-rolled.
- **Honesty states and live prices stay.** Every amount still resolves through
  the pricing store / `lib/villa-pricing.ts`; the casket sample captions, the
  five-tier substitution note and the "photographs show the section" line all
  remain. The lot imagery still comes from the one rule home `lib/lot-imagery.ts`.
- **Images never upscaled.** `PublicImage` carries `width`/`height` and, with a
  `srcSet`, a `sizes` hint that matches the column; the lot-detail photo's
  previously hint-less `srcSet` is fixed.
- **One `h1` per route; the public word budget** (≤ 300 paragraph words, ≤ 30
  longest) holds on every route in scope.
- **No port 4000.** The pass used a spare dev port; the captain's server was
  never touched.

## Guards

`tests/unit/public-page-budget.test.tsx` now renders and pins the section order
of `/products`, `/lots`, `/gallery` and `/lots/price-list-2026` (the lane appends
its routes in the PR that sweeps them); `public-layout.test.ts`,
`phone-layout.test.tsx`, `public-image-rules.test.tsx`,
`public-cta-contract.test.tsx`, `products-listing.test.tsx`,
`gallery-page.test.tsx` and `reading-budget.test.tsx` are all green.

`npm run lint && npm run typecheck && npm test && npm run build` — green
(206 files / 2430 tests).
