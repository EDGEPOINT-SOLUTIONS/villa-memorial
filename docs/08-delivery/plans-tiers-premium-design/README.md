# Villa Memorial Plan — premium tier cards (2026-09-21)

**Route:** `/plans` (the five-tier section), with the tier data read by `lib/plan-content.ts`.
**Brief:** captain's 2026-09-21 direction — *"improve them it should look premium make the 5 tier
in one column and you can attach or not images, the dropdown inclusion is displayed already in
the card not a dropdown, it's the best practice"* — applied in the product's blue/gold design
language, with the anatomy of the reference pricing page (name · subtitle · price · description ·
action · **Key features:**).

## What shipped

The tier block on `/plans` was an equal-weight two-column grid of `.card`s, each with a live
monthly rate and a **closed `<details>`** inclusion list. It is now **one column of five premium
tier cards**, each with:

1. the tier name (serif display step);
2. a "**Starting from**" subtitle;
3. the **live monthly rate** read through `planRateOf` from the current pricing store
   (never authored in content, never a per-card constant);
4. a **one-line description** (editable content, seeded from the client's own TYPES OF COFFIN
   tier descriptions + lid lines);
5. **one clear action** — "Ask about this plan", the existing prefilled `/contact` enquiry built
   by `planRequestAction` (no invented online availability);
6. **Key features:** the tier's inclusion checklist **printed directly in the card** (never a
   `<details>` / dropdown);
7. an **optional photograph** — a 20rem media panel when attached, a clean text-only card when
   not (no placeholder hole).

The 2026 rate tables, cash-assistance table and package blocks below the tiers are unchanged.

## Card anatomy / layout

- `.plan-tiers` is a one-column grid (`gap: --space-5`).
- `.plan-tier` is a ruled `.card`-family surface with one gold spine hairline; at ≥56rem it holds
  two text columns (`minmax(0, 1fr)` intro · `minmax(0, 1.2fr)` features) split by a hairline.
  A staff-attached photo adds a fixed `20rem` media column (`.plan-tier--media`).
- Below 56rem the card stacks media (16:9) → intro → features; the checklist prints one per line.
- At ≥56rem the feature list flows to two columns once the card has room
  (`repeat(auto-fit, minmax(15rem, 1fr))`).

## Model

One optional field pair on the existing typed **checklist block** (`lib/content-catalog.ts`),
which already described "a plan tier's inclusion list":

| Field | Type | Meaning |
|---|---|---|
| `summary` | `string` | the one-line description the tier card prints under the name |
| `image` | `ContentImage \| null` | the optional tier photograph (alt text; sample requires a caption) |

- The tolerant reader takes honest defaults (`summary: ""`, `image: null`) and now reads a
  missing/unknown `mode` as `printed` — a new checklist opens printed (the captain's practice).
- The validator checks the summary length and runs the one shared image gate (published source,
  alt text, bounded caption, sample-needs-caption); the glyph gate includes the new strings.
- The page-document editor (`components/content/content-editor-fields.tsx`) gets a
  "Description (optional)" field and an "Attach photo (optional)" control (library / device
  upload / URL via the existing `MediaPicker`, with alt / caption / sample / remove), and the
  editor routes a picked photo into the checklist block.
- **No new editor concept** and **no amount in a block**: the price is still the page's live read.

## Evidence

| Shot | What it shows |
|---|---|
| `shots/plans-tiers-before-1440.png` · `plans-tiers-before-390.png` | Before: the two-column card grid with closed inclusion dropdowns. |
| `shots/plans-tiers-after-1440.png` · `plans-tiers-after-390.png` | After: one column of five premium cards, features printed in the card, text-only (no photo attached). |
| `shots/plans-tiers-with-image-1440.png` · `plans-tiers-with-image-390.png` | After with a staff-attached photo on Bronze 1: the 20rem media panel, caption chip, and the card still scans at a glance. |
| `shots/editor-plans-tier-no-image-1440.png` | The editor's checklist block: Description, "Printed open (the tier card)", "Attach photo (optional)" with "No photo". |
| `shots/editor-plans-tier-with-image-1440.png` | The same block after attaching a photo: thumbnail, Change/Remove, alt text, caption, sample toggle. |

Measured (`chrome-devtools-axi` on the dev server):

- 1440×900: card width **1392px** (the folio container), no horizontal overflow
  (`scrollWidth === clientWidth === 1440`).
- 390×844: card width **342px**, no horizontal overflow (`scrollWidth === clientWidth === 390`);
  the action button is full-width and the 44px phone target rule covers it.
- The card row's height is driven by its tallest column; the media panel stretches to it and the
  picture covers (`object-fit: cover`), so a short photo never leaves a hole beside a tall list.

## Not changed

- No new colours, typefaces or type-ladder steps — tokens and the existing `.card`/`.btn`
  grammar only; the gold spine is decorative and carries no text.
- The rates stay a live read; the package table, eligibility, notes, cash assistance and the
  5 × 4 payment tables are untouched.
- The public nav work and the content-catalogue cleanup are untouched.

## Tests

- `tests/unit/plans-page-content.test.tsx` — the five tiers render as one `.plan-tiers` column of
  five `.plan-tier` cards with **no `<details>`**, the printed "Key features:" lists, the
  "Starting from" subtitle, the live rate and the one action; and an attached photo renders a
  `.plan-tier--media` card while the others stay text-only.
- `tests/unit/plan-content.test.ts` — the typed reading: tier order, the one-line `summary`, the
  optional `image`, honest empties.
- `tests/unit/content-catalog.test.ts` — a fresh checklist opens **printed**; the reader defaults
  `summary`/`image`; the validator refuses a tier image without alt text and a sample without
  its caption.
- Gates: `npm run lint && npm run typecheck && npm test` (2179 passed) and `npm run build`.
