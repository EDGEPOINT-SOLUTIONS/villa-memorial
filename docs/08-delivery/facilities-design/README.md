# Facilities page — implementation record (F-02, 2026-09-18)

**Route:** `/facilities` (`app/(public)/facilities/page.tsx`).
**Brief:** checklist F-02 — "Build the park's Facilities page: the chapels, viewing rooms and
grounds as a page a family can actually look at." The requirement document names a *Facilities*
screen (`docs/04-modules/screen-inventory.md`: Public website); until now the chapels existed
only as rates and a booking path inside `/services`.

## What the page does

1. **Hero** — one line ("Where the wake is held — and the 2026 rates.") + the 24/7 call as the
   primary action, with the client's own photo of the park's front gate.
2. **The rooms** (`.fac-room` ×2) — the common chapel and the private chapel, each with the
   client's photograph, what the class suits (`Suited to` / `Shared with` / `Stay`), the
   published per-day rate, and **one next step**: ask the office for availability. The sheet's
   own conditions follow as facts (`.fac-facts`), then the honest state (below).
3. **The grounds** — the park pavilion photo, the areas the client's *own masterplan* labels
   (`lib/park-3d/masterplan.ts` → Main Entrance · Premium Lots · Mausoleum · Primary Lots ·
   Garden Lots · Garden Niches), the client's garden-niche and mausoleum imagery, and two
   actions: the park map & 3D view (`/map`) and lots & 2026 prices (`/lots`). The map and the
   3D walk-through are **not** duplicated here.
4. **Ask the office** (`.fac-help`) — the closing action band: the 24/7 call + chapel dates &
   booking on `/services#chapel`.

## Where every fact comes from (nothing is authored in the view)

