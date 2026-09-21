# Story, service & support pages — the minimal public pass (Lane 1 of Wave A)

**Task:** `villa-public-minimal-story-pages` · **Plan:** `data/villa-public-design-plan/report.md`
§4–7 (captain, 2026-09-21: _"ok implement now"_) · **Base:** `main` after PR #111
(`fm/villa-public-layout-phase0`, the frozen Phase 0 contract) · **Date:** 2026-09-22

## What this PR is

Lane 1 sweeps the **story, service and support** surfaces onto the frozen Phase 0
grammar. The captain's complaint was that the pages _"feel cheap because of large
labels, the headings, the design, the positions"_; the fix is one grammar —
`PublicHero` · `SectionHead` · `PublicDisclosure` · `PublicImage` — applied to
every route, with the answer at a glance and the detail behind a disclosure.

Nothing here invents grammar and nothing edits another lane's CSS block: the
shared contract stays in the "public layout grammar — Phase 0" block, and this
lane appends only its own named **"public: story block"** to
`styles/components.css`.

### Routes in scope (8)

`/services` · `/services/death-at-home` · `/services/death-at-hospital` ·
`/transport` · `/facilities` · `/immediate-assistance` · `/faq` · `/contact`

## The blueprint, per route

| route | the section list, in order |
|---|---|
| `/services` | breadcrumb → `PublicHero` (eyebrow · headline · one lead · Call + See prices · hero photo) → **Services and prices** ledger (five lines, one gold action each, the sheet's ₱19,500 total) → **Embalming — priced by the day** (day picker + `PublicDisclosure` for the full 3–9 day table) → **Chapel** (one card per park record, photo + per-day rate + 3-day examples + Check-dates) → closing `StoryHelpBand` |
| the three guides | `PublicHero` (one ≤12-word answer + Call · secondary) → back link → **Three steps, handled with you** (`StorySteps`) → **More about …** `PublicDisclosure` (the editable summary + any staff blocks) → `StoryHelpBand` |
| `/facilities` | `PublicHero` → **Common chapel, private chapel** (one `.story-room` per class, photo + per-day rate + who it suits + one call action) → the sheet's conditions as `.story-area` chips → the unconfirmed-room honesty line → **Gardens, niches and open lawns** (aerial + masterplan area chips + the two ground photographs) → map / lots links → closing band |
| `/immediate-assistance` | `PublicHero variant="call-first"` (the enormous call; F-01's documented exemption from the closing band) → four numbered steps → one reassurance line → three secondary alternatives |
| `/faq` | `PublicHero` → **Straight answers** (each seeded question a `PublicDisclosure`, the first open) → the next-step link row → back home |
| `/contact` | `PublicHero` → **Reach the office** facts grid (both lines · office · park, read from the landing document) + the three request doors → the shared capture form (its Send is the page's one sky commit) → back home |

## Measured — before / after

Chrome, DPR 1, full page. Screens = `scrollHeight ÷ 844` (phone 390×844) or
`÷ 900` (desktop 1440×900). Paragraph metrics are scoped to the page content
root (`.story-page` / `.sv-page`), not the shared chrome, and measured at 390.

| route | phone screens | desktop screens | paragraph words | longest paragraph | max image height |
|---|---:|---:|---:|---:|---:|
| | **before → after** | **before → after** | **before → after** | **before → after** | **before → after** |
| `/services` | 12.37 → **8.21** | 5.88 → **4.22** | 183 → 179 | 15 → 14 | 257 → 256 |
| `death-at-home` | 3.36 → 3.96 | 1.66 → 2.26 | 45 → 77 | **41 → 23** | 177 → 176 |
| `death-at-hospital` | 3.32 → 3.96 | 1.66 → 2.26 | 40 → 77 | **36 → 22** | 177 → 176 |
| `transport` | 3.27 → 3.96 | 1.66 → 2.26 | 33 → 75 | **30 → 22** | 177 → 176 |
| `/facilities` | 7.57 → **5.72** | 4.30 → **3.26** | 72 → 114 | 23 → 23 | **228 → 176** |
| `/immediate-assistance` | 3.83 → **3.50** | 1.97 → **1.83** | 70 → 70 | 14 → 14 | 0 → 0 |
| `/faq` | 3.51 → **3.27** | 1.65 → 1.89 | 55 → 56 | 17 → 17 | 0 → 0 |
| `/contact` | 4.55 → 4.59 | 2.46 → 2.69 | 35 → 39 | 13 → 13 | 0 → 0 |

Read the table with the plan's per-family ceilings
(`lib/public-layout.ts` → `PAGE_HEIGHT_CEILINGS`):

- **desktop meets or beats the ceiling on every route** (service 4.22 ≤ 4.5;
  guide 2.26 ≤ 2.5; support ≤ 3; grounds 3.26 ≤ 4);
- **two of the four phone families meet their ceiling** — IA 3.50 ≤ 3.5 and FAQ
  3.27 ≤ 3.5;
- `/services` (8.21), `/facilities` (5.72), the guides (3.96) and `/contact`
  (4.59) are still over their phone target. The shared public chrome
  (masthead + footer + the closing “Talk to us” band) is **≈1.9–2.2 k px on a
  phone** — more than half the guide/support budgets before a single section
  renders — so the phone ceiling is not reachable from this lane alone. The
  content itself fell hard (services content 8.4 k → 4.9 k px, −42 %).

The column that moved for the guides is the one the reading budget cares about:
the worst paragraph on `death-at-home` went **41 → 23 words** (it was over the
30-word limit before this pass). Every page's prose now sits inside the budget:
≤179 paragraph words, ≤23-word paragraph, all images at or under their role cap
(card ≤256 px, band-lead/interior ≤176 px), **no horizontal overflow at 390**
(`scrollWidth = 390` on all eight routes).

## What is honest, and what stayed honest

- **Live prices are untouched.** Every amount still comes through
  `lib/villa-pricing.ts` / `lib/catalogue-skus.ts` / the pricing store; the
  services ledger, the embalming ladder and the chapel cards render the same
  sheet figures, and `/services` and `/facilities` read the same chapel rates
  (`tests/unit/facilities-page.test.tsx` still compares the two pages).
- **Sample imagery keeps its label.** The chapel photographs carry
  `CHAPEL_SAMPLE_NOTE`. The `/services` hero photograph is one of the client's
  own wake set-ups and is `illustration-only` in `lib/client-photos.ts`, so this
  pass restores its note beside the hero (`SERVICE_SAMPLE_NOTE`) — the shared
  `PublicHero` has no caption slot, so the story lane carries it as hero copy.
- **`/facilities` still invents nothing.** No room name, no capacity and no
  chapel count are published; the “Room names and capacity are still
  unconfirmed” line stays, and the map / 3D walk-through are linked, not redrawn.
- **`/immediate-assistance` is unchanged in order and scope** — one `h1`, one
  `tel:` link, no hours, no street address, no second number, no chat/callback.
- **Content edits still reach the pages**: the landing document drives the FAQ
  and the contact facts; the three guides render their service entries (the
  entry's own `summary` and blocks live behind “More about …”, so an edit is
  never dropped).

## Guards

| guard | change |
|---|---|
| `tests/unit/villa-services-premium.test.tsx` | re-pinned to the `.story-*` DOM; still pins the three priced sections, both actions per line, the chapel sample photos + label, the day picker, the booking step (never a straight chapel add) and the editable 24/7 line |
| `tests/unit/facilities-page.test.tsx` | room/area class pins moved to `.story-room` / `.story-area`; the honesty, imagery, map-link and same-figures-as-`/services` checks are unchanged |
| `tests/unit/faq-page.test.tsx` | questions are `PublicDisclosure` now; the empty state and the save-path tests are unchanged |
| `tests/unit/immediate-assistance.test.tsx` | the enormous call is the hero's primary button now; order, one-number and honesty checks are unchanged |
| `tests/unit/service-entry-page.test.tsx` | the guide's compressed summary wording |
| `tests/unit/reading-budget.test.tsx` | the three story routes' opening-lead selector moved to `public-hero__lead` |

`npm run lint && npm run typecheck && npm test && npm run build` all green
(206 files / 2,417 tests).

## Evidence

`shots/before/` and `shots/after/` — full-page captures at **1440×900** and
**390×844** for every route in scope (lazy images forced to load before capture).

## Open item

The phone ceilings for `/services`, `/facilities`, the guides and `/contact` are
held back by the shared public chrome (masthead + footer + closing band). Closing
them is a chrome-level decision (a later wave), not a story-lane restyle — this
lane does not edit the shared header/footer grammar.
