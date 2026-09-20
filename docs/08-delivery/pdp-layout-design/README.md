# Product detail page — the Amazon layout pass (P3)

Phase **P3** of the captain-confirmed editable-PDP plan
(`data/villa-pdp-cms-plan/report.md`, sections 6, 8.2 and 10; the six captain
decisions in §9) and the captain's 2026-09-21 removal direction. P0 (the pure
model, PR #103), P1 (the editable description / gallery / specs and their public
render, PR #104) and P2 (the variant selector, PR #105) are merged; this phase is
the **Amazon-structure layout**: the legacy bespoke blocks on `/products/[sku]`
go, the page is a sticky gallery beside a buy box, and everything below the fold
comes from the editable catalogue entry.

## Removed (the captain's list)

The long sample-photo caption and tier notes, **"This model at a glance"**
(`CasketFacts` + `CasketPriceGrid`), **"What comes with this model"**
(`CasketInclusionPanel`), **"How the five tiers are shown"** (the `COFFINS`
strip), the five-link cross-navigation row (`RelatedChips`) and the
sibling-models row. The breadcrumb stays. The dead `.casket-facts` /
`.casket-prices` / `.casket-inclusions` / `.casket-chapel` /
`.casket-sample-strip` / `.casket-siblings` declarations were pruned with them;
`components/villa/casket-detail.tsx` now exports only the rule-derived
`CasketSampleFigure` the no-gallery fallback still needs.

## The structure (report §6, in our tokens and kit)

| Zone | What renders | Source |
|---|---|---|
| Breadcrumb | Coffins & caskets ▸ the line name | `app/(public)/products/[sku]/page.tsx` |
| `.pdp-media` (left, sticky ≥64rem) | the authored gallery viewer + thumbnail rail + zoom, or the rule-derived sample figure, or an honest text placeholder | `components/villa/pdp-gallery.tsx`, `casket-detail.tsx` |
| `.pdp-buy` (right) | collection eyebrow · variant h1 · one-line lead · the selector · the live price + senior line · availability/trust lines · one primary CTA + Request order | `components/villa/product-detail.tsx` |
| `.pdp-below` (full width) | the editable rich description · feature bullets (authored `bullets` blocks) · the formatted specs table · the remaining authored blocks | `RichText` · `SpecsTable` · `ContentBlocks` |

The grid is two columns on desktop (`"media buy" / "below below"`) and one column
below 64 rem, so a phone reads **gallery → buy box → content** — the Amazon
stack. The gallery is a `<figure>`, so the buy box is the first `<section>` a
reader (and the reading-budget gate) meets.

## Sticky gallery + zoom

- `.pdp-media` is `position: sticky` inside a `min-width: 64rem` query only;
  below it the page collapses to the phone stack. Measured on the demo build:
  after `window.scrollTo(0, 350)` the media top stays at 24 px while the buy box
  is at −145 px.
- The main viewer's magnifier button opens a `useModalFocus` dialog
  (focus moves in, Tab trapped, Escape closes, body scroll locked, focus
  returned). The enlarged picture sits at natural size in a `.pdp-zoom__frame`
  that pans (`overflow: auto`) — no new dependency.
- Every non-lead image is `loading="lazy" decoding="async"`; only the selected
  variant's lead photograph is eager.

## Performance (measured, dev server on :4177, `/products/CSK-LUMINA`)

| | Before (P2) | After (P3) |
|---|---|---|
| Server HTML | 82 754 B | 64 315 B |
| `/products/[sku]` route | 5.98 kB / 129 kB First Load JS | 6.16 kB / 129 kB First Load JS |
| Photographs on the default page | 1 wide sample + **5 tier samples** + 6 selector thumbs | 1 wide sample + 6 selector thumbs |
| Tier-image bytes removed | — | **≈ 122 KB** (lazy, so only when scrolled) |