| Fact | Source |
|---|---|
| Per-day chapel rates (₱1,500 common · ₱3,500 private) | `CHAPEL_RATES[0]` in `lib/villa-pricing.ts` — sheet III, "PRICE LIST FOR 2026 III"; the same constants `/services` renders |
| ₱1,000 miscellaneous fee · chapel-use scope · ₱700 groceries / 3-day minimum | `CHAPEL_NOTES` in `lib/villa-pricing.ts` (printed verbatim as `<li>` facts) |
| Grounds area names | `POINTS_OF_INTEREST` in `lib/park-3d/masterplan.ts` (the client masterplan's own labels; "Future Development" is land, not a family-facing area) |
| 24/7 number | the staff-editable landing content document (`listLandingContent()`, zone 01) — no number typed in the page |
| Photographs | `lib/media.ts` — the chapel sample set-ups (cropped from the client's TYPES OF COFFIN sheet), the client's park photo and lot-category imagery |

`tests/unit/facilities-page.test.tsx` renders **both** `/facilities` and `/services` and asserts
the two pages print the *same* per-day amounts — a rate typed into this page is the defect the
test exists to catch. It also pins the staff-edit propagation of the phone number.

## Honest states (compressed, one line each)

- **The room list is a client question.** `docs/07-client-villa/open-questions.md` — "Actual
  chapel names, capacities, rates" — is unanswered, so the page publishes what the sheets
  publish (the two classes and their per-day rates) and says so in one line
  (`.fac-placeholder`): *"Room names and capacity are still unconfirmed — the client has not sent
  the park's real chapel list. Rates and dates are real."* It invents **no room name, no capacity
  and no chapel count** (asserted: `Chapel A`/`Chapel B` and any "N people" figure must not
  appear). This deliberately differs from `/services`, whose chapel cards still carry the older
  app-authored placeholder resource names and capacities; that page was out of this brief's
  scope.
- **Illustrative photography is labelled.** Both chapel photos carry the sheet's own
  `CHAPEL_SAMPLE_NOTE` ("Illustration purposes only — sample set-up.") as a `<figcaption>`, and
  their alt text says "Illustrative sample…". The sheet prints "(Illustration purposes only)"
  under its sample set-ups, so no caption claims to photograph the room.
- **The senior-rate sheet conflict is not re-published here.** `/services` carries both the
  table column and the footnote (captain Q8); this page publishes the regular per-day rate and
  links to `/services#chapel` for booking and senior questions.

## Public navigation

- **The bar gains one chip**: `SITE_NAV_LINKS` = Home · Services · Plans · Lots · Park ·
  **Facilities** · Contact (`components/landing/site-header.tsx`). Measured: at 1200 px (the
  narrowest width where the chip row renders) the bar is one 68 px row and all seven chips sit on
  one line (nav right edge 859 px of 1200); at 1440 px the row is 68 px. No wrapping, and the
  phone chip + "Sign in" keep their room. This is the one deliberate addition to the approved
  2026-09-17 bar design (the F-01 PR shipped without touching the chip row) — flagged for the
  captain rather than hidden.
- Also linked from the phone quick menu's site list (`mobile-quick-menu.tsx`) and the footer's
  "Explore" column (`landing-view.tsx`), so the page is reachable on every chrome surface.
- `PUBLIC_PAGES` in `lib/seo.ts` publishes the route (sitemap + per-page metadata;
  `tests/unit/seo.test.ts` walks `app/(public)` and would fail without it).
- `/services` gained exactly one link to the new page: the chapel block's intro line, "See both
  rooms" → `/facilities#rooms` (`components/villa/service-rates-2026.tsx`).

## Render check (production build, `next start`)

Measured in Chrome against the built app (`chrome-devtools-axi`): bounding rects of the rendered
elements, horizontal overflow, tap-target heights, `h1` count.

| Viewport | `h1` | First room card | Room call button | Overflow | Phone bar |
|---|---|---|---|---|---|
| 1440 × 900 | left 137 · top 325 (643 × 52) | rate at y 1299 | 578 × 48 | none (`scrollWidth` = `clientWidth` = 1440) | hidden |
| 390 × 844 | left 53 · top 221 (284 × 68) | photo 340 × 213 at y 976 | 292 × 56 | none (`scrollWidth` = `clientWidth` = 390) | 0–390 × 779–844, 3 targets |

- One `h1`, five `h2`s; every content image has alt text (the only alt-less images on the page
  are the header/footer brand marks, `alt=""`, decorative).
- Every `.fac-page .btn` target is 48 px or 56 px tall (≥ 44 px floor).
- No inline styles on the page; every colour/size/space resolves to `styles/tokens.css`
  (`.fac-*` block in `styles/components.css`).
- Lighthouse, production build:
  - desktop — **Accessibility 100 · Best Practices 100** · Agentic Browsing 100 · SEO 92;
  - mobile — **Accessibility 100 · Best Practices 100** · SEO 92.
  - The SEO 92 is the *pre-existing* site-wide "no meta description" audit artifact of Next's
    streamed metadata: the description **is** served (`<meta name="description">`, 150 chars, in
    the response and in the hydrated DOM) but arrives after the initial head flush on the
    dynamic public pages. `/transport` and `/faq` — both shipped earlier — score the same 92 on
    this build, and `/transport`'s page is structured the same way. Not introduced here.
- Reading budget (`tests/unit/reading-budget.test.tsx`, page added to `PAGES`): paragraph prose
  **69 words** (budget 300) · longest paragraph **22 words** (limit 30) · longest list item
  **10 words** (limit 30) · opening sentence **9 words** (limit 12).
- Known cost, stated plainly: the two lot-category PNGs are the client's own 2.5 MB files
  (shipped exactly as they are — the same files `/lots` and `/lots/price-list-2026` already
  publish; Next's image optimiser is not used anywhere in this repo). They sit below the fold
  and load with `loading="lazy"`, so the first screen costs the hero photo (~150 KB) plus the two
  chapel samples (~50 KB).

## Verification

- `npm run lint` ✓ · `npm run typecheck` ✓ · `npm test` → **92 files / 997 tests passed** ✓ ·
  `npm run build` ✓ (`/facilities` builds as a dynamic route, 240 B / 107 kB first load).
- New tests: `tests/unit/facilities-page.test.tsx` (rooms + rates, the /services drift guard,
  one next step per room, sheet conditions as facts, honest states, masterplan area names, imagery
  and map links, doc-driven phone number + staff-edit propagation, chrome reachability, one `h1`,
  no inline styles). `tests/unit/reading-budget.test.tsx` and `tests/unit/public-nav.test.tsx`
  extended; `lib/seo.ts` `PUBLIC_PAGES` publishes the route.

## Shots

- `shots/facilities-1440.png`, `shots/facilities-390.png` — above-the-fold at both viewports.
- `shots/facilities-full-1440.jpeg`, `shots/facilities-full-390.jpeg` — the whole page.
