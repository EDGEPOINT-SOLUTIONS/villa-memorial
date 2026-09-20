# `/lots` product listing — implementation record (2026-09-20)

**Route:** `/lots` (`app/(public)/lots/page.tsx` + `lot-listing.tsx` + `lot-filters.tsx`; the
detail page `/lots/[id]` shares the imagery rule).
**Brief:** the captain's review — *"still /lots have lots that doesn't have any images, improve
the UI/UX of this page… the filter is in the left side it should be sticky so that when customer
scroll it is there, the looks should be inspired by amazon product pages, but the theme color is
our theme"* — plus two binding additions: **filtering must not reload the page**, and the panel
must follow Amazon's *Refine by* structure (checkbox groups with live result counts, a min/max
price range, a Clear action).

## What shipped

1. **Every plot is pictured.** All 56 seeded plots render as cards with a photograph from the
   client's own park imagery (4 composition derivatives, 57–107 KB each — never the 2.2–2.6 MB
   marketing tiles). The mapping is ONE rule home, `lib/lot-imagery.ts`: a linked lot's **section**
   (A–D) → the client's photograph of that ground, else the plot's **legend type** → that type's
   photograph, else the park's own **plan image**. Every card's caption says what the picture is
   *not*: *"A photograph of this kind of place — plot A-001 is marked on the park map."*
2. **The filter rail is a client-side "Refine lots by" panel.** Six collapsible groups (Park ·
   Section · Availability · Lot type · Area · Price), each option a checkbox row with its live
   result count at the right edge; a zero-count option stays visible but dimmed. Price is two
   labelled peso inputs with a Go button plus quick ranges whose boundaries are read from the
   published figures. Groups are separated by hairlines; a vertical rule separates the rail from
   the results. **Filtering updates the results and counts in place** — no navigation, no server
   round trip, scroll preserved — and mirrors the view state into the URL with
   `history.replaceState` (shareable, reload-safe; the server parses the query so a hard reload
   paints the view the URL describes).
3. **The listing is the shop grammar.** `.shop-grid`/`.shop-card` cards (the same kit `/plans`,
   `/products`, `/packages` use) in `.lot-grid` columns: 3 across at 1440, 4 at the widest folio,
   2 under the rail breakpoint, 1 on a phone. Card order is the captain's: photograph → lot number
   → section/block/area → **price** → status chip → one action (View this lot / View on the park
   map). A results bar carries how many plots match and the sort control (Featured · price ↑ ·
   price ↓; unpriced map plots always sort last).
4. **Phone/tablet**: the rail becomes one **Filters** control that opens the same panel in place
   (with a *Show N lots* action that closes it and returns focus to the control) — it never
   overlays a card and traps no focus. The desktop rail is `position: sticky` under the public
   header with its own bounded scroll.

## One rules home per thing

| Thing | Home |
|---|---|
| Filter + sort model (parsing, matching, facet counts, sorting, quick ranges) | `lib/lot-listing.ts` (pure; `tests/unit/lot-listing.test.ts`) |
| A plot's photograph + its honesty caption | `lib/lot-imagery.ts` (`tests/unit/lots-listing.test.tsx`) |
| Panel presentation | `app/(public)/lots/lot-filters.tsx` |
| Listing state + cards | `app/(public)/lots/lot-listing.tsx` |
| Sticky rail / sheet / grid declarations | the "lot listing" block of `styles/components.css` (`tests/unit/phone-layout.test.tsx` pins the sticky + hide rules and the 44 px row) |

`lib/lots-legend.ts` (the single-select link model) was retired with its test; its cases are
folded into `tests/unit/lot-listing.test.ts`.

## Not invented, not removed

- No lot fact, price, area, owner or status was changed, and no image field was added to the
  frozen `Lot` fixture. **The imagery is derived, and that is an open contract ask**: the frozen
  `Lot` contract ships no media field, so when property-gis freezes lot media the lot record
  should carry its own photograph (the section mapping then becomes its fallback).
- Every existing link still works: linked lots open `/lots/[id]`; map plots keep
  `/map?park=…&plot=…`; the area/section filters exclude records that have no published area
  (map plots) or section (Loyola/Golden plots) rather than inventing one.
- Nothing was dropped for the layout: park, status and type filters all survive with their
  behaviour and labels, plus the new Section/Area/Price groups.

## Evidence

- `npm run lint` · `npm run typecheck` · `npm test` (2 019 tests) · `npm run build` — green.
- Targeted tests: `tests/unit/lot-listing.test.ts`, `tests/unit/lots-listing.test.tsx`,
  `tests/unit/phone-layout.test.tsx`.
- Lighthouse (production standalone, desktop): **Accessibility 100 · Best Practices 100**. The
  one remaining SEO audit (`meta-description`) is a pre-existing production streaming issue
  shared by `/contact` and `/faq` (the description streams after the head on those routes; it is
  present in the HTML and unchanged from before this PR — verified against the primary checkout's
  dev server).
- Browser checks: a checkbox click updated 56 → 16 cards with the URL moving to `?park=villa`
  and no navigation; scroll position was preserved; the sort select re-ordered in place; the
  phone sheet's *Show 56 lots* closed the panel and returned focus; Clear restored 56 cards.
- Shots (`./shots`, `.jpeg`): before/after 1440×900 and 390×844 — the grid, the sticky rail
  mid-scroll, the phone filter control + open panel (price group and Apply action), and the
  no-results state at both widths.
