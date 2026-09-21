# Remove the redundant "Sample photograph" chip + the header utility row

Captain's direction, 2026-09-21 (two shared cleanups, one PR):

1. *"remove the label 'sample photograph' because it's pretty obvious."* The chip
   was a shared pattern — it rendered on a product card, in the PDP gallery, on
   a plan tier card and on a content-block gallery. The client's own
   **"Illustration purposes only."** wording stays; only the redundant badge is
   gone.
2. *"remove this additional navigation / Isabela City, Basilan - every hour,
   every day / Immediate assistance / 24/7 Assistance Line / 0917 617 8489 it's
   so cheap."* The whole `anchored-header__utility` row is removed with no
   replacement.

## What changed

- **`lib/catalogue-imagery.ts`** — `CatalogueItemPhoto`'s `chip?: string` is
  replaced by `sample?: boolean` (the honesty semantics `catalogue-content.ts`
  derives from). No chip label is carried any more.
- **`components/kit/product-card.tsx`** — the `chip` prop and its
  `.casket-sample__chip` render are gone; the `caption` line stays.
- **`components/villa/{pdp-gallery,casket-detail,plan-tier-card,casket-catalogue}.tsx`**
  and **`components/content/content-blocks.tsx`** — the chip / mini label render
  sites are removed; captions stay.
- **`styles/components.css`** — `.casket-sample__chip`,
  `.casket-sample__mini`, `.shop-card__media .casket-sample__chip` and
  `.pdp-gallery__thumb .casket-sample__mini` are pruned; the utility-row block,
  the call button, the Immediate-Assistance chip, `UTILITY_HOURS` and the unused
  icons are pruned; `--anchored-header-h` drops to the single-row compressed
  height on desktop and phone.
- **`components/landing/site-header.tsx`** — one row now; the `contact` prop is
  gone (no caller needs it).

The 24/7 number stays reachable in the footer, `/contact`, `/immediate-assistance`
and the permanent phone action bar (Call 24/7) — pinned by
`tests/unit/public-nav.test.tsx`, `journey-actions`, `immediate-assistance`.

## Evidence — 1440×900 (`shots/`)

| Surface | Before | After |
|---|---|---|
| `/products` card | `before-products.jpg` | `after-products.jpg` |
| `/products/CSK-LUMINA` PDP sample figure | `before-pdp.jpg` | `after-pdp.jpg` |
| `/plans` tier card (seeded sample image) | `before-plans.jpg` | `after-plans.jpg` |
| `/map` content-block gallery (seeded) | `before-content.jpg` | `after-content.jpg` |
| Header at 390 (utility row) | `before-header-390.jpg` | `after-header-390.jpg` |

The plan-tier and content-block samples were seeded into
`lib/fixtures/content/pages.json` only to produce the shots; the seed is NOT part
of the change (neither surface ships a seeded sample image).

## Validation

`npm run lint && npm run typecheck && npm test && npm run build` — all green
(206 files / 2417 tests).
