# `/lots` control-system consistency — implementation record (2026-09-21)

**Route:** `/lots` (`app/(public)/lots/page.tsx`, `lot-listing.tsx`, `lot-filters.tsx`; the
"lot listing" block of `styles/components.css`).
**Brief:** the captain's follow-up to the merged `/lots` rebuild (PR
[#85](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/85)) and the public-page kit
adoption (PR [#87](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/87)):
*"tell me why in the lots, the buttons or cta is not consistent"* (2026-09-21). Close the
remaining gap against the Amazon search-page structure the original brief named — **no new
visual language, tokens and the existing button grammar only**.

## What shipped — one control ladder

The public catalogue already declares a hierarchy; `/lots` was the one catalogue surface not
on it. Every repeated control now takes its rung from that ladder — nothing bespoke:

| Control | Rung | Why |
|---|---|---|
| **Card action** (one per card) | `.btn--accent` (gold), `.btn--sm` | The card's one action owns its **primary** slot. The catalogue dresses a card's main action in gold (`Add to cart` on `/products`, `/plans`, `/packages`); there is no cart action on a lot, so "View …" is that primary. |
| **Rail `Clear`** and **no-results `Clear all filters`** | `.btn--secondary`, `.btn--sm` | The same reset act, one treatment. The rail link was an underlined text link while the recovery button was an outline button. |
| **Desktop `Go`** and **phone-sheet `Show N lots`** | `.btn--primary` (sky, full size) | The same commit act, one hierarchy across surfaces. `Go` was a small secondary; the sheet apply was already full-size primary. |
| **Quick price ranges** | `.btn--secondary`, `.btn--sm` | Subordinate to `Go`, but on the same `.btn` ladder — no bespoke chip class. Riding `.btn` also lifts them to the phone 44px touch target the old 33px chip never reached. |
| **Group heads** | `.lot-filter__head` + hover wash + radius | The panel reads as one system: a head now hovers exactly like its option rows. |
| **`Filters` toggle** | `.lot-sheet__toggle` + hover border | Same hover cue as `.btn--secondary`; focus already comes from the one global `:focus-visible` ring. |
| **Sort control** | `.select` (unchanged) | Already on the shared field grammar: the product-wide `select:hover` border and the one global focus ring. Confirmed, not re-styled. |

### The card-action wording reconciled

Before: 12 cards said **"View this lot"** (a linked, published lot) and 44 said **"View on the
park map"** (a plot with no published lot) — four-fifths of the grid on a different wording.
The two **honest destinations stay** (the frozen `Lot` contract still drives the href: `/lots/[id]`
vs `/map?park=…&plot=…`), but the labels now read as **one grammar** — the shared core *"View
this lot"*, with the map destination spelled out only where that is where it goes:

- published lot → **"View this lot"**
- map-only plot → **"View this lot on the park map"**

Both are the same action on the same object; only the map case adds where it leads. The card's
photograph and title already route to the same href, and every caption already discloses
*"…is marked on the park map"*, so no destination is hidden.

## Structure check against Amazon's search page

| Reference element | `/lots` state | This pass |
|---|---|---|
| Results count + sort placement | count left, sort right, above the bands | **on the reference** — untouched |
| Card scannability / density | `.shop-grid`/`.shop-card`: photograph first, then figures; 3 across beside the rail, 1 at 390 | **on the reference** — untouched |
| Status chip | directly under the price (the kit's ONE settled placement, `ProductCard`) | **out of scope** — moving it is a kit-wide product decision, not a `/lots` restyle |
| No-results recovery | `EmptyState` + one clear action | **closed** — the recovery is now the same control as the rail's Clear |

Nothing else in the structure was restyled; the two out-of-scope items are named above rather
than "fixed" into a different grammar.

## Not changed

- The page's approved structure: sticky rail, in-place filtering with URL state and preserved
  scroll, the imagery and its captions, the per-park bands.
- The FilterRail's own grammar (collapsible groups, count pills, min/max, sheet) — promoting it
  into `components/kit/` stays a separate product decision (`components/kit/README.md`).
- Prices, fixtures, honesty wording, the type ladder and every token value. No new colour, no
  new component.

## Evidence

- Targeted: `tests/unit/lots-listing.test.tsx` (the new **"one control ladder for /lots"**
  block pins the accent card action, the shared label core, the two Clear controls and the
  Go/Apply/quick-range rungs), `tests/unit/lot-listing.test.ts`, `tests/unit/phone-layout.test.tsx`,
  `tests/unit/composition-pass.test.tsx`, `tests/unit/broken-pages.test.ts`.
- Full gate on the branch: `npm run lint` · `npm run typecheck` · `npm test` (2 065 tests) ·
  `npm run build` — green.
- Measured before → after (computed styles, 1440×900 unless noted):

  | Control | before | after |
  |---|---|---|
  | card action | `btn btn--primary btn--sm` 27px, sky `rgb(152,210,241)` | `btn btn--accent btn--sm` 27px, gold `rgb(226,182,51)` |
  | card labels | `View this lot` (12) / `View on the park map` (44) | `View this lot` (99px) / `View this lot on the park map` (200px) |
  | rail Clear | `.lot-refine__clear` underline text, 33px, transparent | `btn btn--secondary btn--sm` 27px, raised + border |
  | desktop `Go` | `btn btn--secondary btn--sm` 27px / 14px | `btn btn--primary` 37px / 16px, full rail width |
  | phone apply | `btn btn--primary` 44px | `btn btn--primary` 44px (unchanged rung) |
  | quick range | `.lot-filter__quick-link` 12px chip, 33px (desktop) | `btn btn--secondary btn--sm lot-filter__quick-link` 14px, 27px desktop / **44px phone** |
  | group head | no hover | hover wash + `.radius-sm` |

- Shots (`./shots`, `.jpg`): before/after at 1440×900 (card action · rail Clear + price group ·
  no-results recovery) and 390×844 (phone sheet's `Go` / quick ranges / `Show N lots`).
