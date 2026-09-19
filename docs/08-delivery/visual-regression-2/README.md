# Visual regression pass 2 — the pages the captain named, and the class behind them (2026-09-19)

**Captain's second report:** *"The pages render broken"* — and this time he named them:
**`/plans` and `/lots`.** An earlier pass had fixed four surfaces (landing, `/services`,
`/products`) and reported those two clean. They were not; the earlier detectors measured the
wrong things, so this pass paired **eyes** (screenshots at 1440×900 and 390×844, before and
after) with a detector that knows this class:

- **document overflow** (`scrollWidth − innerWidth`) and every element rendering past the viewport;
- **clipped content** (`overflow: hidden` with `scrollWidth > clientWidth`);
- **sliced text** — a text line crossing the edge of a pan/clip container (this is what a "broken"
  table looks like: headers cut mid-word with no ellipsis);
- **degenerate capsules** — a `border-radius` ≥ 40px that resolves to ≥ half the box's height
  (a 999px radius on a wrapped multi-row group draws an ellipse through its own content);
- sub-12px text, image aspect-ratio obedience, and empty bands.

Every route was walked at both widths: `/` · `/services` · `/products` (`/products/[sku]`) ·
`/packages` · `/plans` · `/plans/[sku]` · `/plans/compare` · `/plans/villa-memorial-plan` ·
`/plans/senior-benefits` · `/lots` · `/lots/price-list-2026` · `/lots/[id]` · `/map` ·
`/facilities` · `/gallery` · `/builder` · `/contact` · `/faq` · `/immediate-assistance` ·
`/memorials` · `/memorials/find` · `/cart` · `/checkout` · `/client/dashboard` ·
`/agent/dashboard` · `/staff/dashboard` · `/staff/ops` · `/staff/copilot` · `/platform/tenants`
(the portal/staff screens with a signed-in admin session).

**Seven defects were fixed.** Two were on the named pages; five more were the same class
elsewhere, including one that had been printing two 560px logos in a hero since a stylesheet rule
was dropped.

---

## D1 · `/plans` — the rate card ran 175px past the phone viewport, sliced mid-word {#d1}

The Villa Memorial Plan's two schedules are five tiers × four terms. On a 390 phone the client's
table is **515px** wide; it sat inside a 292px `.table-wrapper` pan frame, so the caption read
*"Villa Memorial Plan — regular payment schedul"* (cut with no ellipsis) and the header row ended
at **"SI"** — two and a half of five tiers visible, and nothing on screen said the rest existed.

| at 390 | before | after |
|---|---|---|
| table width | 515px | **290px** |
| pan overflow | 225px | **0** |
| caption | clipped mid-word | **full line** |
| tiers visible | 2.5 of 5 | **5 of 5** |
| column headers | sliced ("SI") | **hidden; each amount carries its tier** |

**Cause.** `PlanPaymentTable` renders the client's sheet as a table (`components/villa/plan-payment-table.tsx`),
and the pan frame (`.table-wrapper { overflow-x: auto }`) kept the *page* from scrolling
sideways — but at 342px of card the table cannot fit, so a family comparing what they pay saw a
table cut at the viewport with no visible affordance. `overflow-x: visible` on the `<table>` itself
is what made the firstmate measurement read "no scroll container".

**Fix.** Below 40rem the table **stacks**: each payment mode becomes a block, and every amount
carries the tier name the hidden column header used to hold (`data-tier`, rendered by
`td::before`). Above 40rem the client's five-column table and its pan frame are byte-for-byte
unchanged. The phone layout repeats **no** controls: still exactly one request link per tier ×
term cell (`tests/unit/phone-layout.test.tsx`).

## D2 · `/lots` — the type filter drew an ellipse through its own chips {#d2}

At 390 the "Filter by legend type" group wraps to five rows. Its capsule
(`.seg-filter { border-radius: 999px }`) resolved to half the group's **height** — 123px on a
246px-tall box — so the border became a large oval: the first chip (PREMIUM LOTS) and the last
(MAUSOLEUM) sat **on the curve**, and the whole control read as a rendering accident.

