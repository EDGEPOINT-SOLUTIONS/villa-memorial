# The five plan tiers — one comparison row (2026-09-21)

**Route:** `/plans` (the five-tier section), content read through `lib/plan-content.ts`.
**Brief:** captain's follow-up after the premium one-column pass — *"the five tier plan make it
5 plan per row"*: the five tiers must sit **five across in a single row on desktop**, each
keeping its full premium anatomy and staying legible.

## What shipped

`.plan-tiers` is now a deliberate grid and `.plan-tier` a single vertical stack:

| Viewport | Columns | Measured card width |
|---|---|---|
| ≥ 86rem (1376px) — desktop | **5 across, one row** | 265.6px at 1440 |
| ≥ 72rem (1152px) | 4 | 264–317px |
| ≥ 60rem (960px) | 3 | 293–427px |
| ≥ 40rem (640px) | 2 | 318–452px |
| < 40rem (phone) | 1 | 342px at 390 |

Chosen so the narrowest five-row card (~253px at the 86rem boundary) still prints every
`"Key features:"` line on one row — the previous lower breakpoint (82rem) wrapped five
labels at 240px, so the five-row starts where the labels no longer wrap.

Each card keeps the full premium anatomy from the premium pass: tier name · "Starting from"
subtitle · the **live monthly rate** (`planRateOf`, never authored in content) · the one-line
editable summary · one enquiry action · the inclusion checklist **printed under "Key features:"**
(never a `<details>`) · the optional staff-attached photograph.

### Deliberate steps down (the narrow-column adaptation)

- The card is one vertical stack at every width (the old `≥56rem` two-text-column split and the
  20rem side media column are gone), so the same card is legible at 253px and at 452px.
- On the five-row the **name steps down one rung** (`--text-2xl` → `--text-xl`) and the **rate
  one rung** (`--text-3xl` → `--text-2xl`) — the only off-1440 deviations, both ladder tokens.
- The feature list is always one line per row; it no longer flows to the two-column
  `repeat(auto-fit, …)` it had at ≥56rem, which is the layout that would clip at 253px.
- `.plan-tier__features` is `margin-top: auto`, so in the row the "Key features:" hairline and
  the eight inclusion rows line up across all five cards whatever the summary length.
- The optional photograph leads the card at 16:9 (wrapper ratio + `object-fit: cover`); a
  photo-led card is the tallest in the row and the grid stretches the rest to match — no
  placeholder hole is introduced, and the seed carries no photo, so the default row is uniform.

Nothing else changed: prices stay live reads from the pricing store, content stays editable
(the same optional `summary` / `image` fields on the checklist block), tokens and the type
ladder only, no new colours or faces, the accessible focus rings and the ≤40rem 44px button
target are untouched.

## Evidence

| Shot | What it shows |
|---|---|
| `shots/plans-tiers-before-1440.png` · `plans-tiers-before-390.png` | Before: five full-width cards stacked one per row. |
| `shots/plans-tiers-after-1440.png` · `plans-tiers-after-390.png` | After: five across in one row at 1440; the single-column card at 390. |
| `shots/plans-tiers-wrap-1280.png` | The intermediate 1280px width — four across, the fifth wrapping to a second row. |
| `shots/plans-tiers-with-image-1440.png` | With a staff-attached photo on Gold: the 16:9 leading band + caption, the other four text-only. |

Measured (`chrome-devtools-axi`, dev server on a spare port):

- 1440×900: `.plan-tier` width **265.6px**, `gridTemplateColumns` = five ×265.6px,
  `scrollWidth === clientWidth === 1440` — no horizontal overflow.
- 390×844: card **342px**, `scrollWidth === clientWidth === 390`; the action is full-width and
  the ≤40rem 44px touch target applies.
- 1280×900: four ×296px (the wrap point), 4123px-wide sweep at 1920/1440/1376/1366/1280/1152/
  1100/960/900/700/500/390 found **zero wrapped feature rows** and no overflow at any width.

The with-photo shot was taken with a photo temporarily attached to the Gold checklist (the
seed ships none); the seed was reverted before the commit.

## Tests

- `tests/unit/plans-tiers-layout.test.ts` — pins the wrap ladder (base 1 col; 40/60/72/86rem →
  2/3/4/5), the single-stack card, the stepped-down name/rate on the five-row, the bottom-aligned
  feature block, and the 16:9 media band; fails if the retired two-column templates return.
- `tests/unit/plans-page-content.test.tsx` — still renders the five tiers and the printed
  "Key features:" lists.
- Gates: `npm run lint && npm run typecheck && npm test && npm run build`.
