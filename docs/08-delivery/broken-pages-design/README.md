# Broken pages — what rendered wrong, why, and the fix (2026-09-19)

**Captain's report:** *"The product's pages render broken — the landing page first, and others
too."* This is the highest-priority report there is, so the method was visual first, mechanical
second: walk the pages, write down what the eye catches, then name the rule that does it.

**Firstmate's pre-check (already done, not repeated):** three stylesheets load, 2,609 rules, none
inaccessible; body renders Source Sans 3 at 16 px and `h1` renders Alegreya; no console errors on
`/`; braces balanced, no conflict markers. So the breakage is **layout and composition**, and it
can only be found by looking.

## The route walk (fixture mode, both required widths)

`/` · `/services` · `/products` · `/plans` · `/lots` · `/map` · `/facilities` · `/gallery` ·
`/builder` · `/contact` · `/faq`; `/client/dashboard`, `/agent/dashboard`, `/staff/dashboard`,
`/staff/ops`, `/staff/copilot`, `/platform/tenants`; plus (to be sure "and others too" was
covered) `/packages`, `/transport`, `/cart`, `/checkout`, `/lots/price-list-2026`,
`/plans/villa-memorial-plan`, `/plans/senior-benefits`, `/plans/compare`,
`/services/death-at-home`, `/services/death-at-hospital`, `/immediate-assistance`, `/memorials`,
`/memorials/find`, `/products/[sku]`, `/plans/[sku]`, `/lots/[id]`, and every `/staff/*` section
page — at 1440×900 **and** 390×844.

**Four surfaces were visibly broken. Everything else on that list renders correctly** — the
portals, the staff board, the copilot, the platform screens and the whole `/plans` `/lots` `/map`
`/facilities` `/gallery` `/builder` `/contact` `/faq` set are clean at both widths (checked by
eye and by the detectors listed under "How this was searched").

---

## D1 · `/` — the "Services we offer" lead photograph, stretched to a portrait slab

The band's one dominant element is the client's own garden photograph. The CSS box asks for 3:2
(`.svc-card__media img { width: 100%; aspect-ratio: 3 / 2 }`). It rendered **330×480** at 1440 — a
portrait slice of a landscape picture — and the height was pinned at **480 px at every width from
390 to 1440**, so at 800 px the ratio happened to come out right and everywhere else it did not.
Beside it the lead's copy ("Lot only … from ₱75,000") floated in a 480 px-tall row with ~260 px of
blank below it, so the band read as two unrelated halves.

| | before | after |
|---|---|---|
| lead media box @1440 | 330 × 480 (ratio 0.69) | **330 × 220 (ratio 1.50)** |
| lead card | 708 × 505 | **708 × 245** |
| `.svc-grid` band | 791 px | **531 px** |
| `/` document height @1440 | 5,459 px | **5,199 px** |

**Cause — one rule, not the symptom.** The view reserves the picture's space with
`<img width={720} height={480}>` (a CLS hint, and worth keeping). A `width`/`height` attribute is
a *presentational hint*: it supplies a **definite height**, and a definite height makes
`aspect-ratio` a no-op — the box's ratio is then simply ignored. `.svc-card__media img` set
`width`, `aspect-ratio` and `object-fit` and never reset `height`, so the attribute won.
Confirmed live: injecting `height: auto` alone moves the box from 330×480 to 330×220.

**Fix.** `height: auto` on the rule. The same omission sat on **seven other `img`-level ratio
rules** in the same file (`.ledger__media img`, `.tier-ledger__media img`, `.chapel-card__media
img`, `.ed-media-card img`, `.sv-chapel__media img`, `.fac-room__media img`,
`.fac-ground__media img`) — all currently invisible only because those pictures happen to carry no
attributes yet, while `/gallery`'s seven already do. All eight now reset the hint, and
`tests/unit/broken-pages.test.ts` fails any `img`-level `aspect-ratio` rule that does not.

## D2 · `/` — an empty box where the newsfeed caption should end

