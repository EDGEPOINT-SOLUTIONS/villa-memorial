# One park — Villa Memorial Park only (2026-09-21)

**Routes/surfaces:** the public park page `/map` (+ its Lots tab), `/lots`,
`/staff/property` and `/agent/lots` (all ride the shared park map), the staff
tenant switcher, and the park seed `lib/fixtures/property/parks.json`.

**Brief (captain, 2026-09-21):** *"remove this Loyola Gardens / Golden Haven in
our parkmap it should only be Villa Memorial Park"*. The store seeded three demo
parks (`villa` 16 plots, `loyola` 20, `golden` 20); the map carried a park
switcher in both the page hero and the map component, and `/lots` listed three
bands with a three-option Park filter.

## What changed

- **`lib/fixtures/property/parks.json`** keeps the `villa` record and all its
  plot data unchanged; the `loyola` / `golden` records are removed and the
  provenance note now states the single park. The file is the store's only
  source, so every surface follows.
- **`/map`** (`app/(public)/map/page.tsx`): the hero's three park chips are gone
  (only "Browse all plots" and "Photos of the park" remain), the fact line reads
  `N lots` (no "3 parks"), and the `?park=` validator accepts only `villa`, so an
  old `?park=loyola` deep link degrades to the Villa map rather than 404ing.
- **Park map component** (`components/park-maps-view.tsx`): the "Choose park
  map" switcher now renders only when the store carries more than one park — so
  there is no one-button switcher. `components/public-park-map.tsx`'s header and
  `lib/park-maps.ts`'s store docs describe the single park.
- **`/lots`** (`app/(public)/lots/page.tsx`, `lot-filters.tsx`): one band
  (Villa Memorial) from the same `buildLotListing` shaping; the one-option
  **Park** refine group is hidden with the other parks (the band header names the
  park), and the hero facts drop the park count.
- **Demo tenant switcher** (`lib/demo-tenants.ts`, `components/tenant-switcher.tsx`):
  only `villa` remains; the switcher renders nothing for a one-tenant list.
- **Park page copy** (`lib/fixtures/content/pages.json` + the page's read-failure
  fallback) says "the grounds of Villa Memorial Park", not "every
  Villa-affiliated park".

## References that intentionally stay

- **`lib/fixtures/property/lot-lifecycle.json`'s exhumation `destination`
  ("Loyola Gardens")** and its step note. This is where a *family asks the
  remains to go* — an external receiving cemetery — not one of this product's
  parks. The record does not depend on the removed park rows; the fixture
  provenance now says the destination is a written receiving place rather than a
  `parks.json` name, and
  `tests/fixture-contract/lot-lifecycle.test.ts` checks its presence rather than
  a park cross-reference. `tests/unit/lot-lifecycle-pages.test.tsx` still pins
  that the office's Exhumations screen prints it.
- **The store/validator seam is data-driven, not hard-coded.** `parksList()`,
  `buildLotListing()` and the map's switcher all read the fixture, so the
  single-park state is a data outcome (add a row and a second park re-appears
  without touching a view). `tests/unit/lot-listing.test.ts` keeps proving the
  filter model still ORs across two park ids, now with a synthetic
  `second-park` id rather than a removed demo park.

## Evidence

- New: `tests/unit/single-park.test.tsx` — the store seeds one park, the tenant
  list holds one, `/map` renders no other-park chip/switcher and degrades
  `?park=loyola`, and `/lots` renders one `Villa Memorial` band with no Park
  group.
- Updated: `tests/unit/lots-listing.test.tsx` (16 plots, one band, no Park group,
  Villa map-only deep links), `tests/unit/lot-listing.test.ts` (synthetic second
  park id), `tests/fixture-contract/lot-lifecycle.test.ts` (destination is a
  written receiving place).
- Full gate on the branch: `npm run lint` · `npm run typecheck` · `npm test`
  (2 211 tests) · `npm run build` — green.
- Shots (`./shots`, `.jpg`): `/map` and `/lots` before/after at 1440×900 and
  390×844 — before shows the three park chips, the `Choose park map` switcher,
  `3 parks` and the three `/lots` bands; after shows Villa Memorial alone.