**Cause.** `border-radius: 999px` is a capsule only while the element is one row. Any wrapping
flex capsule degenerates the moment it wraps past ~two rows.

**Fix.** Below 40rem every wrapping capsule (`.seg-filter`, and `.term-switch` which wraps at 390
on the home board) keeps a normal corner (`var(--radius-lg)`); the active chip is still a filled
pill, and above 40rem the capsule is unchanged. `tests/unit/phone-layout.test.tsx` finds every
top-level rule pairing `border-radius: 999px` with `flex-wrap: wrap` and **fails one without a
phone cap** — so the next capsule cannot ship this bug.

## D3 · `/plans/villa-memorial-plan` — two logos printed at 560px/460px and were sliced {#d3}

The hero's logo row used `className="plan-logo-row"` — a name whose stylesheet rule had been
deleted while the page kept it (the package-page pass replaced it with `.logo-row`). With no rule
the logos rendered at their **natural 560×563 and 460×460**, and the hero's `overflow: hidden`
cut them off at the card edge. At 390 the hero ended in a giant cropped logo mark; at 1440 the
same giant logo dominated the fold.

**Fix.** The page uses the live shared `.logo-row` (2.6rem, the home board's and package page's
logo row). The test also scans `app/`+`components/` for `className="…plan-logo-row…"` so a
deleted rule cannot be reintroduced silently — the class this pass is named after.

## D4 · `/plans/[sku]` — the term control ellipsised its own terms {#d4}

The buy card's plan-term control is four columns. At 390 the rail leaves each button ~50–57px;
`.term-btn__name` is `nowrap + overflow: hidden + text-overflow: ellipsis`, so the control
printed **"MONT…", "QUART…", "SEMI-A…", "ANNUAL"** — the words a family chooses their payment
plan with, truncated to fragments.

**Fix.** `.term-grid` reflows to two columns below 40rem; each label now has 125–127px and no
button clips (`scrollWidth === clientWidth`). Desktop is unchanged.

## D5 · `/` — the home plan board clipped its last column by 34px {#d5}

The approved prototype's board (`.plan-scroll`, `role="region"`, labelled, focusable) was panning
40px at 390, which sliced the "ANNUAL" header to "AN" and the values under it. The table needed
40px less than it had.

**Fix.** Below 40rem the table's cell padding tightens and the header's letter-spacing drops —
the same four columns now fit the frame exactly (**308 = 308**), so the pan frame is a no-op on a
phone while the prototype's table shape is kept.

## D6 · `/plans/compare` — the Premium column sliced 71px {#d6}

Three package columns plus a label column need 413px; the card gives 342px. The third package
was cut mid-word and its description fragmented.

**Fix.** Below 40rem, tighter cell padding plus breaking the long description cells fits all four
columns (340 ≤ 342). The descriptions hyphenate where the dictionary allows; this table is a
deliberate trade — see "still weakest" below.

## D7 · the class — classes referenced with no rule {#d7}