The lead post's caption printed a small hollow rectangle after "…a gift of time and light.". The
seed caption (`lib/fixtures/landing/content.json`, post `post-golden-hour`) ended in the herb
emoji **U+1F33F**.

**Cause.** The product owns exactly two faces — Alegreya and Source Sans 3, both self-hosted.
Neither carries any emoji, so a published emoji is not an emoji at all: it is a missing glyph, and
the browser draws the tofu box. Nothing at the publish boundary said so, so the seed shipped one.

**Fix, two halves.** The seed caption keeps its meaning and loses the glyph; and the publish gate
(`validateLandingContent`) now refuses an unrenderable glyph in **any** staff-authored landing
field, naming it in a plain sentence ("…this product's typefaces … carry no emoji, so the page
would show an empty box instead. Please write the thought in words."). The rule
(`unrenderableGlyphs`) names the astral emoji/pictograph blocks and their two dress-up modifiers
only — `₱ · — → ↑ ↓ ← ↔ ▸ ▾ ◆ ○ ● ⚠ ✓ ✕` are all characters these faces really carry and stay
legal.

## D3 · `/services` — both guide cards opened a 174 px hole in the top-left

"Death at home" and "Death in hospital" are photo cards. They rendered as: photograph at the top
**right** in a 290 px column, the sentence and button below it, and a large empty rectangle where
the heading should have been. The heading had been dropped to **y=1497** — the *bottom* of the
picture — leaving the top-left corner of a 377 px-tall card blank.

**Cause.** The composition pass re-templated `.sv-price-card` from a stacked card into a two-column
price ledger (`grid-template-columns: minmax(0, 1fr) auto; align-items: baseline`) so the a-la-carte
rates would read as a hairline ledger. The guide cards reuse the same class and were left with a
`padding`-only override, so they inherited the ledger: the photograph took the `auto` track (sized
for a *price*, so 290 px) and `align-items: baseline` aligned the heading to the image's baseline.
`.sv-prices--guides .sv-price-card` had one declaration — `padding` — and no way to say "not this
template".

**Corroboration.** The design record's own review page
(`docs/08-delivery/services-design/services-design.html` + `services-pages.css`) declares a
**one-column** `.sv-price-card`; because it does not restate `grid-template-columns`, the shipped
two-column template now leaks into it too and its guide cards are broken the same way
(`shots/d9-services-artifact-ruined-by-the-shared-rule.jpg`) — the shared rule damaged the record
as well as the page.

| | before | after |
|---|---|---|
| card grid tracks | `246px 290px`, `align-items: baseline` | **`560px` (one column), `align-items: start`** |
| heading | y=1497, 246 px wide | **y=1315, 560 px wide** |
| photograph | y=1323, 290 × 194 (right column) | **y=1366, 560 × 194 (full width, below the heading)** |

**Fix.** The guide variant declares its own template — the approved design's one-column stack.

## D4 · `/products` — every coffin-tier row boxed, with its copy crushed into a 131 px ribbon

The five-coffin-tier band's supporting rows ("Bronze 2", "Silver 1", "Silver 2", "Gold") rendered
as bordered rounded boxes with the tier's description wrapped over 4–8 lines inside a **131 px**
column, and **three of five grid columns empty** on every row. The composition pass had just
removed exactly this look from this very page.

**Cause — the class collision AGENTS.md already warns about.** `.tier-row` is declared **twice at
top level**: once by the package page's tier × term segmented control (`repeat(5, minmax(0, 1fr))`
plus padding, border, radius and background — the older owner, 2026-09-16, and the one
`PlanTermSelector` renders) and once by this ledger row (2026-09-18). Same specificity, so **source
order decided**, and the later segmented-control block silently re-templated the ledger row: its
two children were auto-placed into the first two of five 131 px tracks.

| | before | after |
|---|---|---|
| row grid tracks | `repeat(5, …)` → 131 px each | **`88px 580px`** |
| body column | 131 px | **580 px** |
| row box | 680 × 180, bordered, rounded, filled | **680 × 141, hairline-separated** |
| `/products` document height | 7,100 px | **6,853 px** |