The build's shared First Load JS is unchanged at 129 kB: the zoom lives inside the
already-shipped `PdpGallery` client component, so no new client boundary or
dependency is added.

## Honesty and rules

- **No-image fallback** — the variant's own gallery, else the rule-derived sample
  with its chip and the short `COFFIN_SAMPLE_NOTE`, else the honest placeholder.
- **Samples labelled** — the chip renders when the active picture is a sample;
  the rail chips each sample thumbnail; the buy box adds an
  "illustrative samples" trust line whenever a sample or the fallback is shown.
- **The seven withheld photographs** (`HELD_CLIENT_PHOTOS`) are never offered;
  `catalogue-imagery` remains the one photograph rule home.
- **Money is always live** — the selected variant's catalogue `display_price`
  plus its model's sheet senior figure; nothing is authored into a view.
- **Tokens and the type ladder only** — the new `.pdp-*` block carries no raw
  colour or off-ladder size, `height: auto` accompanies every img-level ratio,
  and gold never carries body text (`--color-text-accent` is `gold-800`).

## Source (this pass)

- `app/(public)/products/[sku]/page.tsx` — drops the two static slots, passes the
  landing `contact` into the buy box, keeps the per-SKU canonical and the one
  server pass over the line.
- `components/villa/product-detail.tsx` — the `.pdp-layout` structure, the buy
  box, the feature-bullet and specs sections, the sticky media wrapper.
- `components/villa/pdp-gallery.tsx` — the zoom dialog; the substitution note
  trimmed to the sheet's one-line illustration label.
- `components/villa/casket-detail.tsx` — only `CasketSampleFigure` remains.
- `styles/components.css` — the `.pdp-*` layout / buy box / zoom block.

## Evidence

Shots in `shots/` (1440×900 and 390×844):

- `before-pdp-1440.png` · `before-pdp-1440-full.png` · `before-pdp-390.png` ·
  `before-pdp-390-full.png` — the P2 page (glance · inclusions · five-tier strip ·
  five-link row).
- `after-pdp-1440.png` · `after-pdp-1440-full.png` · `after-pdp-390.png` ·
  `after-pdp-390-full.png` — the P3 page on the default entry (gallery + buy box).
- `after-content-1440.png` · `after-content-1440-full.png` ·
  `after-content-390-full.png` — an authored White Rose Full entry showing the
  rich description, feature bullets, specs table and authored blocks.
- `after-zoom-1440.png` — the zoom dialog (count, Close, natural-size pan frame,
  caption).

Measurements (chrome-devtools-axi): sticky media top 24 px at scrollY 350;
`scrollWidth === clientWidth === 390` at the phone width; the zoom dialog reports
`role="dialog"`, `aria-modal="true"`, a pan frame with `overflow: auto`, focus on
Close and `body.overflow: hidden`; Escape closes and restores the page.

## Tests

- `tests/unit/phone-layout.test.tsx` — the new `.pdp-layout` two-column → phone
  stack, the gallery/copy order, the desktop-only sticky rule, and the fixed zoom
  dialog with its pan frame and 44 px trigger.
- `tests/unit/reading-budget.test.tsx` — the PDP joins the guard (the buy box lead
  opens the page in ≤12 words, one action beside it).
- `tests/unit/villa-services-premium.test.tsx` — the live price + senior line, the
  Amazon structure, the sample photograph, and the retirement of every named
  legacy block.
- `tests/unit/catalogue-entry-page.test.tsx` — the rich description, gallery and
  specs still reach the page; the sample stays labelled in the rail.
- `tests/unit/pdp-gallery.test.tsx` · `tests/unit/pdp-variants.test.tsx` — the
  viewer/rail/fallback and the selector, updated for the new tree.

`npm run lint && npm run typecheck && npm test && npm run build` all green
(201 test files, 2286 tests).

## Not in this pass (P4)

The server-side upload route to `MEDIA_UPLOAD_DIR` and the C12 object-store seam
remain P4 of the plan.
