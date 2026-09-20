# The storefront imagery pass — the client's own photographs (2026-09-19)

**The captain's instruction:** *"the images used and the design was broken, fix that — make
sure it has all the images per product and services and the design is premium and the
consistency."* Firstmate measured the state he was looking at before any of this work:

| measured defect (before) | number |
| --- | --- |
| `/products` catalogue imagery | **88×66** thumbnails beside text — the whole page carried 11 images and 5 of them were upscaled |
| `/plans` | **3** images on the entire page (the plan poster twice + one logo) |
| `/lots` | 6 images, 3 of them upscaled from 480px files |
| `/services` | 8 images, 3 upscaled from 340px files |
| `/packages` | 3 cards reprinting **one** poster (630 KB of the same file) |
| casket models | 24 models sharing **five** stock photographs (`bronze-casket.jpg`, `coffin-bronze-1.jpg`, …), two of them the same picture twice |
| the client's own photographs | **0** in the project |

**What this pass ships:** every catalogue item and service line carries its own photograph from
the client's own 2026 set, at one art direction, on the storefront's one card grammar; the
client's 21 supplied photographs are imported, processed and honestly labelled; the page
surfaces follow the measured before/after below.

## 1. The import — 21 client files → 14 published photographs + 7 held

`scripts/build-client-photos.mjs` (re-runnable; every source file's md5 is pinned, so a
re-run against a changed source fails loudly):

- reads the client's originals from outside the repo (`--source <dir>` / `CLIENT_PHOTOS_SOURCE`,
  default `/home/edgepoint/Edgepoint_05/VILLA MEMORIAL PROJECT 2026/`);
- writes `public/media/client/` — **4:3 `*-card-440/880`** (cards, rows, rails) and
  **3:2 `*-wide-960/1600`** (leads, heroes, features), WebP, no upscaling (a width larger than
  the crop's own pixels is skipped);
- archives each original byte-for-byte in `media-sources/client-photos/` — OUTSIDE `public/`,
  because seven of the twenty-one show identifiable mourners and a URL-fetchable file is
  published whether or not a page links it;
- names every derivative for **what it depicts**, never for the client's folder name
  ("Serenity full gass 2.jpg" → `casket-white-gold-closed`). The source name stays in
  `lib/client-photos.ts` (`file:`) and the provenance README beside the originals.

The seven held photographs are named one by one in `lib/client-photos.ts`
(`HELD_CLIENT_PHOTOS`, all from the Tribute series): they show identifiable mourners, one a
named memorial screen. Their originals are archived, no web derivative is written, and the
reason travels with each one.

## 2. The mapping record — what each photograph actually shows

`lib/client-photos.ts` is the record: each published photograph carries a concrete `what`
description (the Phase-2 evidence a reviewer checks the mapping against) and an honesty class
(`client-photo` = the thing named; `illustration-only` = a stand-in that must be labelled).

| client file | published id | what it shows | used as |
| --- | --- | --- | --- |
| `Serenity full glcass.jpg` | `casket-white-gold-glass-lid` | white metal casket, gold handles, full-glass lid raised showing a white quilted interior with embroidered doves | casket sample |
| `Serenity full gass 2.jpg` | `casket-white-gold-closed` | the same casket with the full-glass lid closed, chapel crucifix reflected | casket sample |
| `Divine Rest.jpg` | `casket-white-gold-wreath-lid` | white-and-gold casket, full-glass lid raised over a white interior with a laurel-wreath head panel | casket sample |
| `Heaven_s Gate.jpg` | `casket-wood-white-gold-bible-lid` | wood-toned shell with white panels and gold handles; the published frame is the raised lid's bible-embroidered interior | casket sample |
| `Everlasting.jpg` | `casket-white-open-lid` | plain white casket, lid raised, on a bier in the chapel hall | casket sample |
| `Everlasting 2.jpg` | `casket-white-closed` | plain white casket, closed, silver ornaments, on its bier | casket sample |
| `Karwahe.jpg` | `hearse-carriage-gold-side` | the office's karwahe — gold-leafed glass casket compartment, black canopy, white chrysanthemums | **the hearse itself** |
| `karwahe (2).jpg` | `hearse-carriage-gold-rear` | the same carriage from behind | **the hearse itself** |
| `urn set up.jpg` | `chapel-hall-candle-pedestals` | the chapel hall: draped table, five candle pedestals on the green runner, no urn in frame | **the chapel hall** |
| `creamation urn set up.jpg` | `chapel-hall-flags` | the same hall from the platform, pedestals lit | **the chapel hall** |
| `our services (4).jpg` | `wake-setup-lamp-alcove` | a prepared viewing alcove, purple/white drapes and lit lamp stands, nobody in frame | viewing set-up sample |
| `our services (2).jpg` | `wake-setup-casket-draped` | a white casket in a draped alcove, two staff with their backs turned | viewing set-up sample |
| `our services (5).jpg` | `wake-setup-flower-bank` | a finished wake set-up banked in white flowers | viewing set-up sample |
| `our services.jpg` | `wake-setup-dressing` | office staff, from behind, building the set-up | preparation stand-in |

**The caskets, honestly.** Six photographs cannot be twenty-four coffins. The one rule home is
`CASKET_MODEL_PHOTOS` in `lib/media.ts` — an explicit 24-row table whose choice answers the
COVER the model's own name states (Half = lid down / half stay; Full, Full Split, Flexi = a
raised cover) and the collection's price band, laid out so no family and no neighbouring card
repeats a picture:

