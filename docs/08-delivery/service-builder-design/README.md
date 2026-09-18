# Smart Service Builder — implementation record (F-05, 2026-09-18)

**Route:** `/builder` (`app/(public)/builder/page.tsx` → `components/builder/service-builder.tsx`).
**Brief:** checklist F-05 — "Build the Smart Service Builder — the screen where a family works
out what they need and sees what it costs." It is the last unbuilt public screen in the
requirement document and the screen the PRD calls the configurator
(`docs/04-modules/screen-inventory.md`: Public website → "Smart Service Builder";
`docs/04-modules/commerce-catalog.md` §"Smart Service Builder / configurator (blueprint §8)").

## The one honest constraint, stated first

The PRD's configurator assumes a live pricing-and-availability rule engine. **No such service
exists** (the platform's rule engine is deferred platform scope), so nothing on this screen is
computed by a service. Every figure is the **client's own published 2026 figure**, read from
`lib/villa-pricing.ts` (the single transcription home for the sheets) and the CURRENT pricing
store document for the plan tables. The screen is an estimate that ends in the office's hands —
never a quotation, and it says so on the panel every visitor sees
("An estimate — the office confirms the final figures." / "Nothing here is reserved or ordered.").

## What the screen does

1. **Hero** — one line ("What you already have, what you need, and the running total."), the
   24/7 call as the primary action and a jump to step 01.
2. **01 Your situation** — *who this is for* (the sheet's standard columns, or the senior
   column: 61–100, no insurance benefit) and *what is already in place* (a Villa Memorial Plan ·
   a casket · a burial lot · an arrangement with the office). This is the first question on
   purpose: what the family already has **reduces** the total instead of restarting it.
3. **02 The casket** — the sheet's 24 models in their five collections, each row printing
   **both** of the sheet's columns (`White Rose Half — ₱62,000.00 · senior ₱49,600.00`), the
   chosen model's inclusion chips (flowers · tarp · lapida · family car · 1 doz roses ·
   thank-you card), and the sheet's substitution line.
4. **03 The service and its days** — the sheet's preparation ladder (3–9 days) plus its
   ">9 +₱1,500/day" line behind a *More* choice and a bounded day count.
5. **04 The chapel** — common or private, 3–9 days, the printed stay totals, and the sheet's
   senior column with the sheet's own scope and fee notes.
6. **05 The extras** — the five a-la-carte fees the sheet prices, with a *Select all five*
   shortcut that shows the sheet's own unlabelled ₱19,500 total.
7. **06 The plan** — optional, paid in instalments: tier × payment mode with the store's
   current amounts, printed **separately** from the one-time total, with the plan sheet's own
   inception/contestability line.
8. **Your estimate** (the rail) — the running total, every priced line, the lines a held or
   chosen plan covers (listed with no amount), what is already yours, the steps still to answer,
   the item the office quotes, the disclaimer, and the two actions: **Call** (the
   staff-editable 24/7 number) and **Send this arrangement to the office** (the existing
   `/contact` request path, carrying the arrangement and the figure the visitor saw).

## Where every fact comes from (nothing is authored in the view)

| Fact | Source |
|---|---|
| Casket models, SRP + senior column, collections | `CASKET_MODELS` in `lib/villa-pricing.ts` (sheet A "For package") |
| Per-family inclusions (flowers · tarp · lapida · car · roses · card) | `CASKET_INCLUSIONS` + `CASKET_INCLUSION_COLUMNS` (sheet III) |
| Substitution line | `COFFIN_TIER_NOTE` (TYPES OF COFFIN sheet) |
| Preparation 3–9 days, ">9" extra day | `EMBALMING_RATES`, `EMBALMING_PER_DAY_BEYOND_9` (sheet A) |
| The five a-la-carte fees + the sheet's ₱19,500 total | `ALACARTE_SERVICE_FEES`, `ALACARTE_SERVICE_TOTAL` (sheet A) |
| Chapel 3–9 day schedule, regular + senior, scope + ₱1,000 fee | `CHAPEL_RATES`, `CHAPEL_NOTES` (sheet III) |
| Plan tier × payment mode, regular + senior | the pricing store document through `planRateOf` (`lib/api-client/pricing.ts`) — an office edit on `/staff/plans` is what a visitor sees |
| Plan inception/contestability line | `VMP_NOTES.contestability` (COMPLETE MEMORIAL PACKAGE sheet) |
| Items the sheets do NOT price | `WITHDRAWN_CATALOG_ITEMS` (`lib/catalog-sources.ts`) — named as the office's, never given a figure |
| 24/7 number | the staff-editable landing content document (zone 01), read per request |

`lib/service-builder.ts` is the **one rules home** (what a step can be, how the total adds up,
what the request carries) and it is pure: it never states an amount, only adds up the catalog it
is handed. `lib/service-builder-catalog.ts` is the ONE join of the sheets + the pricing store
into the plain document the browser renders.

## Honest states / deliberate omissions (compressed, one line each)

