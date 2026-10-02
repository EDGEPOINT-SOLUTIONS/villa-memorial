# The home/blog swap, titleless pages, larger images — 2026-10-02

**Captain's brief:** *"Remove our current Homepage, our blog page will become our homepage and
create another blog page that's dedicated for a real blog page, and in the new homepage make a
banner in the middle section and remove the blogs inside that middle sections, also remove the
titles of each pages and make images 1.5x larger for services and plan pages."*

## What changed

### 1 · `/` is the blog page's storefront composition, with a banner and no posts

`app/(public)/page.tsx` now renders `components/landing/home-storefront.tsx`:
`LandingBands` (both rails + the middle sheet — the anchored storefront that `/blog` used to
carry beneath its post list), whose middle column opens on the captain's banner
(`components/landing/home-banner.tsx`).

- The banner carries the office's own opening: the place line, the rotating gateway title
  (`HomeTitleRotator`, still the page's ONE `h1`), the 24/7 call, the supporting action and
  the three trust facts — beside the client's park photograph. Every word, link and control
  the retired gateway carried survives.
- The storefront's newsfeed band is OFF (`newsfeed={false}`): the posts are not on the home.
- The retired seven-section `components/public/home-page.tsx` is no longer routed (the file
  is left in the tree; deleting it and its two band components is a follow-up, not part of
  this brief).
- The entrance overlay (`HomeSignOverlay`) is unchanged and still the page's first paint.

### 2 · `/blog` is a dedicated blog page

`app/(public)/blog/page.tsx` renders `components/blog/blog-view.tsx` — the blog page
document's heading, intro, the `Products` action and ONE HORIZONTAL ROW PER POST (photograph
beside text, alternating sides). Nothing else: the bands are the home now. It renders inside
`PublicShell`, so it keeps exactly one header, footer, phone bar and closing action band.

### 3 · The visible page-title band is off every public page

The shared interior hero (`components/public/public-hero.tsx`, variant `interior`) is
**titleless**. The eyebrow, `h1` and lead stay in the document — the lead's facts and the
heading are still there for assistive tech and search — but
`styles/components.css`'s new `/* public: titleless openings */` block hides them with the
sr-only pattern, so the band paints only the page's own actions, any facts a page passed it
as children, and its banner photograph. A page that had none of those renders no band at all.

- Exactly one `h1` per page is preserved (the heading is visually hidden, not removed).
- The page's first real section leads (`.sv-orient`, `.plan-orient`, `.gal-wall`, … —
  unchanged), so no page is left bare.
- `call-first` (unused) and `home` retain their visible title; only `interior` is titleless.

### 4 · Services and Plans images render larger

Measured on the production build (`next start`), 1440 × 900, image `getBoundingClientRect`
width → height:

| surface · picture | before | after | factor |
|---|---|---|---|
| `/services` · the five a-la-carte tile plates (`3:2`) | 190 × 126 | **286 × 190** | **1.5×** |
| `/services` · the two chapel room plates (`3:2`) | 356 × 238 | **536 × 357** | **1.5×** |
| `/plans` · the five tier-card photographs (`3:2`) | 180 × 119 | **232 × 154** | **1.29×** |
| `/plans` · the comparison-matrix photographs (`3:2`) | 92 × 61 | **138 × 92** | **1.5×** |
| horizontal overflow @ 1440 / 390 | 0 / 0 | **0 / 0** | — |

- Services: the tile basis and plate cap go `15rem → 22.5rem` (row cap with them); the chapel
  envelope goes `--layout-reading-w` → `88rem`. The `sizes` hints move with the boxes.
- Plans: `/plans` widens from the catalogue envelope to the folio
  (`--layout-catalogue-w` → `--layout-folio-w`), which grows every card with its grid; the
  matrix photograph's cap goes `92px → 138px` and the tier `sizes` hint `16rem → 20rem`.
- **The tier photograph lands at 1.29×, not 1.5×, on purpose.** The five-across comparison
  row is pinned (`tests/unit/plans-tiers-layout.test.ts` — the approved 2026-09-30 board,
  captain: *"Im good with the plans page"*). Five cards at 1.5× would need ≈1401 px of
  content; the folio content box is ≈1229 px at 1440. Forcing 1.5× would mean dropping to
  four columns and orphaning the fifth tier, breaking the comparison the page exists for.
  The matrix photographs, the services plates and the chapel plates all reach 1.5×; the tier
  card takes the largest growth the five-across row allows. If the captain prefers an exact
  1.5× there, the change is the wrap ladder (5 → 4 across), which is a plan-page redesign.

## Evidence

Full-page captures of the running production build, 1440 × 900 and 390 × 844, with the home
entrance cookie set:

| capture | before (`main` @ `09c9d3a`) | after (this branch) |
|---|---|---|
| home | [`shots-before/home-1440.png`](shots-before/home-1440.png) · [`home-390.png`](shots-before/home-390.png) | [`shots-after/home-1440.png`](shots-after/home-1440.png) · [`home-390.png`](shots-after/home-390.png) |
| blog | [`shots-before/blog-1440.png`](shots-before/blog-1440.png) · [`blog-390.png`](shots-before/blog-390.png) | [`shots-after/blog-1440.png`](shots-after/blog-1440.png) · [`blog-390.png`](shots-after/blog-390.png) |
| services | [`shots-before/services-1440.png`](shots-before/services-1440.png) · [`services-390.png`](shots-before/services-390.png) | [`shots-after/services-1440.png`](shots-after/services-1440.png) · [`services-390.png`](shots-after/services-390.png) |
| plans | [`shots-before/plans-1440.png`](shots-before/plans-1440.png) · [`plans-390.png`](shots-before/plans-390.png) | [`shots-after/plans-1440.png`](shots-after/plans-1440.png) · [`plans-390.png`](shots-after/plans-390.png) |

Page heights (full-page capture, px): home 4953 → 4174 @ 1440 and 7877 → 7016 @ 390; blog
4843 → 1974 @ 1440 and 8773 → 3564 @ 390 (the storefront left the blog); services 3485 →
3531 / 5852 → 5697; plans 4254 → 4141 / 5770 → 5665. The image-measurement run reported
`overflow: 0` for every route at both viewports.

## Gates

- `npm run lint` — 0 errors (4 pre-existing warnings in `lib/agent/acquisition.ts` and
  `tests/unit/gallery-page.test.tsx`).
- `npx tsc --noEmit` — clean.
- `npx vitest run` — **295 files / 3242 tests passed**.
- `npm run build` — exit 0.
- `node scripts/smoke-public-routes.mjs --base http://localhost:4200` — **all 54 advertised
  routes render** (a production build on :4200; :4000 is another lane's dev server).

### Tests updated / added

- `tests/unit/home-blog-swap.test.tsx` — new: the home opens on the banner (office words,
  call, supporting action, facts, one `h1`), renders the storefront bands, lists no posts,
  and degrades without a photograph.
- `tests/unit/blog-document.test.ts` — `/blog` is the dedicated page (heading, intro, four
  alternating rows, no storefront bands).
- `tests/unit/public-page-budget.test.tsx` — the home blueprint renders `HomeStorefront` and
  pins the new band order; the blog blueprint pins the dedicated page.
- `tests/unit/home-intro.test.tsx` — the entrance sign is asserted before `HomeStorefront`.
- `tests/unit/page-opening.test.ts` — pins the titleless interior band.
- `tests/unit/park-page-content.test.tsx` — the page keeps one titleless, sr-only `h1` and
  the Map / Lots actions.
