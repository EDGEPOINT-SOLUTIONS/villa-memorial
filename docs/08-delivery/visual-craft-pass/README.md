# Visual craft pass — judging by the eye, page by page (2026-09-18)

Captain's brief: *“make it premium and the ‘not looking built like AI’ idea”*, with *“fix the
broken UI/UX”*, after the client's president read the site as **“so generic”** and **“so
noticeable that it's built by AI.”** Typography (PR #61) and the composition pass (PR #67) were
already in `main`; this pass is the finer craft on top of them.

## Method

Every route was driven with a real browser (Chrome DevTools Protocol) at **1440×900** and
**390×844** — 69 routes, both widths, 95 viewport captures per width plus full-page captures —
using the fixture personas (`admin@vm.demo`, which previews the staff, family and agent portals).

A defect only entered the list if the screenshot showed it. Measurements (`scrollWidth`,
element rects, contrast) confirm what the eye saw. Two “defects” were first suspected and then
**withdrawn as lazy-load artifacts** after the images were shown to load (`/facilities` garden
niches + mausoleum photos, the `/lots` band leads) — they are recorded here only so nobody
re-reports them.

## Defects found, fixed, and re-shot

| # | Surface | What was wrong (before) | Fix | Before → after |
|---|---|---|---|---|
| D1 | `/map`, `/staff/property`, `/agent/lots`, `/staff/landing` (every admin map/upload surface) | The product-wide form rule out-specified `.visually-hidden`, so a hidden file input stretched to the full row and pushed the page **57–380 px past the viewport** (`/staff/property` `scrollWidth` 1752 in a 1440 viewport) — the whole page could be panned sideways into blank space | `styles/components.css`: the three global `input:not(checkbox/radio)` rules now also `:not(.visually-hidden)`, so the 1×1px helper holds | `shots/d1-sideways-pan.jpg` |
| D2 | `/map` + the home “Browse the grounds, live” band | The masterplan rendered **300×300 px inside a 1062×540 frame** with the plot labels piled into an unreadable smear. Leaflet's default `zoomSnap: 1` makes `fitBounds` **floor** the fitted zoom (2.84 → 2) | `components/parks-canvas.tsx`: `zoomSnap: 0` (image maps are not tile maps) + refits on the ResizeObserver, two post-layout rAFs and a 320 ms timer. The home band drops the full-page 540 px canvas for the park frame's own **4:3** so the plan fills its box | `shots/d2-map-fit.jpg` |
| D3 | Every staff screen at 390 px | The static sidebar wrapped ~30 links into a **~900 px nav wall**; the page itself began below the fold (`mainTop` 900 on an 844 px screen) | `components/ui/sidebar-disclosure.tsx` + `AppShell`: a 44 px Menu/Close toggle collapses the nav below 48 rem (desktop unchanged); `aria-expanded` / `aria-controls` | `shots/d3-staff-mobile-nav.jpg` |
| D4 | `/plans/villa-memorial-plan` at 390 px | The hero grid's collapsed track was `1fr`, and a non-wrapping button row expanded it to **560 px inside a 342 px card** — the `h1`, the lead and the promo image were clipped mid-word by the hero's `overflow: hidden` | `styles/components.css`: `minmax(0, 1fr)` for the collapsed `.hero-premium__grid`; the page's button row becomes `row row--wrap` | `shots/d4-plan-hero.jpg` |
| D5 | `/lots/[id]` (all widths) | Two bugs in one: the image was the raw **1254 px marketing tile** with no sizing rule, so a 746 px / 342 px `.media-block` cropped it to its top-left corner (the group logo), and sections D lots fell back to a generic photo | `lib/media.ts`: `VILLA_SECTION_PHOTOS` now maps A–D to the photograph-only `PARK_PLACE_BY_TYPE` derivatives; the page uses `media-block--natural` (whole photo, height follows) | `shots/d5-lot-photo-mobile.jpg`, `shots/d5-lot-photo-desktop.jpg` |
| D6 | `/` right rail, the “LEAD” mausoleum card | The navy scrim was far too weak where the text sits: white `Mausoleum` on bright marble (~2:1) and the price in the **dark** accent gold (`gold-800`, ~1.6–2.6:1) — unreadable on the flagship page | `styles/components.css`: the scrim is opaque from the 56 % stop; the price takes `--gold-200`, the inverse gold `styles/tokens.css` reserves for text on navy. `tests/unit/typography-system.test.ts` pins the new dark-surface rule | `shots/d6-rail-lead-contrast.jpg` |
| D7 | `/lots/price-list-2026` | The four lot cards printed the **marketing tiles** — each with its baked-in logo lock-up and its own “MAUSOLEUM” / “PRIMARY LOT” title, right above a caption naming the same type | page + `styles/components.css`: the photograph derivatives, and a new `.media-block--photo` (4:3, `object-fit: cover`) so the slightly different derivative crops keep **one baseline** | `shots/d7-price-list-photos.jpg` |
| D8 | Staff top bar at 390 px | The topbar group is 388 px wide in a 326 px bar; `flex-end` pushed it off the **left** edge and half-clipped “Workspace” on every staff screen | `styles/components.css`: below 48 rem the topbar padding tightens and the “Workspace” label hides (the tenant select keeps the meaning) | `shots/d8-staff-topbar.jpg` |

