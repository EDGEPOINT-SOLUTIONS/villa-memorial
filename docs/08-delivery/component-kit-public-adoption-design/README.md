# Component kit — the public adoption pass (2026-09-21)

**What this is.** The follow-up to the component-kit build record
([`../component-kit-design/README.md`](../component-kit-design/README.md)): move the public
storefront off its one-off card arrangement onto the kit's `ProductCard` / `ResultsGrid`, with no
visual, content or behavioural change. The captain's order: *"adopt the component kit on the public
pages"*.

This file is the change record and the evidence. The kit's own rules live in
[`components/kit/README.md`](../../../components/kit/README.md).

## What shipped

Every surface that renders the product-card grammar now reads the kit:

| Surface | Before | After |
|---|---|---|
| `/lots` (the listing) | `components/villa/shop-card.tsx` inside a hand-written `<ul class="shop-grid lot-grid">` | kit `ProductCard` + kit `ResultsGrid` |
| `/plans` (the 2026 catalogue) | `ShopCard` inside a per-group `<ul class="shop-grid">` | kit `ProductCard` + `ResultsGrid` |
| `/packages` | `ShopCard` inside `<ul class="shop-grid">` | kit `ProductCard` + `ResultsGrid` |
| `/products` (the casket catalogue, `components/villa/casket-catalogue.tsx`) | `ShopCard` inside a per-collection `<ul class="shop-grid">` | kit `ProductCard` + `ResultsGrid` |

`components/villa/shop-card.tsx` was **deleted** — its exact markup is now `ProductCard`'s. The one
kit change this required: `ProductCard` was reconciled to the landed `ShopCard` body order
(eyebrow · title · supporting · price · **status** · **senior** · actions), because the kit's first
draft printed the status chip above the price and had no `senior` slot. `/lots` puts its
availability chip under the figure; the casket card carries a senior line. Both now render exactly
as before.

`ResultsGrid.label` was made **optional** (matching `DataTable.label`): the storefront bands already
name their enclosing `<section>`, so a required list name would have added a duplicate `aria-label`
to every grid. Optional keeps the public DOM byte-identical and the kit's named-list behaviour
intact for callers that want it.

## No-visual-change evidence

### 1 · Rendered DOM is byte-identical

All four surfaces were rendered with `renderToStaticMarkup` at the base commit and on this branch
(fixtures mode, `CartProvider` wrapper) and compared byte-for-byte:

```
IDENTICAL  products  packages  plans  lots
```

Reproduction (temporary harness, deleted after the pass): render each page to
`/tmp/kit-{before,after}/<name>.html` and `cmp` the pairs. In the first attempt `ResultsGrid` added
an `aria-label` to each `<ul>` and every surface differed by exactly that attribute; making `label`
optional removed the diff entirely.

### 2 · Screenshots at 1440×900 and 390×844

`docs/08-delivery/component-kit-public-adoption-design/shots/<surface>-<width>-{before,after}.png`
(headless Chrome via `chrome-devtools-axi`, fixture mode, one dev server per tree). Pixel diff with
`sharp`:

| Surface | 1440×900 | 390×844 |
|---|---|---|
| lots | 4994 / 1,296,000 px (see control) | identical |
| plans | identical | identical |
| packages | identical | identical |
| products | identical | identical |

**Control:** two captures of the *same* build of `/lots` at 1440 differ by the same
4994 px / max channel delta 131, confined to the sticky filter rail (x 20–281). The rail's own
capture state is nondeterministic in this environment; the code is not involved. The other seven
pairs are zero-pixel.

## What was deliberately NOT adopted (the delta)

The brief says: if the kit cannot express a landed surface exactly, keep the landed surface and
report the delta rather than restyling. Two cases:

1. **`FilterRail` on `/lots`.** The landed rail
   (`app/(public)/lots/lot-filters.tsx`, the captain's 2026-09-20 Amazon-inspired panel) is a
   different grammar from the kit's `FilterRail`:

   | Landed `/lots` rail | Kit `FilterRail` |
   |---|---|
   | `<button>` group heads with a rotating chevron, each group collapsible in place (all open by default) | `<details>`/`<summary>` |
   | option color dots (`type-dot`, from the legend) | none |
   | count **pills** at each option's right edge | plain tabular count |
   | price group = Min ₱ / Max ₱ **plus quick ranges** read from the published figures | min/max inputs + Apply only |
   | phone surface is an **in-place** panel with its own "Show N lots" action, no focus trap | a modal sheet with `useModalFocus` |
   | sticky 17rem `.lot-rail` / `.lot-sheet` shell owned by the page | its own `.filter-rail__*` shell |

   Moving `/lots` onto the kit rail would therefore change the DOM, the classes and the phone
   behaviour — a restyle, which the brief forbids. The landed panel is kept, and
   `tests/unit/phone-layout.test.tsx` still pins its `.lot-filter__row` / sticky-rail rules.
   Promoting the Amazon grammar into the kit as a second rail shape is an open decision (a
   product/architecture call, not a silent restyle here).

2. **Bespoke captain-approved card grammars.** `/services` (`.sv-price-card` / `.sv-chapel`),
   `/facilities` (`.fac-rooms` / `.fac-grounds`) and `/gallery` (`.gal-cards` / `.gal-feature`) are
   photographic / rate cards with their own approved layouts, not the product card. `/map` already
   renders the kit `EmptyState` and `/builder` has no kit-shaped pattern. None is forced onto
   `ProductCard`; all are unchanged.

   `DataTable` stays admin-only per the brief; no public route introduces it.

## Checks

```
npm run lint && npm run typecheck && npm test && npm run build
```

All green (175 files / 2061 tests). The kit's own tests gained two assertions locking the
reconciled grammar: the status chip sits under the figure, and the senior line is card furniture
(never `<p>` prose).