| photograph | models (all labelled samples) |
| --- | --- |
| `casket-white-closed` | Lumina · Angelica Half · Noble Half · Monarch Half |
| `casket-white-gold-closed` | White Rose Half · Magnolia Half · Royal Half |
| `casket-white-gold-glass-lid` | White Rose Full · Noble Full Split · Majesty Full · Emperor Full Split · Imperial Flexi |
| `casket-white-gold-wreath-lid` | Angelica Full · Royal Full · Majesty Full Split · Emperor Flexi |
| `casket-white-open-lid` | Magnolia Full · Royal Full Split · Emperor Full · Imperial Full Split |
| `casket-wood-white-gold-bible-lid` | Noble Full · Monarch Full · Majesty Flexi · Imperial Full |

**The unmapped-photo decision.** The client's photographs are named Tribute, Serenity,
Everlasting, Divine Rest and Heaven's Gate; the 2026 sheets sell White Rose, Angelica,
Magnolia, Noble, Royal, Monarch, Majesty, Emperor, Imperial and Lumina. Nobody has reconciled
the two lists, so **no photograph is published as a named model**: every model card carries the
`Sample photograph` chip and the sheet's own substitution note (`COFFIN_TIER_NOTE`). Which
models still have no true photograph of their own: **all twenty-four** — none is provably the
model it illustrates; the reconciliation is an open client question, opened in
`docs/07-client-villa/open-questions.md`. Six photographs cover them; two models never share a
card without the sample label.

**No photograph of the preparation itself exists** in the client's set, so the embalming
ladder uses the office's own staff-at-work picture, captioned as such; retrieval likewise uses
the office's at-need photograph, labelled "Illustration only".

## 3. Art direction and consistency

- **One rule home for a catalogue item's photograph:** `lib/catalogue-imagery.ts`
  (`catalogueItemPhoto(sku)`). The caskets delegate to the 24-row table, the packages to
  `COFFIN_TIER_PHOTO_IDS`, the services to the chapel / karwahe / set-up photographs. An
  admin-set `item.image` wins; an item the client's material does not cover returns `null` and
  renders text only rather than a borrowed picture.
- **One card grammar:** `components/villa/shop-card.tsx` inside `.shop-grid` — the photograph
  leads at the column's full width, 4:3; figures under it; actions last. Now on `/products`
  (24 model cards + the sheet's five-tier band + inclusions), `/plans` (all 42 items; the eight
  embalming day counts as ONE `.day-ladder`), `/packages` (converted from the 3:2 `item-card`
  grid so the same package cannot look like two products), and `/lots`.
- **One ratio family:** 4:3 for cards/rows/rails; 3:2 for leads, heroes and feature figures.
  `/products/[sku]`'s tier strip uses the SAME photographs as the `/products` band (two-up at
  1440, one-up at 390, top hairline, no box), so a tier looks the same on both surfaces.