## What was *not* changed

- No palette, typeface or type-ladder change; every value is an existing token
  (`--gold-200`, `--sky-*`, `--color-text-*`, the `--text-*` ladder).
- No fact, price, or honesty note was removed or reworded.
- The composition grammar (PR #67) stands: the ledger bands, the client imagery, the removed
  gradients/shadows are untouched.
- Tables that scroll horizontally inside `.table-wrapper` (e.g. `/plans/compare`) were left
  alone — that is a working pattern, not a clip.

## Verification

```bash
npx tsc --noEmit            # clean
npx eslint app components lib tests   # clean
npm test                    # 124 files / 1417 tests pass
npm run build               # production build passes
```

Measured after the fixes (same browser + persona):

| Check | Before | After |
|---|---|---|
| `/staff/property` `documentElement.scrollWidth` @1440 | 1752 | **1440** |
| `.visually-hidden` input width | 1440 px | **1 px** |
| `/map` plan size in the 1062×540 frame | 300×300 | **538×538** |
| home band plan box | 296×296 in a 540 px-tall canvas | **4:3 canvas, plan fills it** |
| `/staff/dashboard` sidebar height @390 | 900 px (page starts at y=900) | **281 px (content from y=281)** |
| `/plans/villa-memorial-plan` `scrollWidth` @390 | 1600 | **390** |
| `/lots/A-001` image in a 342 px block @390 | 1254 px (cropped to the logo) | **340 px, whole photograph** |
| the four price-list cards | tile titles + logos, uneven baselines | photographs, one baseline |

## What still looks weakest, honestly

- **The staff dashboard** is the thinnest real screen: four KPI tiles, two progress bars and a
  mostly empty “Business at a glance”. The figures are real, but the composition lives on
  whitespace rather than substance. It is demo data (6 cases, 8 lots), so the fix is content,
  not layout — recorded here rather than padded with invented widgets.
- **The home map band** is legible now, but the masterplan is a square drawing in a narrow
  column, so it still reads as a diagram, not as the park. A photograph-led band with the map
  as the second element would be stronger; that is a composition decision (and PR #67 owns that
  grammar), so it was left alone.
- **Portraits at small sizes**: several client photographs (garden niches, mausoleum) are
  marketing-render imagery rather than the park itself. They are the client's own material and
  are now labelled/handled honestly, but a real site photography set would do more for
  “premium” than any CSS in this pass.
- **The agent/family portals** are consistent but card-row heavy; the composition grammar was
  deliberately not pushed there (the captain made the agent portal the visual reference and
  this pass did not relitigate it).

## Evidence

`shots/` holds the before|after pairs for D1–D8 (left = before, right = after). Raw captures
and the per-defect measurements are in the PR body; the working set lives outside the repo.
