# Storefront listing grammar — the Amazon-familiar restructure (2026-09-25)

**Task:** `villa-storefront-listing` · **Captain, 2026-09-25:** *"the designs were all the
same… the structures are all the same. Renovate them all in a much more Amazon inspired
UI/UX quality so customers are much more familiar."* His standing storefront aim: *"a well-run
product listing — picture first, then price and status, filters that stay in view while
scrolling (sticky rail on the left, a filter sheet on phones), deliberate even columns."*

This lane makes the **listing surfaces** one structural grammar. The type right-sizing
(#133), the page-opening bands (#136), monthly pricing (#130), Request for Quote (#129) and
the homepage rebuild (#131) had already landed, so the system rules were in place; this pass
changes the LISTING structure only.

## The shared grammar (new kit pieces)

The captain-approved `/lots` Amazon rail was promoted into the component kit, so every listing
now renders one frame instead of re-deriving a rail:

| Piece | What it owns |
|---|---|
| `components/kit/listing-shell.tsx` | The frame: a sticky left rail, a results/sort bar, and one Filters sheet on a phone (mounted only while open, focus returned on close). |
| `components/kit/refine-panel.tsx` | The refine controls: collapsible groups, per-option live counts (dimmed at zero, never hidden), a min/max price range with Go, quick bands drawn from the listing's published figures. |
| `components/kit/listing-nav.tsx` | A browse rail (a price list's or gallery's own sections) in the same sticky/sheet shell. |
| `lib/listing-model.ts` | The generic filter plumbing every listing shares: token lists, known-id filtering, peso→centavos parsing, reversed-range clamping, tercile price bands. |
| `lib/casket-listing.ts` | `/products`' pure filter/sort model (collection · cover · price; sorts by sheet order, price, name). |

`/lots` now renders the same kit frame; its route-local `app/(public)/lots/lot-filters.tsx`
duplicate was deleted. The CSS block that was `.lot-layout`/`.lot-rail`/`.lot-sheet`/
`.lot-filter*` is now the generic `.listing-*`/`.refine-*` grammar
(`styles/components.css`, "The listing grammar: a sticky rail + results").

## Structural inventory — before / after

### `/products` (the casket catalogue) — the main new listing

| | before | after |
|---|---|---|
| Rail | none | sticky `.listing-rail`, 17 rem, `< 64rem` → one Filters sheet |
| Filters | none | Collection (4), Cover (5: Half · Full · Full Split · Flexi · Cover not stated), Price (min/max + 3 quick bands) |
| Sort | none | Catalogue order · Price low→high · Price high→low · Name A–Z |
| Grid | one `.casket-grid`, `21rem` floor (3 across at 1440 un-railed) | one `.casket-grid`, `16.5rem` floor beside the rail → **3 across at 1440/1280**, 2 at 1024 and below the rail breakpoint, 2 at ≤40 rem |
| Legend | static `.casket-index` (4 collection tiles, no control) | removed — the rail's Collection group with live counts does the job |
| Card order | picture → family → name → cover → SRP → senior → actions | unchanged (already the brief's order) |
| Disclosure | 8 visible + "Show all 24" | unchanged |
| Empty state | none needed | "No models match those filters" + Clear, and a no-match hint naming the office |

### `/lots` (the memorial-lot listing)

| | before | after |
|---|---|---|
| Structure | route-local `.lot-layout` / `.lot-rail` / `.lot-sheet` / `.lot-results` | the kit `ListingShell` frame (same visual grammar, shared code) |
| Panel | route-local `lot-filters.tsx` | the kit `RefinePanel` |
| Filters | Section · Availability · Lot type · Area · Price | unchanged |
| Sort | price asc/desc in `.lot-results__bar` | unchanged, in the shared `.listing-bar` |
| Card order | picture → number → facts → monthly → status → action | unchanged |

### `/gallery` (the park's photographs)

| | before | after |
|---|---|---|
| Rail | none | `ListingShell` + `RefinePanel`: a "Photo sets" filter (Park & grounds · Care & facilities · Chapels & viewing, each with its photo count) |
| Phone | three stacked bands | the same sets behind one Filters sheet |
| Bands | three `.catalogue-band`s | the same bands, filtered in place; unfiltered shows all |
| Grid | two-up/three-up `.gal-cards` | unchanged |

### `/price-list` (the 2026 price list)

| | before | after |
|---|---|---|
| Rail | none | `ListingShell` + `ListingNav`: an "On this page" sticky rail (Compare packages · Coffin options · Senior citizen plan · Plan benefits · 2026 price list) |
| Phone | hero jump chips only (scrolled away) | one Sections sheet |
| Jump nav | `hero-chips` in the hero | removed (the persistent rail replaces it) |
| Tables | six sections, long tables behind `PublicDisclosure` | unchanged |

### `/plans` and the package pages — deliberately unchanged

The five plan tiers are a five-card comparison row (`plans-tiers-layout` pins the wrap ladder)
and a package page already carries its own right-hand buy rail. Neither has facets a filter
would narrow, so forcing a rail would be chrome, not a listing. They keep the shared
`PublicHero` / `SectionHead` grammar.

## Removals (nothing that helps a customer choose or act)

- `/products`' static `.casket-index` collection legend and its CSS — the rail's Collection
  group carries the same four collections AND lets the reader filter by them.
- `/price-list`'s hero `hero-chips` jump nav — the persistent rail does the same job and does
  not scroll away.
- `app/(public)/lots/lot-filters.tsx` — the route-local refine panel, now the kit's
  `RefinePanel`.

## What is deliberately preserved

- The navigation bar is untouched.
- The designed page-opening bands (`PublicHero`), the tokens, and the merged type caps (card
  figures 18–20 px, nothing above 40 px) are unchanged.
- The `PublicDisclosure` / `PublicImage` / `SectionHead` primitives keep their pinned
  declarations; `tests/unit/public-layout.test.ts` and the public-page-budget blueprint stay
  green.
- Every price, photograph, SKU, caption and detail route is unchanged.

## Guards updated / added

- `tests/unit/casket-listing.test.ts` (new) — the `/products` pure model.
- `tests/unit/products-listing.test.tsx` — the listing shell, the rail facets, the no-match
  state, filter/sort from the query string.
- `tests/unit/lots-listing.test.tsx`, `phone-layout.test.tsx`, `single-park.test.tsx`,
  `public-page-budget.test.tsx` — the `.listing-*`/`.refine-*` grammar.
- `tests/unit/price-list-page.test.tsx`, `gallery-page.test.tsx`, `reading-budget.test.tsx` —
  the new rails' copy and structure.

## Full check set

See the PR body for the exact `npm run lint && npm run typecheck && npm test && npm run build`
results.
