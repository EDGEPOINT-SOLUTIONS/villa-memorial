# Composition pass — implementation record (2026-09-18)

**Brief:** the captain's — *"Break the sameness — the half of the president's complaint that
typography cannot fix."* The client's president read the product as *"so generic"* and *"so
noticeable that it's built by AI."* Firstmate measured the running pages and found the same four
causes every time:

1. **the same box, repeated** — four identical service cards, four identical news cards, the same
   equal-weight grid wherever you look;
2. **stock iconography where real imagery existed** — 30 files importing one icon library while
   the client's own photographs of the chapel, the grounds and the coffins sat unused on those
   very pages;
3. **decorative sheen standing in for hierarchy** — 30–42 gradient elements and 28–33 shadowed
   elements on a single public page;
4. **spacious but thin** — calm, but not rich.

The typography half (PR #61 — Alegreya + Source Sans 3, the seven-step ladder, four ink roles) was
already merged. This is the composition half.

**Scope:** the public site. The family, agent and staff portals are untouched, and so is the
digital-memorial work landing in parallel.

## The one grammar this pass added

Everything below is *one* pattern, declared once in `styles/components.css`:

| class | meaning |
|---|---|
| `.ledger` | the band |
| `.ledger__lead` | **one** dominant element — the client's own photograph and the band's loudest figure |
| `.ledger__list` / `.ledger__entry` | supporting entries, separated by **hairlines**, not boxes; two columns on desktop |
| `.ledger__row` | one entry: what it is · its figure · what you can do |
| `.band-head` | a group's own name, its real count, its one action — replacing the prose intro |

Hierarchy comes from **scale, position and a rule** — the three things that read as designed —
instead of from decoration applied uniformly. A band built with it cannot be counted as boxes,
because there are no boxes.

`.svc-band__lead` / `.svc-band__list` are the same grammar for the home's service cards, kept as
separate class names because `tests/unit/landing-view.test.tsx` pins the exact `a.svc-card` door.

## What each page became

| page | before | after |
|---|---|---|
| `/` services band | 4 equal icon cards | the client's photo of the place it sells leads; 3 hairline entries with their derived 2026 figures |
| `/` newsfeed | 4 identical full-width cards | the newest story leads; the rest two-up and capped |
| `/services` a-la-carte | 5 equal shadowed boxes, the fifth orphaned | one hairline price ledger, the amount set against each line |
| `/products` | 5 equal tier cards + 24 equal model cards showing **4 distinct pictures between them** | the entry tier leads its band; 4 hairline tier rows; per collection **one** chipped sample photograph + dense priced model rows |
| `/plans` | **42** equal cards, **every one** showing the same `plan-packages.png` poster (none of the 42 fixtures carries an image) | 3 groups (Packages · Services · Add-ons) with real counts, a dominant first entry, hairline priced rows, **one** image on the page |
| `/lots` | 56 equal cards reprinting 4 marketing tiles | one band per park with its real plot count and available count, the first plot led by the photograph of its actual legend type, then a lot register |
| `/facilities` | the two lot tiles as `figure.card` | the tiles' photographs, side by side, no per-card shadow |

## Decoration removed (measured at 1440 px, `getComputedStyle`)

| page | gradient elements | shadowed elements | page height |
|---|---|---|---|
| `/` | 30 → **7** | 30 → **11** | 6672 → 5775 |
| `/services` | 40 → **6** | 26 → **5** | 6452 → 6108 |
| `/products` | 29 → **3** | 39 → **4** | 8493 → 6814 |
| `/plans` | 49 → **4** | 52 → **8** | 9713 → **5099** |
| `/lots` | 18 → **4** | 78 → **9** | 16188 → **7013** |
| `/facilities` | 12 → **5** | 19 → **4** | 3798 → 3593 |
| `/gallery` | 11 → **6** | 17 → **4** | 3031 → 3011 |

Counted with `document.querySelectorAll('*')` + `getComputedStyle(...).backgroundImage` /
`.boxShadow`. What is left is functional: the brand mark's mask, the hero's photo scrim, the rail
lead's caption scrim, the page's desk wash, and elevation on things that actually float (the
header's dropdown, the sticky rail panel, the fixed phone bar, the skip link).

The single biggest source was `.btn--accent`: a vertical gold gradient plus a `brightness()`
hover, repeated **24–42** times per catalogue page. It is a flat gold fill now, with a flat hover
step. `.btn--primary` lost its gradient and its drop shadow the same way. `.landing .btn--accent`
and `.landing__cta .btn--accent` were flattened with it; the **staff portal's**
`.app-shell .btn--accent` is its own approved direction and was deliberately left alone.

Also fixed on the way past: `.svc-grid` / `.svc-card*` were declared **twice** — a dead block in
the `/services` section and the live one in the home section — and the dead declarations silently
re-templated the home band into a 13.5rem card grid and put a gold disc behind every glyph. The
dead block is gone; `.svc-card` now has one home.

## Imagery brought in

`scripts/build-composition-images.mjs` (documented per-rectangle) publishes two families of
derivative:

- **band photographs** — `public/media/composition/*.webp`. The client's lot tiles
  (`lot-*.png`, 1254×1254, 2.2–2.6 MB) are *marketing tiles*: a logo lock-up in one corner and the
  family name set large across the bottom, over a photograph of the actual place. The pass needs
  the photograph, so each tile is cropped past its logo and above its title band — the same move
  `build-gallery-images.mjs` already makes for the client's promo composite. Nothing is
  re-coloured or invented.
- **thumbnails** — `public/media/composition/thumbs/*.webp` at 320/640 px, for every media-library
  asset a public view can render. `lib/media.ts` `libraryThumb()` / `libraryThumbSet()` is the one
  rule; an asset it does not know (a staff URL, a device upload's data URL) comes back unchanged.

Where the pictures go: the home's service band lead (`serviceCardPhoto()` derives it from the
card's own lot family + icon key — the same discipline as the `from ₱X` line), `/lots`' park
leads and hero, `/facilities`' ground figures and hero, the home's rails, About figure, promo
figure and newsfeed cells.

### Image weight — the bytes a page can request (heaviest `src`/`srcset` candidate per `<img>`)

| page | before | after |
|---|---|---|
| `/` | 26 imgs · **28 247 KB** | 27 imgs · **1 371 KB** |
| `/plans` | 45 imgs · **81 753 KB** | 3 imgs · **105 KB** |
| `/lots` | 59 imgs · **139 015 KB** | 6 imgs · **398 KB** |
| `/facilities` | 8 imgs · **5 106 KB** | 8 imgs · **354 KB** |
| `/products` | 31 imgs · **706 KB** | 11 imgs · **228 KB** |
| `/gallery`, `/services` | unchanged — already at the right size |

Every derivative: **12.01 MB of sources → 811 KB of published thumbnails**, and **9.38 MB of tiles
→ 458 KB of band photographs**.

## Facts kept

No figure, honesty note or scope statement was deleted. What the tests pin still holds:

- `/products` — all 24 models with SRP, senior SRP, discount and discounted price, each linking to
  its detail page with "View details", "Add to cart" (the exact SKU) and the prefilled
  "Request order".
- `/plans` — every one of the 42 items with its `display_price` and both actions.
- `/services` — all five a-la-carte fees, the sheet's ₱19,500 total, embalming 3–9 days + the
  `>9` extra day, both chapel classes with every 3–9 day regular/senior figure, the senior-rate
  conflict as published.
- `/lots` — every plot's status, type, area, owner and published price, and the honest
  "Price on request" state for map plots.
- The illustrative labels (`CHAPEL_SAMPLE_NOTE`, `SERVICE_SAMPLE_NOTE`, `COFFIN_TIER_NOTE`,
  "Sample photograph") ride with every sample photograph that is still published.

The reading budget (`tests/unit/reading-budget.test.tsx`) still passes on all six gated pages;
this pass removed prose rather than adding it.

## The one test assertion that changed meaning

`tests/unit/villa-services-premium.test.tsx` used to require `CASKET_MODELS.length` (24)
`casket-sample__chip` elements — "every card carries the sample photograph". The sheet photographs
**five** sample coffins and binds none of them to a named model, so the old assertion could only
be satisfied by reprinting a collection's one picture 6–9 times; that repetition *was* the defect.
The assertion now pins the stricter, more honest guarantee: **no published sample photograph
without its illustration chip and the sheet's substitution note**, one per collection, plus every
model still priced and reachable. `tests/unit/facilities-page.test.tsx`'s imagery assertion moved
to the photograph-only derivatives for the same reason (same asset, documented crop).

## Guardrail

`tests/unit/composition-pass.test.tsx` fails if any of this comes back: a gradient or a
`--shadow-card-rest` on a public band or button, a catalogue tile with a shadow, a fourth
"Services we offer" box, a second photograph repeated across the band, an invented image on
`/plans`, a heavy library image served raw, or a derivative missing from disk. It is deliberately
written against the **declaration**, so the failure names the rule that regressed.

## Evidence (this directory, `shots/`)

- `home-1440-png-sbs.jpg`, `services-1440-png-sbs.jpg`, `products-1440-png-sbs.jpg`,
  `plans-1440-png-sbs.jpg` — full page, before | after, 1440 px.
- `band-home-services.jpg`, `band-home-newsfeed.jpg`, `band-products-tiers.jpg`,
  `band-products-catalogue.jpg`, `band-plans-catalogue.jpg`, `band-lots-index.jpg` — the bands at
  1:1 so the detail is legible.

Before = `3ba8961` (the branch point) served on :4100; after = this branch on :4000; both captured
at 1440 px and 390 px with the same harness (`chrome-devtools-axi`, full-page screenshot at the
measured `scrollHeight`).

## Follow-ups this pass does not close

- The remaining gradient/shadow counts are the ones with a job (scrims, masks, the desk wash,
  real elevation). A future pass that wants to go further should start from the count above, not
  from zero.
- `/packages` still prints `plan-packages.png` once per package card; it has three items, so it
  was left outside this brief rather than half-migrated.
- The collection → sample-coffin binding stays provisional (`lib/media.ts`) and the client
  question — which sample belongs to Lumina / White Rose / Crown / Dynasty — is unchanged.
