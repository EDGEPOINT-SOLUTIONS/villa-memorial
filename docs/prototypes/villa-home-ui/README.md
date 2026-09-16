# Villa Memorial — home & package page design reference

The reviewed visual prototype behind this PR's UI work, carried here as a design
reference. It is **plain HTML/CSS built with the app's own design system**
(`styles/tokens.css`, `styles/base.css`, `styles/components.css`,
`styles/utilities.css` — copied at review time), not a screenshot and not a
second design language.

## What it shows

| File | Demonstrates |
|---|---|
| `home.html` | The three-column home with **one oversized lead image per rail** (the “Lead” pill), the **middle column widened to 58rem**, and the **hero running a background photo** (park-gate) under a navy readability scrim. |
| `package.html` | The package page rebuilt to the client's *Package page UI example.webp*: breadcrumb → title → pill links → quote → blue Villa Memorial Plan statement → COMPLETE MEMORIAL PACKAGE inclusions + conditions grid → promo card → buy card with the **Plan tier × Plan Term selector** (Monthly · Quarterly · Semi-Annual · Annual, regular and senior-citizen rates) → the whole **2026 price list** (four families, 6-year amortization) and the source sheets as an evidence strip. |
| `prototype.css` | The only authored CSS: the rail lead card, the hero photo layer, and the new package-page blocks. Everything else is the app's stylesheet. |
| `asset-analysis.md` | Per-asset notes written while reading the client's media library — what each file contains and where it belongs. |

## Viewing it

Images are staged locally (they are the client's assets and copies already in
`public/media`, so they are not committed):

```bash
docs/prototypes/villa-home-ui/stage-assets.sh
python3 -m http.server 4180          # from the repo root
# open http://127.0.0.1:4180/docs/prototypes/villa-home-ui/home.html
```

Set `VILLA_CLIENT_MEDIA` if the client library lives outside the default path.
The two `doc-price-list-2026-II/III.jpg` sheets need a PDF rasteriser
(`pdftoppm` or `pymupdf`); without one those two evidence figures are blank and
everything else renders.

## Decisions this reference encodes (captain's review, D1–D5)

1. **Middle column 58rem** (was 50rem), folio 99rem, rails stay fixed at 17rem.
2. **Rail lead images**: left = a service photo (viewing & wake set-up), right =
   a product photo (mausoleum). Staff pick the lead per rail in the editor.
3. **Hero photo**: full-bleed photo + navy scrim; no photo keeps the gradient.
4. **Brand lockup**: Sanctuario de Mercedes y Gloria crest + “Villa Memorial
   Park” (staff-editable via the content document's `logo.markImage`).
5. **Price list on the package page**, below the package detail.

## How production implements it

| Reference element | Production |
|---|---|
| Rail lead image | `RailItem.featured` (model + tolerant reader) → `RailItemLink` lead branch → `.rail-item--lead` in `styles/components.css`; the “Lead” toggle in the landing editor clears every other item on that rail. |
| Widened middle | `--layout-folio-w: 99rem` (`styles/tokens.css`), `--mid-w: 58rem` and the mobile cap (`styles/components.css`). |
| Hero photo | `HeroSection.image` → `hero-home--photo` + a real `<img>` layer behind the copy, scrim above it; editor field “Background photo”. |
| Package page blocks | `app/(public)/plans/[sku]/page.tsx` (quote, statement, inclusions, conditions, price module, "The package at a glance" strip, advisor card) — rendered only for packages. |
| Plan term selector | `app/(public)/plans/[sku]/plan-term-selector.tsx`, every amount through `planRate()` in `lib/villa-pricing.ts`. |
| 2026 price list module | `app/(public)/plans/[sku]/price-list-2026-module.tsx` — the prototype's term-highlight switch + senior toggle over `data-term` cells; `components/villa/price-list-2026.tsx` stays the `/lots/price-list-2026` card renderer. |
| Logos & photos | `public/media/logo-sanctuario.png` (header/footer brand mark), `logo-villa-group.png` + `logo-villa-agency.png` (plan/package underwriting rows), `viewing-care.jpg` (rail lead), plus the already-shipped lot/casket photos. |

The prototype is a visual target, not a runtime contract: production reads every
amount from `lib/villa-pricing.ts` and every photo from `lib/media.ts`.