The D3 bug is one instance of a class the codebase already records once (`.stack` was "referenced
but never defined"). A scan of static `className` literals found four more shipped references
with no rule:

| class | used by | effect | fix |
|---|---|---|---|
| `text-xs` | membership folio, purchase-application form | notes printed at body size | defined in `styles/utilities.css` |
| `stack-2` | membership application page | children had no spacing | defined beside `.stack-3`/`.stack-4` |
| `sr-only` | three `<caption>`s (membership register, two price editors) | captions were **visible**, not screen-reader-only | use the house `.visually-hidden` |
| `nowrap`, `table__name`, `table__sub` | staff dashboard bookings | date wrapped; name/sub rendered plain | defined with the table styles |

`tests/unit/phone-layout.test.tsx` closes the utility vocabulary: any future `text-*`, `stack-*`,
`nowrap`, `sr-only` reference without a definition fails the suite. The remaining class names in
`className` literals are semantic hooks (BEM modifiers, JS selectors) and are not gated.

---

## Shots (before | after)

| file | what it shows |
|---|---|
| `d1-plans-390-table-before.jpg` / `-after.jpg` | D1 — the rate card at 390: sliced caption/headers vs five readable payment-mode blocks |
| `d1-plans-1440-table-before.jpg` / `-after.jpg` | D1 — the same table at 1440, unchanged (client's five-column sheet) |
| `d2-lots-390-filter-before.jpg` / `-after.jpg` | D2 — the legend filter: the ellipse through the chips vs a rounded group |
| `d3-vmp-390-hero-before.jpg` / `-after.jpg` | D3 — the hero at 390: the giant sliced logo vs the 2.6rem logo row |
| `d3-vmp-1440-hero-before.jpg` / `-after.jpg` | D3 — the same at 1440 (the giant mark dominated the fold) |
| `d4-pkg-390-term-before.jpg` / `-after.jpg` | D4 — "MONT… / QUART… / SEMI-A…" vs four full labels in 2×2 |
| `d5-home-390-planboard-before.jpg` / `-after.jpg` | D5 — the home board's clipped ANNUAL column vs the same four columns fitting |
| `d6-compare-390-before.jpg` / `-after.jpg` | D6 — the sliced Premium column vs all three packages inside the card |
| `walk-plans-390-before.jpg`, `walk-lots-390-before.jpg` | the two named pages whole, at the phone width, before |
| `plans-1440-full-before-small.jpeg`, `lots-1440-full-before-small.jpeg` | the two named pages whole, at 1440, before |
| `weak-services-390-subnav.jpg`, `weak-products-390-inclusions.jpg` | the two deliberate pan surfaces listed as still weakest |

The before/after pairs are separate captures of the same page at the same scroll and width (dev
server, fixture mode), not toggled stylesheets.

## How the causes were named

Every defect above was measured in the browser before it was touched: element widths and
`scrollWidth`/`clientWidth` for the pan frames, `getComputedStyle().borderRadius` against the
box height for the capsule, `naturalWidth` for the logos, and `Range.getClientRects()` against
the clipping ancestor's edge for sliced text. The failing test gates were each **proved to fail
against the pre-fix code** (mutating each fix back produces 1–3 failures) before being committed.

## Still weakest (honest list)

1. **The 2026 family price tables still pan on phones.** `/plans/villa-memorial-plan`,
   `/lots/price-list-2026` and `/plans/PKG-BASIC` render the client's matrices (923–1180px wide,
   10–13 columns) inside `.table-wrapper`, so a phone shows ~3.5 columns and must pan 850–890px.
   They are reachable and their captions name them, but a per-product stacked layout would read
   better — that is a design decision for the captain, not a silent re-layout. `/products`'
   inclusions matrix (715px) is the same shape.
2. **`/services`' sticky "On this page" chip strip** pans with `scrollbar-width: none` and a chip
   sliced at the phone edge; making it wrap would make the sticky bar ~150px tall. It needs a
   designed affordance (edge fade or a scroll hint) — proposed, not changed here.
3. **Pan-frame captions scroll with their table**, so a caption can be partly off-screen until
   the user pans. (The tables' cells stay reachable.) A sticky caption inside a scroll container
   needs a component change, not a CSS trick.
4. **Overlay scrollbars** mean the pan frames show no visible scrollbar until touched; the
   "reachable" guarantee rests on touch panning plus `tabIndex` keyboard scrolling.
5. **`/plans/compare`'s descriptions hyphenate/mid-word break at 390.** It is the price of fitting
   four columns; a stacked-per-package layout is the better next step (same family as item 1).

Two things looked like defects in the sweep and were not: `/gallery`'s masterplan box was
`loading="lazy"` (it fills once scrolled to), and a transient `document.width 468` on `/map` was
a partially hydrated page state that does not reproduce.

## Checks

`npm run lint` · `npm run typecheck` · `npm test` (1,737 passing, 139 files) · `npm run build` —
all green on this branch, with the dev server stopped (the durable-store suites time out under
dev-server + Chrome contention, which is a load artefact, not a failure — each passes in
isolation).
