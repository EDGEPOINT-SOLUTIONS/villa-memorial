# Page opening band — one designed first band for every page (2026-09-25)

Captain's direction (2026-09-25):

> "This should be intuitive, smart, empathetic and user-friendly, familiarity for
> ui/ux design, not crowded, not overwhelming like huge images that are not
> necessary, perfect design, experience. Make this look sharp and proper, every
> page titles or 1st page section is so basic and whack."

So: the opening band of every page — the title and first section a customer meets —
must be a properly designed, sharp, familiar element, consistent across the
product, never a bare title on white.

The home's storefront rebuild (`docs/08-delivery/home-storefront-design/`) already
gave the home a designed opening panel (`.hero-home__copy`). This pass extends that
same grammar to **every other opening** in the product — public interior pages, the
Admin Portal, and both signed-in portals.

## The grammar

One band, one shape, **eyebrow · headline · one short lead · the page's action**:

| element | role | value |
|---|---|---|
| surface | band ground | `--color-bg-surface` (white) |
| hairline | one crisp rule | `1px solid var(--color-rule)` (`granite-200`) |
| radius | modern corner | `var(--radius-lg)` (14px) |
| whitespace | deliberate padding | `clamp(1.5rem, 3vw, 2.25rem)` → **24px phone / 36px desktop (3vw ≥1200px)** |
| ceremonial mark | 2px gold rule on top | `var(--gold-hairline)` (matches `.hero-home::before` + `.gal-hero::before`) |
| eyebrow | uppercase micro label | `--text-micro`, `--color-text-accent` |
| headline | the route's `h1` | `--text-page-title` (**28px desktop / 22px phone**) |
| lead | one sentence | `--text-lg` (**18px**), `--color-text-secondary`, max 46rem |
| action | one page commitment | the route's own button(s), right-aligned on desktop |
| composition | title column + action | 2-col grid `minmax(0,1fr) auto`; stacks to 1 col ≤ 48rem |

No gradient on the field, no drop shadow, no per-route restyle. The rule lives in the
"page opening band" block at the tail of `styles/components.css`.

### One grammar, three roots

The band reuses the three opening roots the surfaces already render, so no view
re-derives a header and the class names the surface tests pin stay intact:

- `.public-hero` — the public interior pages + the support/purchase pages
  (`/cart`, `/checkout`, `/quote`, `/appointments`, `/orders/[number]`, `/map`'s
  error state). The interior title stepped **down** from the fluid hero
  (`--text-hero`, 36→52px) to the shared page title (28px) — the captain's
  "no oversizing", and the same rung the Admin Portal and the portals use.
- `.page-header` — the Admin Portal (`components/ui/page.tsx`). `PageHeader` gained
  an optional `lead` (`page-header__lead`) so each principal screen opens on one
  line; its text column is wrapped in `page-header__text` and its action sits at
  the band's end.
- `.ag-hero` — both signed-in portals (`PortalHero` / `AgentHero`).

### Hierarchy and breadcrumbs

The eyebrow carries the group ("Operations · Case", "Commerce · Order"), and the
pages whose hierarchy needs more already render a real breadcrumb — `/plans/[sku]`
keeps the client-approved prototype's breadcrumb — or a "Back to …" action at the
band's end. No second breadcrumb grammar was invented.

### What was removed

- `.ops-lead` — the one-sentence line that sat *below* the header on the three
  designed Operations screens (`/staff/notifications`, `/staff/dispatch`,
  `/staff/work-orders`) moved **into** the band as its lead. Same words, one band.
- The standalone intro paragraphs on `/staff/landing`, `/staff/pricing`,
  `/staff/users`, `/staff/workflows`, `/staff/settings` folded into the band lead.

## Imagery

The opening banner stays **optional** and within the existing ceilings
(`lib/public-layout.ts` `IMAGE_CEILINGS["interior-hero"]`, 16:9 ≤ 18rem). Only three
public interior pages pass a photograph (`/services`, `/gallery`, `/facilities`) —
each adds meaning. The rest open on the band's type and whitespace, not a large
image.

## Evidence (declaration-level; vitest runs in `node`)

`tests/unit/page-opening.test.ts` (new) pins:

- **one rule list targets all three roots** with the same surface, hairline, radius
  and padding — a later edit cannot split the grammar;
- the 2px gold rule targets all three roots and no band root carries a `box-shadow`;
- the public interior title rides `--text-page-title`;
- the composition is a 2-column grid on desktop and stacks to 1 column ≤ 48rem;
- `page-header__lead` / `page-header__text` exist and the lead rides `--text-lg`;
- `PageHeader`, `PublicHero` (interior) and `PortalHero` each render
  eyebrow · headline · lead · action;
- **every principal Admin Portal screen** (every `STAFF_NAV` route) passes a lead.

`tests/unit/typography-system.test.ts` now maps `.public-hero__title` to the
`page-title` role, so it cannot drift back to the display step.
`tests/unit/portal-calm.test.ts` was updated: the `.ag-hero` is no longer asserted
"never a boxed card" — it is the shared designed band (surface + one hairline + one
gold rule, still no shadow/lift/gradient field). Its gradient exemption names the
band's gold rule, like the skeleton shimmer.

`tests/unit/reading-budget.test.tsx` `openingLead` now reads the band lead
(`page-header__lead`) for the five Admin screens whose one line moved into it.

Full gates: `npm run lint`, `npm run typecheck`, `npm test` (2628 passing),
`npm run build` — all green.

## Two existing designed openings are deliberately unchanged

- `/plans/[sku]` (the client-approved package layout) and `/map` (the staff-editable
  park hero) keep their own `.hero-premium` bands; the package prototype is the
  authority for that page and the park hero is content-driven.
- The platform operator surface (`/platform/*`) keeps its `.platform-hero`; it is
  not a product (customer/staff) surface.