**Fix.** "One class, one declaration": the ledger row (the newcomer) takes its own names —
`.tier-ledger__row` / `__media` / `__body` — in the stylesheet and on `/products`, and the
segmented control keeps `.tier-row` alone. `tests/unit/broken-pages.test.ts` asserts there is
exactly one top-level `.tier-row` (the segmented control's) and that the ledger row never carries
its template or its box chrome.

---

## How this was searched (so the next pass can re-run it)

Every detector ran over the route list above at 1440×900 and 390×844, before and after:

- **document overflow** (`scrollWidth − innerWidth`) and the offending element when non-zero;
- **clipped content** — `overflow: hidden` with `scrollHeight > clientHeight`;
- **invisible text** — ink equal to its own background, or fully transparent;
- **empty / zero-height bands** in `main`;
- **aspect-ratio obedience** — each `<img>`'s rendered ratio against its resolved `aspect-ratio`;
- **empty grid cells** — a sampled occupancy grid over every `display: grid` with ≥2 tracks;
- **dead space** — a box whose children do not come close to filling it;
- **glyph coverage** — any codepoint outside the two faces' range, for every rendered text node;
- **duplicate top-level class rules** with contradictory structural declarations (this is what
  found D4's family: six classes are declared twice at top level; the other five
  — `.item-card__media`, `.legend`, `.ornament-rule`, `.paper-sheet`, `.portal-sidebar__foot` —
  are additive or benign today and are recorded, not changed).

Two things the eye found that the detectors could not, and that are **not** fixed here because they
are design questions rather than breakage: the public site carries three hero generations
(`.hero-premium` at 52 px on `/services`, `/plans`, `/lots`, `/map`, `/facilities`, `/gallery`,
`/builder`, `/faq`, `/memorials*`; the older centred `.page-hero` at 28 px on `/products`,
`/packages`, `/plans/compare`, `/plans/senior-benefits`, `/lots/price-list-2026`; and the plain
28 px opening on `/contact`, `/quote`, `/appointments`), and `.item-card__media` states a 3:2 crop
that an older `object-fit: contain` block overrides — harmless only because `/packages`' poster is
itself 3:2.

## What this pass deliberately did not do

No section was removed, no element hidden, no type shrunk below the 12 px floor, no palette or
token changed, and no working behaviour deleted. `styles/tokens.css` is untouched. The typography
ladder is untouched. No test was weakened: the four new gates were each proved to fail against the
pre-fix code and pass after it, and one recorded expectation of mine was corrected when the
function it tested was right (a flag pair is two regional indicators, not one).

## Checks

`npm run lint` · `npm run typecheck` · `npm test` (1,723 passing, 138 files) · `npm run build` —
all green on this branch.

## Shots

| file | what it shows |
|---|---|
| `d1-home-services-band.jpg` | D1 — the band at 1440 before/after, same scroll |
| `d2-home-caption-tofu.jpg` | D2 — the caption at 2×; the empty box, then no box |
| `d3-services-guides.jpg` | D3 — the two guide cards at 1440 before/after |
| `d4-products-tier-rows.jpg` | D4 — the tier band at 1440 before/after |
| `d5-home-full-page-1440.jpg` | `/` whole page, side by side |
| `d6-home-full-page-390.jpg` | `/` whole page at 390, side by side |
| `d7-services-full-page-1440.jpg` | `/services` whole page, side by side |
| `d8-products-full-page-1440.jpg` | `/products` whole page, side by side |
| `d9-services-artifact-ruined-by-the-shared-rule.jpg` | D3's corroboration: the design record's own review page, broken by the same shipped rule |

The before/after pairs were taken **in one browser session with the pre-fix declarations toggled in
place** (`styles/components.css`'s shipped pre-fix text re-injected as a `<style>` override), so
scroll position, fixture state, lazy-image state and font loading are identical on both sides of
every pair.