- **The 88×66 boxes are gone.** The tier band's row figure is `clamp(9rem, 14vw, 11rem)`
  (176px at 1440, 144px at 390), pinned by `tests/unit/broken-pages.test.ts`.
- Tokens only: no new colour, typeface or off-ladder size; captions and chips are the sheet's
  own words, compressed for the reading budget.

## 4. Measured result (rendered in Chrome at 1440×900 and 390×844)

Count = `<img>` elements; median = median rendered width of visible images; upscale = rendered
wider than the published file by >5%; payload = bytes of the page's distinct images fetched
with `cache: 'reload'`. Before = the default branch (58e4bea), after = this branch.

| page | before | after |
| --- | --- | --- |
| `/products` @1440 | 11 img · median **88px** · 5 upscaled · 143 KB | **31 img · median 448px · 0 upscaled · 275 KB** |
| `/products` @390 | 11 img · median 88px · 1 upscaled · 143 KB | 31 img · median 342px · 0 upscaled · 275 KB |
| `/products/CSK-LUMINA` @1440 | hero 902×640, an **upscaled 330px stock photo** · 150 KB | hero 902×601 from the client's own photograph · 228 KB |
| `/products/CSK-LUMINA` @390 | hero 340×241 upscaled from the 330px stock photo | hero 340×227 from the client's own photograph |
| `/plans` @1440 | **3 img** · 75 KB | **38 img · median 448px** · 459 KB |
| `/plans` @390 | 3 img · 75 KB | 38 img · median 342px · 459 KB |
| `/lots` @1440 | 6 img · median 497px · 3 upscaled · 263 KB | 11 img · median 448px · 0 upscaled · 427 KB |
| `/lots` @390 | 6 img · 208 KB | 11 img · median 342px · 240 KB |
| `/services` @1440 | 8 img · 3 upscaled · 410 KB | 13 img · median 389px · 0 upscaled · 489 KB |
| `/services` @390 | 8 img · 410 KB | 13 img · median 340px · 489 KB |
| `/facilities` @1440 | 8 img · 5 upscaled · 261 KB | 8 img · 0 upscaled · 451 KB |
| `/facilities` @390 | 8 img · 261 KB | 8 img · 386 KB |
| `/packages` @1440 | 5 img · 3× the same poster · 630 KB | 5 img · three different casket photographs · **64 KB** |
| `/packages` @390 | 5 img · the poster again · 630 KB | 5 img · 64 KB |
| `/` @1440 | 28 img · 3151 KB | 28 img · 3151 KB (unchanged) |
| `/` @390 | 28 img (11 in the collapsed flyout) · 3151 KB | 28 img · 3151 KB (unchanged) |

The home page is untouched by this pass. Its 3.1 MB is dominated by one pre-existing asset,
the client masterplan `public/media/Park map.png` (2.3 MB, 1254×1254, the Leaflet overlay and
3D frame) — deliberately not swapped (AGENTS: the masterplan is the only spatial source of
truth), and named here as the largest remaining image payload on the site.

## 5. Screenshots

`shots/` — 36 viewport captures, `{surface}-{width}-{before|after}.jpg`:

- surfaces: `home` · `products` (scrolled to the shop grid) · `detail` (a model page) ·
  `detail-tiers` (that page's tier strip) · `plans` (scrolled to the catalogue) · `lots`
  (scrolled to the legend cards) · `services` (scrolled to the rates) · `facilities` ·
  `packages` (scrolled to the cards)
- widths: 1440×900 and 390×844
- before: the default branch served from a clean `git archive 58e4bea` (port 4322)
- after: this branch's dev server (port 4321)

## 6. Verification

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (all green on the PR head).
Pinned by:

- `tests/unit/client-photos.test.ts` — every published derivative exists, no upscaling, the
  held list, the provenance record;
- `tests/unit/catalogue-imagery.test.ts` — every catalogue SKU resolves to a published file,
  a sample chip and caption travel together, a casket's photo equals
  `casketModelPhotoId()`, a shared photograph is always labelled;
- `tests/unit/broken-pages.test.ts` — the tier-row template;
- `tests/unit/villa-services-premium.test.tsx` — the detail page's tier strip and the sample
  wording;
- `tests/unit/packages-page.test.tsx` — three packages, three different photographs.