| State | What the screen does |
|---|---|
| An item no 2026 sheet prices (the four withdrawn catalogue lines) | Named once as "The office arranges these — ask for a price: …"; no SKU, no placeholder figure, no row |
| The burial lot | "Burial lot — the office quotes it per plot"; the lot sheet's family tables are NOT published here (the per-plot quotation is an open client question) |
| Fewer than three preparation days | "Fewer than 3 days is not on the 2026 sheet — ask the office" (no invented row) |
| A step not answered yet | "Still to choose: …" — words, no figure; the total starts at ₱0.00 |
| An arrangement already with the office | The builder stops pricing: one card, the call, and the contact path |
| A held plan | The package lines leave the one-time total and are listed as covered — the total is reduced by omission, never by a fake zero |

## Interaction, accessibility and the reading budget

- **Every control is native** (radio, checkbox, select, number, button) inside its own
  `fieldset` + `legend`, so the flow is keyboard-operable end to end with the app's single brass
  focus ring (`.sb-page` uses the standard `:focus-visible` rule; the ring is visible in
  `shots/builder-1440-focus-ring.jpeg`).
- **The total stays visible**: a sticky rail under the two-layer header at desktop widths, and
  the same running figure repeated in every step header on a phone (the rail is static there),
  plus a one-tap "Your estimate: ₱X" jump line at the top. The total is a polite live region.
- **Lighthouse**: accessibility 100, best practices 100, SEO 100 on desktop and mobile (0 failed
  audits), run against the production build on this branch.
- **Reading budget**: the page joined `tests/unit/reading-budget.test.tsx` in the PR that added
  it (paragraph prose ≤ 300 words, ≤ 30 words per paragraph/list item, opening sentence ≤ 12).
- **Tokens only**: the `.sb-*` block in `styles/components.css` uses `styles/tokens.css` roles
  and ladder sizes only (18px body, nothing a family reads below 16px, ≥ 44px targets);
  `tests/unit/typography-system.test.ts` stays green.

## Tests

| File | What it pins |
|---|---|
| `tests/unit/service-builder.test.ts` | The catalog is the sheets joined (24 caskets, both columns, the five fees + the sheet total, the 3–9 day ladder + the extra-day line, both chapel classes, every tier × term cell); the plan rates come from the STORE (a simulated edit is what a visitor sees); the senior column applies where the sheet prints one and nowhere else; a held plan reduces the total without re-pricing it; the plan's instalment is never added to the one-time total; the request note always keeps "An estimate, not a quote."; the withdrawn items are only labels |
| `tests/unit/service-builder-page.test.tsx` | Rendered: both casket columns published, the preparation/fee/chapel figures, the five tiers, one `h1`, the office-confirms line, the request link, no cart action, the withdrawn SKUs and placeholder amounts absent, the lot left to the office, the zero-total state |
| `tests/unit/reading-budget.test.tsx` | The page's prose budget |
| `tests/unit/seo.test.ts` | `/builder` is in `PUBLIC_PAGES` and the sitemap (the route-coverage walk) |

## Navigation and SEO

- `SITE_NAV_LINKS` gains one short chip (`Builder`) after Services; the grouped "Plan ahead" menu
  gains the screen's full name ("Smart Service Builder — Build the arrangement and see the 2026
  total"); the shared footer's "Care & planning" column links it too.
- `lib/seo.ts` publishes `/builder` in `PUBLIC_PAGES` (monthly, 0.8) — **indexable**, unlike the
  memorial pages: this is a selling surface. `app/robots.ts` needs no change (the storefront is
  allowed; the route is not a session surface). The page builds its canonical/OG/Twitter tags
  through `pageMetadata()` like every other public page.

## Evidence

`shots/` — production build on this branch:

| Shot | Shows |
|---|---|
| `builder-1440-running-total.jpeg` | 1440: hero, step 01 (senior rates chosen) and the sticky estimate rail with the running total |
| `builder-1440-senior-comparison.jpeg` | 1440: the casket row with BOTH sheet columns, the picked model's senior amount, its inclusion chips and "Standard price: ₱62,000.00" |
| `builder-1440-plan-covered.jpeg` | 1440: the plan chosen → the package lines marked "Covered", the one-time total reduced to the chapel, and the monthly amount in its own box ("paid in instalments — shown separately") |
| `builder-1440-focus-ring.jpeg` | 1440: the brass focus ring on a builder control (keyboard operability) |
| `builder-390-top.jpeg` | 390: hero + the "Your estimate: ₱79,540.00" jump line + step 01, no horizontal overflow |
| `builder-390-estimate.jpeg` | 390: the estimate panel at phone width — every line, the disclaimer, both actions |
| `builder-390-full.jpeg` | 390: the whole flow in one column (running figure in every step header) |

## Contract asks recorded by this PR (do not quietly widen)

1. **No pricing/availability rule engine exists** — this screen is an app-authored estimate over
   the client's published figures, not a computed quotation. When a pricing service freezes,
   `lib/service-builder-catalog.ts` is the seam that changes; the view does not.
2. **The senior chapel column conflict** (the sheet's table vs its footnote) is published exactly
   as the sheet prints it — the same open client question `/plans` and `/services` already carry
   (`lib/fixtures/commerce/pricing.json` → `questions`).
3. **No cart/order write** leaves this screen: the arrangement is handed to the office through
   `/contact`. A configuration → order contract does not exist.
